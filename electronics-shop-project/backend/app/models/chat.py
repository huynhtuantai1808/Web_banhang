import uuid
import uuid as _uuid_lib
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects.postgresql import UUID as _DB_UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    
    id = Column(_DB_UUID(as_uuid=True), primary_key=True, default=_uuid_lib.uuid4, index=True)
    customer_id = Column(_DB_UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False, index=True)
    employee_id = Column(_DB_UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    status = Column(String(20), default="waiting") # waiting, active, closed
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", backref="chat_rooms")
    employee = relationship("Employee", backref="chat_rooms")
    messages = relationship("ChatMessage", back_populates="room", cascade="all, delete-orphan", order_by="ChatMessage.created_at")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(_DB_UUID(as_uuid=True), primary_key=True, default=_uuid_lib.uuid4, index=True)
    room_id = Column(_DB_UUID(as_uuid=True), ForeignKey("chat_rooms.id"), nullable=False, index=True)
    sender_type = Column(String(20), nullable=False) # "customer" or "employee"
    sender_id = Column(_DB_UUID(as_uuid=True), nullable=False)
    message = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    room = relationship("ChatRoom", back_populates="messages")
