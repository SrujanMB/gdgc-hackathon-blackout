"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import { Store, User, ShieldAlert, MapPin, Navigation, Plus, X, Crosshair, Locate } from "lucide-react";
import { renderToString } from "react-dom/server";
import { UserProfile } from "@/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface RedMarker {
  id: string;
  lat: number;
  lng: number;
  placeholder: boolean;
}

type Mode = "view" | "placing-custom" | "setting-location";

const LONDON_CENTER: [number, number] = [51.5074, -0.1278];

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
    className: "custom-leaflet-icon",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

const createRedIcon = (placeholder: boolean) => {
  const iconHtml = renderToString(
    <div
      className={`p-2 rounded-full border ${
        placeholder 
          ? "bg-red-950 text-red-300 border-dashed border-red-500"
          : "bg-red-950 text-red-400 border-red-500"
      }`}
    >
      <MapPin size={18} />
    </div>,
  );
  return L.divIcon({
    html: iconHtml,
    className: "custom-leaflet-icon",
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
};

const createMyLocationIcon = () => {
  const iconHtml = renderToString(
    <div className="p-2 rounded-full border bg-blue-950 text-blue-400 border-blue-500">
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

// Pans map when user location is first found
function FlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15, { animate: false });
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
      if (mode !== "view") {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function BlackoutMap() {
  const [locations, setLocations] = useState<UserProfile[]>([]);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [redMarkers, setRedMarkers] = useState<RedMarker[]>([]);
  const [mode, setMode] = useState<Mode>("view");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");

  useEffect(() => {
    fetch("/api/map-points")
      .then((res) => res.json())
      .then((data) => setLocations(data))
      .catch((err) => console.error("Failed to load grid points", err));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    setLocError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocError("Location permission denied — allow it in browser settings");
        }
      },
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
            ? "Location permission denied — allow it in browser settings"
            : "Could not get location, try again",
        );
      },
      { timeout: 10000 },
    );
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (mode === "setting-location") {
      setMyLocation([lat, lng]);
    } else if (mode === "placing-custom") {
      setRedMarkers((prev) => [
        ...prev,
        { id: crypto.randomUUID(), lat, lng, placeholder: true },
      ]);
    }
    setMode("view");
  };

  const addAtMyLocation = () => {
    if (!myLocation) return;
    setRedMarkers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        lat: myLocation[0],
        lng: myLocation[1],
        placeholder: true,
      },
    ]);
  };

  const removeMarker = (id: string) => {
    setRedMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  const bannerText: Record<Exclude<Mode, "view">, string> = {
    "placing-custom": "Click the map to place a placeholder trading marker",
    "setting-location": "Click the map to set your location",
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={LONDON_CENTER}
        zoom={12}
        zoomControl={false}
        zoomAnimation={false}
        fadeAnimation={false}
        className={`w-full h-full${mode !== "view" ? " cursor-crosshair" : ""}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        />

        <FlyTo position={myLocation} />
        <MapClickHandler mode={mode} onMapClick={handleMapClick} />

        {locations.length > 0 &&
          locations.map((user) => (
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
                  className="text-xs text-red-500 mt-2 hover:underline"
                >
                  Remove
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {redMarkers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={createRedIcon(m.placeholder)}>
            <Popup>
              <div className="p-2 font-sans text-zinc-900 min-w-[220px] space-y-3">
                {m.placeholder ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-violet-300/70 flex items-center justify-center text-violet-700">
                          <span className="text-sm font-bold">N</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">Name</p>
                          <p className="text-[11px] text-zinc-500">Trading Away</p>
                        </div>
                      </div>
                      <div className="rounded border border-zinc-300/60 bg-white/90 p-2 text-xs text-zinc-600 min-h-[64px]">
                        Trading Away
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">
                        Wants to trade
                      </label>
                      <select className="w-full rounded border border-zinc-300 bg-white/90 px-2 py-1 text-sm text-zinc-800">
                        <option>Wants to trade</option>
                        <option>Food</option>
                        <option>Medicine</option>
                        <option>Tools</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">
                        Message name (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Message Name"
                        className="w-full rounded border border-zinc-300 bg-white/90 px-2 py-1 text-sm text-zinc-800"
                      />
                    </div>
                    <button
                      onClick={() => removeMarker(m.id)}
                      className="w-full rounded bg-red-500 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:bg-red-600"
                    >
                      Remove placeholder
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-sm">Red Marker</p>
                    <p className="text-xs text-zinc-500">
                      {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
                    </p>
                    <button
                      onClick={() => removeMarker(m.id)}
                      className="text-xs text-red-500 mt-2 hover:underline"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* HUD */}
      <div className="absolute top-4 left-4 bg-zinc-950/90 backdrop-blur border border-zinc-800 p-3 rounded text-xs text-zinc-400 z-[1000] space-y-1 shadow-xl pointer-events-none">
        <div className="flex items-center gap-1.5 text-red-500 font-bold tracking-wider">
          <ShieldAlert size={14} />
          <span>LONDON GRID MONITOR</span>
        </div>
        <p>Active Mesh Nodes: {locations.length}</p>
        {myLocation && (
          <p className="text-blue-400">
            Your pos: {myLocation[0].toFixed(3)}, {myLocation[1].toFixed(3)}
          </p>
        )}
        {redMarkers.length > 0 && (
          <p className="text-red-400">Red markers: {redMarkers.length}</p>
        )}
      </div>

      {/* Mode banner */}
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

      {/* Location error */}
      {locError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] bg-red-950/95 border border-red-700 px-4 py-2 rounded text-xs text-red-300 flex items-center gap-2 shadow-xl max-w-xs text-center">
          <span>{locError}</span>
          <button onClick={() => setLocError("")} className="ml-1 text-red-500 hover:text-red-300 shrink-0">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2">
        {/* Location buttons */}
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-blue-400 shadow-lg transition-all disabled:opacity-50"
        >
          <Locate size={13} />
          {locating ? "Locating..." : "Find My Location"}
        </button>
        <button
          onClick={() => setMode("setting-location")}
          className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border shadow-lg transition-all ${
            mode === "setting-location"
              ? "bg-blue-900/50 border-blue-500 text-blue-300"
              : "bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-blue-400"
          }`}
        >
          <Navigation size={13} />
          Set Location on Map
        </button>

        {/* Marker buttons */}
        {myLocation && (
          <button
            onClick={addAtMyLocation}
            className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border bg-zinc-900/90 border-red-800 text-red-400 hover:bg-red-950/40 shadow-lg transition-all"
          >
            <Plus size={13} />
            Add Marker at My Location
          </button>
        )}
        <button
          onClick={() => setMode("placing-custom")}
          className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border shadow-lg transition-all ${
            mode === "placing-custom"
              ? "bg-red-900/50 border-red-500 text-red-300"
              : "bg-zinc-900/90 border-red-800 text-red-400 hover:bg-red-950/40"
          }`}
        >
          <Crosshair size={13} />
          Add Custom Marker
        </button>
      </div>
    </div>
  );
}
