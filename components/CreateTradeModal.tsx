"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface CreateTradeModalProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTradeModal({
  lat,
  lng,
  onClose,
  onSuccess,
}: CreateTradeModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form States
  const [haveTitle, setHaveTitle] = useState("");
  const [haveDesc, setHaveDesc] = useState("");
  const [wantTitle, setWantTitle] = useState("");
  const [wantDesc, setWantDesc] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!haveTitle || !wantTitle) {
      setError("Both offering and wanting item titles are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Send the payload to your unified Next.js API route
      const formData = new FormData();
      formData.append("lat", String(lat));
      formData.append("lng", String(lng));
      formData.append("haveTitle", haveTitle);
      formData.append("haveDesc", haveDesc);
      formData.append("wantTitle", wantTitle);
      formData.append("wantDesc", wantDesc);
      if (user?.userID != null) {
        formData.append("userId", String(user.userID));
      }
      if (imageFile) {
        formData.append("itemImage", imageFile);
      }

      const res = await fetch("/api/map-points", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to establish trade node.");
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error creating trade node:", err);
      setError(err.message || "Network error. Node could not be broadcasted.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-6 text-zinc-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
        >
          <X size={18} />
        </button>

        <h2 className="text-base font-bold tracking-wider text-amber-500 uppercase mb-1">
          Establish New Trade Node
        </h2>
        <p className="text-xs text-zinc-500 mb-4">
          Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded bg-red-950/50 border border-red-800 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* --- Item Offered --- */}
          <div className="space-y-2 border-l-2 border-emerald-600 pl-3">
            <label className="text-[11px] font-bold text-emerald-500 tracking-wider uppercase block">
              Asset You Have (Offering)
            </label>
            <input
              type="text"
              placeholder="e.g., Portable Water Filter"
              value={haveTitle}
              onChange={(e) => setHaveTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
            />
            <textarea
              placeholder="Describe condition, capacity, etc. (Optional)"
              value={haveDesc}
              onChange={(e) => setHaveDesc(e.target.value)}
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600 resize-none"
            />
            <label className="text-[11px] font-bold text-emerald-500 tracking-wider uppercase block mt-2">
              Upload Image (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="w-full text-[11px] text-zinc-200 file:mr-3 file:rounded-full file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-1 file:text-xs file:text-zinc-100"
            />
            {imageFile && (
              <p className="text-[11px] text-zinc-400">Selected: {imageFile.name}</p>
            )}
          </div>

          {/* --- Item Wanted --- */}
          <div className="space-y-2 border-l-2 border-amber-600 pl-3">
            <label className="text-[11px] font-bold text-amber-500 tracking-wider uppercase block">
              Asset You Need (Seeking)
            </label>
            <input
              type="text"
              placeholder="e.g., 12V Battery Pack"
              value={wantTitle}
              onChange={(e) => setWantTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-amber-600"
            />
            <textarea
              placeholder="Minimum specifications needed... (Optional)"
              value={wantDesc}
              onChange={(e) => setWantDesc(e.target.value)}
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-amber-600 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 text-zinc-950 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Broadcasting...
                </>
              ) : (
                "Broadcast Offer"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
