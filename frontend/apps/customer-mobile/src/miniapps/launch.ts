/**
 * Tham số mở mini app (`context.launch`) đi qua router của host.
 *
 * React Navigation dành riêng vài khoá params cho điều hướng lồng nhau (`screen`, `params`, …): `router.push`
 * tới `/miniapp/x?screen=messages` làm mất `screen`, nên push chat của Partner rơi về màn đơn hàng. Host đổi tên
 * các khoá đó khi tự điều hướng (`routeForWebHref`, push) và màn chứa đổi lại trước khi đưa cho mini app.
 * Deep link ngoài (`zhaoxi://miniapp/…?screen=…`) đi qua linking của expo-router, giữ nguyên khoá, vẫn đọc được.
 */
const RESERVED = new Set(["screen", "params", "initial", "state", "path", "merge", "pop"]);
const PREFIX = "launch_";

export function encodeLaunchParams(params: URLSearchParams): URLSearchParams {
  const encoded = new URLSearchParams();
  params.forEach((value, key) => encoded.append(RESERVED.has(key) ? `${PREFIX}${key}` : key, value));
  return encoded;
}

export function decodeLaunchKey(key: string): string {
  const name = key.startsWith(PREFIX) ? key.slice(PREFIX.length) : "";
  return RESERVED.has(name) ? name : key;
}
