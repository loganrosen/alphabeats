import { useState } from "react";
import type { Inspection, Restaurant } from "../api.js";
import { fmtDate, norm } from "../utils.js";
import { violationCategory } from "../violationCategory.js";
import EmojiSet from "./EmojiSet.js";
import GradeInfo from "./GradeInfo.js";
import { GRADE_TEXT } from "./InspectionCard.js";
import InspectionCard from "./InspectionCard.js";
import ViolationList from "./ViolationList.js";

const GRADE_LABEL: Record<string, string> = {
  A: "A",
  B: "B",
  C: "C",
  N: "N",
  Z: "P",
  P: "P",
};

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

function RestaurantInspectionRow({
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
  const insp = r.latest;
  const gradedInsp = r.latestGraded;
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
    <InspectionCard
      name={r.dba}
      detailLink={`/restaurant/${r.camis}`}
      detailLinkState={{ restaurant: r }}
      detailLinkDataAttr="data-restaurant-link"
      address={addr}
      mapsUrl={mapsUrl}
      yelpUrl={yelpUrl}
      distance={r.distance}
      phone={r.phone}
      grade={grade}
      gradeDisplay={GRADE_LABEL[grade ?? ""] ?? grade ?? "?"}
      gradeSublabel={
        grade === "Z" || grade === "P"
          ? "PENDING"
          : grade === "N"
            ? "UNGRADED"
            : "GRADE"
      }
      neverInspected={!insp}
      lastInspectedDate={insp?.date}
      tags={
        <>
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
        </>
      }
      inspectionCount={allInspections.length}
      inspectionSummaryExtra={
        recentViolations.length > 0 ? (
          <span className="flex items-center gap-0.5 ml-1">
            <EmojiSet items={recentViolations} categorize={categorizeViolation} />
            <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 ml-0.5">
              12mo
            </span>
          </span>
        ) : undefined
      }
      inspectionRows={allInspections.map((i, idx) => (
        <RestaurantInspectionRow key={idx} insp={i} isLatest={i === insp} />
      ))}
      footerLinks={
        <a
          href={`https://a816-health.nyc.gov/ABCEatsRestaurants/#!/Search/${r.camis}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
        >
          NYC Health ↗
        </a>
      }
    />
  );
}
