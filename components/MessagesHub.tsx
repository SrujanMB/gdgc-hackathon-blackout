"use client";

import { useState } from "react";
import { Send, X, Search, MessageCircle } from "lucide-react";

export interface Conversation {
  tradeOfferId: number;
  recipientId: number;
  recipientName: string;
}

interface MessagesHubProps {
  conversations: Conversation[];
  onOpenChat: (tradeOfferId: number, recipientId: number, recipientName: string) => void;
  onClearAll: () => void;
  unreadCount?: number;
  onOpen?: () => void;
}

// Deterministic avatar colour from name — same name always gets same colour
const AVATAR_COLOURS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-orange-500",
  "bg-pink-600",
  "bg-teal-600",
  "bg-red-600",
  "bg-indigo-600",
];
function avatarColour(name: string) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return AVATAR_COLOURS[n % AVATAR_COLOURS.length];
}

export default function MessagesHub({ conversations, onOpenChat, onClearAll, unreadCount = 0, onOpen }: MessagesHubProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Show the 3 most recently added conversations as avatar stack in the pill
  const recentAvatars = conversations.slice(-3).reverse();

  const filtered = search.trim()
    ? conversations.filter((c) =>
        c.recipientName.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  // Newest conversation first in the list
  const sorted = [...filtered].reverse();

  const open = () => { setIsOpen(true); onOpen?.(); };
  const close = () => { setIsOpen(false); setSearch(""); };

  return (
    <>
      {/* ── Pill button — always visible when closed ─────────────────────── */}
      {!isOpen && (
        <button
          onClick={open}
          className="fixed bottom-6 left-4 z-[1001] flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-full shadow-xl hover:bg-zinc-800 transition-colors pill-enter"
        >
          {/* Unread badge sits on top-right of the pill */}
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <Send size={15} className="text-zinc-300 shrink-0" />
          <span className="text-sm font-semibold text-white">Messages</span>

          {/* Overlapping avatar stack — up to 3 most recent chats */}
          {recentAvatars.length > 0 && (
            <div className="flex -space-x-2 ml-0.5">
              {recentAvatars.map((conv) => (
                <div
                  key={`${conv.tradeOfferId}-${conv.recipientId}`}
                  title={conv.recipientName}
                  className={`w-6 h-6 rounded-full ${avatarColour(conv.recipientName)} flex items-center justify-center text-[11px] font-bold text-white border-2 border-zinc-900 shrink-0`}
                >
                  {conv.recipientName[0].toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </button>
      )}

      {/* ── Invisible backdrop — clicking outside closes the popup ─────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-[1001]" onClick={close} />
      )}

      {/* ── Floating popup box anchored above the pill ───────────────────── */}
      {isOpen && (
        <div
          className="fixed bottom-20 left-4 z-[1002] w-[420px] flex flex-col bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl popup-enter overflow-hidden"
          style={{ height: "clamp(360px, 60vh, 680px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <MessageCircle size={19} className="text-blue-400" />
              <h2 className="text-base font-bold text-white tracking-wide">Messages</h2>
            </div>
            <div className="flex items-center gap-2">
              {conversations.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-xs text-zinc-400 hover:text-red-400 transition-colors px-2 py-1 rounded-md hover:bg-zinc-800"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={close}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2.5">
              <Search size={14} className="text-zinc-500 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                  <MessageCircle size={30} className="text-zinc-600" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-zinc-300">
                    {conversations.length === 0 ? "No messages yet" : "No results found"}
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {conversations.length === 0
                      ? "Click on a trade node on the map, then hit Message to start a conversation."
                      : "Try a different name."}
                  </p>
                </div>
                {conversations.length === 0 && (
                  <div className="mt-1 px-4 py-2 rounded-full border border-zinc-700 text-xs text-zinc-400">
                    Tap a trade node → Message
                  </div>
                )}
              </div>
            ) : (
              <ul>
                {sorted.map((conv) => (
                  <li key={`${conv.tradeOfferId}-${conv.recipientId}`}>
                    <button
                      onClick={() => {
                        onOpenChat(conv.tradeOfferId, conv.recipientId, conv.recipientName);
                        close();
                      }}
                      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800 transition-colors text-left border-b border-zinc-800/50 last:border-b-0"
                    >
                      <div
                        className={`w-11 h-11 rounded-full ${avatarColour(conv.recipientName)} flex items-center justify-center text-base font-bold text-white shrink-0`}
                      >
                        {conv.recipientName[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {conv.recipientName}
                        </p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          Trade node #{conv.tradeOfferId}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
