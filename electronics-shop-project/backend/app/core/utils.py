import re
import uuid


def make_slug(title: str, max_len: int = 240) -> str:
    """Tạo slug URL-friendly từ title, đảm bảo unique bằng short-uuid suffix."""
    slug = (
        title.lower()
        .strip()
        .replace(" ", "-")
    )
    slug = re.sub(r"[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷđ\-]", "", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    short = str(uuid.uuid4())[:6]
    result = f"{slug[:max_len - 8]}-{short}"
    return result
