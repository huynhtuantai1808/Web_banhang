"use client";
import { useState, useEffect } from "react";
import { CreditCard, Save, Check, Trash2 } from "lucide-react";

interface CardData {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
}

interface SavedCard {
  id: string;
  last4: string;
  name: string;
  expiry: string;
  brand: string;
  savedAt: string;
}

interface CreditCardFormProps {
  onCardChange?: (card: CardData) => void;
  isLoggedIn?: boolean;
}

function detectBrand(num: string): "VISA" | "Mastercard" | "JCB" | "" {
  const n = num.replace(/\s/g, "");
  if (/^4/.test(n)) return "VISA";
  if (/^5[1-5]/.test(n)) return "Mastercard";
  if (/^35/.test(n)) return "JCB";
  return "";
}

function formatCardNumber(val: string) {
  return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(val: string) {
  const v = val.replace(/\D/g, "").slice(0, 4);
  if (v.length >= 3) return v.slice(0, 2) + "/" + v.slice(2);
  return v;
}

const STORAGE_KEY = "saved_cards";

function getSavedCards(): SavedCard[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function CreditCardForm({ onCardChange, isLoggedIn }: CreditCardFormProps) {
  const [card, setCard] = useState<CardData>({ number: "", name: "", expiry: "", cvv: "" });
  const [flipped, setFlipped] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedSaved, setSelectedSaved] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) setSavedCards(getSavedCards());
  }, [isLoggedIn]);

  useEffect(() => {
    onCardChange?.(card);
  }, [card, onCardChange]);

  function updateCard(field: keyof CardData, value: string) {
    setCard((prev) => ({ ...prev, [field]: value }));
    setSelectedSaved(null);
  }

  function handleSaveCard() {
    if (!isLoggedIn || !card.number || !card.name || !card.expiry) return;
    const brand = detectBrand(card.number);
    const newCard: SavedCard = {
      id: Date.now().toString(),
      last4: card.number.replace(/\s/g, "").slice(-4),
      name: card.name,
      expiry: card.expiry,
      brand,
      savedAt: new Date().toISOString(),
    };
    const updated = [...getSavedCards(), newCard];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedCards(updated);
    setSaveCard(false);
  }

  function handleDeleteSaved(id: string) {
    const updated = getSavedCards().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedCards(updated);
    if (selectedSaved === id) {
      setSelectedSaved(null);
      setCard({ number: "", name: "", expiry: "", cvv: "" });
    }
  }

  function handleSelectSaved(saved: SavedCard) {
    setSelectedSaved(saved.id);
    setCard({
      number: "**** **** **** " + saved.last4,
      name: saved.name,
      expiry: saved.expiry,
      cvv: "",
    });
  }

  const brand = detectBrand(card.number);
  const displayNumber = card.number || "•••• •••• •••• ••••";
  const displayName = card.name || "TÊN CHỦ THẺ";
  const displayExpiry = card.expiry || "MM/YY";

  return (
    <div className="space-y-6">
      {/* Saved cards (logged in only) */}
      {isLoggedIn && savedCards.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-circuit-muted uppercase tracking-widest">Thẻ đã lưu</p>
          <div className="grid gap-2">
            {savedCards.map((sc) => (
              <div
                key={sc.id}
                onClick={() => handleSelectSaved(sc)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                  selectedSaved === sc.id
                    ? "border-circuit-copper bg-circuit-copper/10 shadow-[0_0_12px_rgba(200,127,69,0.2)]"
                    : "border-circuit-line bg-circuit-panel/50 hover:border-circuit-copper/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 rounded bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center">
                    <CreditCard size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-circuit-text">
                      {sc.brand || "Thẻ"} •••• {sc.last4}
                    </p>
                    <p className="text-[11px] text-circuit-muted">{sc.name} · {sc.expiry}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSaved === sc.id && <Check size={16} className="text-circuit-copper" />}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteSaved(sc.id); }}
                    className="p-1.5 rounded-lg text-circuit-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-circuit-muted">Hoặc nhập thẻ mới bên dưới</p>
        </div>
      )}

      {/* 3D Card Visual */}
      <div className="flex justify-center">
        <div
          className="relative w-[320px] h-[190px] cursor-pointer"
          style={{ perspective: "1000px" }}
          onClick={() => setFlipped((f) => !f)}
        >
          <div
            className="relative w-full h-full transition-transform duration-700"
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-600 via-slate-500 to-indigo-700" />
              {/* Holographic shimmer */}
              <div className="absolute inset-0 opacity-30"
                style={{
                  background: "linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)",
                  backgroundSize: "200% 200%",
                  animation: "shimmer 3s ease-in-out infinite",
                }}
              />
              <div className="relative h-full p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  {/* Chip */}
                  <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center shadow-inner">
                    <div className="grid grid-cols-2 gap-0.5 p-1">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-1.5 h-1 bg-yellow-700/40 rounded-[1px]" />
                      ))}
                    </div>
                  </div>
                  {/* Brand */}
                  <div className="text-right">
                    {brand === "VISA" && (
                      <span className="text-white font-bold italic text-xl tracking-widest" style={{ fontFamily: "serif" }}>VISA</span>
                    )}
                    {brand === "Mastercard" && (
                      <div className="flex items-center gap-0">
                        <div className="w-7 h-7 rounded-full bg-red-500 opacity-90" />
                        <div className="w-7 h-7 rounded-full bg-yellow-400 opacity-90 -ml-3" />
                      </div>
                    )}
                    {brand === "JCB" && (
                      <span className="text-white font-bold text-lg tracking-wider bg-blue-600 px-2 py-0.5 rounded">JCB</span>
                    )}
                    {!brand && <CreditCard size={24} className="text-white/60" />}
                  </div>
                </div>

                <div>
                  <p className="text-white font-mono text-lg tracking-[0.2em] drop-shadow">
                    {displayNumber}
                  </p>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-white/50 text-[9px] uppercase tracking-widest mb-0.5">Chủ thẻ</p>
                    <p className="text-white font-medium text-sm tracking-wider uppercase truncate max-w-[180px]">
                      {displayName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-[9px] uppercase tracking-widest mb-0.5">Hạn</p>
                    <p className="text-white font-medium text-sm font-mono">{displayExpiry}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-600 to-indigo-800" />
              <div className="relative h-full flex flex-col">
                <div className="w-full h-10 bg-black/60 mt-6" />
                <div className="px-5 mt-4">
                  <p className="text-white/50 text-[9px] uppercase tracking-widest mb-1.5">CVV</p>
                  <div className="w-full bg-white/90 rounded px-3 py-2 flex items-center justify-end">
                    <span className="font-mono text-slate-800 tracking-widest text-sm">
                      {card.cvv ? "•".repeat(card.cvv.length) : "•••"}
                    </span>
                  </div>
                </div>
                <p className="text-white/30 text-[9px] text-center mt-auto pb-4">
                  Nhấn thẻ để xem mặt trước
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-circuit-muted">Nhấn vào thẻ để xem mặt sau (CVV)</p>

      {/* Form inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-circuit-muted mb-1.5">Số thẻ</label>
          <input
            type="text"
            inputMode="numeric"
            value={card.number}
            onChange={(e) => updateCard("number", formatCardNumber(e.target.value))}
            placeholder="0000 0000 0000 0000"
            maxLength={19}
            className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text font-mono outline-none focus:border-circuit-copper transition-colors focus:shadow-[0_0_10px_rgba(200,127,69,0.15)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-circuit-muted mb-1.5">Tên chủ thẻ</label>
          <input
            type="text"
            value={card.name}
            onChange={(e) => updateCard("name", e.target.value.toUpperCase())}
            placeholder="NGUYEN VAN A"
            className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text uppercase outline-none focus:border-circuit-copper transition-colors focus:shadow-[0_0_10px_rgba(200,127,69,0.15)]"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-circuit-muted mb-1.5">Ngày hết hạn</label>
            <input
              type="text"
              inputMode="numeric"
              value={card.expiry}
              onChange={(e) => updateCard("expiry", formatExpiry(e.target.value))}
              placeholder="MM/YY"
              maxLength={5}
              className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text font-mono outline-none focus:border-circuit-copper transition-colors focus:shadow-[0_0_10px_rgba(200,127,69,0.15)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-circuit-muted mb-1.5">CVV</label>
            <input
              type="password"
              inputMode="numeric"
              value={card.cvv}
              onChange={(e) => updateCard("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
              onFocus={() => setFlipped(true)}
              onBlur={() => setFlipped(false)}
              placeholder="•••"
              maxLength={4}
              className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text font-mono outline-none focus:border-circuit-copper transition-colors focus:shadow-[0_0_10px_rgba(200,127,69,0.15)]"
            />
          </div>
        </div>

        {/* Save card option (logged-in only) */}
        {isLoggedIn && card.number && card.name && card.expiry && !selectedSaved && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-circuit-line/60 bg-circuit-panel/30">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-circuit-text">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
                className="w-4 h-4 rounded border-circuit-line bg-circuit-bg text-circuit-copper focus:ring-circuit-copper"
              />
              <Save size={14} className="text-circuit-muted" />
              Lưu thẻ này cho lần thanh toán sau
            </label>
            {saveCard && (
              <button
                type="button"
                onClick={handleSaveCard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-circuit-copper/20 text-circuit-copper text-xs font-medium hover:bg-circuit-copper/30 transition-colors"
              >
                <Check size={12} /> Lưu ngay
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 200%; }
          100% { background-position: -200% -200%; }
        }
      `}</style>
    </div>
  );
}
