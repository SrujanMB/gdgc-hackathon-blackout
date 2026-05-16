"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import { ShieldAlert } from "lucide-react";
import { UserProfile } from "@/types";
import "leaflet/dist/leaflet.css";

// No icon utilities: map will display only the base tiles/layout

export default function BlackoutMap() {
  const [locations, setLocations] = useState<UserProfile[]>([]);
  const londonCenter: [number, number] = [51.5074, -0.1278]; // Central London
  const [center, setCenter] = useState<[number, number]>(londonCenter);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [latInput, setLatInput] = useState<string>(String(londonCenter[0]));
  const [lngInput, setLngInput] = useState<string>(String(londonCenter[1]));
  const [locationError, setLocationError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/map-points")
      .then((res) => res.json())
      .then((data) => setLocations(data))
      .catch((err) => console.error("Failed to load grid points", err));
  }, []);

  // Try to use the user's real location as the start center
  useEffect(() => {
    if (!navigator?.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const userCenter: [number, number] = [latitude, longitude];
        setCenter(userCenter);
        if (mapInstance) {
          mapInstance.setView(userCenter, mapInstance.getZoom());
        }
        setLatInput(String(latitude));
        setLngInput(String(longitude));
        setStatus("Centered to browser geolocation");
      },
      (err) => {
        console.warn("Geolocation unavailable, using default center", err);
        setLocationError(err.message || "Geolocation error");
        setStatus("Geolocation unavailable");
      },
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, [mapInstance]);

  const handleUseMyLocation = () => {
    setLocationError(null);
    if (!navigator?.geolocation) {
      setLocationError("Geolocation is not available in this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const userCenter: [number, number] = [latitude, longitude];
        setCenter(userCenter);
        setLatInput(String(latitude));
        setLngInput(String(longitude));
        if (mapInstance) mapInstance.setView(userCenter, mapInstance.getZoom());
        setStatus("Centered to your location");
      },
      (err) => {
        setLocationError(err.message || "Failed to get location");
        setStatus("Failed to get location");
      },
      { enableHighAccuracy: true, timeout: 7000 },
    );
  };

  const handleApplyManualCoords = () => {
    setLocationError(null);
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setLocationError("Invalid latitude or longitude");
      return;
    }
    const coords: [number, number] = [lat, lng];
    setCenter(coords);
    if (mapInstance) mapInstance.setView(coords, mapInstance.getZoom());
    setStatus("Centered to manual coordinates");
  };

  // Ensure the map view follows `center` when it changes
  useEffect(() => {
    if (!mapInstance) return;
    try {
      mapInstance.setView(center, mapInstance.getZoom());
    } catch (e) {
      // ignore
    }
  }, [center, mapInstance]);

  // Fallback: react-leaflet hook-based updater to ensure map recenters
  function CenterUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
      try {
        map.setView(center, map.getZoom());
      } catch (e) {
        // ignore
      }
    }, [center, map]);
    return null;
  }

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={12}
        whenCreated={(m) => setMapInstance(m)}
        zoomControl={false} // clean minimalist HUD look
        className="w-full h-full"
      >
        {/* Lighter, free, tokenless base map */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
<<<<<<< Updated upstream
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
=======
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
        />
        <CenterUpdater center={center} />
        {/* Visual indicator for the selected center */}
        <CircleMarker
          center={center}
          radius={8}
          pathOptions={{ color: "#ff5722", fillColor: "#ffb4a2", fillOpacity: 0.9 }}
>>>>>>> Stashed changes
        />
      </MapContainer>

      {/* Floating HUD Panel */}
      <div className="absolute top-4 left-4 bg-zinc-950/90 backdrop-blur border border-zinc-800 p-3 rounded text-xs text-zinc-400 z-[1000] space-y-1 shadow-xl">
        <div className="flex items-center gap-1.5 text-red-500 font-bold tracking-wider">
          <ShieldAlert size={14} />
          <span>LONDON GRID MONITOR</span>
        </div>
        <p>Active Mesh Nodes: {locations.length}</p>

        <div className="mt-2 space-y-1 text-[11px] text-zinc-300">
          <button
            onClick={handleUseMyLocation}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-xs"
          >
            Use my location
          </button>

          <div className="flex items-center gap-2">
            <input
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              className="w-24 px-2 py-1 rounded bg-zinc-900 text-white text-xs"
              placeholder="lat"
            />
            <input
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              className="w-24 px-2 py-1 rounded bg-zinc-900 text-white text-xs"
              placeholder="lng"
            />
            <button
              onClick={handleApplyManualCoords}
              className="bg-sky-600 hover:bg-sky-500 text-white px-2 py-1 rounded text-xs"
            >
              Set
            </button>
          </div>

            {locationError ? (
              <div className="text-red-400 text-[11px]">{locationError}</div>
            ) : null}

            {status ? (
              <div className="text-green-300 text-[11px]">{status}</div>
            ) : null}
        </div>
      </div>
    </div>
  );
}
