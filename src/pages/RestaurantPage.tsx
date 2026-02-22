import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchByCamis } from '../api.js';
import type { Restaurant, Inspection, Violation } from '../api.js';
import { norm, fmtDate } from '../utils.js';

// ── shared helpers (duplicated from RestaurantCard to keep pages self-contained)

const GRADE_STYLES: Record<string, string> = {
  A: 'bg-green-700', B: 'bg-amber-600', C: 'bg-red-600',
};
const GRADE_LABEL: Record<string, string> = {
  A: 'A', B: 'B', C: 'C', N: 'N', Z: 'P', P: 'P',
};
const GRADE_TEXT: Record<string, string> = {
  A: 'text-green-700 dark:text-green-400',
  B: 'text-amber-600 dark:text-amber-400',
  C: 'text-red-600 dark:text-red-400',
};

const VIOLATION_CATEGORIES: { emoji: string; label: string; test: (d: string) => boolean }[] = [
  { emoji: '🐀', label: 'Rodents',          test: d => d.includes('mice') || d.includes('mouse') || d.includes('rodent') || d.includes('rat') || d.includes('droppings') },
  { emoji: '🪳', label: 'Cockroaches',      test: d => d.includes('roach') || d.includes('cockroach') },
  { emoji: '🪰', label: 'Insects / pests',  test: d => d.includes('fly') || d.includes('flies') || d.includes('insect') || d.includes('pest') },
  { emoji: '🌡️', label: 'Temperature',     test: d => d.includes('temperature') || d.includes('cold') || d.includes('hot holding') || d.includes('thaw') || d.includes('refrigerat') },
  { emoji: '🧼', label: 'Hand hygiene',     test: d => d.includes('hand wash') || d.includes('handwash') || d.includes('hand-wash') || d.includes('hygiene') || d.includes('bare hand') },
  { emoji: '🚰', label: 'Plumbing',         test: d => d.includes('sewage') || d.includes('plumbing') || d.includes('drain') || d.includes('water supply') || d.includes('toilet') },
  { emoji: '🧹', label: 'Sanitation',       test: d => d.includes('food contact') || d.includes('sanitiz') || d.includes('clean') || d.includes('wash') || d.includes('utensil') },
  { emoji: '⚠️', label: 'Contamination',   test: d => d.includes('raw') || d.includes('cross-contam') || d.includes('contamina') },
  { emoji: '🚬', label: 'Smoking',          test: d => d.includes('smoke') || d.includes('smoking') || d.includes('cigarette') },
  { emoji: '🗑️', label: 'Waste / garbage', test: d => d.includes('garbage') || d.includes('waste') || d.includes('refuse') || d.includes('trash') },
  { emoji: '📋', label: 'Permit / posting', test: d => d.includes('permit') || d.includes('license') || d.includes('sign') || d.includes('posted') || d.includes('notice') },
];
const DEFAULT_CATEGORY = { emoji: '📌', label: 'Other violation' };
function violationCategory(desc: string) {
  const d = desc.toLowerCase();
  return VIOLATION_CATEGORIES.find(c => c.test(d)) ?? DEFAULT_CATEGORY;
}

function ViolationList({ violations }: { violations: Violation[] }) {
  const sorted = [...violations].sort((a, b) => Number(b.critical) - Number(a.critical));
  return (
    <div className="flex flex-col gap-2 mt-1">
      {sorted.map((v, i) => {
        const { emoji, label } = violationCategory(v.desc);
        return (
          <div key={i} className={`text-sm pl-3 border-l-2 leading-relaxed ${v.critical ? 'border-red-500 text-zinc-800 dark:text-zinc-100' : 'border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'}`}>
            <div className="font-mono text-xs text-yellow-600 mb-0.5 dark:text-yellow-400">
              <span title={label}>{emoji}</span> {v.code}{v.critical ? ' · CRITICAL' : ''}
            </div>
            {v.desc}
          </div>
        );
      })}
    </div>
  );
}

function InspectionSection({ insp, isLatest }: { insp: Inspection; isLatest: boolean }) {
  const grade = insp.grade ?? null;
  const critCount = insp.violations.filter(v => v.critical).length;
  return (
    <div className={`rounded border p-4 flex flex-col gap-3 ${isLatest ? 'border-zinc-300 dark:border-zinc-600' : 'border-zinc-200 dark:border-zinc-800'}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`font-display text-2xl w-8 text-center shrink-0 ${GRADE_TEXT[grade ?? ''] ?? 'text-zinc-400'}`}>
          {grade ? (GRADE_LABEL[grade] ?? grade) : '—'}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-mono text-sm text-zinc-700 dark:text-zinc-200">{fmtDate(insp.date)}</span>
          {insp.type && <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">{insp.type}</span>}
        </div>
        <div className="ml-auto flex items-center gap-3 shrink-0 flex-wrap">
          {insp.score != null && <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{insp.score} pts</span>}
          {critCount > 0 && <span className="font-mono text-xs text-red-600 border border-red-300 rounded px-2 py-0.5 dark:text-red-300 dark:border-red-800">{critCount} critical</span>}
          {isLatest && <span className="font-mono text-xs text-yellow-600 border border-yellow-300 rounded px-2 py-0.5 dark:text-yellow-400 dark:border-yellow-700">Latest</span>}
        </div>
      </div>
      {insp.violations.length > 0
        ? <ViolationList violations={insp.violations} />
        : <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">No violations recorded.</p>
      }
    </div>
  );
}

export default function RestaurantPage() {
  const { camis } = useParams<{ camis: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const passedRestaurant = (location.state as { restaurant?: Restaurant } | null)?.restaurant ?? null;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(passedRestaurant);
  const [loading, setLoading] = useState(!passedRestaurant);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (passedRestaurant) {
      document.title = `${passedRestaurant.dba} — alphabeats`;
      return () => { document.title = 'alphabeats — NYC Restaurant Inspection Search'; };
    }
    if (!camis) return;
    setLoading(true);
    setError(null);
    fetchByCamis(camis)
      .then(r => {
        setRestaurant(r);
        if (r) document.title = `${r.dba} — alphabeats`;
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
    return () => { document.title = 'alphabeats — NYC Restaurant Inspection Search'; };
  }, [camis]); // eslint-disable-line react-hooks/exhaustive-deps

  const allInspections = restaurant
    ? Object.values(restaurant.inspections).sort(
        (a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime()
      )
    : [];

  const grade = restaurant?.latest?.grade ?? null;
  const streetPart = restaurant ? [restaurant.building, norm(restaurant.street)].filter(Boolean).join(' ') : '';
  const addr = restaurant ? [streetPart, restaurant.zipcode, restaurant.boro].filter(Boolean).join(' · ') : '';
  const mapsUrl = restaurant ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([restaurant.dba, streetPart, restaurant.zipcode, 'New York NY'].filter(Boolean).join(' '))}` : '';
  const yelpUrl = restaurant ? `https://www.yelp.com/search?find_desc=${encodeURIComponent(restaurant.dba)}&find_loc=${encodeURIComponent([streetPart, restaurant.zipcode, 'New York NY'].filter(Boolean).join(', '))}` : '';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
          className="font-mono text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors mb-6 inline-block cursor-pointer"
        >
          ← Back to search
        </button>

        {loading && (
          <p className="font-mono text-sm text-zinc-400 dark:text-zinc-500 mt-8">Loading…</p>
        )}

        {error && (
          <p className="font-mono text-sm text-red-500 mt-8">Error: {error}</p>
        )}

        {!loading && !error && !restaurant && (
          <p className="font-mono text-sm text-zinc-400 dark:text-zinc-500 mt-8">Restaurant not found.</p>
        )}

        {restaurant && (
          <>
            {/* Header */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h1 className="font-semibold text-2xl leading-snug text-zinc-900 dark:text-zinc-100">{restaurant.dba}</h1>
                <p className="font-mono text-sm text-zinc-500 mt-1 dark:text-zinc-300">
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">{addr}</a>
                </p>
                {restaurant.cuisine && (
                  <span className="font-mono text-xs text-zinc-600 tracking-wide uppercase border border-zinc-300 rounded px-2 py-0.5 mt-2 inline-block dark:text-zinc-300 dark:border-zinc-700">
                    {restaurant.cuisine}
                  </span>
                )}
              </div>
              {grade
                ? <div className={`${GRADE_STYLES[grade] ?? 'bg-zinc-400 dark:bg-zinc-700'} w-14 rounded shrink-0 flex flex-col items-center justify-center relative text-white py-3`}>
                    <span className="font-display text-4xl leading-none">{GRADE_LABEL[grade] ?? grade}</span>
                    <span className="font-mono text-[0.45rem] tracking-widest mt-1 opacity-75">
                      {grade === 'Z' || grade === 'P' ? 'PENDING' : grade === 'N' ? 'UNGRADED' : 'GRADE'}
                    </span>
                  </div>
                : <div className="w-14 rounded shrink-0 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 px-2 py-3">
                    <span className="font-mono text-xs text-center leading-tight">NOT YET</span>
                  </div>
              }
            </div>

            <div className="flex items-center gap-4 mb-6">
              <a
                href={`https://a816-health.nyc.gov/ABCEatsRestaurants/#!/Search/${restaurant.camis}`}
                target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
              >
                View on NYC Health ↗
              </a>
              <a
                href={mapsUrl}
                target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
              >
                Google Maps ↗
              </a>
              <a
                href={yelpUrl}
                target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
              >
                Yelp ↗
              </a>
            </div>

            {/* Mini map */}
            {restaurant.lat && restaurant.lng && (
              <div className="rounded overflow-hidden mb-8" style={{ height: 180 }}>
                <MapContainer
                  center={[restaurant.lat, restaurant.lng]}
                  zoom={16}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                  scrollWheelZoom={false}
                  dragging={false}
                  attributionControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <CircleMarker
                    center={[restaurant.lat, restaurant.lng]}
                    radius={8}
                    pathOptions={{ color: '#fff', weight: 2, fillColor: '#ca8a04', fillOpacity: 1 }}
                  />
                </MapContainer>
              </div>
            )}

            {/* Inspection history */}
            <h2 className="font-mono text-xs tracking-widest text-zinc-400 dark:text-zinc-500 uppercase mb-3">
              {allInspections.length} Inspection{allInspections.length !== 1 ? 's' : ''}
            </h2>
            <div className="flex flex-col gap-3">
              {allInspections.map((insp, i) => (
                <InspectionSection key={i} insp={insp} isLatest={insp === restaurant.latest} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
