import { LRUCache } from "lru-cache";

const MAX_SIZE = Number(process.env.CACHE_MAX_SIZE) || 50 * 1024 * 1024; // 50 MB default
export const TTL = Number(process.env.CACHE_TTL) || 1000 * 60 * 60 * 24; // 1 day default

export const cache = new LRUCache<string, {size: number, resp: Response}>({
  maxSize: MAX_SIZE,
  sizeCalculation: (res) => {
    console.log(`Caching response of size ${res.size} bytes`);
    return res.size;
  },
  ttl: TTL,
});

export async function cachedFetch(input: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const key = JSON.stringify({ input, ...options });

  const cached = cache.get(key);
  if (cached) {
    // Return a fresh clone, so caller can consume it
    return cached.resp.clone();
  }

  const res = await fetch(input, options);
  const buf = Buffer.from(await res.arrayBuffer());
  const clone = new Response(buf, {
    status: res.status,
    headers: res.headers,
  });

  cache.set(key, {size: buf.length, resp: clone});

  return new Response(buf, {
    status: res.status,
    headers: res.headers,
  });
}
