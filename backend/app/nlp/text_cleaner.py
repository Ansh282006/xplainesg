from __future__ import annotations

import re
from dataclasses import dataclass

import spacy

from app.utils.logging import get_logger

logger = get_logger(__name__)

MIN_SENTENCE_CHARS = 40
MAX_SENTENCE_CHARS = 500
MIN_ALPHA_TOKEN_LEN = 4

_PAGE_NUMBER_LINE = re.compile(r"^\s*(page\s+)?\d{1,4}\s*$", re.IGNORECASE)
_MULTI_WHITESPACE = re.compile(r"[ \t]+")
_MULTI_NEWLINES = re.compile(r"\n{3,}")
_SINGLE_NEWLINE = re.compile(r"(?<!\n)\n(?!\n)")
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

_NLP: spacy.language.Language | None = None


def _get_nlp() -> spacy.language.Language:
    global _NLP
    if _NLP is None:
        logger.info("Loading spaCy model: en_core_web_sm")
        _NLP = spacy.load(
            "en_core_web_sm",
            disable=["parser", "ner", "tagger", "lemmatizer", "attribute_ruler"],
        )
        if "sentencizer" not in _NLP.pipe_names:
            _NLP.add_pipe("sentencizer")
    return _NLP


@dataclass(frozen=True)
class Sentence:
    page_number: int
    text: str


def clean_text(raw: str) -> str:
    if not raw:
        return ""
    text = _CONTROL_CHARS.sub("", raw)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _MULTI_WHITESPACE.sub(" ", text)
    lines = [ln for ln in text.split("\n") if not _PAGE_NUMBER_LINE.match(ln)]
    text = "\n".join(lines)
    text = _MULTI_NEWLINES.sub("\n\n", text)
    text = _SINGLE_NEWLINE.sub(" ", text)
    return text.strip()


def _is_usable_sentence(text: str) -> bool:
    t = text.strip()
    if len(t) < MIN_SENTENCE_CHARS:
        return False
    if len(t) > MAX_SENTENCE_CHARS:
        return False
    has_real_word = any(
        tok.isalpha() and len(tok) >= MIN_ALPHA_TOKEN_LEN for tok in t.split()
    )
    if not has_real_word:
        return False
    return True


def segment_sentences(pages: list[tuple[int, str]]) -> list[Sentence]:
    nlp = _get_nlp()
    out: list[Sentence] = []

    for page_num, raw in pages:
        cleaned = clean_text(raw)
        if not cleaned:
            continue
        doc = nlp(cleaned)
        for sent in doc.sents:
            text = sent.text.strip()
            text = text.replace("\n", " ")
            text = _MULTI_WHITESPACE.sub(" ", text)
            if _is_usable_sentence(text):
                out.append(Sentence(page_number=page_num, text=text))

    logger.info("Segmented %d pages into %d usable sentences", len(pages), len(out))
    return out