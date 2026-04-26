from collections import Counter
import re
from typing import List, Tuple

from app.core.config import settings
from app.services.store import KnowledgeChunk

_TOKEN_PATTERN = re.compile(r"[A-Za-z0-9_]+")


def tokenize(text: str) -> List[str]:
    return [token.lower() for token in _TOKEN_PATTERN.findall(text)]


def chunk_text(text: str, chunk_size: int | None = None, overlap: int | None = None) -> List[str]:
    chunk_size = chunk_size or settings.chunk_size
    overlap = overlap or settings.chunk_overlap

    words = text.split()
    if not words:
        return []

    step = max(chunk_size - overlap, 1)
    chunks: List[str] = []
    for start in range(0, len(words), step):
        chunk_words = words[start : start + chunk_size]
        if not chunk_words:
            break
        chunks.append(" ".join(chunk_words))
        if start + chunk_size >= len(words):
            break

    return chunks


def score_chunk(question_tokens: List[str], chunk_text_value: str) -> float:
    if not question_tokens:
        return 0.0

    chunk_tokens = tokenize(chunk_text_value)
    if not chunk_tokens:
        return 0.0

    question_counts = Counter(question_tokens)
    chunk_counts = Counter(chunk_tokens)

    overlap = sum(min(question_counts[token], chunk_counts[token]) for token in question_counts)
    coverage = overlap / max(len(set(question_tokens)), 1)
    density = overlap / max(len(chunk_tokens), 1)
    return round((coverage * 0.7) + (density * 0.3), 4)


def rank_chunks(question: str, chunks: List[KnowledgeChunk], top_k: int | None = None) -> List[Tuple[KnowledgeChunk, float]]:
    top_k = top_k or settings.top_k
    question_tokens = tokenize(question)

    scored: List[tuple[float, KnowledgeChunk]] = []
    for chunk in chunks:
        score = score_chunk(question_tokens, chunk.text)
        scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [(chunk, score) for score, chunk in scored[:top_k] if score > 0]


def build_summary_from_chunks(chunks: List[KnowledgeChunk]) -> str:
    if not chunks:
        return "No course material was found for this lecture."

    bullet_points = []
    for chunk in chunks[:4]:
        snippet = " ".join(chunk.text.split()[:28]).strip()
        bullet_points.append(f"- {snippet}{'...' if len(chunk.text.split()) > 28 else ''}")

    return "\n".join(bullet_points)
