import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { Inspection, Restaurant } from "../api.js";
import { fetchByCamis } from "../api.js";
import GradeBadge from "../components/GradeBadge.js";
import GradeTimeline from "../components/GradeTimeline.js";
import MiniMap from "../components/MiniMap.js";
import ViolationList from "../components/ViolationList.js";
import { GRADE_LABEL, GRADE_TEXT, gradeForScore } from "../gradeStyles.js";
import {
  fmtDate,
  fmtRelativeAge,
  inspectionStalenessClass,
  norm,
} from "../utils.js";
import { violationCategory } from "../violationCategory.js";

function recurringCategories(
  inspections: Inspection[],
): { emoji: string; label: string; count: number }[] {
  const counts = new Map<
    string,
    { emoji: string; label: string; count: number }
  >();
  for (const insp of inspections) {
    if (insp.reinspection || insp.violations.length === 0) continue;
    const seen = new Set<string>();
    for (const v of insp.violations) {
      const { emoji, label } = violationCategory(v.code, v.desc);
      if (!seen.has(emoji)) {
        seen.add(emoji);
        const entry = counts.get(emoji);
        if (entry) entry.count++;
        else counts.set(emoji, { emoji, label, count: 1 });
      }
    }
  }
  return [...counts.values()]
    .filter((c) => c.count >= 2)
    .sort((a, b) => b.count - a.count);
}

function InspectionSection({
  insp,
  isLatest,
  id,
}: {
  insp: Inspection;
  isLatest: boolean;
  id?: string;
}) {
  const grade = insp.grade ?? null;
  const critCount = insp.violations.filter((v) => v.critical).length;
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
          {insp.type && (
            <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
              {insp.type}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3 shrink-0 flex-wrap">
          {insp.score != null && (
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {insp.score} pts
            </span>
          )}
          {insp.score != null &&
            (!grade || grade === "P" || grade === "Z" || grade === "N") && (
              <span
                className={`font-mono text-xs ${GRADE_TEXT[gradeForScore(insp.score)] ?? "text-zinc-400"}`}
              >
                {gradeForScore(insp.score)} if graded
              </span>
            )}
          {critCount > 0 && (
            <span className="font-mono text-xs text-red-600 border border-red-300 rounded px-2 py-0.5 dark:text-red-300 dark:border-red-800">
              {critCount} critical
            </span>
          )}
          {insp.closed && (
            <span className="font-mono text-xs text-orange-600 border border-orange-300 rounded px-2 py-0.5 dark:text-orange-300 dark:border-orange-800">
              closed by DOHMH
            </span>
          )}
          {isLatest && (
            <span className="font-mono text-xs text-yellow-600 border border-yellow-300 rounded px-2 py-0.5 dark:text-yellow-400 dark:border-yellow-700">
              Latest
            </span>
          )}
        </div>
      </div>
      {insp.violations.length > 0 ? (
        <ViolationList violations={insp.violations} />
      ) : (
        <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
          No violations recorded.
        </p>
      )}
    </div>
  );
}

export default function RestaurantPage() {
  const { camis } = useParams<{ camis: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const passedRestaurant =
    (location.state as { restaurant?: Restaurant } | null)?.restaurant ?? null;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(
    passedRestaurant,
  );
  const [loading, setLoading] = useState(!passedRestaurant);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (passedRestaurant) {
      document.title = `${passedRestaurant.dba} — eatsafe`;
      return () => {
        document.title = "eatsafe — NYC Restaurant Inspection Search";
      };
    }
    if (!camis) return;
    setLoading(true);
    setError(null);
    fetchByCamis(camis)
      .then((r) => {
        setRestaurant(r);
        if (r) document.title = `${r.dba} — eatsafe`;
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    return () => {
      document.title = "eatsafe — NYC Restaurant Inspection Search";
    };
  }, [camis, passedRestaurant]);

  const allInspections = restaurant
    ? Object.values(restaurant.inspections).sort(
        (a, b) =>
          new Date(b.date ?? "").getTime() - new Date(a.date ?? "").getTime(),
      )
    : [];

  const grade = restaurant?.latestGraded?.grade ?? null;
  const streetPart = restaurant
    ? [restaurant.building, norm(restaurant.street)].filter(Boolean).join(" ")
    : "";
  const addr = restaurant
    ? [streetPart, restaurant.zipcode, restaurant.boro]
        .filter(Boolean)
        .join(" · ")
    : "";
  const mapsUrl = restaurant
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([restaurant.dba, streetPart, restaurant.zipcode, "New York NY"].filter(Boolean).join(" "))}`
    : "";
  const yelpUrl = restaurant
    ? `https://www.yelp.com/search?find_desc=${encodeURIComponent(restaurant.dba)}&find_loc=${encodeURIComponent([streetPart, restaurant.zipcode, "New York NY"].filter(Boolean).join(", "))}`
    : "";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          type="button"
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

        {!loading && !error && !restaurant && (
          <p className="font-mono text-sm text-zinc-400 dark:text-zinc-500 mt-8">
            Restaurant not found.
          </p>
        )}

        {restaurant && (
          <>
            {/* Header */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h1 className="font-semibold text-2xl leading-snug text-zinc-900 dark:text-zinc-100">
                  {restaurant.dba}
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
                {restaurant.cuisine && (
                  <span className="font-mono text-xs text-zinc-600 tracking-wide uppercase border border-zinc-300 rounded px-2 py-0.5 mt-2 inline-block dark:text-zinc-300 dark:border-zinc-700">
                    {restaurant.cuisine}
                  </span>
                )}
              </div>
              <GradeBadge
                grade={grade}
                display={grade ? (GRADE_LABEL[grade] ?? grade) : undefined}
                sublabel={
                  grade === "Z" || grade === "P"
                    ? "PENDING"
                    : grade === "N"
                      ? "UNGRADED"
                      : "GRADE"
                }
                neverInspected={!grade}
                size="lg"
              />
            </div>

            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <a
                href={`https://a816-health.nyc.gov/ABCEatsRestaurants/#!/Search/${restaurant.camis}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
              >
                View on NYC Health ↗
              </a>
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
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
                >
                  📞{" "}
                  {restaurant.phone.replace(
                    /(\d{3})(\d{3})(\d{4})/,
                    "($1) $2-$3",
                  )}
                </a>
              )}
              <button
                type="button"
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
            {restaurant.lat && restaurant.lng && (
              <MiniMap lat={restaurant.lat} lng={restaurant.lng} />
            )}

            {/* Grade timeline */}
            <GradeTimeline
              inspections={allInspections}
              onSelect={(date) => {
                document
                  .getElementById(`insp-${date}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            />

            {/* Recurring violations */}
            {(() => {
              const cats = recurringCategories(allInspections);
              if (cats.length === 0) return null;
              return (
                <div className="mb-6 rounded border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                  <div className="font-mono text-xs tracking-widest text-amber-700 dark:text-amber-500 uppercase mb-2">
                    ↻ Recurring violations
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cats.map(({ emoji, label, count }) => (
                      <span
                        key={emoji}
                        title={`${label} — found in ${count} inspections`}
                        className="font-mono text-xs border border-amber-300 dark:border-amber-800 rounded px-2 py-0.5 text-amber-800 dark:text-amber-400 cursor-default"
                      >
                        {emoji} {label} · {count}×
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Inspection history */}
            <h2 className="font-mono text-xs tracking-widest text-zinc-400 dark:text-zinc-500 uppercase mb-3">
              {allInspections.length} Inspection
              {allInspections.length !== 1 ? "s" : ""}
            </h2>
            <div className="flex flex-col gap-3">
              {allInspections.map((insp) => (
                <InspectionSection
                  key={`${insp.date ?? "nodate"}-${insp.grade ?? "none"}`}
                  insp={insp}
                  isLatest={insp === restaurant.latest}
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
