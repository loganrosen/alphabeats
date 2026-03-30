import { useState } from "react";
import { Link } from "react-router-dom";
import { deficiencyCategory } from "../deficiencyCategory.js";
import { GRADE_TEXT } from "../gradeStyles.js";
import type { Deficiency, Grocery, GroceryInspection } from "../groceryApi.js";
import {
  fmtDate,
  fmtDistance,
  fmtRelativeAge,
  inspectionStalenessClass,
  norm,
} from "../utils.js";
import EmojiSet from "./EmojiSet.js";
import GradeBadge from "./GradeBadge.js";
import GroceryGradeInfo from "./GroceryGradeInfo.js";

const categorizeDeficiency = (d: Deficiency) => deficiencyCategory(d.number);

function InspectionRow({
  insp,
  isLatest,
}: {
  insp: GroceryInspection;
  isLatest: boolean;
}) {
  const [open, setOpen] = useState(false);
  const grade = insp.grade ?? null;

  return (
    <div
      className={`rounded border ${isLatest ? "border-zinc-300 dark:border-zinc-600" : "border-zinc-200 dark:border-zinc-800"}`}
    >
      <button
        type="button"
        disabled={insp.deficiencies.length === 0}
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 w-full text-left select-none ${insp.deficiencies.length > 0 ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className={`font-display text-base w-6 text-center shrink-0 ${GRADE_TEXT[grade ?? ""] ?? "text-zinc-400"}`}
        >
          {grade ?? "—"}
        </span>
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
          {fmtDate(insp.date)}
        </span>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {insp.deficiencies.length > 0 && (
            <>
              <span className="text-xs">
                <EmojiSet
                  items={insp.deficiencies}
                  categorize={categorizeDeficiency}
                />
              </span>
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {insp.deficiencies.length} deficienc
                {insp.deficiencies.length === 1 ? "y" : "ies"}
              </span>
              <span
                className={`font-mono text-xs text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`}
              >
                ▶
              </span>
            </>
          )}
        </div>
      </button>

      {open && insp.deficiencies.length > 0 && (
        <div className="px-3 pb-3 border-t border-zinc-100 dark:border-zinc-800 pt-2">
          <ul className="flex flex-col gap-1.5">
            {insp.deficiencies.map((d) => {
              const cat = deficiencyCategory(d.number);
              return (
                <li
                  key={`${d.number}-${d.description?.slice(0, 20)}`}
                  className="font-mono text-xs text-zinc-600 dark:text-zinc-300 leading-snug"
                >
                  <span className="mr-1" title={cat.label}>
                    {cat.emoji}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">
                    [{d.number}]
                  </span>{" "}
                  {d.description}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function GroceryCard({ grocery: g }: { grocery: Grocery }) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const insp = g.latest;
  const gradedInsp = g.latestGraded;
  const neverInspected = !insp;
  const grade = gradedInsp?.grade ?? null;
  const addr = [norm(g.street), g.zipcode, g.boro].filter(Boolean).join(" · ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([g.tradeName, norm(g.street), g.zipcode, "New York NY"].filter(Boolean).join(" "))}`;
  const yelpUrl = `https://www.yelp.com/search?find_desc=${encodeURIComponent(g.tradeName)}&find_loc=${encodeURIComponent([norm(g.street), g.zipcode, "New York NY"].filter(Boolean).join(", "))}`;
  const allInspections = Object.values(g.inspections).sort(
    (a, b) =>
      new Date(b.date ?? "").getTime() - new Date(a.date ?? "").getTime(),
  );

  const latestDeficiencyCount = insp?.deficiencies.length ?? 0;

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentDeficiencies = allInspections
    .filter((i) => i.date && new Date(i.date) >= oneYearAgo)
    .flatMap((i) => i.deficiencies);

  return (
    <div className="bg-white hover:bg-zinc-50 transition-colors p-5 flex flex-col gap-3 min-w-0 dark:bg-zinc-950 dark:hover:bg-zinc-900 group">
      <div className="flex justify-between items-start gap-4">
        <div>
          <Link
            to={`/store/${g.id}`}
            state={{ grocery: g }}
            className="font-semibold text-lg leading-snug text-zinc-900 dark:text-zinc-100 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors group-hover:text-yellow-600 dark:group-hover:text-yellow-400"
          >
            {g.tradeName}
            <span className="ml-1.5 text-zinc-400 dark:text-zinc-500 group-hover:text-yellow-500 dark:group-hover:text-yellow-400 transition-colors text-base font-normal">
              →
            </span>
          </Link>
          <div className="font-mono text-sm text-zinc-500 mt-1 tracking-tight dark:text-zinc-300 flex items-center gap-2 flex-wrap">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
            >
              {addr}
            </a>
            {g.distance != null && (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                {fmtDistance(g.distance)}
              </span>
            )}
          </div>
        </div>
        <GradeBadge grade={grade} neverInspected={neverInspected} />
      </div>

      <div className="flex gap-1.5 flex-wrap items-center">
        {g.establishmentTypeLabel && (
          <span className="font-mono text-xs text-zinc-600 tracking-wide uppercase border border-zinc-300 rounded px-2 py-0.5 dark:text-zinc-300 dark:border-zinc-700">
            {g.establishmentTypeLabel}
          </span>
        )}
        {latestDeficiencyCount > 0 && (
          <span className="font-mono text-xs text-red-600 border border-red-300 rounded px-2 py-0.5 dark:text-red-300 dark:border-red-800">
            {latestDeficiencyCount} deficienc
            {latestDeficiencyCount === 1 ? "y" : "ies"}
          </span>
        )}
        {grade && <GroceryGradeInfo align="left" direction="up" />}
      </div>

      {allInspections.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            className="font-mono text-sm text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1.5 text-left cursor-pointer dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <span
              className={`transition-transform ${historyOpen ? "rotate-90" : ""}`}
            >
              ▶
            </span>
            {allInspections.length} INSPECTION
            {allInspections.length !== 1 ? "S" : ""}
            {recentDeficiencies.length > 0 && (
              <span className="flex items-center gap-0.5 ml-1">
                <EmojiSet
                  items={recentDeficiencies}
                  categorize={categorizeDeficiency}
                />
                <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 ml-0.5">
                  12mo
                </span>
              </span>
            )}
          </button>

          {historyOpen && (
            <div className="flex flex-col gap-1.5">
              {allInspections.map((ins) => (
                <InspectionRow
                  key={`${ins.date}-${ins.grade ?? "none"}`}
                  insp={ins}
                  isLatest={ins === insp}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-zinc-200 mt-auto dark:border-zinc-800">
        <span
          className={`font-mono text-xs ${inspectionStalenessClass(insp?.date)}`}
        >
          {neverInspected
            ? "No inspection on record"
            : `Last inspected ${fmtDate(insp?.date)}${fmtRelativeAge(insp?.date) ? ` · ${fmtRelativeAge(insp?.date)}` : ""}`}
        </span>
        <div className="flex items-center gap-3">
          <a
            href={yelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
          >
            Yelp ↗
          </a>
        </div>
      </div>
    </div>
  );
}
