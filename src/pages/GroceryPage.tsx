import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { Grocery, GroceryInspection } from "../groceryApi.js";
import { fetchGroceryById } from "../groceryApi.js";
import { deficiencyCategory } from "../deficiencyCategory.js";
import { GRADE_COLOR, GRADE_LABEL, GRADE_TEXT } from "../gradeStyles.js";
import GradeBadge from "../components/GradeBadge.js";
import MiniMap from "../components/MiniMap.js";
import { fmtDate, fmtRelativeAge, inspectionStalenessClass, norm } from "../utils.js";

function InspectionSection({
  insp,
  isLatest,
  id,
}: {
  insp: GroceryInspection;
  isLatest: boolean;
  id?: string;
}) {
  const grade = insp.grade ?? null;
  return (
    <div
      id={id}
      className={`rounded border p-4 flex flex-col gap-3 ${isLatest ? "border-zinc-300 dark:border-zinc-600" : "border-zinc-200 dark:border-zinc-800"}`}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`font-display text-2xl w-8 text-center shrink-0 ${GRADE_TEXT[grade ?? ""] ?? "text-zinc-400"}`}
        >
          {grade ? (GRADE_LABEL[grade] ?? grade) : "—"}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-mono text-sm text-zinc-700 dark:text-zinc-200">
            {fmtDate(insp.date)}
          </span>
          {isLatest && fmtRelativeAge(insp.date) && (
            <span
              className={`font-mono text-xs ${inspectionStalenessClass(insp.date)}`}
            >
              {fmtRelativeAge(insp.date)}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3 shrink-0 flex-wrap">
          {isLatest && (
            <span className="font-mono text-xs text-yellow-600 border border-yellow-300 rounded px-2 py-0.5 dark:text-yellow-400 dark:border-yellow-700">
              Latest
            </span>
          )}
        </div>
      </div>
      {insp.deficiencies.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {insp.deficiencies.map((d, i) => {
            const cat = deficiencyCategory(d.number);
            return (
              <li key={i} className="font-mono text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <span className="mr-1" title={cat.label}>{cat.emoji}</span>
                <span className="text-zinc-400 dark:text-zinc-500 mr-1.5">#{d.number}</span>
                {d.description}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
          No deficiencies recorded.
        </p>
      )}
    </div>
  );
}

function GradeTimelineSVG({
  inspections,
  onSelect,
}: {
  inspections: GroceryInspection[];
  onSelect: (date: string) => void;
}) {
  const graded = inspections.filter((i) => i.date && i.grade);
  if (graded.length < 2) return null;

  const dates = graded.map((i) => new Date(i.date!).getTime());
  const minTime = Math.min(...dates);
  const maxTime = Math.max(...dates);
  const span = maxTime - minTime || 1;

  const pad = 40;
  const w = 600;
  const innerW = w - pad * 2;

  // Year ticks
  const minYear = new Date(minTime).getFullYear();
  const maxYear = new Date(maxTime).getFullYear();
  const yearTicks: { x: number; label: string }[] = [];
  for (let y = minYear; y <= maxYear + 1; y++) {
    const t = new Date(y, 0, 1).getTime();
    if (t >= minTime && t <= maxTime) {
      yearTicks.push({ x: pad + ((t - minTime) / span) * innerW, label: String(y) });
    }
  }

  return (
    <div className="mb-8">
      <svg viewBox="0 0 600 80" className="w-full" role="img" aria-label="Grade timeline">
        {/* Axis line */}
        <line x1={pad} y1={40} x2={w - pad} y2={40} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />

        {/* Year ticks */}
        {yearTicks.map((tick) => (
          <g key={tick.label}>
            <line x1={tick.x} y1={35} x2={tick.x} y2={45} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />
            <text x={tick.x} y={65} textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-500" style={{ fontSize: 10, fontFamily: "monospace" }}>
              {tick.label}
            </text>
          </g>
        ))}

        {/* Grade markers */}
        {graded.map((insp, i) => {
          const t = new Date(insp.date!).getTime();
          const x = pad + ((t - minTime) / span) * innerW;
          const color = GRADE_COLOR[insp.grade!] ?? "#a1a1aa";
          return (
            <g
              key={i}
              onClick={() => onSelect(insp.date!)}
              style={{ cursor: "pointer" }}
              role="button"
              tabIndex={0}
              aria-label={`${insp.grade} on ${fmtDate(insp.date)}`}
            >
              <circle cx={x} cy={40} r={12} fill={color} opacity={0.9} />
              <text x={x} y={44} textAnchor="middle" fill="white" style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>
                {insp.grade}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function GroceryPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const passedGrocery =
    (location.state as { grocery?: Grocery } | null)?.grocery ?? null;
  const [grocery, setGrocery] = useState<Grocery | null>(passedGrocery);
  const [loading, setLoading] = useState(!passedGrocery);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (passedGrocery) {
      document.title = `${passedGrocery.tradeName} — eatsafe`;
      return () => {
        document.title = "eatsafe — NYC Restaurant Inspection Search";
      };
    }
    if (!storeId) return;
    setLoading(true);
    setError(null);
    fetchGroceryById(storeId)
      .then((g) => {
        setGrocery(g);
        if (g) document.title = `${g.tradeName} — eatsafe`;
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    return () => {
      document.title = "eatsafe — NYC Restaurant Inspection Search";
    };
  }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const allInspections = grocery
    ? Object.values(grocery.inspections).sort(
        (a, b) =>
          new Date(b.date ?? "").getTime() - new Date(a.date ?? "").getTime(),
      )
    : [];

  const grade = grocery?.latestGraded?.grade ?? null;
  const addr = grocery
    ? [norm(grocery.street), grocery.zipcode, grocery.boro]
        .filter(Boolean)
        .join(" · ")
    : "";
  const mapsUrl = grocery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([grocery.tradeName, norm(grocery.street), grocery.zipcode, "New York NY"].filter(Boolean).join(" "))}`
    : "";
  const yelpUrl = grocery
    ? `https://www.yelp.com/search?find_desc=${encodeURIComponent(grocery.tradeName)}&find_loc=${encodeURIComponent([norm(grocery.street), grocery.zipcode, "New York NY"].filter(Boolean).join(", "))}`
    : "";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() =>
            window.history.length > 1 ? navigate(-1) : navigate("/")
          }
          className="font-mono text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors mb-6 inline-block cursor-pointer"
        >
          ← Back to search
        </button>

        {loading && (
          <p className="font-mono text-sm text-zinc-400 dark:text-zinc-500 mt-8">
            Loading…
          </p>
        )}

        {error && (
          <p className="font-mono text-sm text-red-500 mt-8">Error: {error}</p>
        )}

        {!loading && !error && !grocery && (
          <p className="font-mono text-sm text-zinc-400 dark:text-zinc-500 mt-8">
            Store not found.
          </p>
        )}

        {grocery && (
          <>
            {/* Header */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h1 className="font-semibold text-2xl leading-snug text-zinc-900 dark:text-zinc-100">
                  {grocery.tradeName}
                </h1>
                <p className="font-mono text-sm text-zinc-500 mt-1 dark:text-zinc-300">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                  >
                    {addr}
                  </a>
                </p>
                <span className="font-mono text-xs text-zinc-600 tracking-wide uppercase border border-zinc-300 rounded px-2 py-0.5 mt-2 inline-block dark:text-zinc-300 dark:border-zinc-700">
                  {grocery.establishmentTypeLabel}
                </span>
                {grocery.ownerName && (
                  <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    {grocery.ownerName}
                  </p>
                )}
              </div>
              <GradeBadge
                  grade={grade}
                  display={grade ? (GRADE_LABEL[grade] ?? grade) : undefined}
                  neverInspected={!grade}
                  size="lg"
                />
            </div>

            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
              >
                Google Maps ↗
              </a>
              <a
                href={yelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
              >
                Yelp ↗
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300 cursor-pointer ml-auto"
              >
                {copied ? "✓ Copied" : "Copy link"}
              </button>
            </div>

            {/* Mini map */}
            {grocery.lat && grocery.lng && (
              <MiniMap lat={grocery.lat} lng={grocery.lng} />
            )}

            {/* Grade timeline */}
            <GradeTimelineSVG
              inspections={allInspections}
              onSelect={(date) => {
                document
                  .getElementById(`insp-${date}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            />

            {/* Inspection history */}
            <h2 className="font-mono text-xs tracking-widest text-zinc-400 dark:text-zinc-500 uppercase mb-3">
              {allInspections.length} Inspection
              {allInspections.length !== 1 ? "s" : ""}
            </h2>
            <div className="flex flex-col gap-3">
              {allInspections.map((insp, i) => (
                <InspectionSection
                  key={i}
                  insp={insp}
                  isLatest={insp === grocery.latest}
                  id={`insp-${insp.date}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
