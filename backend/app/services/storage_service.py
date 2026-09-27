from __future__ import annotations

import hashlib
from pathlib import Path

from supabase import Client

from app.utils.logging import get_logger

logger = get_logger(__name__)

BUCKET = "esg-reports"


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def upload_report_pdf(
    sb: Client,
    *,
    local_path: str | Path,
    ticker: str,
    year: int,
) -> dict:
    local_path = Path(local_path)
    if not local_path.exists():
        raise FileNotFoundError(f"PDF not found: {local_path}")

    filename = local_path.name
    storage_path = f"{ticker}/{year}/{filename}"

    with local_path.open("rb") as f:
        file_bytes = f.read()

    content_type = "application/pdf"

    sb.storage.from_(BUCKET).upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": content_type, "upsert": "true"},
    )

    metadata = {
        "storage_path": storage_path,
        "size_bytes": len(file_bytes),
        "checksum": _sha256(local_path),
        "content_type": content_type,
    }
    logger.info("Uploaded %s -> %s (%d bytes)", filename, storage_path, metadata["size_bytes"])
    return metadata


def create_signed_url(sb: Client, storage_path: str, expires_in: int = 3600) -> str:
    res = sb.storage.from_(BUCKET).create_signed_url(storage_path, expires_in)
    if isinstance(res, dict):
        return res.get("signedURL") or res.get("signed_url") or ""
    data = getattr(res, "data", None) or {}
    return data.get("signedURL") or data.get("signed_url") or ""