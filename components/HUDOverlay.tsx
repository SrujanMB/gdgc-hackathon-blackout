"use client";

import { ShieldAlert } from "lucide-react";

interface HUDOverlayProps {
  nodeCount: number;
  myLocation: [number, number] | null;
}

export default function HUDOverlay({ nodeCount, myLocation }: HUDOverlayProps) {
  return (
    <div className="absolute top-4 left-4 bg-zinc-950/90 backdrop-blur border border-zinc-800 p-3 rounded text-xs text-zinc-400 z-[1000] space-y-1 shadow-xl pointer-events-none">
      <div className="flex items-center gap-1.5 text-red-500 font-bold tracking-wider">
        <ShieldAlert size={14} />
        <span>BARTER NETWORK MONITOR</span>
      </div>
      <p>Active Trade Nodes: {nodeCount}</p>
      {myLocation && (
        <p className="text-blue-400">
          Coordinates: {myLocation[0].toFixed(3)}, {myLocation[1].toFixed(3)}
        </p>
      )}
    </div>
  );
}
