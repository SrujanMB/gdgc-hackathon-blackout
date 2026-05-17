"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Search, X } from "lucide-react";

interface LocationSearchResult {
  id: number;
  userId: string;
  latitude: number;
  longitude: number;
  distance: number;
  userName: string;
  label: string;
  tag: "OFFER" | "REQUEST" | "";
  offering: string;
  wanting: string;
}

interface LocationFilterProps {
  onLocationSelect: (result: LocationSearchResult) => void;
}

export default function LocationFilter({
  onLocationSelect,
}: LocationFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [itemsEnabled, setItemsEnabled] = useState(true);
  const [peopleEnabled, setPeopleEnabled] = useState(false);
  const [offersEnabled, setOffersEnabled] = useState(true);
  const [requestsEnabled, setRequestsEnabled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLat(position.coords.latitude);
          setUserLng(position.coords.longitude);
        },
        () => {
          setUserLat(-36.8485);
          setUserLng(174.7645);
        },
      );
    }
  }, []);

  useEffect(() => {
    const searchLocations = async () => {
      if (!searchQuery.trim() || userLat === null || userLng === null) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      const activeTypes: string[] = [];
      if (itemsEnabled) activeTypes.push("items");
      if (peopleEnabled) activeTypes.push("people");

      const activeDirections: string[] = [];
      if (offersEnabled) activeDirections.push("offers");
      if (requestsEnabled) activeDirections.push("wants");

      if (activeTypes.length === 0 || activeDirections.length === 0) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/location-search?q=${encodeURIComponent(
            searchQuery,
          )}&lat=${userLat}&lng=${userLng}&limit=8&types=${activeTypes.join(",")}&directions=${activeDirections.join(",")}`,
        );
        const data = await response.json();
        setResults(data);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchLocations, 300);
    return () => clearTimeout(debounceTimer);
  }, [
    searchQuery,
    userLat,
    userLng,
    itemsEnabled,
    peopleEnabled,
    offersEnabled,
    requestsEnabled,
  ]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelectResult = (result: LocationSearchResult) => {
    onLocationSelect(result);
    setIsOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setSearchQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const pillClass = (active: boolean) =>
    `px-2.5 py-1 text-xs font-mono rounded-md border transition ${
      active
        ? "bg-red-600 border-red-500 text-white"
        : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
    }`;

  return (
    <div ref={containerRef} className="absolute top-4 right-4 z-[1000] w-80">
      {/* Search Input */}
      <div className="flex items-center gap-2 bg-zinc-950/95 backdrop-blur border border-zinc-800 rounded-lg px-3 py-2 focus-within:border-red-500 transition">
        <Search size={16} className="text-zinc-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => searchQuery && setIsOpen(true)}
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder-zinc-500 font-mono"
        />
        {isLoading && (
          <Loader2 size={16} className="text-red-400 animate-spin shrink-0" />
        )}
        {searchQuery && !isLoading && (
          <button
            onClick={handleClear}
            className="text-zinc-500 hover:text-zinc-300 transition shrink-0"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Pills — always visible below search bar */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <button
          onClick={() => {
            if (itemsEnabled && !peopleEnabled) return;
            setItemsEnabled((v) => !v);
          }}
          className={pillClass(itemsEnabled)}
        >
          Items
        </button>
        <button
          onClick={() => {
            if (peopleEnabled && !itemsEnabled) return;
            setPeopleEnabled((v) => !v);
          }}
          className={pillClass(peopleEnabled)}
        >
          People
        </button>
        <span className="text-zinc-700 text-xs font-mono mx-0.5">|</span>
        <button
          onClick={() => {
            if (offersEnabled && !requestsEnabled) return;
            setOffersEnabled((v) => !v);
          }}
          className={pillClass(offersEnabled)}
        >
          Offers
        </button>
        <button
          onClick={() => {
            if (requestsEnabled && !offersEnabled) return;
            setRequestsEnabled((v) => !v);
          }}
          className={pillClass(requestsEnabled)}
        >
          Requests
        </button>
      </div>

      {/* Dropdown Results — positioned below the pills */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="mt-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg overflow-hidden"
        >
          {results.map((result, index) => (
            <button
              key={result.id}
              onClick={() => handleSelectResult(result)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-4 py-3 text-left border-b border-zinc-800 last:border-b-0 transition ${
                index === selectedIndex ? "bg-zinc-800" : "hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-mono truncate">
                    {result.label}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {result.tag && (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          result.tag === "OFFER"
                            ? "bg-emerald-900/60 text-emerald-400"
                            : "bg-amber-900/60 text-amber-400"
                        }`}
                      >
                        {result.tag}
                      </span>
                    )}
                    <span className="text-xs text-zinc-500 font-mono truncate">
                      {result.offering} ↔ {result.wanting}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-red-400 font-mono whitespace-nowrap shrink-0">
                  <MapPin size={12} />
                  {result.distance.toFixed(1)} km
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {isOpen && searchQuery && results.length === 0 && !isLoading && (
        <div className="mt-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-400 text-center font-mono">
            No matches found
          </p>
        </div>
      )}
    </div>
  );
}
