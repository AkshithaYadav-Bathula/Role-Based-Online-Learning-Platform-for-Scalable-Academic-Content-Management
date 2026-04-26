import re
from typing import List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

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


def rank_chunks(question: str, chunks: List[KnowledgeChunk], top_k: int | None = None) -> List[Tuple[KnowledgeChunk, float]]:
    top_k = top_k or settings.top_k
    if not chunks:
        return []

    corpus = [chunk.text for chunk in chunks]
    documents = corpus + [question]

    vectorizer = TfidfVectorizer(stop_words="english")
    matrix = vectorizer.fit_transform(documents)
    similarities = cosine_similarity(matrix[-1], matrix[:-1]).flatten()

    scored: List[Tuple[KnowledgeChunk, float]] = []
    for chunk, score in zip(chunks, similarities):
        scored.append((chunk, round(float(score), 4)))

    scored.sort(key=lambda item: item[1], reverse=True)
    return [(chunk, score) for chunk, score in scored[:top_k] if score > 0]


def build_summary_from_chunks(chunks: List[KnowledgeChunk]) -> str:
    if not chunks:
        return "No course material was found for this lecture."

    bullet_points = []
    for chunk in chunks[:4]:
        snippet = " ".join(chunk.text.split()[:28]).strip()
        bullet_points.append(f"- {snippet}{'...' if len(chunk.text.split()) > 28 else ''}")

    return "\n".join(bullet_points)
