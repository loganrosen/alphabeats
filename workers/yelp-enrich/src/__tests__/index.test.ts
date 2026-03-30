import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheKey, corsHeaders } from "../index.js";

describe("cacheKey", () => {
  it("normalizes to lowercase and strips special chars", () => {
    const key = cacheKey({
      name: "JOE'S PIZZA",
      address: "123 BROADWAY",
      city: "New York",
      zip: "10001",
    });
    expect(key).toBe("yelp:joespizza|123broadway|newyork|10001");
  });

  it("produces same key regardless of case", () => {
    const a = cacheKey({
      name: "Joe's Pizza",
      address: "123 Broadway",
      city: "New York",
      zip: "10001",
    });
    const b = cacheKey({
      name: "JOE'S PIZZA",
      address: "123 BROADWAY",
      city: "NEW YORK",
      zip: "10001",
    });
    expect(a).toBe(b);
  });

  it("handles empty fields", () => {
    const key = cacheKey({ name: "Test", address: "", city: "", zip: "" });
    expect(key).toBe("yelp:test|||");
  });

  it("strips non-alphanumeric characters except pipes", () => {
    const key = cacheKey({
      name: "Café & Bar #1",
      address: "456 5th Ave.",
      city: "New York",
      zip: "10018",
    });
    expect(key).toBe("yelp:cafbar1|4565thave|newyork|10018");
  });
});

describe("corsHeaders", () => {
  const allowed = "https://eatsafe.nyc";

  it("allows exact match", () => {
    const headers = corsHeaders("https://eatsafe.nyc", allowed);
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://eatsafe.nyc");
  });

  it("allows www subdomain", () => {
    const headers = corsHeaders("https://www.eatsafe.nyc", allowed);
    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://www.eatsafe.nyc",
    );
  });

  it("allows subdomains of eatsafe.nyc", () => {
    const headers = corsHeaders("https://staging.eatsafe.nyc", allowed);
    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://staging.eatsafe.nyc",
    );
  });

  it("allows localhost for development", () => {
    const headers = corsHeaders("http://localhost:5173", allowed);
    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "http://localhost:5173",
    );
  });

  it("rejects unknown origins", () => {
    const headers = corsHeaders("https://evil.com", allowed);
    expect(headers["Access-Control-Allow-Origin"]).toBe("");
  });

  it("includes correct methods and headers", () => {
    const headers = corsHeaders("https://eatsafe.nyc", allowed);
    expect(headers["Access-Control-Allow-Methods"]).toBe("POST, OPTIONS");
    expect(headers["Access-Control-Allow-Headers"]).toBe("Content-Type");
  });
});

describe("worker fetch handler", () => {
  let worker: typeof import("../index.js").default;
  let mockKV: Record<string, unknown>;
  let env: {
    YELP_API_KEY: string;
    YELP_CACHE: {
      get: ReturnType<typeof vi.fn>;
      put: ReturnType<typeof vi.fn>;
    };
    ALLOWED_ORIGIN: string;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    mockKV = {};
    env = {
      YELP_API_KEY: "test-key",
      YELP_CACHE: {
        get: vi.fn((key: string) => mockKV[key] ?? null),
        put: vi.fn((key: string, value: string) => {
          mockKV[key] = JSON.parse(value);
        }),
      },
      ALLOWED_ORIGIN: "https://eatsafe.nyc",
    };
    // Re-import to get fresh module
    const mod = await import("../index.js");
    worker = mod.default;
  });

  function makeRequest(
    method: string,
    body?: unknown,
    origin = "https://eatsafe.nyc",
  ) {
    return new Request("https://worker.test/", {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }

  it("returns 204 for OPTIONS preflight", async () => {
    const res = await worker.fetch(makeRequest("OPTIONS"), env as never);
    expect(res.status).toBe(204);
  });

  it("returns 405 for GET requests", async () => {
    const res = await worker.fetch(makeRequest("GET"), env as never);
    expect(res.status).toBe(405);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Method not allowed");
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("https://worker.test/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://eatsafe.nyc",
      },
      body: "not json",
    });
    const res = await worker.fetch(req, env as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await worker.fetch(
      makeRequest("POST", { name: "Test" }),
      env as never,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("name, address, and city are required");
  });

  it("returns cached data with X-Cache: HIT", async () => {
    const cached = { rating: 4.5, reviewCount: 100 };
    env.YELP_CACHE.get = vi.fn(() => cached);

    const res = await worker.fetch(
      makeRequest("POST", {
        name: "Test",
        address: "123 St",
        city: "NY",
        zip: "10001",
      }),
      env as never,
    );

    expect(res.headers.get("X-Cache")).toBe("HIT");
    const body = await res.json();
    expect(body).toEqual(cached);
  });

  it("calls Yelp match then details on cache miss", async () => {
    const matchResponse = {
      businesses: [{ id: "biz-123" }],
    };
    const detailsResponse = {
      rating: 4.0,
      review_count: 50,
      price: "$$",
      url: "https://yelp.com/biz/test",
      image_url: "https://img.yelp.com/test.jpg",
      categories: [{ alias: "pizza", title: "Pizza" }],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(matchResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(detailsResponse),
      });
    vi.stubGlobal("fetch", fetchMock);

    const res = await worker.fetch(
      makeRequest("POST", {
        name: "Test Pizza",
        address: "123 St",
        city: "NY",
        zip: "10001",
      }),
      env as never,
    );

    expect(res.headers.get("X-Cache")).toBe("MISS");
    const body = (await res.json()) as {
      rating: number;
      reviewCount: number;
      price: string;
    };
    expect(body.rating).toBe(4.0);
    expect(body.reviewCount).toBe(50);
    expect(body.price).toBe("$$");

    // Verify Yelp API calls
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain(
      "api.yelp.com/v3/businesses/matches",
    );
    expect(fetchMock.mock.calls[1][0]).toContain(
      "api.yelp.com/v3/businesses/biz-123",
    );

    // Verify cached
    expect(env.YELP_CACHE.put).toHaveBeenCalled();
  });

  it("returns null and caches miss when Yelp match finds nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ businesses: [] }),
      }),
    );

    const res = await worker.fetch(
      makeRequest("POST", {
        name: "Nonexistent",
        address: "000 St",
        city: "NY",
        zip: "10001",
      }),
      env as never,
    );

    const body = await res.json();
    expect(body).toBeNull();
    expect(env.YELP_CACHE.put).toHaveBeenCalledWith(
      expect.any(String),
      "null",
      expect.objectContaining({ expirationTtl: expect.any(Number) }),
    );
  });
});
