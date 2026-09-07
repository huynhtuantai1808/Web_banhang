"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Phone, Facebook, Bot, HeadphonesIcon } from "lucide-react";
import { FAQ_ENTRIES, findBestReply } from "@/lib/chatbotData";
import { BRANDING } from "@/lib/branding";
import { getCustomerToken } from "@/lib/auth-storage";

interface ChatMessage {
  id: string;
  role: "bot" | "user" | "employee";
  text: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "bot",
  text: `Xin chào! Mình là trợ lý ảo của ${BRANDING.siteName} 👋. Bạn cần tư vấn gì hôm nay?`,
};

export default function ChatWidget() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState(false);
  const [chatMode, setChatMode] = useState<"none" | "bot" | "live">("none");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasToken, setHasToken] = useState(false);
  
  // Live Chat state
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    setHasToken(!!getCustomerToken());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chatMode]);

  // Không hiển thị chatbot ở khu vực quản trị — chỉ dành cho khách hàng mua sắm
  if (pathname?.startsWith("/admin")) return null;

  const initLiveChat = async () => {
    try {
      const token = getCustomerToken();
      if (!token) return;
      
      const res = await fetch("http://localhost:8000/api/v1/chat/rooms", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.id) {
        setRoomId(data.id);
        const socket = new WebSocket(`ws://localhost:8000/api/v1/chat/ws/${data.id}?token=${token}`);
        socket.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          setMessages(prev => [...prev, {
            id: msg.id,
            role: msg.sender_type === "employee" ? "employee" : "user",
            text: msg.message
          }]);
        };
        setWs(socket);
        setMessages([{ id: "live_welcome", role: "employee", text: "Xin chào! Bạn cần hỗ trợ gì từ nhân viên chúng tôi?" }]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const closeChat = () => {
    setChatMode("none");
    if (ws) {
      ws.close();
      setWs(null);
    }
  };

  function sendMessage(text: string) {
    if (!text.trim()) return;
    
    if (chatMode === "bot") {
      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
      const botReply: ChatMessage = { id: crypto.randomUUID(), role: "bot", text: findBestReply(text) };
      setMessages((prev) => [...prev, userMsg, botReply]);
    } else if (chatMode === "live" && ws) {
      // Live chat logic
      const token = getCustomerToken();
      // Decode token to get customer ID (simplification, usually we'd pass sender_id)
      // Actually backend just needs to know it's a customer
      // Wait, we need sender_id. But since we use token, we can pass a dummy sender_id and backend validates it?
      // Our WS endpoint currently expects JSON: {"sender_type": "customer", "sender_id": "...", "message": "..."}
      // For now we can extract ID from token or rely on backend.
      // Let's decode JWT manually.
      let customerId = "";
      try {
        const payload = JSON.parse(atob(token!.split('.')[1]));
        customerId = payload.sub;
      } catch (e) {}

      ws.send(JSON.stringify({
        sender_type: "customer",
        sender_id: customerId,
        message: text
      }));
    }
    
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      <AnimatePresence>
        {chatMode !== "none" && (
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
                <p className="font-display text-sm text-circuit-bg font-semibold">
                  {chatMode === "bot" ? "Trợ lý ảo thông minh" : "Hỗ trợ trực tuyến"}
                </p>
                <p className="text-xs text-circuit-bg/80">{BRANDING.siteName}</p>
              </div>
              <button onClick={closeChat} className="text-circuit-bg/80 hover:text-circuit-bg">
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
                    {m.role === "employee" && <strong className="block text-xs mb-1 text-circuit-copperLight">Nhân viên</strong>}
                    {m.text}
                  </div>
                </div>
              ))}

              {/* Gợi ý câu hỏi nhanh — chỉ hiện cho bot */}
              {chatMode === "bot" && messages.length === 1 && (
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

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2.5 border-t border-circuit-line">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập tin nhắn..."
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

      {/* Floating Action Menu */}
      <AnimatePresence>
        {openMenu && chatMode === "none" && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="flex flex-col gap-3 mb-4 items-end"
          >
            <a href={BRANDING.contact.zaloLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
              <span className="bg-circuit-panel border border-circuit-line px-3 py-1.5 rounded-md text-sm text-circuit-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Zalo</span>
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg">
                <MessageCircle size={20} />
              </div>
            </a>
            
            <a href={BRANDING.contact.facebookLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
              <span className="bg-circuit-panel border border-circuit-line px-3 py-1.5 rounded-md text-sm text-circuit-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Messenger</span>
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
                <Facebook size={20} />
              </div>
            </a>

            <button 
              onClick={() => {
                setChatMode("bot");
                setMessages([WELCOME_MESSAGE]);
                setOpenMenu(false);
              }} 
              className="flex items-center gap-2 group"
            >
              <span className="bg-circuit-panel border border-circuit-line px-3 py-1.5 rounded-md text-sm text-circuit-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Chat tự động (Bot)</span>
              <div className="w-12 h-12 bg-circuit-copper rounded-full flex items-center justify-center text-white shadow-lg">
                <Bot size={20} />
              </div>
            </button>

            {hasToken && (
              <button 
                onClick={() => {
                  setChatMode("live");
                  initLiveChat();
                  setOpenMenu(false);
                }} 
                className="flex items-center gap-2 group"
              >
                <span className="bg-circuit-panel border border-circuit-line px-3 py-1.5 rounded-md text-sm text-circuit-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Chat với nhân viên</span>
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg">
                  <HeadphonesIcon size={20} />
                </div>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          if (chatMode !== "none") {
            closeChat();
          } else {
            setOpenMenu(!openMenu);
          }
        }}
        style={{ backgroundColor: "var(--accent-color)" }}
        className="w-14 h-14 rounded-full flex items-center justify-center text-circuit-bg shadow-xl hover:opacity-90 transition-transform hover:scale-105"
      >
        {chatMode !== "none" || openMenu ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
