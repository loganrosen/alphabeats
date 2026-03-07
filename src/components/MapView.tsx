import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";

export interface MapItem {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  grade?: string;
  score?: number | null;
  link: string;
  state?: Record<string, unknown>;
}

const GRADE_COLOR: Record<string, string> = {
  A: "#15803d",
  B: "#d97706",
  C: "#dc2626",
};

function gradeColor(item: MapItem): string {
  return GRADE_COLOR[item.grade ?? ""] ?? "#71717a";
}

function FitBounds({ items }: { items: (MapItem & { lat: number; lng: number })[] }) {
  const map = useMap();
  useEffect(() => {
    if (!items.length) return;
    if (items.length === 1) {
      map.setView([items[0].lat, items[0].lng], 16);
      return;
    }
    const lats = items.map((r) => r.lat);
    const lngs = items.map((r) => r.lng);
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [40, 40] },
    );
  }, [items, map]);
  return null;
}

export default function MapView({ items }: { items: MapItem[] }) {
  const navigate = useNavigate();
  const mapped = items.filter((r) => r.lat && r.lng) as (MapItem & {
    lat: number;
    lng: number;
  })[];

  return (
    <div className="relative w-full" style={{ height: "60vh", minHeight: 320 }}>
      <MapContainer
        center={[40.7128, -74.006]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds items={mapped} />
        {mapped.map((item) => (
          <CircleMarker
            key={item.id}
            center={[item.lat, item.lng]}
            radius={7}
            pathOptions={{
              color: "#fff",
              weight: 1.5,
              fillColor: gradeColor(item),
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => navigate(item.link, { state: item.state }),
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div className="text-xs font-mono">
                <div className="font-semibold">{item.name}</div>
                <div className="text-zinc-500">{item.address}</div>
                {item.grade && (
                  <div>
                    Grade {item.grade}
                    {item.score != null ? ` · ${item.score}pts` : ""}
                  </div>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      {mapped.length < items.length && (
        <div className="absolute bottom-2 left-2 z-[1000] bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-mono text-xs px-2 py-1 rounded shadow">
          {items.length - mapped.length} result
          {items.length - mapped.length !== 1 ? "s" : ""} without
          coordinates hidden
        </div>
      )}
    </div>
  );
}
