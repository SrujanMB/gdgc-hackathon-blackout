"use client";

import { Navigation, Crosshair, Locate, Plus } from "lucide-react";

type Mode = "view" | "placing-custom" | "setting-location";

interface MapControlsProps {
  mode: Mode;
  locating: boolean;
  myLocation: [number, number] | null;
  onLocateMe: () => void;
  onSetMode: (mode: Mode) => void;
  onAddAtLocation: () => void;
}

export default function MapControls({
  mode,
  locating,
  myLocation,
  onLocateMe,
  onSetMode,
  onAddAtLocation,
}: MapControlsProps) {
  return (
    <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2">
      <button
        onClick={onLocateMe}
        disabled={locating}
        className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-blue-400 shadow-lg transition-all disabled:opacity-50"
      >
        <Locate size={13} />
        {locating ? "Scanning Coordinates..." : "Locate Me"}
      </button>
      <button
        onClick={() => onSetMode("setting-location")}
        className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border shadow-lg transition-all ${
          mode === "setting-location"
            ? "bg-blue-900/50 border-blue-500 text-blue-300"
            : "bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-blue-400"
        }`}
      >
        <Navigation size={13} />
        Pin Base Location
      </button>

      {myLocation && (
        <button
          onClick={onAddAtLocation}
          className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border bg-zinc-900/90 border-red-800 text-red-400 hover:bg-red-950/40 shadow-lg transition-all"
        >
          <Plus size={13} />
          Drop Trade Offer Here
        </button>
      )}
      <button
        onClick={() => onSetMode("placing-custom")}
        className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border shadow-lg transition-all ${
          mode === "placing-custom"
            ? "bg-red-900/50 border-red-500 text-red-300"
            : "bg-zinc-900/90 border-red-800 text-red-400 hover:bg-red-950/40"
        }`}
      >
        <Crosshair size={13} />
        Drop Custom Trade Node
      </button>
    </div>
  );
}
