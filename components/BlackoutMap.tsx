"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Store, User, ShieldAlert } from "lucide-react";
import { renderToString } from "react-dom/server";
import { UserProfile } from "@/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Quick utility to convert Lucide Icons into Leaflet-compatible HTML markers
const createCustomIcon = (isStore: boolean) => {
  const iconHtml = renderToString(
    <div
      className={`p-2 rounded-full border ${
        isStore
          ? "bg-emerald-950 text-emerald-400 border-emerald-500"
          : "bg-zinc-900 text-amber-400 border-amber-600"
      }`}
    >
      {isStore ? <Store size={18} /> : <User size={18} />}
    </div>,
  );

  return L.divIcon({
    html: iconHtml,
    className: "custom-leaflet-icon", // removes default white background styling
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

export default function BlackoutMap() {
  const [locations, setLocations] = useState<UserProfile[]>([]);
  const londonCenter: [number, number] = [51.5074, -0.1278]; // Central London

  useEffect(() => {
    fetch("/api/map-points")
      .then((res) => res.json())
      .then((data) => setLocations(data))
      .catch((err) => console.error("Failed to load grid points", err));
  }, []);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={londonCenter}
        zoom={12}
        zoomControl={false} // clean minimalist HUD look
        className="w-full h-full"
      >
        {/* Sleek, free, tokenless dark theme map layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {!Object.is(location, [])
          ? ""
          : locations.map((user) => (
              <Marker
                key={user.id}
                position={[user.latitude, user.longitude]}
                icon={createCustomIcon(user.is_store)}
              >
                <Popup>
                  <div className="p-1 min-w-[200px] font-sans text-zinc-200">
                    <h3 className="font-bold text-sm text-zinc-900 border-b pb-1 mb-2">
                      {user.is_store ? user.business_name : user.name}
                    </h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                      Node Type:{" "}
                      {user.is_store ? "Established Hub" : "Survivor"}
                    </p>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-emerald-600 font-semibold block text-[11px]">
                          🟢 OFFERING:
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 text-zinc-700">
                          {user.inventory
                            .filter((i) => i.type === "offering")
                            .map((i) => (
                              <li key={i.id}>{i.title}</li>
                            ))}
                        </ul>
                      </div>

                      <div>
                        <span className="text-amber-600 font-semibold block text-[11px]">
                          🔴 SEEKING:
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 text-zinc-700">
                          {user.inventory
                            .filter((i) => i.type === "seeking")
                            .map((i) => (
                              <li key={i.id}>{i.title}</li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
      </MapContainer>

      {/* Floating HUD Panel */}
      {/* <div className="absolute top-4 left-4 bg-zinc-950/90 backdrop-blur border border-zinc-800 p-3 rounded text-xs text-zinc-400 z-[1000] space-y-1 shadow-xl pointer-events-none">
        <div className="flex items-center gap-1.5 text-red-500 font-bold tracking-wider">
          <ShieldAlert size={14} />
          <span>LONDON GRID MONITOR</span>
        </div>
        <p>Active Mesh Nodes: {locations.length}</p>
      </div> */}
    </div>
  );
}
