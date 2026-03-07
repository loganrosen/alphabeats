import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { fmtDate, fmtDistance, fmtRelativeAge, inspectionStalenessClass } from "../utils.js";

export const GRADE_STYLES: Record<string, string> = {
  A: "bg-green-700",
  B: "bg-amber-600",
  C: "bg-red-600",
};

export const GRADE_TEXT: Record<string, string> = {
  A: "text-green-700 dark:text-green-400",
  B: "text-amber-600 dark:text-amber-400",
  C: "text-red-600 dark:text-red-400",
};

interface InspectionCardProps {
  name: string;
  detailLink: string;
  detailLinkState: Record<string, unknown>;
  detailLinkDataAttr?: string;
  address: string;
  mapsUrl: string;
  yelpUrl: string;
  distance?: number | null;
  phone?: string | null;
  grade: string | null;
  gradeDisplay?: string;
  gradeSublabel?: string;
  neverInspected: boolean;
  lastInspectedDate?: string | null;
  /** Pills row (cuisine, establishment type, score, deficiency count, etc.) */
  tags?: ReactNode;
  /** Rendered inspection rows for the accordion */
  inspectionRows: ReactNode;
  inspectionCount: number;
  /** Extra content shown inline with the inspections toggle (e.g. emoji rollup) */
  inspectionSummaryExtra?: ReactNode;
  /** Additional links in the footer beyond Yelp */
  footerLinks?: ReactNode;
}

export default function InspectionCard({
  name,
  detailLink,
  detailLinkState,
  detailLinkDataAttr,
  address,
  mapsUrl,
  yelpUrl,
  distance,
  phone,
  grade,
  gradeDisplay,
  gradeSublabel = "GRADE",
  neverInspected,
  lastInspectedDate,
  tags,
  inspectionRows,
  inspectionCount,
  inspectionSummaryExtra,
  footerLinks,
}: InspectionCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const linkProps: Record<string, string> = {};
  if (detailLinkDataAttr) linkProps[detailLinkDataAttr] = "";

  return (
    <div className="bg-white hover:bg-zinc-50 transition-colors p-5 flex flex-col gap-3 min-w-0 dark:bg-zinc-950 dark:hover:bg-zinc-900 group">
      <div className="flex justify-between items-start gap-4">
        <div>
          <Link
            to={detailLink}
            state={detailLinkState}
            className="font-semibold text-lg leading-snug text-zinc-900 dark:text-zinc-100 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors group-hover:text-yellow-600 dark:group-hover:text-yellow-400"
            {...linkProps}
          >
            {name}
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
              {address}
            </a>
            {distance != null && (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                {fmtDistance(distance)}
              </span>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors opacity-60 hover:opacity-100"
              >
                📞
              </a>
            )}
          </div>
        </div>
        {neverInspected ? (
          <div className="w-11 h-14 rounded shrink-0 flex flex-col items-center justify-center relative bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700">
            <span className="font-mono text-xs text-center leading-tight tracking-tight px-0.5">
              NOT YET
            </span>
          </div>
        ) : (
          <div
            className={`${GRADE_STYLES[grade ?? ""] ?? "bg-zinc-400 dark:bg-zinc-700"} w-11 h-14 rounded shrink-0 flex flex-col items-center justify-center relative text-white`}
          >
            <span className="font-display text-3xl leading-none">
              {gradeDisplay ?? grade ?? "?"}
            </span>
            <span className="font-mono text-[0.45rem] tracking-widest absolute bottom-1.5 opacity-75">
              {gradeSublabel}
            </span>
          </div>
        )}
      </div>

      {tags}

      {inspectionCount > 0 && (
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
            {inspectionCount} INSPECTION
            {inspectionCount !== 1 ? "S" : ""}
            {inspectionSummaryExtra}
          </button>

          {historyOpen && (
            <div className="flex flex-col gap-1.5">{inspectionRows}</div>
          )}
        </>
      )}

      <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-zinc-200 mt-auto dark:border-zinc-800">
        <span
          className={`font-mono text-xs ${inspectionStalenessClass(lastInspectedDate)}`}
        >
          {neverInspected
            ? "No inspection on record"
            : `Last inspected ${fmtDate(lastInspectedDate)}${fmtRelativeAge(lastInspectedDate) ? ` · ${fmtRelativeAge(lastInspectedDate)}` : ""}`}
        </span>
        <div className="flex items-center gap-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
          >
            Maps ↗
          </a>
          <a
            href={yelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
          >
            Yelp ↗
          </a>
          {footerLinks}
        </div>
      </div>
    </div>
  );
}
