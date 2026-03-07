import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateStoreId,
  parseStoreId,
  getEstablishmentTypeLabel,
  groupGroceryRows,
  searchGroceries,
  fetchGroceryById,
  COUNTY_TO_BOROUGH,
  BOROUGH_TO_COUNTY,
  NYC_COUNTIES,
  ESTABLISHMENT_TYPES,
  type GroceryApiRow,
  type GrocerySearchParams,
} from "../groceryApi.js";

const EMPTY: GrocerySearchParams = {
  name: "",
  boro: [],
  address: "",
  zip: "",
  grade: [],
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

function makeRow(overrides: Partial<GroceryApiRow> = {}): GroceryApiRow {
  return {
    county: "Kings",
    inspection_date: "2024-06-15T00:00:00.000",
    inspection_grade: "A",
    establishment_type: "A",
    owner_name: "Test Owner",
    trade_name: "Test Store",
    street: "123 MAIN ST",
    city: "BROOKLYN",
    statecode: "NY",
    zipcode: "11201",
    deficiency_number: "",
    deficiency_description: "",
    georeference: { type: "Point", coordinates: [-73.9, 40.7] },
    ...overrides,
  };
}

describe("generateStoreId / parseStoreId", () => {
  it("roundtrips: generate then parse returns original values", () => {
    const tradeName = "Fresh Market";
    const street = "456 ELM AVE";
    const zipcode = "10001";

    const id = generateStoreId(tradeName, street, zipcode);
    const parsed = parseStoreId(id);

    expect(parsed.tradeName).toBe(tradeName);
    expect(parsed.street).toBe(street);
    expect(parsed.zipcode).toBe(zipcode);
  });

  it("handles special characters in trade name", () => {
    const tradeName = "Tony's Deli & More";
    const street = "789 OAK BLVD";
    const zipcode = "11215";

    const id = generateStoreId(tradeName, street, zipcode);
    const parsed = parseStoreId(id);

    expect(parsed.tradeName).toBe(tradeName);
    expect(parsed.street).toBe(street);
    expect(parsed.zipcode).toBe(zipcode);
  });

  it("produces URL-safe output (no +, /, = characters)", () => {
    const id = generateStoreId("Some Store!", "100 1ST AVE", "10003");
    expect(id).not.toMatch(/[+/=]/);
  });

  it("is consistent: same input always produces same output", () => {
    const a = generateStoreId("ABC Grocery", "10 BROADWAY", "10002");
    const b = generateStoreId("ABC Grocery", "10 BROADWAY", "10002");
    expect(a).toBe(b);
  });

  it("handles unicode characters", () => {
    const tradeName = "Café México";
    const street = "5 AVE";
    const zipcode = "10010";

    const id = generateStoreId(tradeName, street, zipcode);
    const parsed = parseStoreId(id);
    expect(parsed.tradeName).toBe(tradeName);
  });
});

describe("getEstablishmentTypeLabel", () => {
  it('returns "Store" for code "A"', () => {
    expect(getEstablishmentTypeLabel("A")).toBe("Store");
  });

  it("joins multiple codes with · separator", () => {
    expect(getEstablishmentTypeLabel("AC")).toBe("Store · Food Mfr");
  });

  it('returns "Store · Bakery" for "AB"', () => {
    expect(getEstablishmentTypeLabel("AB")).toBe("Store · Bakery");
  });

  it("returns the raw code string for a completely unknown code", () => {
    expect(getEstablishmentTypeLabel("Z")).toBe("Z");
  });

  it("includes only known labels and drops unknown codes", () => {
    // "Z" is unknown and gets filtered by .filter(Boolean), so only "Store" remains
    expect(getEstablishmentTypeLabel("AZ")).toBe("Store");
  });

  it("returns the raw string when all codes are unknown", () => {
    expect(getEstablishmentTypeLabel("XYZ")).toBe("XYZ");
  });
});

describe("groupGroceryRows", () => {
  it("groups rows with the same trade_name+street+zipcode into one Grocery", () => {
    const rows = [
      makeRow({ inspection_date: "2024-06-01T00:00:00.000" }),
      makeRow({ inspection_date: "2024-05-01T00:00:00.000" }),
    ];
    const result = groupGroceryRows(rows);
    expect(result).toHaveLength(1);
    expect(result[0].tradeName).toBe("Test Store");
  });

  it("creates separate Grocery entries for different stores", () => {
    const rows = [
      makeRow({ trade_name: "Store A" }),
      makeRow({ trade_name: "Store B" }),
    ];
    const result = groupGroceryRows(rows);
    expect(result).toHaveLength(2);
  });

  it("groups inspections on different dates as separate entries", () => {
    const rows = [
      makeRow({ inspection_date: "2024-06-01T00:00:00.000" }),
      makeRow({ inspection_date: "2024-05-01T00:00:00.000" }),
    ];
    const result = groupGroceryRows(rows);
    const dates = Object.keys(result[0].inspections);
    expect(dates).toHaveLength(2);
    expect(dates).toContain("2024-06-01T00:00:00.000");
    expect(dates).toContain("2024-05-01T00:00:00.000");
  });

  it("groups multiple deficiencies on the same inspection date", () => {
    const rows = [
      makeRow({
        inspection_date: "2024-06-01T00:00:00.000",
        deficiency_number: "1",
        deficiency_description: "Issue one",
      }),
      makeRow({
        inspection_date: "2024-06-01T00:00:00.000",
        deficiency_number: "2",
        deficiency_description: "Issue two",
      }),
    ];
    const result = groupGroceryRows(rows);
    const inspection =
      result[0].inspections["2024-06-01T00:00:00.000"];
    expect(inspection.deficiencies).toHaveLength(2);
    expect(inspection.deficiencies[0].number).toBe("1");
    expect(inspection.deficiencies[1].number).toBe("2");
  });

  it("has empty deficiencies when no deficiency_number is present", () => {
    const rows = [
      makeRow({
        deficiency_number: "",
        deficiency_description: "",
      }),
    ];
    const result = groupGroceryRows(rows);
    const inspection =
      result[0].inspections["2024-06-15T00:00:00.000"];
    expect(inspection.deficiencies).toHaveLength(0);
  });

  it("picks the most recent inspection as latest", () => {
    const rows = [
      makeRow({
        inspection_date: "2024-01-01T00:00:00.000",
        inspection_grade: "B",
      }),
      makeRow({
        inspection_date: "2024-06-01T00:00:00.000",
        inspection_grade: "A",
      }),
      makeRow({
        inspection_date: "2024-03-01T00:00:00.000",
        inspection_grade: "C",
      }),
    ];
    const result = groupGroceryRows(rows);
    expect(result[0].latest?.date).toBe("2024-06-01T00:00:00.000");
    expect(result[0].latest?.grade).toBe("A");
  });

  it("picks the most recent graded inspection as latestGraded", () => {
    const rows = [
      makeRow({
        inspection_date: "2024-06-01T00:00:00.000",
        inspection_grade: undefined,
      }),
      makeRow({
        inspection_date: "2024-05-01T00:00:00.000",
        inspection_grade: "B",
      }),
      makeRow({
        inspection_date: "2024-04-01T00:00:00.000",
        inspection_grade: "A",
      }),
    ];
    const result = groupGroceryRows(rows);
    expect(result[0].latestGraded?.date).toBe("2024-05-01T00:00:00.000");
    expect(result[0].latestGraded?.grade).toBe("B");
  });

  it("parses georeference correctly (coordinates are [lng, lat])", () => {
    const rows = [
      makeRow({
        georeference: { type: "Point", coordinates: [-73.9, 40.7] },
      }),
    ];
    const result = groupGroceryRows(rows);
    expect(result[0].lat).toBe(40.7);
    expect(result[0].lng).toBe(-73.9);
  });

  it("handles rows with missing georeference", () => {
    const rows = [makeRow({ georeference: undefined })];
    const result = groupGroceryRows(rows);
    expect(result[0].lat).toBeNull();
    expect(result[0].lng).toBeNull();
  });

  it("maps county to borough correctly", () => {
    const cases: [string, string][] = [
      ["Kings", "Brooklyn"],
      ["New York", "Manhattan"],
      ["Queens", "Queens"],
      ["Bronx", "Bronx"],
      ["Richmond", "Staten Island"],
    ];
    for (const [county, expectedBoro] of cases) {
      const rows = [makeRow({ county })];
      const result = groupGroceryRows(rows);
      expect(result[0].boro).toBe(expectedBoro);
    }
  });

  it("uses county as boro fallback for unknown counties", () => {
    const rows = [makeRow({ county: "Suffolk" })];
    const result = groupGroceryRows(rows);
    expect(result[0].boro).toBe("Suffolk");
  });

  it("sorts by grade (A first, then B, C, unknown) then alphabetically", () => {
    const rows = [
      makeRow({
        trade_name: "Zeta Store",
        street: "1 Z ST",
        inspection_grade: "A",
      }),
      makeRow({
        trade_name: "Alpha Market",
        street: "1 A ST",
        inspection_grade: "C",
      }),
      makeRow({
        trade_name: "Beta Deli",
        street: "1 B ST",
        inspection_grade: "B",
      }),
      makeRow({
        trade_name: "Gamma Foods",
        street: "1 G ST",
        inspection_grade: undefined,
      }),
      makeRow({
        trade_name: "Aardvark Grocery",
        street: "1 AA ST",
        inspection_grade: "A",
      }),
    ];
    const result = groupGroceryRows(rows);
    expect(result.map((r) => r.tradeName)).toEqual([
      "Aardvark Grocery",
      "Zeta Store",
      "Beta Deli",
      "Alpha Market",
      "Gamma Foods",
    ]);
  });

  it("skips rows with no inspection_date (no inspections entry created)", () => {
    const rows = [makeRow({ inspection_date: undefined })];
    const result = groupGroceryRows(rows);
    expect(result).toHaveLength(1);
    expect(Object.keys(result[0].inspections)).toHaveLength(0);
    expect(result[0].latest).toBeUndefined();
  });

  it("sets the correct establishmentTypeLabel", () => {
    const rows = [makeRow({ establishment_type: "AB" })];
    const result = groupGroceryRows(rows);
    expect(result[0].establishmentType).toBe("AB");
    expect(result[0].establishmentTypeLabel).toBe("Store · Bakery");
  });
});

describe("Constants", () => {
  it("COUNTY_TO_BOROUGH maps all 5 NYC counties", () => {
    expect(COUNTY_TO_BOROUGH).toEqual({
      "New York": "Manhattan",
      Kings: "Brooklyn",
      Queens: "Queens",
      Bronx: "Bronx",
      Richmond: "Staten Island",
    });
  });

  it("BOROUGH_TO_COUNTY is the reverse mapping", () => {
    expect(BOROUGH_TO_COUNTY).toEqual({
      Manhattan: "New York",
      Brooklyn: "Kings",
      Queens: "Queens",
      Bronx: "Bronx",
      "Staten Island": "Richmond",
    });
  });

  it("each borough maps back to its county and vice versa", () => {
    for (const [county, boro] of Object.entries(COUNTY_TO_BOROUGH)) {
      expect(BOROUGH_TO_COUNTY[boro]).toBe(county);
    }
  });

  it("NYC_COUNTIES contains all 5 counties", () => {
    expect(NYC_COUNTIES).toHaveLength(5);
    expect(NYC_COUNTIES).toContain("New York");
    expect(NYC_COUNTIES).toContain("Kings");
    expect(NYC_COUNTIES).toContain("Queens");
    expect(NYC_COUNTIES).toContain("Bronx");
    expect(NYC_COUNTIES).toContain("Richmond");
  });

  it("ESTABLISHMENT_TYPES includes expected entries", () => {
    expect(ESTABLISHMENT_TYPES["A"]).toBe("Store");
    expect(ESTABLISHMENT_TYPES["B"]).toBe("Bakery");
    expect(ESTABLISHMENT_TYPES["C"]).toBe("Food Mfr");
    expect(ESTABLISHMENT_TYPES["D"]).toBe("Warehouse");
    expect(Object.keys(ESTABLISHMENT_TYPES).length).toBeGreaterThanOrEqual(19);
  });
});

describe("searchGroceries — WHERE clause construction", () => {
  it("always includes NYC county filter and establishment type A", async () => {
    const mock = mockFetch([]);
    await searchGroceries(EMPTY);
    const where = capturedWhere(mock);
    expect(where).toContain("county IN (");
    expect(where).toContain("establishment_type LIKE '%A%'");
  });

  it("matches name tokens at word boundaries", async () => {
    const mock = mockFetch([]);
    await searchGroceries({ ...EMPTY, name: "fresh market" });
    const where = capturedWhere(mock);
    expect(where).toContain("upper(trade_name) like 'FRESH%'");
    expect(where).toContain("upper(trade_name) like '% FRESH%'");
    expect(where).toContain("upper(trade_name) like 'MARKET%'");
    expect(where).toContain("upper(trade_name) like '% MARKET%'");
  });

  it("escapes single quotes in name", async () => {
    const mock = mockFetch([]);
    await searchGroceries({ ...EMPTY, name: "tony's" });
    const where = capturedWhere(mock);
    expect(where).toContain("TONY''S");
  });

  it("filters by single borough (maps to county)", async () => {
    const mock = mockFetch([]);
    await searchGroceries({ ...EMPTY, boro: ["Brooklyn"] });
    expect(capturedWhere(mock)).toContain("county='Kings'");
  });

  it("filters by multiple boroughs with OR", async () => {
    const mock = mockFetch([]);
    await searchGroceries({ ...EMPTY, boro: ["Manhattan", "Queens"] });
    const where = capturedWhere(mock);
    expect(where).toContain("county='New York'");
    expect(where).toContain("county='Queens'");
    expect(where).toContain(" OR ");
  });

  it("filters by zip code", async () => {
    const mock = mockFetch([]);
    await searchGroceries({ ...EMPTY, zip: "11201" });
    expect(capturedWhere(mock)).toContain("zipcode='11201'");
  });

  it("expands address tokens and matches each independently", async () => {
    const mock = mockFetch([]);
    await searchGroceries({ ...EMPTY, address: "338 E 92nd St" });
    const where = capturedWhere(mock);
    expect(where).toContain("upper(street)");
    expect(where).toContain("338");
    expect(where).toContain("EAST");
    expect(where).toContain("STREET");
  });

  it("does NOT include grade in the server-side WHERE clause", async () => {
    const mock = mockFetch([]);
    await searchGroceries({ ...EMPTY, grade: ["A"] });
    expect(capturedWhere(mock)).not.toContain("inspection_grade");
  });

  it("builds within_circle clause when geo is provided", async () => {
    const mock = mockFetch([]);
    await searchGroceries(EMPTY, { lat: 40.75, lng: -73.99, radius: 0.5 });
    const where = capturedWhere(mock);
    expect(where).toContain("within_circle(georeference,");
  });

  it("combines geo with other filters", async () => {
    const mock = mockFetch([]);
    await searchGroceries(
      { ...EMPTY, name: "deli" },
      { lat: 40.75, lng: -73.99, radius: 0.5 },
    );
    const where = capturedWhere(mock);
    expect(where).toContain("trade_name");
    expect(where).toContain("within_circle");
  });

  it("returns geo in the result when provided", async () => {
    mockFetch([]);
    const geo = { lat: 40.75, lng: -73.99, radius: 0.5 };
    const result = await searchGroceries(EMPTY, geo);
    expect(result.geo).toEqual(geo);
  });

  it("returns geo as undefined when not provided", async () => {
    mockFetch([]);
    const result = await searchGroceries(EMPTY);
    expect(result.geo).toBeUndefined();
  });

  it("returns the parsed JSON rows", async () => {
    const fakeRows = [{ trade_name: "TEST" }];
    mockFetch(fakeRows);
    const result = await searchGroceries(EMPTY);
    expect(result.rows).toEqual(fakeRows);
  });

  it("throws on non-OK HTTP response", async () => {
    mockFetch([], false);
    await expect(searchGroceries(EMPTY)).rejects.toThrow("HTTP 500");
  });
});

describe("fetchGroceryById", () => {
  it("queries by parsed store ID fields and returns grouped grocery", async () => {
    const id = generateStoreId("TEST STORE", "123 MAIN ST", "11201");
    const rows = [
      makeRow({
        trade_name: "TEST STORE",
        street: "123 MAIN ST",
        zipcode: "11201",
        inspection_date: "2024-06-01T00:00:00.000",
        inspection_grade: "A",
      }),
    ];
    const mock = mockFetch(rows);
    const result = await fetchGroceryById(id);
    const where = capturedWhere(mock);
    expect(where).toContain("upper(trade_name)=");
    expect(where).toContain("upper(street)=");
    expect(where).toContain("zipcode='11201'");
    expect(result).not.toBeNull();
    expect(result!.tradeName).toBe("TEST STORE");
  });

  it("returns null when no rows are returned", async () => {
    mockFetch([]);
    const id = generateStoreId("NOPE", "1 FAKE ST", "00000");
    const result = await fetchGroceryById(id);
    expect(result).toBeNull();
  });

  it("throws on non-OK HTTP response", async () => {
    mockFetch([], false);
    const id = generateStoreId("X", "Y", "Z");
    await expect(fetchGroceryById(id)).rejects.toThrow("HTTP 500");
  });

  it("escapes single quotes in parsed fields", async () => {
    const id = generateStoreId("Tony's", "O'Brien St", "11201");
    const mock = mockFetch([]);
    await fetchGroceryById(id);
    const where = capturedWhere(mock);
    expect(where).toContain("''");
  });
});

// --- deficiencyCategory tests ---
import { deficiencyCategory } from "../deficiencyCategory.js";

describe("deficiencyCategory", () => {
  it("maps temperature codes", () => {
    expect(deficiencyCategory("06A")).toEqual({ emoji: "🌡️", label: "Cooling & refrigeration" });
    expect(deficiencyCategory("06B")).toEqual({ emoji: "🌡️", label: "Cooling & refrigeration" });
  });

  it("maps pest/contamination codes", () => {
    expect(deficiencyCategory("02A")).toEqual({ emoji: "🐀", label: "Adulterated food" });
  });

  it("maps pest activity codes", () => {
    expect(deficiencyCategory("14A")).toEqual({ emoji: "🪳", label: "Pest activity" });
  });

  it("maps building maintenance codes", () => {
    expect(deficiencyCategory("10B")).toEqual({ emoji: "🏚️", label: "Building maintenance" });
  });

  it("maps cross-contamination codes", () => {
    expect(deficiencyCategory("04F")).toEqual({ emoji: "⚠️", label: "Cross-contamination" });
  });

  it("maps cleanliness codes", () => {
    expect(deficiencyCategory("09A")).toEqual({ emoji: "🚰", label: "Sanitary facilities" });
  });

  it("returns default for unknown codes", () => {
    expect(deficiencyCategory("99Z")).toEqual({ emoji: "📌", label: "Other" });
  });
});
