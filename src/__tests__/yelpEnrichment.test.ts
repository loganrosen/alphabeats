import { beforeEach, describe, expect, it, vi } from "vitest";
import type { YelpEnrichment } from "../hooks/yelpEnrichment.js";
import { fetchYelpEnrichment } from "../hooks/yelpEnrichment.js";

const SAMPLE: YelpEnrichment = {
  rating: 4.5,
  reviewCount: 120,
  price: "$$",
  url: "https://www.yelp.com/biz/joes-pizza",
  imageUrl: "https://s3-media.fl.yelpcdn.com/photo.jpg",
  categories: ["Pizza", "Italian"],
};

function mockFetch(data: unknown = SAMPLE, ok = true) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("fetchYelpEnrichment", () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    });
    vi.restoreAllMocks();
  });

  it("fetches from worker and returns enrichment data", async () => {
    const fn = mockFetch(SAMPLE);
    const result = await fetchYelpEnrichment(
      "Joe's Pizza",
      "123 Broadway",
      "New York",
      "10001",
    );

    expect(result).toEqual(SAMPLE);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        name: "Joe's Pizza",
        address: "123 Broadway",
        city: "New York",
        zip: "10001",
      }),
    });
  });

  it("caches results in sessionStorage", async () => {
    mockFetch(SAMPLE);

    await fetchYelpEnrichment(
      "Joe's Pizza",
      "123 Broadway",
      "New York",
      "10001",
    );

    // Second call should hit cache, not fetch
    const fn2 = mockFetch();
    const result = await fetchYelpEnrichment(
      "Joe's Pizza",
      "123 Broadway",
      "New York",
      "10001",
    );

    expect(result).toEqual(SAMPLE);
    expect(fn2).not.toHaveBeenCalled();
  });

  it("caches null results (Yelp miss)", async () => {
    mockFetch(null);

    await fetchYelpEnrichment(
      "Unknown Place",
      "999 Nowhere",
      "New York",
      "10001",
    );

    const fn2 = mockFetch();
    const result = await fetchYelpEnrichment(
      "Unknown Place",
      "999 Nowhere",
      "New York",
      "10001",
    );

    expect(result).toBeNull();
    expect(fn2).not.toHaveBeenCalled();
  });

  it("returns null on fetch failure", async () => {
    mockFetch(null, false);
    const result = await fetchYelpEnrichment(
      "Joe's Pizza",
      "123 Broadway",
      "New York",
      "10001",
    );
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );
    const result = await fetchYelpEnrichment(
      "Joe's Pizza",
      "456 Main St",
      "New York",
      "10002",
    );
    expect(result).toBeNull();
  });

  it("deduplicates concurrent requests for the same key", async () => {
    let resolvePromise: (v: Response) => void;
    const pending = new Promise<Response>((r) => {
      resolvePromise = r;
    });
    const fn = vi.fn().mockReturnValue(pending);
    vi.stubGlobal("fetch", fn);

    const p1 = fetchYelpEnrichment(
      "Dedup Test",
      "100 Ave",
      "New York",
      "10003",
    );
    const p2 = fetchYelpEnrichment(
      "Dedup Test",
      "100 Ave",
      "New York",
      "10003",
    );

    // Only one fetch should be in flight
    expect(fn).toHaveBeenCalledOnce();

    resolvePromise!({
      ok: true,
      json: () => Promise.resolve(SAMPLE),
    } as Response);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(SAMPLE);
    expect(r2).toEqual(SAMPLE);
  });

  it("normalizes cache keys (case-insensitive, strips special chars)", async () => {
    mockFetch(SAMPLE);
    await fetchYelpEnrichment(
      "JOE'S PIZZA",
      "123 BROADWAY",
      "New York",
      "10001",
    );

    const fn2 = mockFetch();
    const result = await fetchYelpEnrichment(
      "joe's pizza",
      "123 broadway",
      "New York",
      "10001",
    );

    expect(result).toEqual(SAMPLE);
    expect(fn2).not.toHaveBeenCalled();
  });
});
