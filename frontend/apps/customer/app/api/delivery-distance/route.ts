type Coordinate = { latitude: number; longitude: number };
type GeocodeResult = { coordinate: Coordinate; label: string };

const geocodeCache = new Map<string, GeocodeResult[]>();

function parseCoordinate(value: string): Coordinate | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function completeDaNangAddress(value: string) {
  if (parseCoordinate(value) || /đà\s*nẵng|da\s*nang/i.test(value)) return value;
  return `${value}, Đà Nẵng, Việt Nam`;
}

function geocodeLabel(properties: Record<string, unknown>) {
  const text = (key: string) => typeof properties[key] === "string" ? String(properties[key]).trim() : "";
  const street = [text("housenumber"), text("street")].filter(Boolean).join(" ");
  const values = [text("name"), street, text("locality"), text("district"), text("city"), text("state"), text("country")];
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.toLocaleLowerCase("vi");
    if (!value || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  }).join(", ");
}

async function geocodeMany(value: string, limit = 1): Promise<GeocodeResult[]> {
  const direct = parseCoordinate(value);
  if (direct) return [{ coordinate: direct, label: `${direct.latitude}, ${direct.longitude}` }];
  const query = completeDaNangAddress(value).trim();
  const cached = geocodeCache.get(query);
  if (cached && cached.length >= limit) return cached.slice(0, limit);
  const response = await fetch(`https://photon.komoot.io/api/?limit=${limit}&countrycode=VN&bbox=108.0,15.85,108.4,16.2&lat=16.0544&lon=108.2022&location_bias_scale=0.1&q=${encodeURIComponent(query)}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];
  const payload = await response.json() as { features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: Record<string, unknown> }> };
  const results = (payload.features || []).flatMap((feature) => {
    const coordinates = feature.geometry?.coordinates;
    if (!coordinates || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return [];
    const coordinate = { longitude: coordinates[0], latitude: coordinates[1] };
    return [{ coordinate, label: geocodeLabel(feature.properties || {}) || `${coordinate.latitude}, ${coordinate.longitude}` }];
  });
  geocodeCache.set(query, results);
  return results.slice(0, limit);
}

async function geocode(value: string): Promise<Coordinate | null> {
  return (await geocodeMany(value, 1))[0]?.coordinate || null;
}

async function reverseGeocode(coordinate: Coordinate): Promise<string | null> {
  try {
    const response = await fetch(`https://photon.komoot.io/reverse?lat=${coordinate.latitude}&lon=${coordinate.longitude}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = await response.json() as { features?: Array<{ properties?: Record<string, unknown> }> };
    const properties = payload.features?.[0]?.properties;
    if (!properties) return null;
    return geocodeLabel(properties);
  } catch {
    return null;
  }
}

async function routeDistance(origin: Coordinate, destination: Coordinate) {
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const response = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinates}?overview=false&alternatives=false&steps=false`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const payload = await response.json() as { code?: string; routes?: Array<{ distance?: number }> };
  const meters = payload.routes?.[0]?.distance;
  if (payload.code !== "Ok" || !Number.isFinite(meters) || !meters) return null;
  return Math.max(0.1, Math.round((meters / 1000) * 10) / 10);
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");

    if (latStr && lonStr) {
      const latitude = Number(latStr);
      const longitude = Number(lonStr);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return Response.json({ error: "invalid-coordinate" }, { status: 400 });
      }
      const label = await reverseGeocode({ latitude, longitude });
      return Response.json({
        coordinate: { latitude, longitude },
        label: label || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" } });
    }

    const address = searchParams.get("address")?.trim() || "";
    const limit = Math.min(5, Math.max(1, Number.parseInt(searchParams.get("limit") || "1", 10) || 1));
    if (!address || address.length > 300) return Response.json({ error: "invalid-address" }, { status: 400 });
    const results = await geocodeMany(address, limit);
    if (!results.length) return Response.json({ error: "address-not-found" }, { status: 404 });
    return Response.json({ coordinate: results[0].coordinate, results }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" } });
  } catch {
    return Response.json({ error: "geocode-service-unavailable" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { origins?: string[]; destination?: string };
    if (!Array.isArray(body.origins) || !body.destination || body.origins.length === 0 || body.origins.length > 20) {
      return Response.json({ error: "invalid-route-request" }, { status: 400 });
    }
    const destination = await geocode(body.destination);
    if (!destination) return Response.json({ distances: body.origins.map(() => null) });
    const origins = await Promise.all(body.origins.map((origin) => geocode(origin)));
    const distances = await Promise.all(origins.map((origin) => origin ? routeDistance(origin, destination) : null));
    return Response.json({ distances }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "route-service-unavailable" }, { status: 502 });
  }
}
