export interface YelpEnrichment {
  rating: number;
  reviewCount: number;
  price: string | null;
  url: string;
  imageUrl: string | null;
  categories: string[];
}

export interface UseYelpEnrichmentResult {
  data: YelpEnrichment | null;
  loading: boolean;
}

const WORKER_URL =
  import.meta.env.VITE_YELP_WORKER_URL ??
  "https://yelp-enrich.eatsafe.workers.dev";

const inFlightRequests = new Map<string, Promise<YelpEnrichment | null>>();

function storageKey(name: string, address: string): string {
  return `yelp:${name}|${address}`.toLowerCase().replace(/[^a-z0-9:|]/g, "");
}

function getFromSession(key: string): YelpEnrichment | null | undefined {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return undefined; // not cached
    if (raw === "null") return null; // cached miss
    return JSON.parse(raw) as YelpEnrichment;
  } catch {
    return undefined;
  }
}

function saveToSession(key: string, data: YelpEnrichment | null): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

export async function fetchYelpEnrichment(
  name: string,
  address: string,
  city: string,
  zip: string,
): Promise<YelpEnrichment | null> {
  const key = storageKey(name, address);

  // Check sessionStorage first
  const cached = getFromSession(key);
  if (cached !== undefined) return cached;

  // Deduplicate in-flight requests
  const existing = inFlightRequests.get(key);
  if (existing) return existing;

  const request = (async () => {
    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, city, zip }),
      });
      if (!res.ok) return null; // don't cache transport errors
      const data = (await res.json()) as YelpEnrichment | null;
      saveToSession(key, data); // cache both hits and Yelp-level misses
      return data;
    } catch {
      return null; // don't cache network errors
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, request);
  return request;
}
