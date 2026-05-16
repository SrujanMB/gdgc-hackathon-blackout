'use client';

import { useState, useEffect } from 'react';
import { type Trade, type Offer } from '@/app/data/trades';

const STORAGE_KEY = 'barter-trades-v2';

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Post Trade Modal ──────────────────────────────────────────────────────────

function PostTradeModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (t: Omit<Trade, 'id' | 'createdAt' | 'offers'>) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [wantDescription, setWantDescription] = useState('');
  const [postedBy, setPostedBy] = useState('');

  const canSubmit = title.trim() && description.trim() && wantDescription.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      wantDescription: wantDescription.trim(),
      postedBy: postedBy.trim() || 'Anonymous',
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Post a Trade</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Trade Title *</span>
            <input
              type="text"
              placeholder='e.g. "Guitar lessons for web design"'
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">What are you offering? *</span>
            <textarea
              placeholder='Describe what you have or can do (e.g. "I can teach beginner guitar, 1h sessions")'
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 text-sm resize-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">What do you want in return? *</span>
            <textarea
              placeholder='Describe what you want (e.g. "Help redesigning my portfolio site")'
              value={wantDescription}
              onChange={e => setWantDescription(e.target.value)}
              rows={3}
              className="px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 text-sm resize-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Your Name</span>
            <input
              type="text"
              placeholder="Optional"
              value={postedBy}
              onChange={e => setPostedBy(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 text-sm"
            />
          </label>

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Post Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Trade Detail Modal ────────────────────────────────────────────────────────

type OfferMode = null | 'offer' | 'counteroffer';

function TradeDetailModal({
  trade,
  onClose,
  onAddOffer,
}: {
  trade: Trade;
  onClose: () => void;
  onAddOffer: (tradeId: string, offer: Omit<Offer, 'id' | 'createdAt'>) => void;
}) {
  const [mode, setMode] = useState<OfferMode>(null);
  const [fromName, setFromName] = useState('');
  const [message, setMessage] = useState('');

  function submitOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    onAddOffer(trade.id, {
      type: mode as 'offer' | 'counteroffer',
      fromName: fromName.trim() || 'Anonymous',
      message: message.trim(),
    });
    setMode(null);
    setFromName('');
    setMessage('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{trade.title}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Posted by <span className="font-medium">{trade.postedBy}</span> · {timeAgo(trade.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xl leading-none shrink-0">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-6">

          {/* Trade details */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Offering</span>
              <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">{trade.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
              <span className="text-zinc-400 text-base">⇄</span>
              <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Wants in return</span>
              <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">{trade.wantDescription}</p>
            </div>
          </div>

          {/* Action buttons */}
          {mode === null && (
            <div className="flex gap-3">
              <button
                onClick={() => setMode('offer')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
              >
                ✓ Accept Trade
              </button>
              <button
                onClick={() => setMode('counteroffer')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-500 transition-colors"
              >
                ↩ Counter Offer
              </button>
            </div>
          )}

          {/* Offer / Counter Offer form */}
          {mode !== null && (
            <form onSubmit={submitOffer} className="flex flex-col gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {mode === 'offer' ? '✓ Accept this trade' : '↩ Counter Offer'}
                </h3>
                <button type="button" onClick={() => setMode(null)} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                  Cancel
                </button>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Your Name</span>
                <input
                  type="text"
                  placeholder="Optional"
                  value={fromName}
                  onChange={e => setFromName(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  {mode === 'offer' ? 'Message (how to reach you, availability, etc.) *' : 'What would you offer instead? *'}
                </span>
                <textarea
                  placeholder={
                    mode === 'offer'
                      ? 'e.g. "I\'m available weekends, reach me at hello@example.com"'
                      : 'e.g. "Instead of web design, I can offer social media management"'
                  }
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 text-sm resize-none"
                />
              </label>

              <button
                type="submit"
                disabled={!message.trim()}
                className={`py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
                  mode === 'offer'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300'
                }`}
              >
                {mode === 'offer' ? 'Send Offer' : 'Send Counter Offer'}
              </button>
            </form>
          )}

          {/* Existing offers */}
          {trade.offers.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                {trade.offers.length} Response{trade.offers.length !== 1 ? 's' : ''}
              </h3>
              {trade.offers.map(offer => (
                <div
                  key={offer.id}
                  className={`rounded-xl p-3.5 text-sm flex flex-col gap-1 ${
                    offer.type === 'offer'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{offer.fromName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      offer.type === 'offer'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {offer.type === 'offer' ? '✓ Trade Offer' : '↩ Counter Offer'}
                    </span>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{offer.message}</p>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">{timeAgo(offer.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Board ────────────────────────────────────────────────────────────────

export default function TradeBoard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setTrades(JSON.parse(stored));
    } catch {}
  }, []);

  function saveTrades(next: Trade[]) {
    setTrades(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function handlePostTrade(data: Omit<Trade, 'id' | 'createdAt' | 'offers'>) {
    const trade: Trade = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      offers: [],
    };
    saveTrades([trade, ...trades]);
    setShowPostForm(false);
  }

  function handleAddOffer(tradeId: string, offerData: Omit<Offer, 'id' | 'createdAt'>) {
    const offer: Offer = {
      ...offerData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    const next = trades.map(t =>
      t.id === tradeId ? { ...t, offers: [...t.offers, offer] } : t
    );
    saveTrades(next);
    setSelectedTrade(prev => prev?.id === tradeId ? { ...prev, offers: [...prev.offers, offer] } : prev);
  }

  function removeTrade(id: string) {
    saveTrades(trades.filter(t => t.id !== id));
    if (selectedTrade?.id === id) setSelectedTrade(null);
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-10 font-sans">

      {/* Header */}
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Barter Board</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            {trades.length === 0
              ? 'No trades yet — be the first!'
              : `${trades.length} active trade${trades.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          onClick={() => setShowPostForm(true)}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
        >
          + Post a Trade
        </button>
      </div>

      {/* Modals */}
      {showPostForm && (
        <PostTradeModal
          onClose={() => setShowPostForm(false)}
          onSubmit={handlePostTrade}
        />
      )}
      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          onAddOffer={handleAddOffer}
        />
      )}

      {/* Board */}
      {trades.length === 0 ? (
        <div className="text-center py-24 flex flex-col items-center gap-3">
          <p className="text-5xl">🤝</p>
          <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">No trades posted yet</p>
          <p className="text-sm text-zinc-400 dark:text-zinc-600">Post your first trade offer above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trades.map(trade => (
            <button
              key={trade.id}
              onClick={() => setSelectedTrade(trade)}
              className="text-left rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col gap-4 shadow-sm hover:shadow-md hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">{trade.title}</h3>
                {trade.offers.length > 0 && (
                  <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    {trade.offers.length} response{trade.offers.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Offering</span>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">{trade.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                <span className="text-zinc-400 dark:text-zinc-600 text-sm">⇄</span>
                <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Wants</span>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">{trade.wantDescription}</p>
              </div>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-medium">{trade.postedBy}</span> · {timeAgo(trade.createdAt)}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); removeTrade(trade.id); }}
                  className="text-xs text-zinc-300 dark:text-zinc-700 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  aria-label="Remove trade"
                >
                  ✕
                </button>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
