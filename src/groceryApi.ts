import { expandAddress, norm } from "./utils.js";

const API = "https://data.ny.gov/resource/d6dy-3h7r.json";

export const NYC_COUNTIES = ["New York", "Kings", "Queens", "Bronx", "Richmond"];

export const COUNTY_TO_BOROUGH: Record<string, string> = {
  "New York": "Manhattan",
  Kings: "Brooklyn",
  Queens: "Queens",
  Bronx: "Bronx",
  Richmond: "Staten Island",
};

export const BOROUGH_TO_COUNTY: Record<string, string> = {
  Manhattan: "New York",
  Brooklyn: "Kings",
  Queens: "Queens",
  Bronx: "Bronx",
  "Staten Island": "Richmond",
};

export const ESTABLISHMENT_TYPES: Record<string, string> = {
  A: "Store",
  B: "Bakery",
  C: "Food Mfr",
  D: "Warehouse",
  E: "Beverage",
  F: "Feed Mill",
  G: "Processing",
  H: "Wholesale Mfr",
  I: "Refrigerated Wh",
  K: "Vehicle",
  L: "Produce Wh",
  N: "Produce Packer",
  O: "Grower/Packer",
  P: "Controlled Atm",
  Q: "Medicated Feed",
  R: "Pet Food Mfr",
  S: "Feed Dist",
  T: "Disposal",
  V: "Slaughterhouse",
  W: "Farm Winery",
};

export function getEstablishmentTypeLabel(codes: string): string {
  const labels = codes
    .split("")
    .map((c) => ESTABLISHMENT_TYPES[c])
    .filter(Boolean);
  return labels.join(" · ") || codes;
}

export interface GrocerySearchParams {
  name: string;
  boro: string[];
  address: string;
  zip: string;
  grade: string[];
}

export interface Deficiency {
  number: string;
  description: string;
}

export interface GroceryInspection {
  date: string | undefined;
  grade: string | undefined;
  deficiencies: Deficiency[];
}

export interface Grocery {
  id: string;
  tradeName: string;
  ownerName: string;
  street: string;
  city: string;
  zipcode: string;
  county: string;
  boro: string;
  establishmentType: string;
  establishmentTypeLabel: string;
  lat: number | null;
  lng: number | null;
  inspections: Record<string, GroceryInspection>;
  latest: GroceryInspection | undefined;
  latestGraded: GroceryInspection | undefined;
  distance?: number;
}

export interface GroceryApiRow {
  county?: string;
  inspection_date?: string;
  inspection_grade?: string;
  establishment_type?: string;
  owner_name?: string;
  trade_name?: string;
  street?: string;
  city?: string;
  statecode?: string;
  zipcode?: string;
  deficiency_number?: string;
  deficiency_description?: string;
  georeference?: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

export function generateStoreId(
  tradeName: string,
  street: string,
  zipcode: string,
): string {
  const key = [tradeName, street, zipcode].join("|");
  const encoded = btoa(unescape(encodeURIComponent(key)));
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function parseStoreId(id: string): {
  tradeName: string;
  street: string;
  zipcode: string;
} {
  let padded = id.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) padded += "=";
  const key = decodeURIComponent(escape(atob(padded)));
  const parts = key.split("|");
  return {
    tradeName: parts[0] ?? "",
    street: parts[1] ?? "",
    zipcode: parts[2] ?? "",
  };
}

export interface GeoParams {
  lat: number;
  lng: number;
  radius: number;
}

export async function searchGroceries(
  params: GrocerySearchParams,
  geo?: GeoParams,
): Promise<{ rows: GroceryApiRow[]; geo?: GeoParams }> {
  const conditions: string[] = [];

  // Always filter to NYC counties and establishment type containing 'A' (Store)
  conditions.push(
    `county IN (${NYC_COUNTIES.map((c) => `'${c}'`).join(",")})`,
  );
  conditions.push(`establishment_type LIKE '%A%'`);

  if (params.name) {
    const tokens = norm(params.name).split(/\s+/).filter(Boolean);
    for (const t of tokens) {
      const s = t.replace(/'/g, "''");
      conditions.push(
        `(upper(trade_name) like '${s}%' OR upper(trade_name) like '% ${s}%')`,
      );
    }
  }

  if (params.boro.length > 0) {
    const counties = params.boro
      .map((b) => BOROUGH_TO_COUNTY[b])
      .filter(Boolean);
    if (counties.length === 1) {
      conditions.push(`county='${counties[0]}'`);
    } else if (counties.length > 1) {
      conditions.push(
        `(${counties.map((c) => `county='${c}'`).join(" OR ")})`,
      );
    }
  }

  if (params.zip) conditions.push(`zipcode='${params.zip}'`);

  if (params.address) {
    for (const token of expandAddress(params.address)) {
      conditions.push(
        `upper(street) like '%${token.replace(/'/g, "''")}%'`,
      );
    }
  }

  if (geo) {
    // Socrata supports within_circle for Point-type fields
    // radius is in miles, convert to meters (1 mi ≈ 1609.34 m)
    const meters = geo.radius * 1609.34;
    conditions.push(
      `within_circle(georeference, ${geo.lat}, ${geo.lng}, ${meters})`,
    );
  }

  const query = new URLSearchParams({
    $where: conditions.join(" AND "),
    $order: "inspection_date DESC",
    $limit: "5000",
  });

  const res = await fetch(`${API}?${query}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows: GroceryApiRow[] = await res.json();
  return { rows, geo };
}

export async function fetchGroceryById(id: string): Promise<Grocery | null> {
  const { tradeName, street, zipcode } = parseStoreId(id);
  const conditions = [
    `upper(trade_name)='${norm(tradeName).replace(/'/g, "''")}'`,
    `upper(street)='${norm(street).replace(/'/g, "''")}'`,
    `zipcode='${zipcode.replace(/'/g, "''")}'`,
  ];

  const query = new URLSearchParams({
    $where: conditions.join(" AND "),
    $order: "inspection_date DESC",
    $limit: "1000",
  });

  const res = await fetch(`${API}?${query}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows: GroceryApiRow[] = await res.json();
  if (!rows.length) return null;
  return groupGroceryRows(rows)[0] ?? null;
}

export function groupGroceryRows(rows: GroceryApiRow[]): Grocery[] {
  const map: Record<string, Grocery> = {};

  for (const r of rows) {
    const tradeName = r.trade_name ?? "";
    const street = r.street ?? "";
    const zipcode = r.zipcode ?? "";
    const compositeKey = `${tradeName}|${street}|${zipcode}`;

    if (!map[compositeKey]) {
      const county = r.county ?? "";
      let lat: number | null = null;
      let lng: number | null = null;
      if (r.georeference?.coordinates) {
        lng = r.georeference.coordinates[0];
        lat = r.georeference.coordinates[1];
      }

      map[compositeKey] = {
        id: generateStoreId(tradeName, street, zipcode),
        tradeName,
        ownerName: r.owner_name ?? "",
        street,
        city: r.city ?? "",
        zipcode,
        county,
        boro: COUNTY_TO_BOROUGH[county] ?? county,
        establishmentType: r.establishment_type ?? "",
        establishmentTypeLabel: getEstablishmentTypeLabel(
          r.establishment_type ?? "",
        ),
        lat,
        lng,
        inspections: {},
        latest: undefined,
        latestGraded: undefined,
      };
    }

    const dateKey = r.inspection_date ?? "";
    if (!dateKey) continue;

    const store = map[compositeKey];

    if (!store.inspections[dateKey]) {
      store.inspections[dateKey] = {
        date: r.inspection_date,
        grade: r.inspection_grade,
        deficiencies: [],
      };
    }

    if (r.deficiency_number) {
      store.inspections[dateKey].deficiencies.push({
        number: r.deficiency_number,
        description: r.deficiency_description ?? "",
      });
    }
  }

  const gradeOrder: Record<string, number> = { A: 0, B: 1, C: 2 };

  return Object.values(map)
    .map((store) => {
      const sorted = Object.values(store.inspections).sort(
        (a, b) =>
          new Date(b.date ?? "").getTime() - new Date(a.date ?? "").getTime(),
      );
      store.latest = sorted[0];
      store.latestGraded = sorted.find((i) => i.grade) ?? sorted[0];
      return store;
    })
    .sort((a, b) => {
      const ga = gradeOrder[a.latestGraded?.grade ?? ""] ?? 3;
      const gb = gradeOrder[b.latestGraded?.grade ?? ""] ?? 3;
      if (ga !== gb) return ga - gb;
      return a.tradeName.localeCompare(b.tradeName);
    });
}
