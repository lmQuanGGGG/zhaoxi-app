// The housing, travel and payment alerts consume the same notification feed.
// Share concurrent reads only; do not cache authentication or notification data.
const pending = new Map<string, Promise<Response>>();

export async function sharedNotificationFetch(url: string, init?: RequestInit): Promise<Response> {
  let request = pending.get(url);
  if (!request) {
    request = fetch(url, { ...init, signal: AbortSignal.timeout(12_000) });
    pending.set(url, request);
    const clear = () => { if (pending.get(url) === request) pending.delete(url); };
    void request.then(clear, clear);
  }
  // Each consumer must be able to read its own body.
  return (await request).clone();
}
