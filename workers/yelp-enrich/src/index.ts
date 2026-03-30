interface Env {
  YELP_API_KEY: string;
  YELP_CACHE: KVNamespace;
  ALLOWED_ORIGIN: string;
}

interface EnrichRequest {
  name: string;
  address: string;
  city: string;
  zip: string;
}

interface YelpBusiness {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  price?: string;
  url: string;
  image_url?: string;
  categories?: Array<{ alias: string; title: string }>;
}

interface EnrichResponse {
  rating: number;
  reviewCount: number;
  price: string | null;
  url: string;
  imageUrl: string | null;
  categories: string[];
}

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function corsHeaders(origin: string, allowed: string): HeadersInit {
  const isAllowed =
    origin === allowed ||
    origin === allowed.replace("https://", "https://www.") ||
    origin.endsWith(".eatsafe.nyc") ||
    origin.includes("localhost");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export function cacheKey(req: EnrichRequest): string {
  const normalized = `${req.name}|${req.address}|${req.city}|${req.zip}`
    .toLowerCase()
    .replace(/[^a-z0-9|]/g, "");
  return `yelp:${normalized}`;
}

async function yelpMatch(
  req: EnrichRequest,
  apiKey: string,
): Promise<string | null> {
  // Try exact Business Match first
  const matchParams = new URLSearchParams({
    name: req.name,
    address1: req.address,
    city: req.city,
    state: "NY",
    country: "US",
  });
  if (req.zip) matchParams.set("postal_code", req.zip);

  const matchRes = await fetch(
    `https://api.yelp.com/v3/businesses/matches?${matchParams}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  if (matchRes.ok) {
    const matchData = (await matchRes.json()) as {
      businesses: YelpBusiness[];
    };
    if (matchData.businesses?.[0]?.id) return matchData.businesses[0].id;
  }

  // Fall back to fuzzy Business Search
  const location = [req.address, req.city, "NY", req.zip]
    .filter(Boolean)
    .join(" ");
  const searchParams = new URLSearchParams({
    term: req.name,
    location,
    limit: "1",
  });

  const searchRes = await fetch(
    `https://api.yelp.com/v3/businesses/search?${searchParams}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  if (!searchRes.ok) return null;

  const searchData = (await searchRes.json()) as {
    businesses: YelpBusiness[];
  };
  return searchData.businesses?.[0]?.id ?? null;
}

async function yelpDetails(
  bizId: string,
  apiKey: string,
): Promise<EnrichResponse | null> {
  const res = await fetch(`https://api.yelp.com/v3/businesses/${bizId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) return null;

  const biz = (await res.json()) as YelpBusiness;
  return {
    rating: biz.rating,
    reviewCount: biz.review_count,
    price: biz.price ?? null,
    url: biz.url,
    imageUrl: biz.image_url ?? null,
    categories: biz.categories?.map((c) => c.title) ?? [],
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers: cors },
      );
    }

    let body: EnrichRequest;
    try {
      body = (await request.json()) as EnrichRequest;
    } catch {
      return Response.json(
        { error: "Invalid JSON" },
        { status: 400, headers: cors },
      );
    }

    if (!body.name || !body.address || !body.city) {
      return Response.json(
        { error: "name, address, and city are required" },
        { status: 400, headers: cors },
      );
    }

    const key = cacheKey(body);

    // Check cache
    const cached = await env.YELP_CACHE.get(key, "json");
    if (cached) {
      return Response.json(cached, {
        headers: { ...cors, "X-Cache": "HIT" },
      });
    }

    // Yelp Business Match → Details
    const bizId = await yelpMatch(body, env.YELP_API_KEY);
    if (!bizId) {
      // Cache the miss too, so we don't keep hitting Yelp for unknown businesses
      await env.YELP_CACHE.put(key, "null", {
        expirationTtl: CACHE_TTL_SECONDS,
      });
      return Response.json(null, {
        headers: { ...cors, "X-Cache": "MISS" },
      });
    }

    const details = await yelpDetails(bizId, env.YELP_API_KEY);
    if (!details) {
      return Response.json(null, {
        headers: { ...cors, "X-Cache": "MISS" },
      });
    }

    // Cache the result
    await env.YELP_CACHE.put(key, JSON.stringify(details), {
      expirationTtl: CACHE_TTL_SECONDS,
    });

    return Response.json(details, {
      headers: { ...cors, "X-Cache": "MISS" },
    });
  },
};
