from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader

from app.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class ExtractedPage:
    page_number: int
    text: str


@dataclass(frozen=True)
class ExtractedDocument:
    source_path: str
    total_pages: int
    pages: list[ExtractedPage]
    errors: list[str]

    @property
    def full_text(self) -> str:
        return "\n\n".join(p.text for p in self.pages if p.text.strip())

    @property
    def char_count(self) -> int:
        return sum(len(p.text) for p in self.pages)


def extract_pdf(path: str | Path) -> ExtractedDocument:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    try:
        reader = PdfReader(str(path))
    except Exception as exc:
        raise ValueError(f"Could not open PDF {path.name}: {exc}") from exc

    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception as exc:
            raise ValueError(f"PDF {path.name} is encrypted") from exc

    total_pages = len(reader.pages)
    pages: list[ExtractedPage] = []
    errors: list[str] = []

    for idx, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception as exc:
            errors.append(f"page {idx}: {exc}")
            logger.warning("Failed page %d of %s: %s", idx, path.name, exc)
            text = ""
        pages.append(ExtractedPage(page_number=idx, text=text))

    doc = ExtractedDocument(
        source_path=str(path),
        total_pages=total_pages,
        pages=pages,
        errors=errors,
    )
    logger.info(
        "Extracted %s: %d pages, %d chars, %d errors",
        path.name, total_pages, doc.char_count, len(errors),
    )
    return doc
