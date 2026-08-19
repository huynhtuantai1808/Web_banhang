from datetime import datetime
from sqlalchemy import String, Text, DateTime, SmallInteger, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class SiteSettings(Base):
    """Cấu hình hiển thị trang khách hàng (storefront) — chỉ có 1 dòng duy nhất (id=1),
    admin chỉnh sửa qua PUT /api/v1/settings để tuỳ biến giao diện mà không cần sửa code."""
    __tablename__ = "site_settings"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, default=1)
    site_name: Mapped[str] = mapped_column(String(100), default="TechTrace")
    hero_title: Mapped[str] = mapped_column(String(255), default="Công nghệ chính hãng, kết nối đúng nhu cầu của bạn.")
    hero_subtitle: Mapped[str] = mapped_column(String(100), default="TechTrace Store")
    hero_description: Mapped[str] = mapped_column(
        Text,
        default="Điện thoại, laptop, máy tính bảng, PC gaming — trả góp 0% lãi suất, bảo hành chính hãng, giao nhanh toàn quốc.",
    )
    banner_image_url: Mapped[str | None] = mapped_column(Text)
    logo_image_url: Mapped[str | None] = mapped_column(Text)
    accent_color: Mapped[str] = mapped_column(String(7), default="#C87F45")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
