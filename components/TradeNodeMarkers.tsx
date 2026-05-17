"use client";

import { Marker, Popup } from "react-leaflet";
import { MessageCircle, Trash2, User } from "lucide-react";
import { renderToString } from "react-dom/server";
import L from "leaflet";
import React, { useEffect, useRef } from "react";

interface CleanMapNode {
  id: number;
  userId: number;
  latitude: number;
  longitude: number;
  name: string;
  offering: Array<{ id: number; title: string; description: string | null }>;
  seeking: Array<{ id: number; title: string; description: string | null }>;
}

interface TradeNodeMarkersProps {
  locations: CleanMapNode[];
  currentUserId: number;
  onMessageClick: (tradeOfferId: number, userId: number, name: string) => void;
  onDeleteClick: (tradeOfferId: number) => void;
  openTradeId?: number | null;
}

const TRADE_ICON = (() => {
  const iconHtml = renderToString(
    <div
      style={{ animation: "marker-fade-in 0.35s ease-out" }}
      className="p-2 rounded-full border bg-zinc-900 text-amber-400 border-amber-600 shadow-lg animate-pulse-slow"
    >
      <User size={18} />
    </div>,
  );
  return L.divIcon({
    html: iconHtml,
    className: "custom-leaflet-icon",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
})();

const tradeNodeMarkersAreEqual = (
  prev: TradeNodeMarkersProps,
  next: TradeNodeMarkersProps,
) => {
  if (prev.locations === next.locations) return true;
  if (prev.locations.length !== next.locations.length) return false;
  for (let i = 0; i < prev.locations.length; i++) {
    if (prev.locations[i].id !== next.locations[i].id) return false;
  }
  return (
    prev.currentUserId === next.currentUserId &&
    prev.openTradeId === next.openTradeId &&
    prev.onMessageClick === next.onMessageClick &&
    prev.onDeleteClick === next.onDeleteClick
  );
};

export default React.memo(function TradeNodeMarkers({ locations, currentUserId, onMessageClick, onDeleteClick, openTradeId }: TradeNodeMarkersProps) {
  const markerRefs = useRef<Map<number, L.Marker>>(new Map());

  useEffect(() => {
    if (openTradeId != null) {
      const marker = markerRefs.current.get(openTradeId);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [openTradeId]);

  return (
    <>
      <style>{`@keyframes marker-fade-in{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}`}</style>
      {locations.map((node) => (
        <Marker
          key={node.id}
          position={[node.latitude, node.longitude]}
          icon={TRADE_ICON}
          ref={(ref) => {
            if (ref) markerRefs.current.set(node.id, ref);
          }}
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

              {node.userId === currentUserId ? (
                <button
                  onClick={() => onDeleteClick(node.id)}
                  className="w-full text-center rounded bg-red-600 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 size={12} />
                  Delete Trade
                </button>
              ) : (
                <button
                  onClick={() => onMessageClick(node.id, node.userId, node.name)}
                  className="w-full text-center rounded bg-blue-600 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                >
                  <MessageCircle size={12} />
                  Message
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}, tradeNodeMarkersAreEqual);
