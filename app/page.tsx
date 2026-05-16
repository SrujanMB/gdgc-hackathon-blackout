"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const BlackoutMap = dynamic(() => import("@/components/BlackoutMap"), {
  ssr: false,
  loading: () => (
    <p className="text-center p-10 text-white font-mono">
      Loading London Grid Data...
    </p>
  ),
});

export default function Map() {
  // State for search query (not yet implemented)
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <main className="h-screen w-screen bg-zinc-950 text-white">

      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-10 -10 34 34" strokeWidth={1.5} stroke="currentColor" className="size-6 absolute z-1000">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>


      {/* search bar */}
      <div className="absolute top-4 right-4 z-[1000]">
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-400 focus:outline-none focus:border-red-500"
        />
      </div>
      
      <div className="h-screen w-full">
        <BlackoutMap />
      </div>
    </main>
  );
}
