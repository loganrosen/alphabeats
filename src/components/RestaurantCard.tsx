import { useState } from "react";
import { Link } from "react-router-dom";
import type { Inspection, Restaurant } from "../api.js";
import { GRADE_LABEL, GRADE_TEXT } from "../gradeStyles.js";
import {
  fmtDate,
  fmtDistance,
  fmtRelativeAge,
  inspectionStalenessClass,
  norm,
} from "../utils.js";
import { violationCategory } from "../violationCategory.js";
import EmojiSet from "./EmojiSet.js";
import GradeBadge from "./GradeBadge.js";
import GradeInfo from "./GradeInfo.js";
import ViolationList from "./ViolationList.js";

function abbrevInspType(type: string | undefined): string {
  if (!type) return "";
  const part = type.split("/").pop()?.trim() ?? type;
  const p = part.toLowerCase();
  if (p.includes("re-inspection") || p.includes("reinspection"))
    return "Re-insp";
  if (p.includes("initial")) return "Initial";
  if (p.includes("pre-permit")) return "Pre-permit";
  if (p.includes("compliance")) return "Compliance";
  if (p.includes("reopening")) return "Reopening";
  if (p.includes("smoke") || p.includes("calorie") || p.includes("trans fat"))
    return "Special";
  if (p.includes("admin")) return "Admin";
  if (p.includes("inspected")) return "Inspected";
  return part.length > 14 ? part.slice(0, 12) + "…" : part;
}

const categorizeViolation = (v: { code: string; desc: string }) =>
  violationCategory(v.code, v.desc);

function InspectionRow({
  insp,
  isLatest,
}: {
  insp: Inspection;
  isLatest: boolean;
}) {
  const [open, setOpen] = useState(false);
  const grade = insp.grade ?? null;
  const critCount = insp.violations.filter((v) => v.critical).length;

  return (
    <div
      className={`rounded border ${isLatest ? "border-zinc-300 dark:border-zinc-600" : "border-zinc-200 dark:border-zinc-800"}`}
    >
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 cursor-pointer select-none ${insp.violations.length > 0 ? "hover:bg-zinc-50 dark:hover:bg-zinc-900" : ""}`}
        onClick={() => insp.violations.length > 0 && setOpen((o) => !o)}
      >
        <span
          className={`font-display text-base w-6 text-center shrink-0 ${GRADE_TEXT[grade ?? ""] ?? "text-zinc-400"}`}
        >
          {grade ? (GRADE_LABEL[grade] ?? grade) : "—"}
        </span>
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
          {fmtDate(insp.date)}
        </span>
        <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
          {abbrevInspType(insp.type)}
        </span>
        {insp.score != null && (
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
            · {insp.score}pts
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {critCount > 0 && (
            <span className="font-mono text-xs text-red-500 dark:text-red-400">
              {critCount}✕ crit
            </span>
          )}
          {insp.violations.length > 0 && (
            <>
              <span className="text-xs">
                <EmojiSet items={insp.violations} categorize={categorizeViolation} />
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

      {open && insp.violations.length > 0 && (
        <div className="px-3 pb-3 border-t border-zinc-100 dark:border-zinc-800 pt-2">
          <ViolationList violations={insp.violations} />
        </div>
      )}
    </div>
  );
}

export default function RestaurantCard({
  restaurant: r,
}: {
  restaurant: Restaurant;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const insp = r.latest;
  const gradedInsp = r.latestGraded;
  const neverInspected = !insp;
  const grade = gradedInsp?.grade ?? null;
  const streetPart = [r.building, norm(r.street)].filter(Boolean).join(" ");
  const addr = [streetPart, r.zipcode, r.boro].filter(Boolean).join(" · ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([r.dba, streetPart, r.zipcode, "New York NY"].filter(Boolean).join(" "))}`;
  const yelpUrl = `https://www.yelp.com/search?find_desc=${encodeURIComponent(r.dba)}&find_loc=${encodeURIComponent([streetPart, r.zipcode, "New York NY"].filter(Boolean).join(", "))}`;
  const allInspections = Object.values(r.inspections).sort(
    (a, b) =>
      new Date(b.date ?? "").getTime() - new Date(a.date ?? "").getTime(),
  );

  const latestCritCount = (insp?.violations ?? []).filter(
    (v) => v.critical,
  ).length;

  const scoredInspections = allInspections.filter(
    (i) => i.score != null && i.grade,
  );
  const trendArrow = (() => {
    if (scoredInspections.length < 2) return null;
    const diff = scoredInspections[0].score! - scoredInspections[1].score!;
    if (diff < -1)
      return {
        arrow: "↓",
        title: "Violation points improving",
        cls: "text-green-600 dark:text-green-400",
      };
    if (diff > 1)
      return {
        arrow: "↑",
        title: "Violation points worsening",
        cls: "text-red-500 dark:text-red-400",
      };
    return {
      arrow: "→",
      title: "Violation points stable",
      cls: "text-zinc-400 dark:text-zinc-500",
    };
  })();

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentViolations = allInspections
    .filter((i) => i.date && new Date(i.date) >= oneYearAgo)
    .flatMap((i) => i.violations);

  return (
    <div className="bg-white hover:bg-zinc-50 transition-colors p-5 flex flex-col gap-3 min-w-0 dark:bg-zinc-950 dark:hover:bg-zinc-900 group">
      <div className="flex justify-between items-start gap-4">
        <div>
          <Link
            data-restaurant-link
            to={`/restaurant/${r.camis}`}
            state={{ restaurant: r }}
            className="font-semibold text-lg leading-snug text-zinc-900 dark:text-zinc-100 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors group-hover:text-yellow-600 dark:group-hover:text-yellow-400"
          >
            {r.dba}
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
            {r.distance != null && (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                {fmtDistance(r.distance)}
              </span>
            )}
            {r.phone && (
              <a
                href={`tel:${r.phone}`}
                className="hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors opacity-60 hover:opacity-100"
              >
                📞
              </a>
            )}
          </div>
        </div>
        <GradeBadge
          grade={grade}
          display={GRADE_LABEL[grade ?? ""] ?? grade ?? "?"}
          sublabel={
            grade === "Z" || grade === "P"
              ? "PENDING"
              : grade === "N"
                ? "UNGRADED"
                : "GRADE"
          }
          neverInspected={neverInspected}
        />
      </div>

      {r.cuisine && (
        <div>
          <span className="font-mono text-xs text-zinc-600 tracking-wide uppercase border border-zinc-300 rounded px-2 py-0.5 dark:text-zinc-300 dark:border-zinc-700">
            {r.cuisine}
          </span>
        </div>
      )}
      <div className="flex gap-1.5 flex-wrap items-center">
        {insp?.score != null && (
          <span className="font-mono text-xs text-zinc-700 tracking-wide border border-zinc-300 rounded px-2 py-0.5 dark:text-zinc-100 dark:border-zinc-700">
            {insp.score} pts
          </span>
        )}
        {trendArrow && (
          <span
            title={trendArrow.title}
            className={`font-mono text-sm font-bold cursor-default ${trendArrow.cls}`}
          >
            {trendArrow.arrow}
          </span>
        )}
        {(insp?.score != null || grade) && (
          <GradeInfo align="left" direction="up" />
        )}
        {latestCritCount > 0 && (
          <span className="font-mono text-xs text-red-600 border border-red-300 rounded px-2 py-0.5 dark:text-red-300 dark:border-red-800">
            {latestCritCount} critical
          </span>
        )}
      </div>

      {allInspections.length > 0 && (
        <>
          <button
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
            {recentViolations.length > 0 && (
              <span className="flex items-center gap-0.5 ml-1">
                <EmojiSet items={recentViolations} categorize={categorizeViolation} />
                <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 ml-0.5">
                  12mo
                </span>
              </span>
            )}
          </button>

          {historyOpen && (
            <div className="flex flex-col gap-1.5">
              {allInspections.map((i, idx) => (
                <InspectionRow key={idx} insp={i} isLatest={i === insp} />
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
          <a
            href={`https://a816-health.nyc.gov/ABCEatsRestaurants/#!/Search/${r.camis}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
          >
            NYC Health ↗
          </a>
        </div>
      </div>
    </div>
  );
}
