import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import type { Restaurant } from '../api.js';

const GRADE_COLOR: Record<string, string> = {
  A: '#15803d',
  B: '#d97706',
  C: '#dc2626',
};

function gradeColor(r: Restaurant): string {
  return GRADE_COLOR[r.latest?.grade ?? ''] ?? '#71717a';
}

function FitBounds({ restaurants }: { restaurants: Restaurant[] }) {
  const map = useMap();
  useEffect(() => {
    const points = restaurants.filter(r => r.lat && r.lng) as (Restaurant & { lat: number; lng: number })[];
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16);
      return;
    }
    const lats = points.map(r => r.lat);
    const lngs = points.map(r => r.lng);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [40, 40] }
    );
  }, [restaurants, map]);
  return null;
}

export default function MapView({ restaurants }: { restaurants: Restaurant[] }) {
  const navigate = useNavigate();
  const mapped = restaurants.filter(r => r.lat && r.lng) as (Restaurant & { lat: number; lng: number })[];

  return (
    <div className="relative w-full" style={{ height: '60vh', minHeight: 320 }}>
      <MapContainer
        center={[40.7128, -74.006]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds restaurants={restaurants} />
        {mapped.map(r => (
          <CircleMarker
            key={r.camis}
            center={[r.lat, r.lng]}
            radius={7}
            pathOptions={{
              color: '#fff',
              weight: 1.5,
              fillColor: gradeColor(r),
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => navigate(`/restaurant/${r.camis}`, { state: { restaurant: r } }),
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div className="text-xs font-mono">
                <div className="font-semibold">{r.dba}</div>
                <div className="text-zinc-500">{r.building} {r.street}</div>
                {r.latest?.grade && <div>Grade {r.latest.grade}{r.latest.score != null ? ` · ${r.latest.score}pts` : ''}</div>}
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      {mapped.length < restaurants.length && (
        <div className="absolute bottom-2 left-2 z-[1000] bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-mono text-xs px-2 py-1 rounded shadow">
          {restaurants.length - mapped.length} result{restaurants.length - mapped.length !== 1 ? 's' : ''} without coordinates hidden
        </div>
      )}
    </div>
  );
}
