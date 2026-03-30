import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CommunityBoard,
  fetchCommunityBoards,
  fetchCuisines,
  type GeoParams,
  groupRows,
  type Restaurant,
  type SearchParams,
  searchRestaurants,
} from "./api.js";
import GrocerySearchForm from "./components/GrocerySearchForm.js";
import ResultsGrid from "./components/ResultsGrid.js";
import SearchForm from "./components/SearchForm.js";
import {
  type Grocery,
  type GrocerySearchParams,
  groupGroceryRows,
  searchGroceries,
} from "./groceryApi.js";
import { useGeolocation } from "./useGeolocation.js";
import { type Theme, useTheme } from "./useTheme.js";
import { haversineDistance } from "./utils.js";

export type DatasetMode = "restaurant" | "grocery";

interface SearchResult {
  status: "idle" | "loading" | "done" | "error";
  restaurants: Restaurant[];
  groceries: Grocery[];
  hitLimit: boolean;
  totalRows: number;
  error: string | null;
}

const EMPTY: SearchParams = {
  name: "",
  boro: [],
  address: "",
  zip: "",
  cuisine: "",
  grade: [],
  cb: "",
};
const EMPTY_GROCERY: GrocerySearchParams = {
  name: "",
  boro: [],
  address: "",
  zip: "",
  grade: [],
};
const IDLE: SearchResult = {
  status: "idle",
  restaurants: [],
  groceries: [],
  hitLimit: false,
  totalRows: 0,
  error: null,
};

function readParams(): {
  mode: DatasetMode;
  form: SearchParams;
  groceryForm: GrocerySearchParams;
  geo: GeoParams | null;
} {
  const p = new URLSearchParams(window.location.search);
  const mode = (
    p.get("mode") === "grocery" ? "grocery" : "restaurant"
  ) as DatasetMode;
  const form: SearchParams = {
    name: p.get("name") ?? "",
    boro: p.get("boro")?.split(",") ?? [],
    address: p.get("address") ?? "",
    zip: p.get("zip") ?? "",
    cuisine: p.get("cuisine") ?? "",
    grade: p.get("grade")?.split(",") ?? [],
    cb: p.get("cb") ?? "",
  };
  const groceryForm: GrocerySearchParams = {
    name: p.get("name") ?? "",
    boro: p.get("boro")?.split(",") ?? [],
    address: p.get("address") ?? "",
    zip: p.get("zip") ?? "",
    grade: p.get("grade")?.split(",") ?? [],
  };
  const rawLat = p.get("lat");
  const rawLng = p.get("lng");
  const geo =
    rawLat && rawLng
      ? {
          lat: parseFloat(rawLat),
          lng: parseFloat(rawLng),
          radius: parseFloat(p.get("radius") ?? "0.25"),
        }
      : null;
  return { mode, form, groceryForm, geo };
}

function writeParams(
  mode: DatasetMode,
  values: SearchParams | GrocerySearchParams,
  geo?: GeoParams | null,
): void {
  const url = new URL(window.location.href);
  // Clear all search-related params first
  for (const k of [
    "name",
    "boro",
    "address",
    "zip",
    "cuisine",
    "grade",
    "cb",
    "mode",
    "lat",
    "lng",
    "radius",
  ]) {
    url.searchParams.delete(k);
  }
  if (mode === "grocery") url.searchParams.set("mode", "grocery");
  (Object.entries(values) as [string, string | string[]][]).forEach(
    ([k, v]) => {
      const s = Array.isArray(v) ? v.join(",") : v;
      if (s) url.searchParams.set(k, s);
    },
  );
  if (geo) {
    url.searchParams.set("lat", String(geo.lat));
    url.searchParams.set("lng", String(geo.lng));
    url.searchParams.set("radius", String(geo.radius));
  }
  window.history.replaceState({}, "", url);
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "☀" },
  { value: "dark", label: "☾" },
];

function hasQuery(
  values: SearchParams | GrocerySearchParams,
  geo?: GeoParams | null,
): boolean {
  return (
    geo != null ||
    values.name !== "" ||
    values.address !== "" ||
    values.zip !== "" ||
    ("cuisine" in values && values.cuisine !== "") ||
    ("cb" in values && values.cb !== "") ||
    values.boro.length > 0 ||
    values.grade.length > 0
  );
}

export default function App() {
  const [mode, setMode] = useState<DatasetMode>(() => readParams().mode);
  const [form, setForm] = useState<SearchParams>(() => readParams().form);
  const [groceryForm, setGroceryForm] = useState<GrocerySearchParams>(
    () => readParams().groceryForm,
  );
  const [activeGeo, setActiveGeo] = useState<GeoParams | null>(
    () => readParams().geo,
  );
  const [result, setResult] = useState<SearchResult>(IDLE);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [communityBoards, setCommunityBoards] = useState<CommunityBoard[]>([]);
  const { theme, setTheme } = useTheme();
  const { geo, locate, clear: clearGeo } = useGeolocation();
  const [nearbyRadius, setNearbyRadius] = useState(
    () => readParams().geo?.radius ?? 0.25,
  );

  useEffect(() => {
    fetchCuisines().then(setCuisines);
    fetchCommunityBoards().then(setCommunityBoards);
  }, []);

  const resultsRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(
    async (
      currentMode: DatasetMode,
      values: SearchParams | GrocerySearchParams,
      geo?: GeoParams | null,
      isRestore = false,
    ) => {
      if (!hasQuery(values, geo)) {
        setResult(IDLE);
        writeParams(currentMode, values, geo);
        return;
      }
      writeParams(currentMode, values, geo);
      setResult({
        status: "loading",
        restaurants: [],
        groceries: [],
        hitLimit: false,
        totalRows: 0,
        error: null,
      });
      if (!isRestore)
        setTimeout(
          () =>
            resultsRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
          150,
        );
      try {
        if (currentMode === "grocery") {
          const { rows, geo: geoResult } = await searchGroceries(
            values as GrocerySearchParams,
            geo ?? undefined,
          );
          let groceries = groupGroceryRows(rows).filter(
            (g) =>
              (values as GrocerySearchParams).grade.length === 0 ||
              (values as GrocerySearchParams).grade.includes(
                g.latestGraded?.grade ?? "",
              ),
          );
          if (geoResult) {
            groceries = groceries
              .filter((g) => g.lat != null && g.lng != null)
              .map((g) => ({
                ...g,
                distance: haversineDistance(
                  geoResult.lat,
                  geoResult.lng,
                  g.lat as number,
                  g.lng as number,
                ),
              }))
              .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
          }
          setResult({
            status: "done",
            restaurants: [],
            groceries,
            hitLimit: rows.length >= 5000,
            totalRows: rows.length,
            error: null,
          });
        } else {
          const { rows, geo: geoResult } = await searchRestaurants(
            values as SearchParams,
            geo ?? undefined,
          );
          let restaurants = groupRows(rows).filter(
            (r) =>
              (values as SearchParams).grade.length === 0 ||
              (values as SearchParams).grade.includes(
                r.latestGraded?.grade ?? "",
              ),
          );
          if (geoResult) {
            restaurants = restaurants
              .filter((r) => r.lat != null && r.lng != null)
              .map((r) => ({
                ...r,
                distance: haversineDistance(
                  geoResult.lat,
                  geoResult.lng,
                  r.lat as number,
                  r.lng as number,
                ),
              }))
              .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
          }
          setResult({
            status: "done",
            restaurants,
            groceries: [],
            hitLimit: rows.length >= 5000,
            totalRows: rows.length,
            error: null,
          });
        }
      } catch (e) {
        setResult({
          status: "error",
          restaurants: [],
          groceries: [],
          hitLimit: false,
          totalRows: 0,
          error: (e as Error).message,
        });
      }
    },
    [],
  );

  // Restore state from URL on mount
  useEffect(() => {
    const {
      mode: urlMode,
      form: urlForm,
      groceryForm: urlGroceryForm,
      geo: urlGeo,
    } = readParams();
    setMode(urlMode);
    if (urlMode === "grocery") {
      if (hasQuery(urlGroceryForm, urlGeo)) {
        setGroceryForm(urlGroceryForm);
        if (urlGeo) {
          setActiveGeo(urlGeo);
          setNearbyRadius(urlGeo.radius);
        }
        doSearch(urlMode, urlGroceryForm, urlGeo, true);
      }
    } else {
      if (hasQuery(urlForm, urlGeo)) {
        setForm(urlForm);
        if (urlGeo) {
          setActiveGeo(urlGeo);
          setNearbyRadius(urlGeo.radius);
        }
        doSearch(urlMode, urlForm, urlGeo, true);
      }
    }
  }, [doSearch]);

  const handleClear = () => {
    if (mode === "grocery") {
      setGroceryForm(EMPTY_GROCERY);
      setActiveGeo(null);
      writeParams(mode, EMPTY_GROCERY, null);
    } else {
      setForm(EMPTY);
      setActiveGeo(null);
      writeParams(mode, EMPTY, null);
    }
    setResult(IDLE);
    clearGeo();
  };

  const handleClearGeo = () => {
    setActiveGeo(null);
    const currentForm = mode === "grocery" ? groceryForm : form;
    writeParams(mode, currentForm, null);
    clearGeo();
    doSearch(mode, currentForm, undefined);
  };

  const handleModeChange = (newMode: DatasetMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setResult(IDLE);
    setActiveGeo(null);
    clearGeo();
    if (newMode === "grocery") {
      setGroceryForm(EMPTY_GROCERY);
      writeParams(newMode, EMPTY_GROCERY, null);
    } else {
      setForm(EMPTY);
      writeParams(newMode, EMPTY, null);
    }
  };

  // Trigger search when geolocation succeeds
  useEffect(() => {
    if (geo.status === "success" && geo.lat != null && geo.lng != null) {
      const newGeo = { lat: geo.lat, lng: geo.lng, radius: nearbyRadius };
      setActiveGeo(newGeo);
      const currentForm = mode === "grocery" ? groceryForm : form;
      doSearch(mode, currentForm, newGeo);
    }
  }, [geo, doSearch, mode, form, groceryForm, nearbyRadius]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-50 text-zinc-900 font-sans dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-10 bg-white border-b border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800">
        <div className="px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <button
            type="button"
            className="flex items-center gap-3 min-w-0 cursor-pointer"
            onClick={handleClear}
          >
            <img src="/icon-192.png" alt="" className="h-12 w-12 shrink-0" />
            <span className="font-sans font-bold text-3xl sm:text-4xl tracking-wide leading-none shrink-0">
              <span className="text-zinc-800 dark:text-zinc-100">eat</span>
              <span className="text-yellow-500 dark:text-yellow-400">safe</span>
            </span>
          </button>
          <div className="flex items-center gap-3 shrink-0">
            {/* Theme toggle */}
            <div className="flex rounded-md overflow-hidden border border-zinc-300 dark:border-zinc-700 font-mono text-xs">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`px-3 py-1.5 cursor-pointer transition-colors
                    ${
                      theme === opt.value
                        ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-white text-zinc-500 hover:text-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="font-mono text-xs text-zinc-500 leading-relaxed text-right dark:text-zinc-300 hidden sm:block">
              {mode === "grocery" ? (
                <>
                  NY Open Data ·{" "}
                  <a
                    href="https://data.ny.gov/Economic-Development/Food-Safety-Inspections-Current-Ratings/d6dy-3h7r"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
                  >
                    AGM Inspections
                  </a>
                </>
              ) : (
                <>
                  NYC Open Data ·{" "}
                  <a
                    href="https://data.cityofnewyork.us/Health/DOHMH-New-York-City-Restaurant-Inspection-Results/43nn-pn8j"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
                  >
                    DOHMH Inspections
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Dataset tabs — full-width, prominent */}
        <div className="flex border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => handleModeChange("restaurant")}
            className={`flex-1 py-2.5 font-mono text-sm tracking-wide cursor-pointer transition-colors relative
              ${
                mode === "restaurant"
                  ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
          >
            🍕 Restaurants
            {mode === "restaurant" && (
              <span className="absolute bottom-0 left-[10%] right-[10%] h-[2px] bg-yellow-500 dark:bg-yellow-400 rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("grocery")}
            className={`flex-1 py-2.5 font-mono text-sm tracking-wide cursor-pointer transition-colors relative
              ${
                mode === "grocery"
                  ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
          >
            🏪 Bodegas &amp; Groceries
            {mode === "grocery" && (
              <span className="absolute bottom-0 left-[10%] right-[10%] h-[2px] bg-yellow-500 dark:bg-yellow-400 rounded-full" />
            )}
          </button>
        </div>
      </header>

      {mode === "grocery" ? (
        <GrocerySearchForm
          values={groceryForm}
          onChange={setGroceryForm}
          onSearch={() => doSearch(mode, groceryForm, activeGeo)}
          onClear={handleClear}
          onNearby={locate}
          nearbyStatus={geo.status}
          nearbyError={geo.error}
          nearbyRadius={nearbyRadius}
          onRadiusChange={(r) => {
            setNearbyRadius(r);
            if (activeGeo) {
              const updated = { ...activeGeo, radius: r };
              setActiveGeo(updated);
              doSearch(mode, groceryForm, updated);
            }
          }}
          loading={result.status === "loading"}
          nearbyActive={activeGeo != null}
          onClearGeo={handleClearGeo}
        />
      ) : (
        <SearchForm
          values={form}
          onChange={setForm}
          onSearch={() => doSearch(mode, form, activeGeo)}
          onClear={handleClear}
          onNearby={locate}
          nearbyStatus={geo.status}
          nearbyError={geo.error}
          nearbyRadius={nearbyRadius}
          onRadiusChange={(r) => {
            setNearbyRadius(r);
            if (activeGeo) {
              const updated = { ...activeGeo, radius: r };
              setActiveGeo(updated);
              doSearch(mode, form, updated);
            }
          }}
          loading={result.status === "loading"}
          nearbyActive={activeGeo != null}
          onClearGeo={handleClearGeo}
          cuisines={cuisines}
          communityBoards={communityBoards}
        />
      )}
      <div ref={resultsRef} className="scroll-mt-14">
        <ResultsGrid result={result} mode={mode} />
      </div>
    </div>
  );
}
