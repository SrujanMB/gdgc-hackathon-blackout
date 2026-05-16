"use client";

import { useEffect, useState, useRef } from "react";
import { X, Send, Loader2 } from "lucide-react";
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

interface ChatModalProps {
  tradeOfferId: number;
  recipientId: number;
  recipientName: string;
  onClose: () => void;
}

export default function ChatModal({
  tradeOfferId,
  recipientId,
  recipientName,
  onClose,
}: ChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.userID || 1;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          if (!res.ok) {
            setError(data.error || "Failed to load messages");
            setMessages([]);
            return;
          }
          setMessages(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch {
        if (!ignore) {
          setError("Failed to load messages");
          setMessages([]);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`messages-${tradeOfferId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `trade_offer_id=eq.${tradeOfferId}`,
        },
        (payload) => {
          if (!ignore) {
            const msg = payload.new as Message;
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          }
        },
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [currentUserId, recipientId, tradeOfferId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: recipientId,
          content: newMessage,
          tradeOfferId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      setNewMessage("");
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl flex flex-col max-h-[600px] relative">
        <div className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/50">
          <div>
            <h2 className="text-base font-bold tracking-wider text-blue-400 uppercase">
              Chat with {recipientName}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Trade Node #{tradeOfferId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500 text-xs text-center">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender_id === currentUserId
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg text-sm shadow-md ${
                      msg.sender_id === currentUserId
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-zinc-800 text-zinc-200 rounded-bl-none"
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <p className="text-xs mt-1.5 opacity-75 font-medium">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-950/50 border-t border-red-800 text-xs text-red-400">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          className="border-t border-zinc-800 p-4 bg-zinc-900/50"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending}
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
