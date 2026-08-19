from pydantic import BaseModel, Field


class SiteSettingsOut(BaseModel):
    site_name: str
    hero_title: str
    hero_subtitle: str
    hero_description: str
    footer_intro: str | None = None
    banner_image_url: str | None = None
    logo_image_url: str | None = None
    accent_color: str

    class Config:
        from_attributes = True


class SiteSettingsUpdate(BaseModel):
    site_name: str | None = None
    hero_title: str | None = None
    hero_subtitle: str | None = None
    hero_description: str | None = None
    footer_intro: str | None = None
    accent_color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
