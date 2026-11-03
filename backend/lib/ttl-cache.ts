// Short-lived, per-instance cache for read models that every visitor shares,
// such as the public recommendation list. Serverless instances are reused
// between requests, so a few seconds of reuse removes most repeated queries.
// Concurrent misses for the same key share one load instead of each querying.
export class TtlCache<T> {
  private readonly entries = new Map<string, { value: T; expiresAt: number }>();
  private readonly pending = new Map<string, Promise<T>>();

  constructor(private readonly ttlMs: number, private readonly maxEntries = 50) {}

  async get(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value;
    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;
    const request = load().then((value) => {
      if (this.entries.size >= this.maxEntries) this.entries.clear();
      this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
      return value;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }
}
