"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Phone, Facebook } from "lucide-react";
import { FAQ_ENTRIES, findBestReply } from "@/lib/chatbotData";
import { BRANDING } from "@/lib/branding";

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "bot",
  text: `Xin chào! Mình là trợ lý ảo của ${BRANDING.siteName} 👋. Bạn cần tư vấn gì hôm nay?`,
};

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Không hiển thị chatbot ở khu vực quản trị — chỉ dành cho khách hàng mua sắm
  if (pathname?.startsWith("/admin")) return null;

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
    const botReply: ChatMessage = { id: crypto.randomUUID(), role: "bot", text: findBestReply(text) };
    setMessages((prev) => [...prev, userMsg, botReply]);
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-3 w-[340px] max-w-[calc(100vw-2.5rem)] rounded-lg border border-circuit-line bg-circuit-panel shadow-2xl flex flex-col overflow-hidden"
            style={{ height: 460 }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: "var(--accent-color)" }}
            >
              <div>
                <p className="font-display text-sm text-circuit-bg font-semibold">Hỗ trợ trực tuyến</p>
                <p className="text-xs text-circuit-bg/80">{BRANDING.siteName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-circuit-bg/80 hover:text-circuit-bg">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-circuit-copper/20 text-circuit-text"
                        : "bg-circuit-bg text-circuit-text border border-circuit-line"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {/* Gợi ý câu hỏi nhanh — chỉ hiện khi mới bắt đầu chat */}
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {FAQ_ENTRIES.map((entry) => (
                    <button
                      key={entry.quickLabel}
                      onClick={() => sendMessage(entry.quickLabel)}
                      className="text-xs px-2.5 py-1.5 rounded-full border border-circuit-line text-circuit-copperLight hover:border-circuit-copper transition-colors"
                    >
                      {entry.quickLabel}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Liên kết nhanh: hotline + facebook */}
            <div className="flex gap-2 px-3 py-2 border-t border-circuit-line bg-circuit-bg/40">
              <a
                href={`tel:${BRANDING.contact.hotlinePhoneRaw}`}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-circuit-line py-1.5 text-xs text-circuit-muted hover:text-circuit-copperLight hover:border-circuit-copper transition-colors"
              >
                <Phone size={13} /> Gọi hotline
              </a>
              <a
                href={BRANDING.contact.facebookLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-circuit-line py-1.5 text-xs text-circuit-muted hover:text-circuit-copperLight hover:border-circuit-copper transition-colors"
              >
                <Facebook size={13} /> Facebook
              </a>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2.5 border-t border-circuit-line">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi của bạn..."
                className="flex-1 rounded-md bg-circuit-bg border border-circuit-line px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
              />
              <button
                type="submit"
                style={{ backgroundColor: "var(--accent-color)" }}
                className="p-2 rounded-md text-circuit-bg hover:opacity-90 transition-opacity"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        style={{ backgroundColor: "var(--accent-color)" }}
        className="w-14 h-14 rounded-full flex items-center justify-center text-circuit-bg shadow-lg hover:opacity-90 transition-opacity"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
