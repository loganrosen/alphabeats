import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchParams } from "../api.js";
import { fetchByCamis, searchNearby, searchRestaurants } from "../api.js";

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

beforeEach(() => vi.restoreAllMocks());

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
    expect(result).toEqual(fakeRows);
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

describe("searchNearby", () => {
  it("builds a bounding-box WHERE clause with lat/lng", async () => {
    const mock = mockFetch([]);
    await searchNearby(40.75, -73.99);
    const where = capturedWhere(mock);
    expect(where).toContain("latitude >=");
    expect(where).toContain("latitude <=");
    expect(where).toContain("longitude >=");
    expect(where).toContain("longitude <=");
  });

  it("returns restaurants sorted by distance", async () => {
    const rows = [
      {
        camis: "1",
        dba: "FAR PLACE",
        boro: "Manhattan",
        building: "1",
        street: "FAR ST",
        zipcode: "10001",
        cuisine_description: "American",
        latitude: "40.77",
        longitude: "-73.97",
        inspection_date: "2024-06-01T00:00:00.000",
        inspection_type: "Cycle Inspection / Initial Inspection",
        score: "10",
        grade: "A",
      },
      {
        camis: "2",
        dba: "CLOSE PLACE",
        boro: "Manhattan",
        building: "2",
        street: "CLOSE ST",
        zipcode: "10001",
        cuisine_description: "American",
        latitude: "40.751",
        longitude: "-73.991",
        inspection_date: "2024-06-01T00:00:00.000",
        inspection_type: "Cycle Inspection / Initial Inspection",
        score: "8",
        grade: "A",
      },
    ];
    mockFetch(rows);
    const results = await searchNearby(40.75, -73.99);
    expect(results[0].dba).toBe("CLOSE PLACE");
    expect(results[1].dba).toBe("FAR PLACE");
    expect(results[0].distance).toBeLessThan(results[1].distance!);
  });

  it("filters out restaurants without coordinates", async () => {
    const rows = [
      {
        camis: "1",
        dba: "NO COORDS",
        boro: "Manhattan",
        building: "1",
        street: "ST",
        zipcode: "10001",
        cuisine_description: "American",
        inspection_date: "2024-06-01T00:00:00.000",
        inspection_type: "Cycle Inspection / Initial Inspection",
        score: "10",
        grade: "A",
      },
    ];
    mockFetch(rows);
    const results = await searchNearby(40.75, -73.99);
    expect(results).toHaveLength(0);
  });

  it("throws on non-OK HTTP response", async () => {
    mockFetch([], false);
    await expect(searchNearby(40.75, -73.99)).rejects.toThrow("HTTP 500");
  });
});
