"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import {
  ShieldAlert,
  Navigation,
  Crosshair,
  Locate,
  X,
  User,
  MapPin,
  Plus,
  MessageCircle,
} from "lucide-react";
import { renderToString } from "react-dom/server";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CreateTradeModal from "./CreateTradeModal"; // Adjust path if necessary
import ChatModal from "./ChatModal"; // Chat Modal for messaging

// --- Types ---
interface CleanMapNode {
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  offering: Array<{ id: number; title: string; description: string | null }>;
  seeking: Array<{ id: number; title: string; description: string | null }>;
}

type Mode = "view" | "placing-custom" | "setting-location";

const AUCKLAND_CENTER: [number, number] = [-36.8485, 174.7645];

// --- Leaflet Custom Icon Generators ---
const createTradeIcon = () => {
  const iconHtml = renderToString(
    <div className="p-2 rounded-full border bg-zinc-900 text-amber-400 border-amber-600 shadow-lg animate-pulse-slow">
      <User size={18} />
    </div>,
  );
  return L.divIcon({
    html: iconHtml,
    className: "custom-leaflet-icon",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

const createMyLocationIcon = () => {
  const iconHtml = renderToString(
    <div className="p-2 rounded-full border bg-blue-950 text-blue-400 border-blue-500 shadow-md">
      <Navigation size={18} />
    </div>,
  );
  return L.divIcon({
    html: iconHtml,
    className: "custom-leaflet-icon",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

// --- Map Utility Components ---
function FlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15, { animate: true });
  }, [position, map]);
  return null;
}

function MapClickHandler({
  mode,
  onMapClick,
}: {
  mode: Mode;
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (mode !== "view") onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// --- Main Component ---
export default function BlackoutMap() {
  const [locations, setLocations] = useState<CleanMapNode[]>([]);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");

  // Modal State
  const [activeFormCoords, setActiveFormCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedChat, setSelectedChat] = useState<{
    tradeOfferId: number;
    recipientId: number;
    recipientName: string;
  } | null>(null);

  // Fetch from the Next.js API
  const fetchGridData = async () => {
    try {
      const res = await fetch("/api/map-points");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed grid fetch");
      setLocations(data);
    } catch (err) {
      console.error("Failed to load mesh infrastructure nodes:", err);
    }
  };

  useEffect(() => {
    fetchGridData();
  }, []);

  // Initial Geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation([pos.coords.latitude, pos.coords.longitude]),
      () => { }, // Ignore initial errors silently
      { timeout: 10000 },
    );
  }, []);

  const handleLocateMe = () => {
    setLocError("");
    if (!navigator.geolocation) {
      setLocError("Geolocation not supported by this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocError(
          err.code === 1
            ? "Location access denied."
            : "Could not fetch GPS parameters.",
        );
      },
      { timeout: 10000 },
    );
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (mode === "setting-location") {
      setMyLocation([lat, lng]);
      setMode("view");
    } else if (mode === "placing-custom") {
      setActiveFormCoords({ lat, lng });
      setMode("view");
    }
  };

  const addAtMyLocation = () => {
    if (!myLocation) return;
    setActiveFormCoords({ lat: myLocation[0], lng: myLocation[1] });
  };

  const deleteNode = async (id: number) => {
    try {
      const res = await fetch(`/api/map-points?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchGridData();
    } catch (err) {
      console.error("Failed node termination sequence:", err);
    }
  };

  const bannerText: Record<Exclude<Mode, "view">, string> = {
    "placing-custom": "Click the map to place a trade marker",
    "setting-location": "Click the map to set your location",
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={AUCKLAND_CENTER}
        zoom={12}
        zoomControl={false}
        className={`w-full h-full${mode !== "view" ? " cursor-crosshair" : ""}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          className="dark:invert"
        />

        <FlyTo position={myLocation} />
        <MapClickHandler mode={mode} onMapClick={handleMapClick} />

        {/* --- Render Live Database Trade Nodes --- */}
        {locations.map((node) => (
          <Marker
            key={node.id}
            position={[node.latitude, node.longitude]}
            icon={createTradeIcon()}
          >
            <Popup>
              <div className="p-1 min-w-[220px] font-sans text-zinc-200">
                <h3 className="font-bold text-sm text-zinc-900 border-b pb-1 mb-2 flex items-center gap-1">
                  <span>👤 {node.name}</span>
                </h3>

                <div className="space-y-3 text-xs mb-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-zinc-800">
                    <span className="text-emerald-700 font-bold block text-[10px] tracking-wider uppercase mb-0.5">
                      🟢 HAVE (OFFERING):
                    </span>
                    {node.offering.map((item) => (
                      <div key={item.id}>
                        <p className="font-semibold text-zinc-900 text-[13px]">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-[11px] text-zinc-500 font-normal mt-0.5 leading-tight">
                            {item.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded p-2 text-zinc-800">
                    <span className="text-amber-700 font-bold block text-[10px] tracking-wider uppercase mb-0.5">
                      🔴 WANT (SEEKING):
                    </span>
                    {node.seeking.map((item) => (
                      <div key={item.id}>
                        <p className="font-semibold text-zinc-900 text-[13px]">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-[11px] text-zinc-500 font-normal mt-0.5 leading-tight">
                            {item.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() =>
                    setSelectedChat({
                      tradeOfferId: node.id,
                      recipientId: node.id,
                      recipientName: node.name,
                    })
                  }
                  className="w-full text-center rounded bg-blue-600 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                >
                  <MessageCircle size={12} />
                  Message
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* --- Render User Device Location Marker --- */}
        {myLocation && (
          <Marker position={myLocation} icon={createMyLocationIcon()}>
            <Popup>
              <div className="p-1 font-sans">
                <p className="font-bold text-sm text-zinc-900">My Location</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {myLocation[0].toFixed(4)}, {myLocation[1].toFixed(4)}
                </p>
                <button
                  onClick={() => setMyLocation(null)}
                  className="text-xs text-red-500 mt-2 hover:underline font-medium"
                >
                  Remove Location Anchor
                </button>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* --- HUD Interface Overlays --- */}
      <div className="absolute top-4 left-4 bg-zinc-950/90 backdrop-blur border border-zinc-800 p-3 rounded text-xs text-zinc-400 z-[1000] space-y-1 shadow-xl pointer-events-none">
        <div className="flex items-center gap-1.5 text-red-500 font-bold tracking-wider">
          <ShieldAlert size={14} />
          <span>BARTER NETWORK MONITOR</span>
        </div>
        <p>Active Trade Nodes: {locations.length}</p>
        {myLocation && (
          <p className="text-blue-400">
            Coordinates: {myLocation[0].toFixed(3)}, {myLocation[1].toFixed(3)}
          </p>
        )}
      </div>

      {/* Mode Banner */}
      {mode !== "view" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-zinc-950/95 border border-zinc-700 px-4 py-2 rounded text-sm text-zinc-200 flex items-center gap-2 shadow-xl">
          <Crosshair size={14} className="text-red-400" />
          <span>{bannerText[mode]}</span>
          <button
            onClick={() => setMode("view")}
            className="ml-2 text-zinc-500 hover:text-zinc-300"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error Modals */}
      {locError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] bg-red-950/95 border border-red-700 px-4 py-2 rounded text-xs text-red-300 flex items-center gap-2 shadow-xl max-w-xs text-center">
          <span>{locError}</span>
          <button
            onClick={() => setLocError("")}
            className="ml-1 text-red-500 hover:text-red-300 shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Interface Panel Buttons */}
      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-blue-400 shadow-lg transition-all disabled:opacity-50"
        >
          <Locate size={13} />
          {locating ? "Scanning Coordinates..." : "Locate Me"}
        </button>
        <button
          onClick={() => setMode("setting-location")}
          className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border shadow-lg transition-all ${mode === "setting-location"
            ? "bg-blue-900/50 border-blue-500 text-blue-300"
            : "bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-blue-400"
            }`}
        >
          <Navigation size={13} />
          Pin Base Location
        </button>

        {myLocation && (
          <button
            onClick={addAtMyLocation}
            className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border bg-zinc-900/90 border-red-800 text-red-400 hover:bg-red-950/40 shadow-lg transition-all"
          >
            <Plus size={13} />
            Drop Trade Offer Here
          </button>
        )}
        <button
          onClick={() => setMode("placing-custom")}
          className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border shadow-lg transition-all ${mode === "placing-custom"
            ? "bg-red-900/50 border-red-500 text-red-300"
            : "bg-zinc-900/90 border-red-800 text-red-400 hover:bg-red-950/40"
            }`}
        >
          <Crosshair size={13} />
          Drop Custom Trade Node
        </button>
      </div>

      {/* --- Trade Creation Modal Overlay --- */}
      {activeFormCoords && (
        <CreateTradeModal
          lat={activeFormCoords.lat}
          lng={activeFormCoords.lng}
          onClose={() => setActiveFormCoords(null)}
          onSuccess={() => {
            setActiveFormCoords(null);
            fetchGridData(); // Instantly paints the new marker onto Leaflet
          }}
        />
      )}

      {/* --- Chat Modal Overlay --- */}
      {selectedChat && (
        <ChatModal
          tradeOfferId={selectedChat.tradeOfferId}
          recipientId={selectedChat.recipientId}
          recipientName={selectedChat.recipientName}
          onClose={() => setSelectedChat(null)}
        />
      )}
    </div>
  );
}
