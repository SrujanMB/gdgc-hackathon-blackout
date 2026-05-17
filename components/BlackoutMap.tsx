"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { Navigation, Crosshair, X, Check } from "lucide-react";
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

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  const lat = position?.[0];
  const lng = position?.[1];
  useEffect(() => {
    if (lat == null || lng == null) return;
    map.setView([lat, lng], 15, { animate: true });
  }, [lat, lng, map]);
  return null;
}

function MapCenterTracker({
  centerRef,
  onSettle,
}: {
  centerRef: React.MutableRefObject<[number, number]>;
  onSettle: () => void;
}) {
  const map = useMap();
  const settleTimer = useRef<number | undefined>(undefined);
  const onSettleRef = useRef(onSettle);
  onSettleRef.current = onSettle;

  useEffect(() => {
    const handle = () => {
      const c = map.getCenter();
      centerRef.current = [c.lat, c.lng];
      if (settleTimer.current !== undefined) clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(onSettleRef.current, 450);
    };
    map.on("moveend", handle);
    return () => {
      map.off("moveend", handle);
      if (settleTimer.current !== undefined) clearTimeout(settleTimer.current);
    };
  }, [map, centerRef]);
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
  selectedTradeId?: number | null;
  radiusKm?: number;
  onSettle?: (center: [number, number]) => void;
}

export default React.memo(function BlackoutMap({
  searchLocation,
  onClearSearchLocation,
  selectedTradeId,
  radiusKm,
  onSettle,
}: BlackoutMapProps) {
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
  // Key scoped to the logged-in user so switching accounts starts a fresh list
  const storageKey = `barter-conversations-${user?.userID ?? "guest"}`;

  // Persisted list of everyone the current user has opened a chat with.
  // Loaded from localStorage on mount (safe here because BlackoutMap is ssr:false).
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const raw = localStorage.getItem(
        `barter-conversations-${user?.userID ?? "guest"}`,
      );
      return raw ? (JSON.parse(raw) as Conversation[]) : [];
    } catch {
      return [];
    }
  });
  // Tracks messages that arrived while the MessagesHub popup was closed
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<"success" | "deleted" | null>(null);
  const showToast = (type: "success" | "deleted") => {
    setToast(type);
    setTimeout(() => setToast(null), 3500);
  };
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
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any).id;
            setConversations((prev) => {
              const wasConversing = prev.some(
                (c) => c.tradeOfferId === deletedId,
              );
              if (!wasConversing) return prev;
              const updated = prev.filter((c) => c.tradeOfferId !== deletedId);
              localStorage.setItem(storageKey, JSON.stringify(updated));
              setSelectedChat((cur) =>
                cur?.tradeOfferId === deletedId ? null : cur,
              );
              showToast("deleted");
              return updated;
            });
          }
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

          // Buyer accepted — notify the trader and clean up
          if (msg.content === "Trade accepted! ✓") {
            // Mark so the Trade_Offer DELETE event doesn't also show "Trade Cancelled"
            setSelectedChat((current) =>
              current?.tradeOfferId === msg.trade_offer_id ? null : current,
            );
            setConversations((prev) => {
              const updated = prev.filter(
                (c) => c.tradeOfferId !== msg.trade_offer_id,
              );
              localStorage.setItem(storageKey, JSON.stringify(updated));
              return updated;
            });
            showToast("success");
            return;
          }

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
            localStorage.setItem(storageKey, JSON.stringify(updated));
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

  const handleDeleteTrade = useCallback(async (id: number, silent = false) => {
    try {
      const res = await fetch(`/api/map-points?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setLocations((prev) => prev.filter((loc) => loc.id !== id));
        if (!silent) showToast("deleted");
      } else {
        const data = await res.json().catch(() => ({}));
        console.warn("Delete failed:", data.error ?? res.status);
      }
    } catch (err) {
      console.error("Failed to delete trade node:", err);
    }
  }, []);

  const updateLastMessage = (
    tradeOfferId: number,
    recipientId: number,
    content: string,
  ) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.tradeOfferId === tradeOfferId && c.recipientId === recipientId
          ? { ...c, lastMessage: content }
          : c,
      );
      localStorage.setItem(storageKey, JSON.stringify(updated));
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
    setConversations((prev) => {
      const exists = prev.some(
        (c) => c.tradeOfferId === tradeOfferId && c.recipientId === recipientId,
      );
      if (exists) return prev;
      const updated = [...prev, { tradeOfferId, recipientId, recipientName }];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const myLocationIcon = useMemo(() => createMyLocationIcon(), []);
  const centerRef = useRef<[number, number]>([-36.8485, 174.7645]);
  const [settledKey, setSettledKey] = useState(0);
  const [settledCenter, setSettledCenter] = useState<[number, number]>([
    -36.8485, 174.7645,
  ]);

  const handleSettle = useCallback(() => {
    const c = centerRef.current;
    setSettledCenter(c);
    setSettledKey((k) => k + 1);
    onSettle?.(c);
  }, [onSettle]);

  const cachedFilteredRef = useRef<any[]>([]);
  const filteredLocations = useMemo(() => {
    if (!radiusKm) return locations;
    const c = centerRef.current;
    const result = locations.filter((loc: any) => {
      const dist = haversine(c[0], c[1], loc.latitude, loc.longitude);
      return dist <= radiusKm;
    });
    const prev = cachedFilteredRef.current;
    if (
      result.length === prev.length &&
      result.every((loc, i) => loc.id === prev[i].id)
    ) {
      return prev;
    }
    cachedFilteredRef.current = result;
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, radiusKm, settledKey]);

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

        <style>{`@keyframes circle-fade-in{from{opacity:0}}.animate-circle-fade-in{animation:circle-fade-in 0.4s ease-out}`}</style>
        <MapCenterTracker centerRef={centerRef} onSettle={handleSettle} />
        {radiusKm && radiusKm <= 10 ? (
          <Circle
            key={`${settledCenter[0].toFixed(3)}_${settledCenter[1].toFixed(3)}_${radiusKm}`}
            center={settledCenter}
            radius={radiusKm * 1000}
            pathOptions={{
              color: "#a1a1aa",
              weight: 1.5,
              opacity: 0.5,
              fillColor: "#a1a1aa",
              fillOpacity: 0.06,
              dashArray: "4 8",
              className: "animate-circle-fade-in",
            }}
          />
        ) : null}
        <FlyTo
          position={
            searchLocation
              ? [searchLocation.lat, searchLocation.lng]
              : myLocation
          }
        />
        <MapClickHandler mode={mode} onMapClick={handleMapClick} />

        <TradeNodeMarkers
          locations={filteredLocations}
          currentUserId={user?.userID ?? 0}
          onMessageClick={handleMessageClick}
          onDeleteClick={handleDeleteTrade}
          openTradeId={selectedTradeId}
        />

        {myLocation && (
          <Marker position={myLocation} icon={myLocationIcon}>
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

      <HUDOverlay
        nodeCount={filteredLocations.length}
        totalCount={locations.length}
        myLocation={myLocation}
      />

      {mode !== "view" && (
        <div className="absolute top-48 left-1/2 -translate-x-1/2 z-[1001] bg-zinc-950/95 border-2 border-zinc-700 px-4 py-2 rounded-xl text-sm text-zinc-200 flex items-center gap-2 shadow-xl">
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
            updateLastMessage(
              selectedChat.tradeOfferId,
              selectedChat.recipientId,
              content,
            )
          }
          onAccepted={() => {
            const doneId = selectedChat.tradeOfferId;
            handleDeleteTrade(doneId, true);
            setSelectedChat(null);
            setConversations((prev) => {
              const updated = prev.filter((c) => c.tradeOfferId !== doneId);
              localStorage.setItem(storageKey, JSON.stringify(updated));
              return updated;
            });
            showToast("success");
          }}
        />
      )}

      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-3 rounded-lg shadow-2xl pointer-events-none ${
            toast === "success"
              ? "bg-green-900/40 border border-green-700"
              : "bg-red-900/40 border border-red-700"
          }`}
        >
          {toast === "success" ? (
            <Check size={16} className="text-green-400" />
          ) : (
            <X size={16} className="text-red-400" />
          )}
          <span
            className={`text-sm font-bold tracking-wide ${toast === "success" ? "text-green-400" : "text-red-400"}`}
          >
            {toast === "success" ? "Trade Completed" : "Trade Cancelled"}
          </span>
        </div>
      )}

      <MessagesHub
        conversations={conversations}
        onOpenChat={handleMessageClick}
        onClearAll={() => {
          setConversations([]);
          localStorage.removeItem(storageKey);
        }}
        unreadCount={unreadCount}
        onOpen={() => setUnreadCount(0)}
      />
    </div>
  );
});
