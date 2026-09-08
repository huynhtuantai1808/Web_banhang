"use client";

import { useEffect, useState } from "react";
import { getEmployeeToken } from "@/lib/auth-storage";
import { MessageCircle, HeadphonesIcon, Send, User } from "lucide-react";

export default function AdminChatPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

  const fetchRooms = async () => {
    try {
      const token = getEmployeeToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/admin/chat/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRooms(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectRoom = async (roomId: string, status: string) => {
    if (ws) {
      ws.close();
      setWs(null);
    }
    
    setSelectedRoomId(roomId);
    
    try {
      const token = getEmployeeToken();
      
      // If room is waiting, claim it
      if (status === "waiting") {
        await fetch(`${API_URL}/admin/chat/rooms/${roomId}/claim`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchRooms();
      }

      // Fetch messages
      const res = await fetch(`${API_URL}/admin/chat/rooms/${roomId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data);

      // Connect WS
      const WS_URL = API_URL.replace("http", "ws");
      const socket = new WebSocket(`${WS_URL}/chat/ws/${roomId}?token=${token}`);
      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        setMessages(prev => [...prev, msg]);
      };
      setWs(socket);
      
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !ws) return;

    let employeeId = "";
    try {
      const token = getEmployeeToken();
      const payload = JSON.parse(atob(token!.split('.')[1]));
      employeeId = payload.sub;
    } catch (e) {}

    ws.send(JSON.stringify({
      sender_type: "employee",
      sender_id: employeeId,
      message: input
    }));
    setInput("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <h1 className="text-2xl font-bold font-display text-circuit-text mb-6">Hỗ trợ khách hàng</h1>
      
      <div className="flex flex-1 overflow-hidden glass-panel rounded-xl border border-circuit-line/60">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-circuit-line/60 flex flex-col bg-circuit-bg/50">
          <div className="p-4 border-b border-circuit-line/60 font-semibold text-circuit-text flex justify-between items-center">
            Danh sách yêu cầu
            <button onClick={fetchRooms} className="text-xs text-circuit-copperLight hover:underline">Làm mới</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {rooms.length === 0 && <div className="text-center text-circuit-muted text-sm mt-4">Không có yêu cầu nào.</div>}
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => selectRoom(room.id, room.status)}
                className={`w-full text-left p-3 rounded-lg border ${
                  selectedRoomId === room.id 
                    ? "border-circuit-copper bg-circuit-copper/10" 
                    : "border-circuit-line/40 hover:border-circuit-copperLight/50"
                } transition-colors`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-circuit-text truncate">
                    {room.customer.full_name}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    room.status === 'waiting' ? 'bg-orange-500/20 text-orange-400' :
                    room.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {room.status === 'waiting' ? 'Chờ hỗ trợ' : room.status === 'active' ? 'Đang chat' : 'Đã đóng'}
                  </span>
                </div>
                <div className="text-xs text-circuit-muted flex items-center gap-1">
                  <User size={12} /> {room.customer.phone_number}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="w-2/3 flex flex-col bg-circuit-panel">
          {selectedRoomId ? (
            <>
              <div className="p-4 border-b border-circuit-line/60 font-semibold text-circuit-text flex items-center gap-2">
                <HeadphonesIcon size={18} className="text-circuit-copperLight" />
                Phiên chat: {selectedRoomId.split("-")[0]}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.sender_type === "employee" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${
                        m.sender_type === "employee"
                          ? "bg-circuit-copper/20 text-circuit-text border border-circuit-copper/30"
                          : "bg-circuit-bg text-circuit-text border border-circuit-line"
                      }`}
                    >
                      <div className="text-[10px] text-circuit-muted mb-1 opacity-70">
                        {m.sender_type === "employee" ? "Bạn" : "Khách hàng"} - {new Date(m.created_at).toLocaleTimeString()}
                      </div>
                      {m.message}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} className="p-4 border-t border-circuit-line/60 flex items-center gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nhập tin nhắn hỗ trợ..."
                  className="flex-1 bg-circuit-bg border border-circuit-line/60 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-circuit-copper transition-colors text-circuit-text"
                />
                <button
                  type="submit"
                  disabled={!ws}
                  className="bg-circuit-copper text-circuit-bg p-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-circuit-muted">
              <MessageCircle size={48} className="mb-4 opacity-20" />
              <p>Chọn một yêu cầu bên trái để bắt đầu hỗ trợ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
