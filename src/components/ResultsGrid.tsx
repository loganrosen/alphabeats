import { useEffect, useState } from "react";
import type { Restaurant } from "../api.js";
import type { Grocery } from "../groceryApi.js";
import type { DatasetMode } from "../App.js";
import MapView from "./MapView.js";
import RestaurantCard from "./RestaurantCard.js";
import GroceryCard from "./GroceryCard.js";

interface SearchResult {
  status: "idle" | "loading" | "done" | "error";
  restaurants: Restaurant[];
  groceries: Grocery[];
  hitLimit: boolean;
  totalRows: number;
  error: string | null;
}

type SortKey = "grade" | "score" | "recent" | "name" | "distance";

const GRADE_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 };

function applySortKey(list: Restaurant[], key: SortKey): Restaurant[] {
  const copy = [...list];
  if (key === "grade")
    return copy.sort((a, b) => {
      const ga = GRADE_ORDER[a.latestGraded?.grade ?? ""] ?? 3;
      const gb = GRADE_ORDER[b.latestGraded?.grade ?? ""] ?? 3;
      if (ga !== gb) return ga - gb;
      return a.dba.localeCompare(b.dba);
    });
  if (key === "name") return copy.sort((a, b) => a.dba.localeCompare(b.dba));
  if (key === "score")
    return copy.sort(
      (a, b) => (b.latest?.score ?? -1) - (a.latest?.score ?? -1),
    );
  if (key === "recent")
    return copy.sort(
      (a, b) =>
        new Date(b.latest?.date ?? "").getTime() -
        new Date(a.latest?.date ?? "").getTime(),
    );
  if (key === "distance")
    return copy.sort(
      (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity),
    );
  return list;
}

function applySortKeyGrocery(list: Grocery[], key: SortKey): Grocery[] {
  const copy = [...list];
  if (key === "grade")
    return copy.sort((a, b) => {
      const ga = GRADE_ORDER[a.latestGraded?.grade ?? ""] ?? 3;
      const gb = GRADE_ORDER[b.latestGraded?.grade ?? ""] ?? 3;
      if (ga !== gb) return ga - gb;
      return a.tradeName.localeCompare(b.tradeName);
    });
  if (key === "name")
    return copy.sort((a, b) => a.tradeName.localeCompare(b.tradeName));
  if (key === "recent")
    return copy.sort(
      (a, b) =>
        new Date(b.latest?.date ?? "").getTime() -
        new Date(a.latest?.date ?? "").getTime(),
    );
  if (key === "distance")
    return copy.sort(
      (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity),
    );
  return list;
}

export default function ResultsGrid({
  result,
  mode,
}: { result: SearchResult; mode: DatasetMode }) {
  const { status, restaurants, groceries, hitLimit, totalRows, error } = result;
  const isGrocery = mode === "grocery";
  const items = isGrocery ? groceries : restaurants;
  const [view, setView] = useState<"list" | "map">("list");
  const hasDistance = items.length > 0 && items[0]?.distance != null;
  const [sortKey, setSortKey] = useState<SortKey>("grade");

  useEffect(() => {
    setSortKey(hasDistance ? "distance" : "grade");
  }, [hasDistance]);

  const itemLabel = isGrocery ? "store" : "restaurant";

  if (status === "idle")
    return (
      <div className="py-32 text-center font-mono text-sm text-zinc-500 tracking-widest dark:text-zinc-600">
        <div className="font-display text-8xl text-zinc-300 mb-4 leading-none dark:text-zinc-800">
          EAT
        </div>
        {isGrocery
          ? "ENTER A STORE NAME, ADDRESS, OR BOROUGH TO BEGIN"
          : "ENTER A RESTAURANT NAME, ADDRESS, OR BOROUGH TO BEGIN"}
      </div>
    );
  if (status === "loading")
    return (
      <div className="py-32 text-center font-mono text-sm text-zinc-500 tracking-widest dark:text-zinc-600">
        <div className="w-7 h-7 border-2 border-zinc-400 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4 dark:border-zinc-800 dark:border-t-yellow-400" />
        SEARCHING…
      </div>
    );
  if (status === "error")
    return (
      <div className="py-32 text-center font-mono text-sm text-zinc-500 tracking-widest dark:text-zinc-600">
        <div className="font-display text-8xl text-zinc-300 mb-4 leading-none dark:text-zinc-800">
          !
        </div>
        {error}
      </div>
    );

  return (
    <>
      <div className="px-8 py-3 border-b border-zinc-200 flex items-center gap-4 font-mono text-sm text-zinc-500 tracking-wide flex-wrap dark:border-zinc-800 dark:text-zinc-300">
        <span className="flex items-center gap-2">
          <span className="text-zinc-800 font-medium dark:text-zinc-100">
            {items.length.toLocaleString()} {itemLabel}
            {items.length !== 1 ? "s" : ""}
          </span>
          {"share" in navigator && (
            <button
              onClick={() =>
                navigator.share({
                  title: `eatsafe — ${items.length.toLocaleString()} ${itemLabel}${items.length !== 1 ? "s" : ""}`,
                  url: window.location.href,
                })
              }
              className="text-zinc-400 hover:text-yellow-500 transition-colors cursor-pointer"
              aria-label="Share"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
          )}
        </span>
        {hitLimit && (
          <span className="text-amber-500">
            ⚠ Result limit reached — refine your search
          </span>
        )}
        <span className="ml-auto flex items-center gap-3">
          <span>{totalRows.toLocaleString()} inspection records</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="font-mono text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 text-zinc-700 dark:text-zinc-300 cursor-pointer"
          >
            {hasDistance && <option value="distance">Distance</option>}
            <option value="grade">Grade</option>
            {!isGrocery && (
              <option value="score">Violation points ↓</option>
            )}
            <option value="recent">Most recent</option>
            <option value="name">Name</option>
          </select>
          <div className="flex rounded overflow-hidden border border-zinc-300 dark:border-zinc-700 text-xs font-mono">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 cursor-pointer transition-colors flex items-center gap-1.5 ${view === "list" ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "bg-white text-zinc-500 hover:text-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <line x1="1" y1="3" x2="11" y2="3" />
                <line x1="1" y1="6" x2="11" y2="6" />
                <line x1="1" y1="9" x2="11" y2="9" />
              </svg>
              List
            </button>
            <button
              onClick={() => setView("map")}
              className={`px-3 py-1.5 cursor-pointer transition-colors flex items-center gap-1.5 border-l border-zinc-300 dark:border-zinc-700 ${view === "map" ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "bg-white text-zinc-500 hover:text-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polygon points="1,9 4,2 7,6 9,4 11,9" />
                <circle cx="9" cy="3.5" r="1.5" />
              </svg>
              Map
            </button>
          </div>
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-32 text-center font-mono text-sm text-zinc-500 tracking-widest dark:text-zinc-600">
          <div className="font-display text-8xl text-zinc-300 mb-4 leading-none dark:text-zinc-800">
            0
          </div>
          NO RESULTS — TRY BROADER TERMS
        </div>
      ) : view === "list" ? (
        <div className="grid [grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-px bg-zinc-200 dark:bg-zinc-800">
          {isGrocery
            ? applySortKeyGrocery(groceries, sortKey).map((g) => (
                <GroceryCard key={g.id} grocery={g} />
              ))
            : applySortKey(restaurants, sortKey).map((r) => (
                <RestaurantCard key={r.camis} restaurant={r} />
              ))}
        </div>
      ) : (
        <div className="flex h-[calc(100vh-8rem)]">
          <div className="hidden md:flex flex-col overflow-y-auto w-[420px] shrink-0 divide-y divide-zinc-200 dark:divide-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            {isGrocery
              ? applySortKeyGrocery(groceries, sortKey).map((g) => (
                  <GroceryCard key={g.id} grocery={g} />
                ))
              : applySortKey(restaurants, sortKey).map((r) => (
                  <RestaurantCard key={r.camis} restaurant={r} />
                ))}
          </div>
          <div className="flex-1 min-w-0">
            <MapView
              items={
                isGrocery
                  ? groceries.map((g) => ({
                      id: g.id,
                      name: g.tradeName,
                      address: `${g.street}`,
                      lat: g.lat,
                      lng: g.lng,
                      grade: g.latest?.grade,
                      link: `/store/${g.id}`,
                      state: { grocery: g },
                    }))
                  : restaurants.map((r) => ({
                      id: r.camis,
                      name: r.dba,
                      address: `${r.building} ${r.street}`,
                      lat: r.lat,
                      lng: r.lng,
                      grade: r.latest?.grade,
                      score: r.latest?.score,
                      link: `/restaurant/${r.camis}`,
                      state: { restaurant: r },
                    }))
              }
            />
          </div>
        </div>
      )}
    </>
  );
}
