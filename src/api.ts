import { GRADE_ORDER } from "./gradeStyles.js";
import type { GeoParams } from "./geo.js";
export type { GeoParams } from "./geo.js";
import { boundingBox, expandAddress, norm } from "./utils.js";

const API = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";

export interface SearchParams {
  name: string;
  boro: string[];
  address: string;
  zip: string;
  cuisine: string;
  grade: string[];
  cb: string;
}

export interface Violation {
  code: string;
  desc: string;
  critical: boolean;
}

export interface Inspection {
  date: string | undefined;
  type: string | undefined;
  grade: string | undefined;
  score: number | null;
  violations: Violation[];
  closed: boolean;
  reinspection: boolean;
}

export interface Restaurant {
  camis: string;
  dba: string;
  boro: string;
  building: string;
  street: string;
  zipcode: string;
  phone: string;
  cuisine: string;
  lat: number | null;
  lng: number | null;
  inspections: Record<string, Inspection>;
  latest: Inspection | undefined;
  latestGraded: Inspection | undefined;
  distance?: number;
}

// Raw row shape returned by the NYC Open Data API.
export interface ApiRow {
  camis: string;
  dba: string;
  boro: string;
  building: string;
  street: string;
  zipcode: string;
  cuisine_description: string;
  inspection_date?: string;
  inspection_type?: string;
  grade?: string;
  score?: string;
  violation_code?: string;
  violation_description?: string;
  critical_flag?: string;
  latitude?: string;
  longitude?: string;
  action?: string;
  phone?: string;
  grade_date?: string;
}

export interface CommunityBoard {
  code: string;
  label: string;
  borough: string;
}

export async function fetchCommunityBoards(): Promise<CommunityBoard[]> {
  const CACHE_KEY = "eatsafe:community_boards";
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) return JSON.parse(cached);
  const url =
    "https://data.cityofnewyork.us/resource/ruf7-3wgc.json" +
    "?$select=community_board_1,neighborhoods,borough&$limit=200&$order=borough,community_board_1";
  const res = await fetch(url);
  if (!res.ok) return [];
  const rows: {
    community_board_1?: string;
    neighborhoods?: string;
    borough?: string;
  }[] = await res.json();
  const result = rows
    .filter((r) => r.community_board_1 && r.neighborhoods)
    .map((r) => ({
      code: r.community_board_1!,
      label: r.neighborhoods!,
      borough: r.borough ?? "",
    }));
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
  return result;
}

export async function fetchCuisines(): Promise<string[]> {
  const CACHE_KEY = "eatsafe:cuisines";
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) return JSON.parse(cached);
  const url =
    "https://data.cityofnewyork.us/resource/43nn-pn8j.json" +
    "?$select=cuisine_description&$group=cuisine_description&$order=cuisine_description&$limit=500";
  const res = await fetch(url);
  if (!res.ok) return [];
  const rows: { cuisine_description?: string }[] = await res.json();
  const result = rows.map((r) => r.cuisine_description ?? "").filter(Boolean);
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
  return result;
}

export async function searchRestaurants(
  params: SearchParams,
  geo?: GeoParams,
): Promise<{ rows: ApiRow[]; geo?: GeoParams }> {
  const conditions: string[] = [];
  if (params.name) {
    // Match each token at a word boundary (start of name or after a space)
    // so "Om" matches "Om Restaurant" but not "Momofuku" or "Comfort Food"
    const tokens = norm(params.name).split(/\s+/).filter(Boolean);
    for (const t of tokens) {
      const s = t.replace(/'/g, "''");
      conditions.push(`(upper(dba) like '${s}%' OR upper(dba) like '% ${s}%')`);
    }
  }
  if (params.boro.length === 1) {
    conditions.push(`boro='${params.boro[0].replace(/'/g, "''")}'`);
  } else if (params.boro.length > 1) {
    conditions.push(
      `(${params.boro.map((b) => `boro='${b.replace(/'/g, "''")}'`).join(" OR ")})`,
    );
  }
  if (params.zip) conditions.push(`zipcode='${params.zip}'`);
  if (params.cuisine) {
    const terms = params.cuisine
      .split(",")
      .map((s) => norm(s.trim()))
      .filter(Boolean);
    if (terms.length === 1) {
      conditions.push(
        `upper(cuisine_description) like '%${terms[0].replace(/'/g, "''")}%'`,
      );
    } else if (terms.length > 1) {
      const parts = terms.map(
        (t) => `upper(cuisine_description) like '%${t.replace(/'/g, "''")}%'`,
      );
      conditions.push(`(${parts.join(" OR ")})`);
    }
  }
  if (params.cb)
    conditions.push(`community_board='${params.cb.replace(/'/g, "''")}'`);
  if (params.address) {
    // Each token is matched independently so abbreviations and spacing quirks
    // in the stored data (e.g. double spaces) don't prevent matches.
    for (const token of expandAddress(params.address)) {
      conditions.push(
        `upper(building)||' '||upper(street) like '%${token.replace(/'/g, "''")}%'`,
      );
    }
  }
  if (geo) {
    const box = boundingBox(geo.lat, geo.lng, geo.radius);
    conditions.push(
      `latitude >= '${box.minLat}'`,
      `latitude <= '${box.maxLat}'`,
      `longitude >= '${box.minLng}'`,
      `longitude <= '${box.maxLng}'`,
    );
  }

  const query = new URLSearchParams({
    $where: conditions.join(" AND "),
    $order: "inspection_date DESC",
    $limit: "5000",
  });

  const res = await fetch(`${API}?${query}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows: ApiRow[] = await res.json();
  return { rows, geo };
}

export async function fetchByCamis(camis: string): Promise<Restaurant | null> {
  const query = new URLSearchParams({
    $where: `camis='${camis.replace(/'/g, "''")}'`,
    $order: "inspection_date DESC",
    $limit: "1000",
  });
  const res = await fetch(`${API}?${query}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows: ApiRow[] = await res.json();
  if (!rows.length) return null;
  return groupRows(rows)[0] ?? null;
}

// (by camis), keeping all inspections with their violations.
export function groupRows(rows: ApiRow[]): Restaurant[] {
  const map: Record<string, Restaurant> = {};

  for (const r of rows) {
    if (!map[r.camis]) {
      map[r.camis] = {
        camis: r.camis,
        dba: r.dba,
        boro: r.boro,
        building: r.building,
        street: r.street,
        zipcode: r.zipcode,
        phone: r.phone ?? "",
        cuisine: r.cuisine_description,
        lat: r.latitude ? parseFloat(r.latitude) : null,
        lng: r.longitude ? parseFloat(r.longitude) : null,
        inspections: {},
        latest: undefined,
        latestGraded: undefined,
      };
    }

    // Key by date only so same-day inspections (e.g. a scored inspection
    // plus an administrative one) are consolidated into a single entry.
    const key = r.inspection_date ?? "";
    const rest = map[r.camis];

    // Skip sentinel rows — 1900-01-01 means the restaurant has no inspections on record
    const year = r.inspection_date
      ? new Date(r.inspection_date).getFullYear()
      : 0;
    if (year < 2000) continue;

    if (!rest.inspections[key]) {
      rest.inspections[key] = {
        date: r.inspection_date,
        type: r.inspection_type,
        grade: r.grade,
        score: r.score != null ? parseInt(r.score, 10) : null,
        violations: [],
        closed: r.action?.toLowerCase().includes("closed") ?? false,
        reinspection:
          r.inspection_type?.toLowerCase().includes("re-inspection") ?? false,
      };
    } else {
      const insp = rest.inspections[key];
      if (!insp.grade && r.grade) insp.grade = r.grade;
      if (insp.score == null && r.score != null)
        insp.score = parseInt(r.score, 10);
      if (r.action?.toLowerCase().includes("closed")) insp.closed = true;
      if (r.inspection_type?.toLowerCase().includes("re-inspection"))
        insp.reinspection = true;
    }

    if (r.violation_code) {
      rest.inspections[key].violations.push({
        code: r.violation_code,
        desc: r.violation_description ?? "",
        critical: r.critical_flag === "Critical",
      });
    }
  }

  return Object.values(map)
    .map((rest) => {
      const sorted = Object.values(rest.inspections).sort(
        (a, b) =>
          new Date(b.date ?? "").getTime() - new Date(a.date ?? "").getTime(),
      );
      rest.latest = sorted[0];
      rest.latestGraded = sorted.find((i) => i.grade) ?? sorted[0];
      return rest;
    })
    .sort((a, b) => {
      const ga = GRADE_ORDER[a.latestGraded?.grade ?? ""] ?? 3;
      const gb = GRADE_ORDER[b.latestGraded?.grade ?? ""] ?? 3;
      if (ga !== gb) return ga - gb;
      return a.dba.localeCompare(b.dba);
    });
}
