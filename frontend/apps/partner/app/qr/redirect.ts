const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
};

export function redirectToLatestApp(request: Request, pathname: string) {
  const destination = new URL(request.url);
  destination.pathname = pathname;
  destination.search = "";
  destination.searchParams.set("qr", "1");
  destination.searchParams.set("refresh", Date.now().toString(36));

  return new Response(null, {
    status: 302,
    headers: {
      ...NO_CACHE_HEADERS,
      Location: destination.toString(),
    },
  });
}
