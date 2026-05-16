"use client";

import { useEffect, useRef, useState } from "react";
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
import MessagesHub, { type Conversation } from "./MessagesHub";

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

export default function BlackoutMap() {
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
    tradeCreatorId: number;
    tradeStatus: string;
    offering: Array<{ id: number; title: string; description: string | null }>;
    seeking: Array<{ id: number; title: string; description: string | null }>;
  } | null>(null);
  // Persisted list of everyone the current user has opened a chat with.
  // Loaded from localStorage on mount (safe here because BlackoutMap is ssr:false).
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const raw = localStorage.getItem("barter-conversations");
      return raw ? (JSON.parse(raw) as Conversation[]) : [];
    } catch {
      return [];
    }
  });
  // Tracks messages that arrived while the MessagesHub popup was closed
  const [unreadCount, setUnreadCount] = useState(0);
  // Stable ref so the realtime callback always reads the latest locations
  // without needing to be re-subscribed every time locations changes
  const locationsRef = useRef(locations);

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

  // Keep the ref current whenever locations updates
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  // Listen for messages sent TO the current user by anyone.
  // When one arrives we add the sender to conversations (so it appears in the
  // MessagesHub list) and bump the unread badge on the pill.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`incoming-messages-user-${user.userID}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `receiver_id=eq.${user.userID}`,
        },
        (payload) => {
          const msg = payload.new as {
            id: number;
            sender_id: number | null;
            receiver_id: number | null;
            trade_offer_id: number | null;
            content: string;
          };
          if (!msg.sender_id || !msg.trade_offer_id) return;

          // Try to find the sender's name from any visible trade node they own
          const senderNode = locationsRef.current.find(
            (loc) => loc.userId === msg.sender_id,
          );
          const senderName = senderNode?.name ?? `Trader #${msg.sender_id}`;

          // Add to conversation list if this is a brand-new conversation
          setConversations((prev) => {
            const exists = prev.some(
              (c) =>
                c.tradeOfferId === msg.trade_offer_id &&
                c.recipientId === msg.sender_id,
            );
            if (exists) return prev;
            const updated = [
              ...prev,
              {
                tradeOfferId: msg.trade_offer_id!,
                recipientId: msg.sender_id!,
                recipientName: senderName,
              },
            ];
            localStorage.setItem(
              "barter-conversations",
              JSON.stringify(updated),
            );
            return updated;
          });

          // Update the preview text shown in the MessagesHub list
          updateLastMessage(msg.trade_offer_id!, msg.sender_id!, msg.content);

          // Bump the unread badge so the user notices the new message
          setUnreadCount((n) => n + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {},
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

  const handleDeleteTrade = async (id: number) => {
    try {
      const res = await fetch(`/api/map-points?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        // Remove immediately from local state so the marker disappears at once,
        // without waiting for the Supabase realtime event which can be delayed.
        setLocations((prev) => prev.filter((loc) => loc.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        console.warn("Delete failed:", data.error ?? res.status);
      }
    } catch (err) {
      console.error("Failed to delete trade node:", err);
    }
  };

  const updateLastMessage = (tradeOfferId: number, recipientId: number, content: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.tradeOfferId === tradeOfferId && c.recipientId === recipientId
          ? { ...c, lastMessage: content }
          : c,
      );
      localStorage.setItem("barter-conversations", JSON.stringify(updated));
      return updated;
    });
  };

  const handleMessageClick = (
    tradeOfferId: number,
    recipientId: number,
    recipientName: string,
  ) => {
    const node = locationsRef.current.find((loc) => loc.id === tradeOfferId);
    setSelectedChat({
      tradeOfferId,
      recipientId,
      recipientName,
      tradeCreatorId: node?.userId ?? recipientId,
      tradeStatus: node?.status ?? "open",
      offering: node?.offering ?? [],
      seeking: node?.seeking ?? [],
    });
    // Add to conversation history if this pair hasn't been chatted before
    setConversations((prev) => {
      const exists = prev.some(
        (c) => c.tradeOfferId === tradeOfferId && c.recipientId === recipientId,
      );
      if (exists) return prev;
      const updated = [...prev, { tradeOfferId, recipientId, recipientName }];
      localStorage.setItem("barter-conversations", JSON.stringify(updated));
      return updated;
    });
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
          tradeCreatorId={selectedChat.tradeCreatorId}
          tradeStatus={selectedChat.tradeStatus}
          offering={selectedChat.offering}
          seeking={selectedChat.seeking}
          onClose={() => setSelectedChat(null)}
          onMessageSent={(content) =>
            updateLastMessage(selectedChat.tradeOfferId, selectedChat.recipientId, content)
          }
        />
      )}

      <MessagesHub
        conversations={conversations}
        onOpenChat={handleMessageClick}
        onClearAll={() => {
          setConversations([]);
          localStorage.removeItem("barter-conversations");
        }}
        unreadCount={unreadCount}
        onOpen={() => setUnreadCount(0)}
      />
    </div>
  );
}
