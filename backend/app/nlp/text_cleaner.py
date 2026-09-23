"""
Text cleaning and sentence segmentation for ESG reports.

Input:  raw page text (from pdf_extractor)
Output: list of cleaned Sentence objects with page numbers preserved

Design:
- Cleaning is conservative: we only remove obvious noise (page numbers,
  running headers/footers, excessive whitespace, non-printing characters).
- PDF line wraps (single \n) are converted to spaces so sentences that
  were physically wrapped across lines become continuous. Paragraph breaks
  (\n\n) are preserved as natural boundaries.
- Segmentation uses spaCy's sentencizer, which handles common abbreviations
  (Ltd., Inc., e.g., U.S.) that naive regex splitting gets wrong.
- We drop sentences outside a length band (too short = headers/artifacts,
  too long = usually table rows or multi-sentence mergers).
- We do NOT filter for ESG relevance here; that belongs in claim_extractor.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

import spacy

from app.utils.logging import get_logger

logger = get_logger(__name__)

# ---- Configuration (adjust here, not scattered in code) --------------------
MIN_SENTENCE_CHARS = 40
MAX_SENTENCE_CHARS = 500
MIN_ALPHA_TOKEN_LEN = 4  # at least one word of this length must appear

# Patterns for common noise in ESG PDFs.
_PAGE_NUMBER_LINE = re.compile(r"^\s*(page\s+)?\d{1,4}\s*$", re.IGNORECASE)
_MULTI_WHITESPACE = re.compile(r"[ \t]+")
_MULTI_NEWLINES = re.compile(r"\n{3,}")
# Single newline NOT surrounded by other newlines — i.e. a line wrap.
_SINGLE_NEWLINE = re.compile(r"(?<!\n)\n(?!\n)")
# Non-printing / odd control characters that break sentence splitting.
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

# Lazy-loaded spaCy pipeline. Load once, reuse across all calls.
_NLP: spacy.language.Language | None = None


def _get_nlp() -> spacy.language.Language:
    global _NLP
    if _NLP is None:
        logger.info("Loading spaCy model: en_core_web_sm")
        _NLP = spacy.load(
            "en_core_web_sm",
            # We only need the sentencizer + tokenizer; disable the heavy
            # components (parser, NER, tagger) since we do not use them here.
            disable=["parser", "ner", "tagger", "lemmatizer", "attribute_ruler"],
        )
        # The `sentencizer` component provides rule-based sentence boundaries
        # even without the parser. It is fast and adequate for prose.
        if "sentencizer" not in _NLP.pipe_names:
            _NLP.add_pipe("sentencizer")
    return _NLP


@dataclass(frozen=True)
class Sentence:
    page_number: int
    text: str  # cleaned, original case, no leading/trailing whitespace


def clean_text(raw: str) -> str:
    """Normalise whitespace and remove obvious noise. Idempotent."""
    if not raw:
        return ""

    # Remove control characters that PDFs sometimes embed.
    text = _CONTROL_CHARS.sub("", raw)

    # Normalise line endings.
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Collapse runs of spaces/tabs.
    text = _MULTI_WHITESPACE.sub(" ", text)

    # Drop standalone page-number lines.
    lines = [ln for ln in text.split("\n") if not _PAGE_NUMBER_LINE.match(ln)]
    text = "\n".join(lines)

    # Collapse runs of blank lines to a single paragraph break marker.
    text = _MULTI_NEWLINES.sub("\n\n", text)

    # Join single newlines (PDF line wraps) into spaces so sentences that
    # were physically wrapped across lines become continuous. Double
    # newlines (paragraph breaks) are preserved as natural boundaries.
    text = _SINGLE_NEWLINE.sub(" ", text)

    return text.strip()


def _is_usable_sentence(text: str) -> bool:
    """Conservative filter. Returns True if a sentence is worth keeping."""
    t = text.strip()

    if len(t) < MIN_SENTENCE_CHARS:
        return False
    if len(t) > MAX_SENTENCE_CHARS:
        return False

    # Must contain at least one token of MIN_ALPHA_TOKEN_LEN alphabetic chars.
    has_real_word = any(
        tok.isalpha() and len(tok) >= MIN_ALPHA_TOKEN_LEN for tok in t.split()
    )
    if not has_real_word:
        return False

    return True


def segment_sentences(
    pages: list[tuple[int, str]],
) -> list[Sentence]:
    """
    Segment a list of (page_number, raw_text) into cleaned sentences.

    Returns sentences in document order, each tagged with its page number.
    """
    nlp = _get_nlp()
    out: list[Sentence] = []

    for page_num, raw in pages:
        cleaned = clean_text(raw)
        if not cleaned:
            continue

        doc = nlp(cleaned)

        for sent in doc.sents:
            text = sent.text.strip()
            # spaCy may keep a paragraph break inside one segment; convert
            # any residual newlines to spaces so a Sentence is always
            # single-line text.
            text = text.replace("\n", " ")
            text = _MULTI_WHITESPACE.sub(" ", text)
            if _is_usable_sentence(text):
                out.append(Sentence(page_number=page_num, text=text))

    logger.info(
        "Segmented %d pages into %d usable sentences",
        len(pages),
        len(out),
    )
    return out