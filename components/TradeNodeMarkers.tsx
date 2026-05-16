"use client";

import { Marker, Popup } from "react-leaflet";
import { MessageCircle, Trash2, User } from "lucide-react";
import { renderToString } from "react-dom/server";
import L from "leaflet";

interface CleanMapNode {
  id: number;
  userId: number;
  latitude: number;
  longitude: number;
  name: string;
  offering: Array<{ id: number; title: string; description: string | null; image_url?: string | null }>;
  seeking: Array<{ id: number; title: string; description: string | null; image_url?: string | null }>;
}

interface TradeNodeMarkersProps {
  locations: CleanMapNode[];
  currentUserId: number;
  onMessageClick: (tradeOfferId: number, userId: number, name: string) => void;
  onDeleteClick: (tradeOfferId: number) => void;
}

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

export default function TradeNodeMarkers({ locations, currentUserId, onMessageClick, onDeleteClick }: TradeNodeMarkersProps) {
  return (
    <>
      {locations.map((node) => (
        <Marker
          key={node.id}
          position={[node.latitude, node.longitude]}
          icon={createTradeIcon()}
        >
          <Popup>
            <div className="p-1 min-w-[200px] font-sans text-zinc-200">
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
                      <img
                        src={item.image_url || "/noImage.png"}
                        alt={item.title}
                        className="mb-2 h-28 w-full rounded object-contain"
                      />
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
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="mb-2 h-28 w-full rounded object-contain"
                        />
                      ) : (
                        <img
                          src="/noImage.png"
                          alt="No image available"
                          className="mb-2 h-28 w-full rounded object-contain"
                        />
                      )}
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
}
