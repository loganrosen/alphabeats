import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchParams } from "../api.js";
import {
  fetchByCamis,
  fetchCommunityBoards,
  fetchCuisines,
  searchRestaurants,
} from "../api.js";

const EMPTY: SearchParams = {
  name: "",
  boro: [],
  address: "",
  zip: "",
  cuisine: "",
  grade: [],
  cb: "",
};

function mockFetch(data: unknown = [], ok = true) {
  const mock = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

function capturedWhere(mock: ReturnType<typeof vi.fn>): string {
  const url = new URL(mock.mock.calls[0][0] as string);
  return url.searchParams.get("$where") ?? "";
}

beforeEach(() => {
  vi.restoreAllMocks();
  // Mock sessionStorage for caching tests (fetchCommunityBoards, fetchCuisines)
  const store: Record<string, string> = {};
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
});

describe("searchRestaurants — WHERE clause construction", () => {
  it("sends empty $where when no params are set", async () => {
    const mock = mockFetch([]);
    await searchRestaurants(EMPTY);
    expect(capturedWhere(mock)).toBe("");
  });

  it("matches name tokens at word boundaries", async () => {
    const mock = mockFetch([]);
    await searchRestaurants({ ...EMPTY, name: "shake shack" });
    const where = capturedWhere(mock);
    expect(where).toContain("upper(dba) like 'SHAKE%'");
    expect(where).toContain("upper(dba) like '% SHAKE%'");
    expect(where).toContain("upper(dba) like 'SHACK%'");
    expect(where).toContain("upper(dba) like '% SHACK%'");
  });

  it("escapes single quotes in name", async () => {
    const mock = mockFetch([]);
    await searchRestaurants({ ...EMPTY, name: "mcdonald's" });
    const where = capturedWhere(mock);
    expect(where).toContain("MCDONALD''S");
  });

  it("filters by single borough", async () => {
    const mock = mockFetch([]);
    await searchRestaurants({ ...EMPTY, boro: ["Manhattan"] });
    expect(capturedWhere(mock)).toContain("boro='Manhattan'");
  });

  it("filters by multiple boroughs with OR", async () => {
    const mock = mockFetch([]);
    await searchRestaurants({ ...EMPTY, boro: ["Manhattan", "Brooklyn"] });
    const where = capturedWhere(mock);
    expect(where).toContain("boro='Manhattan'");
    expect(where).toContain("boro='Brooklyn'");
    expect(where).toContain(" OR ");
  });

  it("filters by zip code", async () => {
    const mock = mockFetch([]);
    await searchRestaurants({ ...EMPTY, zip: "10001" });
    expect(capturedWhere(mock)).toContain("zipcode='10001'");
  });

  it("filters by cuisine", async () => {
    const mock = mockFetch([]);
    await searchRestaurants({ ...EMPTY, cuisine: "Japanese" });
    expect(capturedWhere(mock)).toContain(
      "upper(cuisine_description) like '%JAPANESE%'",
    );
  });

  it("filters by multiple cuisines with OR", async () => {
    const mock = mockFetch([]);
    await searchRestaurants({ ...EMPTY, cuisine: "Japanese,Korean" });
    const where = capturedWhere(mock);
    expect(where).toContain("%JAPANESE%");
    expect(where).toContain("%KOREAN%");
    expect(where).toContain(" OR ");
  });

  it("filters by community board", async () => {
    const mock = mockFetch([]);
    await searchRestaurants({ ...EMPTY, cb: "101" });
    expect(capturedWhere(mock)).toContain("community_board='101'");
  });

  it("expands address tokens and matches each independently", async () => {
    const mock = mockFetch([]);
    await searchRestaurants({ ...EMPTY, address: "338 E 92nd St" });
    const where = capturedWhere(mock);
    // Ordinal stripped, abbreviations expanded
    expect(where).toContain("338");
    expect(where).toContain("EAST");
    expect(where).toContain("92");
    expect(where).toContain("STREET");
  });

  // This is the key regression test for the grade filter bug fix:
  // grade was previously sent to the server, causing incomplete violation history.
  it("does NOT include grade in the server-side WHERE clause", async () => {
    const mock = mockFetch([]);
    await searchRestaurants({ ...EMPTY, grade: ["A"] });
    expect(capturedWhere(mock)).not.toContain("grade");
  });

  it("does NOT include grade in WHERE even for multiple grades", async () => {
    const mock = mockFetch([]);
    await searchRestaurants({ ...EMPTY, grade: ["A", "B"] });
    expect(capturedWhere(mock)).not.toContain("grade");
  });

  it("returns the parsed JSON rows", async () => {
    const fakeRows = [{ camis: "123", dba: "TEST" }];
    mockFetch(fakeRows);
    const result = await searchRestaurants(EMPTY);
    expect(result.rows).toEqual(fakeRows);
  });

  it("throws on non-OK HTTP response", async () => {
    mockFetch([], false);
    await expect(searchRestaurants(EMPTY)).rejects.toThrow("HTTP 500");
  });
});

describe("fetchByCamis", () => {
  it("queries by camis and returns grouped restaurant", async () => {
    const rows = [
      {
        camis: "50000001",
        dba: "TEST PLACE",
        boro: "Manhattan",
        building: "1",
        street: "MAIN ST",
        zipcode: "10001",
        cuisine_description: "American",
        inspection_date: "2024-06-01T00:00:00.000",
        inspection_type: "Cycle Inspection / Initial Inspection",
        score: "10",
        grade: "A",
      },
    ];
    const mock = mockFetch(rows);
    const result = await fetchByCamis("50000001");
    const where = capturedWhere(mock);
    expect(where).toContain("camis='50000001'");
    expect(result?.camis).toBe("50000001");
    expect(result?.dba).toBe("TEST PLACE");
  });

  it("escapes single quotes in camis", async () => {
    const mock = mockFetch([]);
    await fetchByCamis("it's weird");
    expect(capturedWhere(mock)).toContain("it''s weird");
  });

  it("returns null when no rows are returned", async () => {
    mockFetch([]);
    const result = await fetchByCamis("99999999");
    expect(result).toBeNull();
  });

  it("throws on non-OK HTTP response", async () => {
    mockFetch([], false);
    await expect(fetchByCamis("123")).rejects.toThrow("HTTP 500");
  });
});

describe("searchRestaurants — geo / nearby", () => {
  it("builds a bounding-box WHERE clause when geo is provided", async () => {
    const mock = mockFetch([]);
    await searchRestaurants(EMPTY, { lat: 40.75, lng: -73.99, radius: 0.5 });
    const where = capturedWhere(mock);
    expect(where).toContain("latitude >=");
    expect(where).toContain("latitude <=");
    expect(where).toContain("longitude >=");
    expect(where).toContain("longitude <=");
  });

  it("returns geo in the result when geo is provided", async () => {
    mockFetch([]);
    const geo = { lat: 40.75, lng: -73.99, radius: 0.5 };
    const result = await searchRestaurants(EMPTY, geo);
    expect(result.geo).toEqual(geo);
  });

  it("returns geo as undefined when no geo is provided", async () => {
    mockFetch([]);
    const result = await searchRestaurants(EMPTY);
    expect(result.geo).toBeUndefined();
  });

  it("combines geo bounding box with other filters", async () => {
    const mock = mockFetch([]);
    await searchRestaurants(
      { ...EMPTY, cuisine: "Japanese" },
      { lat: 40.75, lng: -73.99, radius: 0.5 },
    );
    const where = capturedWhere(mock);
    expect(where).toContain("cuisine_description");
    expect(where).toContain("latitude >=");
  });

  it("throws on non-OK HTTP response", async () => {
    mockFetch([], false);
    await expect(
      searchRestaurants(EMPTY, { lat: 40.75, lng: -73.99, radius: 0.5 }),
    ).rejects.toThrow("HTTP 500");
  });
});

describe("fetchCommunityBoards", () => {
  it("fetches and returns parsed community boards", async () => {
    const rows = [
      {
        community_board_1: "101",
        neighborhoods: "Tribeca, Financial District",
        borough: "Manhattan",
      },
      {
        community_board_1: "301",
        neighborhoods: "Greenpoint, Williamsburg",
        borough: "Brooklyn",
      },
    ];
    mockFetch(rows);
    const result = await fetchCommunityBoards();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      code: "101",
      label: "Tribeca, Financial District",
      borough: "Manhattan",
    });
    expect(result[1]).toEqual({
      code: "301",
      label: "Greenpoint, Williamsburg",
      borough: "Brooklyn",
    });
  });

  it("filters out rows with missing community_board_1 or neighborhoods", async () => {
    const rows = [
      {
        community_board_1: "101",
        neighborhoods: "Tribeca",
        borough: "Manhattan",
      },
      {
        community_board_1: undefined,
        neighborhoods: "Missing CB",
        borough: "Manhattan",
      },
      {
        community_board_1: "102",
        neighborhoods: undefined,
        borough: "Manhattan",
      },
    ];
    mockFetch(rows);
    const result = await fetchCommunityBoards();
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("101");
  });

  it("returns empty array on non-OK response", async () => {
    mockFetch([], false);
    const result = await fetchCommunityBoards();
    expect(result).toEqual([]);
  });

  it("handles rows with missing borough gracefully", async () => {
    const rows = [
      {
        community_board_1: "101",
        neighborhoods: "Test Area",
        borough: undefined,
      },
    ];
    mockFetch(rows);
    const result = await fetchCommunityBoards();
    expect(result[0].borough).toBe("");
  });

  it("returns cached data from sessionStorage on second call", async () => {
    const rows = [
      {
        community_board_1: "101",
        neighborhoods: "Tribeca",
        borough: "Manhattan",
      },
    ];
    const mock = mockFetch(rows);
    const first = await fetchCommunityBoards();
    expect(mock).toHaveBeenCalledTimes(1);

    // Second call should use sessionStorage cache
    const second = await fetchCommunityBoards();
    expect(mock).toHaveBeenCalledTimes(1); // No additional fetch
    expect(second).toEqual(first);
  });
});

describe("fetchCuisines", () => {
  it("fetches and returns cuisine names", async () => {
    const rows = [
      { cuisine_description: "American" },
      { cuisine_description: "Japanese" },
      { cuisine_description: "Mexican" },
    ];
    mockFetch(rows);
    const result = await fetchCuisines();
    expect(result).toEqual(["American", "Japanese", "Mexican"]);
  });

  it("filters out empty/undefined cuisine descriptions", async () => {
    const rows = [
      { cuisine_description: "American" },
      { cuisine_description: undefined },
      { cuisine_description: "" },
      { cuisine_description: "Thai" },
    ];
    mockFetch(rows);
    const result = await fetchCuisines();
    expect(result).toEqual(["American", "Thai"]);
  });

  it("returns empty array on non-OK response", async () => {
    mockFetch([], false);
    const result = await fetchCuisines();
    expect(result).toEqual([]);
  });

  it("returns cached data from sessionStorage on second call", async () => {
    const rows = [{ cuisine_description: "Italian" }];
    const mock = mockFetch(rows);
    const first = await fetchCuisines();
    expect(mock).toHaveBeenCalledTimes(1);

    const second = await fetchCuisines();
    expect(mock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });
});
