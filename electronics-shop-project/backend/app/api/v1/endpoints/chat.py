from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, List
import uuid

from app.db.session import get_db
from app.models.chat import ChatRoom, ChatMessage
from app.models.customer import Customer
from app.core.security import require_customer, require_employee

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # room_id -> list of WebSockets
        self.active_connections: Dict[uuid.UUID, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: uuid.UUID):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: uuid.UUID):
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_to_room(self, room_id: uuid.UUID, message: dict):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@router.get("/rooms/me")
async def get_my_room(db: AsyncSession = Depends(get_db), customer_id: str = Depends(require_customer)):
    """Lấy phòng chat của khách hàng hiện tại (nếu có)."""
    result = await db.execute(
        select(ChatRoom)
        .where(ChatRoom.customer_id == uuid.UUID(customer_id))
        .where(ChatRoom.status != "closed")
    )
    room = result.scalar_one_or_none()
    if not room:
        return {"room": None}
    
    # Lấy tin nhắn
    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.room_id == room.id)
        .order_by(ChatMessage.created_at)
    )
    messages = msg_result.scalars().all()
    
    return {
        "room": {
            "id": str(room.id),
            "status": room.status
        },
        "messages": [
            {
                "id": str(msg.id),
                "sender_type": msg.sender_type,
                "message": msg.message,
                "created_at": msg.created_at.isoformat()
            } for msg in messages
        ]
    }

@router.post("/rooms")
async def create_room(db: AsyncSession = Depends(get_db), customer_id: str = Depends(require_customer)):
    """Tạo phòng chat mới cho khách hàng."""
    customer_uuid = uuid.UUID(customer_id)
    # Kiểm tra xem có phòng nào đang mở không
    result = await db.execute(
        select(ChatRoom)
        .where(ChatRoom.customer_id == customer_uuid)
        .where(ChatRoom.status != "closed")
    )
    existing_room = result.scalar_one_or_none()
    if existing_room:
        return {"id": str(existing_room.id), "status": existing_room.status}
    
    room = ChatRoom(customer_id=customer_uuid, status="waiting")
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return {"id": str(room.id), "status": room.status}

@router.websocket("/ws/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: uuid.UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db) # Note: Depends in WebSocket is tricky, but we can resolve it inside
):
    # In FastAPI, using Depends in WebSocket route can be complex for DB sessions.
    # We will do it the simple way by passing the session.
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                import json
                payload = json.loads(data)
                sender_type = payload.get("sender_type")
                sender_id = payload.get("sender_id")
                message = payload.get("message")
                
                if message and sender_type and sender_id:
                    # Get DB session
                    async for session in get_db():
                        msg = ChatMessage(
                            room_id=room_id,
                            sender_type=sender_type,
                            sender_id=uuid.UUID(sender_id),
                            message=message
                        )
                        session.add(msg)
                        await session.commit()
                        await session.refresh(msg)
                        
                        await manager.broadcast_to_room(room_id, {
                            "id": str(msg.id),
                            "sender_type": msg.sender_type,
                            "message": msg.message,
                            "created_at": msg.created_at.isoformat()
                        })
                        break # exit generator
            except Exception as e:
                print(f"Error processing message: {e}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
