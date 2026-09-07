from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid

from app.db.session import get_db
from app.models.chat import ChatRoom, ChatMessage
from app.models.customer import Customer
from app.core.security import require_employee

router = APIRouter()

@router.get("/rooms")
async def get_rooms(
    status: str = Query(None),
    db: AsyncSession = Depends(get_db), 
    employee_id: str = Depends(require_employee)
):
    """Lấy danh sách các phòng chat (dành cho admin)."""
    query = select(ChatRoom, Customer).join(Customer, ChatRoom.customer_id == Customer.id)
    if status:
        query = query.where(ChatRoom.status == status)
    
    query = query.order_by(ChatRoom.created_at.desc())
    result = await db.execute(query)
    
    rooms = []
    for room, customer in result.all():
        rooms.append({
            "id": str(room.id),
            "status": room.status,
            "created_at": room.created_at.isoformat(),
            "customer": {
                "id": str(customer.id),
                "full_name": customer.full_name,
                "phone_number": customer.phone_number
            }
        })
    return rooms

@router.post("/rooms/{room_id}/claim")
async def claim_room(
    room_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    employee_id: str = Depends(require_employee)
):
    """Nhân viên nhận hỗ trợ phòng chat này."""
    room = await db.get(ChatRoom, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng chat")
    if room.status != "waiting":
        raise HTTPException(status_code=400, detail="Phòng chat không ở trạng thái chờ")
        
    room.status = "active"
    room.employee_id = uuid.UUID(employee_id)
    await db.commit()
    return {"message": "Đã nhận phòng chat thành công"}

@router.get("/rooms/{room_id}/messages")
async def get_room_messages(
    room_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    employee_id: str = Depends(require_employee)
):
    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.room_id == room_id)
        .order_by(ChatMessage.created_at)
    )
    messages = msg_result.scalars().all()
    
    return [
        {
            "id": str(msg.id),
            "sender_type": msg.sender_type,
            "message": msg.message,
            "created_at": msg.created_at.isoformat()
        } for msg in messages
    ]
