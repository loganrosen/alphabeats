import { useState } from "react";
import type { GrocerySearchParams } from "../groceryApi.js";
import { inputCls, labelCls } from "../searchStyles.js";
import BoroughFilter from "./BoroughFilter.js";
import GradeFilter from "./GradeFilter.js";
import MoreFiltersToggle from "./MoreFiltersToggle.js";
import NearMeSection from "./NearMeSection.js";

interface Props {
  values: GrocerySearchParams;
  onChange: (fn: (prev: GrocerySearchParams) => GrocerySearchParams) => void;
  onSearch: () => void;
  onClear: () => void;
  onNearby: () => void;
  onClearGeo: () => void;
  nearbyActive: boolean;
  nearbyStatus: "idle" | "loading" | "success" | "error";
  nearbyError: string | null;
  nearbyRadius: number;
  onRadiusChange: (r: number) => void;
  loading: boolean;
}

export default function GrocerySearchForm({
  values,
  onChange,
  onSearch,
  onClear,
  onNearby,
  onClearGeo,
  nearbyActive,
  nearbyStatus,
  nearbyError,
  nearbyRadius,
  onRadiusChange,
  loading,
}: Props) {
  const set =
    (key: keyof GrocerySearchParams) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange((v) => ({ ...v, [key]: e.target.value }));
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSearch();
  };

  const hasAdvancedFilters =
    values.address !== "" || values.zip !== "" || values.grade.length > 0;
  const [showAdvanced, setShowAdvanced] = useState(hasAdvancedFilters);

  return (
    <div className="bg-zinc-100 border-b border-zinc-200 px-8 py-4 dark:bg-zinc-900 dark:border-zinc-800">
      {/* Primary row: Name, Borough, Search/Clear */}
      <div className="grid grid-cols-[2fr_1.2fr_auto] gap-3 max-w-6xl items-end max-[800px]:grid-cols-1">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls} htmlFor="grocery-name">
            Store Name
          </label>
          <input
            id="grocery-name"
            className={inputCls}
            value={values.name}
            onChange={set("name")}
            onKeyDown={onKey}
            placeholder="e.g. Key Food"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelCls} id="grocery-boro-label">
            Borough
          </span>
          <BoroughFilter
            value={values.boro}
            onChange={(boro) => onChange((prev) => ({ ...prev, boro }))}
            aria-labelledby="grocery-boro-label"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={onSearch}
            disabled={loading}
            className="font-mono text-sm tracking-widest bg-yellow-400 text-zinc-950 px-6 py-2.5 rounded-md cursor-pointer hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? "…" : "SEARCH"}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="font-mono text-sm tracking-widest text-zinc-600 border border-zinc-300 px-4 py-2.5 rounded-md cursor-pointer hover:text-zinc-900 hover:border-zinc-500 transition-colors whitespace-nowrap dark:text-zinc-300 dark:border-zinc-600 dark:hover:text-white dark:hover:border-zinc-400"
          >
            CLEAR
          </button>
        </div>
      </div>

      {/* Action row: Near Me + More Filters toggle */}
      <div className="flex items-center gap-4 max-w-6xl mt-3 flex-wrap">
        <NearMeSection
          active={nearbyActive}
          status={nearbyStatus}
          radius={nearbyRadius}
          onLocate={onNearby}
          onClear={onClearGeo}
          onRadiusChange={onRadiusChange}
          loading={loading}
        />
        <MoreFiltersToggle
          open={showAdvanced}
          onToggle={() => setShowAdvanced((o) => !o)}
          hasFilters={hasAdvancedFilters}
        />
      </div>

      {nearbyStatus === "error" && nearbyError && (
        <div className="font-mono text-xs text-red-500 mt-2 dark:text-red-400">
          {nearbyError}
        </div>
      )}

      {/* Advanced filters: Address, Zip, Grade */}
      {showAdvanced && (
        <div className="grid grid-cols-[1.5fr_0.8fr_1fr] gap-3 max-w-6xl mt-3 items-end max-[800px]:grid-cols-1">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="grocery-address">
              Street Address
            </label>
            <input
              id="grocery-address"
              className={inputCls}
              value={values.address}
              onChange={set("address")}
              onKeyDown={onKey}
              placeholder="e.g. 338 E 92nd St"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="grocery-zip">
              Zip Code
            </label>
            <input
              id="grocery-zip"
              className={inputCls}
              value={values.zip}
              onChange={set("zip")}
              onKeyDown={onKey}
              placeholder="e.g. 10128"
              maxLength={5}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={labelCls} id="grocery-grade-label">
              Grade
            </span>
            <GradeFilter
              value={values.grade}
              onChange={(grade) => onChange((prev) => ({ ...prev, grade }))}
              aria-labelledby="grocery-grade-label"
              options={[
                ["A", "A"],
                ["B", "B"],
                ["C", "C"],
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
