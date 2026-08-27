import uuid
from datetime import datetime
from pydantic import BaseModel


class BlogPostCreate(BaseModel):
    title: str
    summary: str | None = None
    content: str | None = None
    image_url: str | None = None
    category: str = "news"
    is_published: bool = True
    display_order: int = 0


class BlogPostUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    content: str | None = None
    image_url: str | None = None
    category: str | None = None
    is_published: bool | None = None
    display_order: int | None = None


class BlogPostOut(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    summary: str | None
    content: str | None
    image_url: str | None
    category: str
    is_published: bool
    published_at: datetime | None
    display_order: int
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


class BlogPostListOut(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    summary: str | None
    image_url: str | None
    category: str
    is_published: bool
    published_at: datetime | None
    display_order: int
    created_at: datetime

    class Config:
        from_attributes = True
