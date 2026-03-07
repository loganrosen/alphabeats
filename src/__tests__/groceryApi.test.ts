import { describe, expect, it } from "vitest";
import {
  generateStoreId,
  parseStoreId,
  getEstablishmentTypeLabel,
  groupGroceryRows,
  COUNTY_TO_BOROUGH,
  BOROUGH_TO_COUNTY,
  NYC_COUNTIES,
  ESTABLISHMENT_TYPES,
  type GroceryApiRow,
} from "../groceryApi.js";

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

// --- deficiencyCategory tests ---
import { deficiencyCategory } from "../deficiencyCategory.js";

describe("deficiencyCategory", () => {
  it("maps temperature codes", () => {
    expect(deficiencyCategory("04A")).toEqual({ emoji: "🌡️", label: "Temperature" });
    expect(deficiencyCategory("04F")).toEqual({ emoji: "🌡️", label: "Temperature" });
  });

  it("maps pest/contamination codes", () => {
    expect(deficiencyCategory("02A")).toEqual({ emoji: "🐀", label: "Food contamination" });
  });

  it("maps building maintenance codes", () => {
    expect(deficiencyCategory("10B")).toEqual({ emoji: "🏚️", label: "Building maintenance" });
  });

  it("maps cleanliness codes", () => {
    expect(deficiencyCategory("09A")).toEqual({ emoji: "🧹", label: "Cleanliness" });
  });

  it("returns default for unknown codes", () => {
    expect(deficiencyCategory("99Z")).toEqual({ emoji: "📌", label: "Other" });
  });
});
