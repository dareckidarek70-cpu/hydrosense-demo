const pending = new Map<string, Promise<unknown>>();
const cache = new Map<string, { expires: number; value: unknown }>();
const windows = new Map<string, { expires: number; count: number }>();

export class RequestLimitError extends Error {}

// Per-instance guard. A production-wide quota still belongs at the edge/provider.
export function allowRequest(bucket: string, limit: number, now = Date.now()) {
  const entry = windows.get(bucket);
  if (!entry || now >= entry.expires) {
    windows.set(bucket, { expires: now + 60_000, count: 1 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function readCachedRequest<T>(bucket: string, key: string) {
  const cached = cache.get(bucket + ":" + key);
  if (cached && cached.expires > Date.now()) return cached.value as T;
}

export async function cachedRequest<T>(bucket: string, key: string, limit: number, load: () => Promise<T>) {
  const id = bucket + ":" + key;
  const cached = readCachedRequest<T>(bucket, key);
  if (cached !== undefined) return cached;
  const active = pending.get(id);
  if (active) return active as Promise<T>;
  if (pending.size >= 8 || !allowRequest(bucket, limit)) throw new RequestLimitError();

  const request = load();
  pending.set(id, request);
  try {
    const value = await request;
    if (cache.size >= 24) {
      const first = cache.keys().next().value;
      if (first !== undefined) cache.delete(first);
    }
    cache.set(id, { expires: Date.now() + 10 * 60_000, value });
    return value;
  } finally {
    pending.delete(id);
  }
}

export async function readJson(request: Request, limit: number): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const decoder = new TextDecoder();
  let length = 0;
  let body = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new Error("Request too large");
    }
    body += decoder.decode(value, { stream: true });
  }
  return JSON.parse(body + decoder.decode());
}
