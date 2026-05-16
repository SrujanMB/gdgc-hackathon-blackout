"use client";

import { useEffect, useState, useRef } from "react";
import { X, Send, Loader2, ArrowUpDown, User, Pencil, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

interface Message {
  id: number;
  sender_id: number | null;
  receiver_id: number | null;
  content: string;
  created_at: string;
  trade_offer_id: number | null;
}

interface TradeItem {
  id: number;
  title: string;
  description: string | null;
}

interface ChatModalProps {
  tradeOfferId: number;
  recipientId: number;
  recipientName: string;
  tradeCreatorId: number;  // UserID of whoever created the trade node
  offering: TradeItem[];
  seeking: TradeItem[];
  onClose: () => void;
  onMessageSent?: (content: string) => void;
}

// ── Editable trade section ────────────────────────────────────────────────────
function TradeSection({
  label,
  colour,       // tailwind colour token used for border + label
  item,
  canEdit,
  onSave,
}: {
  label: string;
  colour: "emerald" | "amber";
  item: TradeItem | null;
  canEdit: boolean;
  onSave: (title: string, description: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item?.title ?? "");
  const [desc, setDesc] = useState(item?.description ?? "");
  const [saving, setSaving] = useState(false);

  const borderClass = colour === "emerald"
    ? "border-emerald-800/50 bg-emerald-950/40"
    : "border-amber-800/50 bg-amber-950/40";
  const labelClass = colour === "emerald" ? "text-emerald-400" : "text-amber-400";

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave(title.trim(), desc.trim());
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className={`rounded-xl border p-4 ${borderClass}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${labelClass}`}>
          {label}
        </p>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Item name"
            className="w-full px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Save
            </button>
            <button
              onClick={() => { setTitle(item?.title ?? ""); setDesc(item?.description ?? ""); setEditing(false); }}
              className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : item ? (
        <>
          <p className="text-sm font-semibold text-white">{item.title}</p>
          {item.description && (
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{item.description}</p>
          )}
        </>
      ) : (
        <p className="text-xs text-zinc-500 italic">Nothing listed</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ChatModal({
  tradeOfferId,
  recipientId,
  recipientName,
  tradeCreatorId,
  offering,
  seeking,
  onClose,
  onMessageSent,
}: ChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.userID ?? 0;
  // Trader = the person who created the trade node
  const isTrader = currentUserId === tradeCreatorId;

  // Local copies so edits are reflected immediately in the UI
  const [offeredItem, setOfferedItem] = useState<TradeItem | null>(offering[0] ?? null);
  const [soughtItem, setSoughtItem] = useState<TradeItem | null>(seeking[0] ?? null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    let ignore = false;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/messages?senderId=${currentUserId}&receiverId=${recipientId}&tradeOfferId=${tradeOfferId}`,
        );
        const data = await res.json();
        if (!ignore) {
          if (!res.ok) { setError(data.error || "Failed to load messages"); setMessages([]); return; }
          setMessages(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch {
        if (!ignore) { setError("Failed to load messages"); setMessages([]); }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`messages-${tradeOfferId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Message", filter: `trade_offer_id=eq.${tradeOfferId}` },
        (payload) => {
          if (!ignore) {
            const msg = payload.new as Message;
            setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          }
        },
      )
      .subscribe();

    return () => { ignore = true; supabase.removeChannel(channel); };
  }, [currentUserId, recipientId, tradeOfferId]);

  const sendQuickMessage = async (content: string) => {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId: currentUserId, receiverId: recipientId, content, tradeOfferId }),
    });
    const data = await res.json();
    if (res.ok && data.message) {
      setMessages((prev) => [...prev, data.message]);
      onMessageSent?.(content);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setIsSending(true);
    try {
      await sendQuickMessage(newMessage.trim());
      setNewMessage("");
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Patch an Item row and notify the chat
  const patchItem = async (
    item: TradeItem,
    newTitle: string,
    newDesc: string,
    role: "offering" | "seeking",
  ) => {
    await fetch("/api/map-points", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, title: newTitle, description: newDesc || null }),
    });
    const updated = { ...item, title: newTitle, description: newDesc || null };
    if (role === "offering") setOfferedItem(updated);
    else setSoughtItem(updated);
    await sendQuickMessage(
      `Updated ${role === "offering" ? "offering" : "exchange"} item to: ${newTitle}${newDesc ? ` — ${newDesc}` : ""}`,
    );
  };

  const handleAccept = async () => {
    setIsSending(true);
    try {
      await fetch("/api/map-points", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId: tradeOfferId, status: "completed" }),
      });
      await sendQuickMessage("Trade accepted! ✓ Status set to completed.");
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  const handleDecline = async () => {
    setIsSending(true);
    try {
      await sendQuickMessage("Trade declined.");
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex max-h-[680px] overflow-hidden">

        {/* ── LEFT: Chat ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-800">
          <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between shrink-0 bg-zinc-900/60">
            <div>
              <h2 className="text-sm font-bold tracking-wider text-blue-400 uppercase">
                Chat with {recipientName}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">Trade #{tradeOfferId}</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-zinc-950">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-zinc-500">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-xs text-center">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                      isMine ? "bg-blue-600 text-white rounded-br-sm" : "bg-zinc-800 text-zinc-200 rounded-bl-sm"
                    }`}>
                      <p className="break-words leading-relaxed">{msg.content}</p>
                      <p className={`text-[10px] mt-0.5 opacity-60 ${isMine ? "text-right" : "text-left"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="px-4 py-2 bg-red-950/50 border-t border-red-800 text-xs text-red-400 shrink-0">
              {error}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="border-t border-zinc-800 px-4 py-3 bg-zinc-900/60 shrink-0 flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending}
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="w-9 h-9 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
            >
              {isSending ? <Loader2 size={15} className="animate-spin text-white" /> : <Send size={15} className="text-white" />}
            </button>
          </form>
        </div>

        {/* ── RIGHT: Trade panel ────────────────────────────────────── */}
        <div className="w-[290px] shrink-0 flex flex-col bg-zinc-900">
          {/* Recipient avatar + name */}
          <div className="flex flex-col items-center pt-6 pb-4 px-4 shrink-0">
            <div className="w-14 h-14 rounded-full bg-purple-900/60 border border-purple-700 flex items-center justify-center mb-3">
              <User size={28} className="text-purple-400" />
            </div>
            <p className="text-base font-semibold text-white">{recipientName}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {isTrader ? "You are the trader" : "You are the buyer"}
            </p>
          </div>

          <div className="flex-1 px-4 pb-4 flex flex-col gap-3 overflow-y-auto">
            {/* Offering — only trader can edit */}
            <TradeSection
              label="Offering"
              colour="emerald"
              item={offeredItem}
              canEdit={isTrader}
              onSave={(title, desc) =>
                offeredItem ? patchItem(offeredItem, title, desc, "offering") : Promise.resolve()
              }
            />

            <div className="flex items-center justify-center">
              <ArrowUpDown size={18} className="text-zinc-600" />
            </div>

            {/* In exchange for — only buyer can edit */}
            <TradeSection
              label="In exchange for"
              colour="amber"
              item={soughtItem}
              canEdit={!isTrader}
              onSave={(title, desc) =>
                soughtItem ? patchItem(soughtItem, title, desc, "seeking") : Promise.resolve()
              }
            />

            {/* Human-readable summary */}
            {offeredItem && soughtItem && (
              <p className="text-xs text-zinc-500 text-center leading-relaxed px-1">
                {recipientName} is trading{" "}
                <span className="text-emerald-400 font-medium">{offeredItem.title}</span>{" "}
                for{" "}
                <span className="text-amber-400 font-medium">{soughtItem.title}</span>.
              </p>
            )}
          </div>

          {/* Decline / Accept */}
          <div className="px-4 pb-5 pt-3 flex gap-3 shrink-0 border-t border-zinc-800">
            <button
              disabled={isSending}
              onClick={handleDecline}
              className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm tracking-wide transition-colors disabled:opacity-50"
            >
              Decline
            </button>
            <button
              disabled={isSending}
              onClick={handleAccept}
              className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm tracking-wide transition-colors disabled:opacity-50"
            >
              Accept
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
