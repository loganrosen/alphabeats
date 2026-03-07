import { useState } from "react";
import { deficiencyCategory } from "../deficiencyCategory.js";
import type { Deficiency, Grocery, GroceryInspection } from "../groceryApi.js";
import { fmtDate, norm } from "../utils.js";
import EmojiSet from "./EmojiSet.js";
import { GRADE_TEXT } from "./InspectionCard.js";
import InspectionCard from "./InspectionCard.js";

const categorizeDeficiency = (d: Deficiency) => deficiencyCategory(d.number);

function GroceryInspectionRow({
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
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 cursor-pointer select-none ${insp.deficiencies.length > 0 ? "hover:bg-zinc-50 dark:hover:bg-zinc-900" : ""}`}
        onClick={() => insp.deficiencies.length > 0 && setOpen((o) => !o)}
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
                <EmojiSet items={insp.deficiencies} categorize={categorizeDeficiency} />
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
      </div>

      {open && insp.deficiencies.length > 0 && (
        <div className="px-3 pb-3 border-t border-zinc-100 dark:border-zinc-800 pt-2">
          <ul className="flex flex-col gap-1.5">
            {insp.deficiencies.map((d, i) => {
              const cat = deficiencyCategory(d.number);
              return (
                <li
                  key={i}
                  className="font-mono text-xs text-zinc-600 dark:text-zinc-300 leading-snug"
                >
                  <span className="mr-1" title={cat.label}>{cat.emoji}</span>
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
  const insp = g.latest;
  const gradedInsp = g.latestGraded;
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
    <InspectionCard
      name={g.tradeName}
      detailLink={`/store/${g.id}`}
      detailLinkState={{ grocery: g }}
      address={addr}
      mapsUrl={mapsUrl}
      yelpUrl={yelpUrl}
      distance={g.distance}
      grade={grade}
      neverInspected={!insp}
      lastInspectedDate={insp?.date}
      tags={
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
        </div>
      }
      inspectionCount={allInspections.length}
      inspectionSummaryExtra={
        recentDeficiencies.length > 0 ? (
          <span className="flex items-center gap-0.5 ml-1">
            <EmojiSet items={recentDeficiencies} categorize={categorizeDeficiency} />
            <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 ml-0.5">
              12mo
            </span>
          </span>
        ) : undefined
      }
      inspectionRows={allInspections.map((ins, idx) => (
        <GroceryInspectionRow key={idx} insp={ins} isLatest={ins === insp} />
      ))}
    />
  );
}

