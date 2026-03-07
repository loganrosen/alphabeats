import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="rounded overflow-hidden mb-8" style={{ height: 180 }}>
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <CircleMarker
          center={[lat, lng]}
          radius={8}
          pathOptions={{
            color: "#fff",
            weight: 2,
            fillColor: "#ca8a04",
            fillOpacity: 1,
          }}
        />
      </MapContainer>
    </div>
  );
}
