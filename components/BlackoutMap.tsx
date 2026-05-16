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
import { Navigation, Crosshair, X } from "lucide-react";
import { renderToString } from "react-dom/server";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import TradeNodeMarkers from "./TradeNodeMarkers";
import MapControls from "./MapControls";
import HUDOverlay from "./HUDOverlay";
import CreateTradeModal from "./CreateTradeModal";
import ChatModal from "./ChatModal";

export type Mode = "view" | "placing-custom" | "setting-location";

const AUCKLAND_CENTER: [number, number] = [-36.8485, 174.7645];

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

const getTradeData = async () => {
  const res = await fetch("/api/map-points");
  if (!res.ok) throw new Error("Failed to fetch trade nodes");
  return res.json();
};

const bannerText: Record<Exclude<Mode, "view">, string> = {
  "placing-custom": "Click the map to place a trade marker",
  "setting-location": "Click the map to set your location",
};

export interface SearchLocationTarget {
  lat: number;
  lng: number;
}

interface BlackoutMapProps {
  searchLocation?: SearchLocationTarget | null;
  onClearSearchLocation?: () => void;
}

export default function BlackoutMap({ searchLocation, onClearSearchLocation }: BlackoutMapProps) {
  const { user } = useAuth();
  const [locations, setLocations] = useState<any[]>([]);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [activeFormCoords, setActiveFormCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedChat, setSelectedChat] = useState<{
    tradeOfferId: number;
    recipientId: number;
    recipientName: string;
  } | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("trade-offer-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Trade_Offer" },
        (payload) => {
          console.log("Trade_Offer realtime payload:", payload);
          getTradeData().then(setLocations).catch(console.error);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          getTradeData().then(setLocations).catch(console.error);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation([pos.coords.latitude, pos.coords.longitude]),
      () => { },
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
        onClearSearchLocation?.();
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
      onClearSearchLocation?.();
      setMode("view");
    } else if (mode === "placing-custom") {
      setActiveFormCoords({ lat, lng });
      onClearSearchLocation?.();
      setMode("view");
    }
  };

  const addAtMyLocation = () => {
    if (!myLocation) return;
    setActiveFormCoords({ lat: myLocation[0], lng: myLocation[1] });
    onClearSearchLocation?.();
  };

  const handleDeleteTrade = async (id: number) => {
    try {
      await fetch(`/api/map-points?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete trade node:", err);
    }
  };

  const handleMessageClick = (
    tradeOfferId: number,
    recipientId: number,
    recipientName: string,
  ) => {
    setSelectedChat({ tradeOfferId, recipientId, recipientName });
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

        <FlyTo position={searchLocation ? [searchLocation.lat, searchLocation.lng] : myLocation} />
        <MapClickHandler mode={mode} onMapClick={handleMapClick} />

        <TradeNodeMarkers
          locations={locations}
          currentUserId={user?.userID ?? 0}
          onMessageClick={handleMessageClick}
          onDeleteClick={handleDeleteTrade}
        />

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

      <HUDOverlay nodeCount={locations.length} myLocation={myLocation} />

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

      <MapControls
        mode={mode}
        locating={locating}
        myLocation={myLocation}
        onLocateMe={handleLocateMe}
        onSetMode={setMode}
        onAddAtLocation={addAtMyLocation}
      />

      {activeFormCoords && (
        <CreateTradeModal
          lat={activeFormCoords.lat}
          lng={activeFormCoords.lng}
          onClose={() => setActiveFormCoords(null)}
          onSuccess={() => {
            setActiveFormCoords(null);
          }}
        />
      )}

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
