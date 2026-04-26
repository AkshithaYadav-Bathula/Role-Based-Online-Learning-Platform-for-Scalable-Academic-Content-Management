from __future__ import annotations

from abc import ABC, abstractmethod
from functools import lru_cache
from typing import List

from sklearn.feature_extraction.text import HashingVectorizer

from app.core.config import settings


class EmbeddingProvider(ABC):
    @abstractmethod
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        raise NotImplementedError

    def embed_query(self, text: str) -> List[float]:
        return self.embed_texts([text])[0]


class HashingEmbeddingProvider(EmbeddingProvider):
    def __init__(self, dimensions: int = 384) -> None:
        self._vectorizer = HashingVectorizer(n_features=dimensions, alternate_sign=False, norm="l2")

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        matrix = self._vectorizer.transform(texts)
        return matrix.toarray().astype(float).tolist()


class FastEmbedEmbeddingProvider(EmbeddingProvider):
    def __init__(self, model_name: str) -> None:
        from fastembed import TextEmbedding

        self._model = TextEmbedding(model_name=model_name)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return [embedding.tolist() for embedding in self._model.embed(texts)]


@lru_cache(maxsize=1)
def get_embedding_provider() -> EmbeddingProvider:
    provider = settings.embedding_provider.lower().strip()

    if provider in {"hashing", "fake", "test"}:
        return HashingEmbeddingProvider()

    try:
        return FastEmbedEmbeddingProvider(settings.embedding_model)
    except Exception:
        return HashingEmbeddingProvider()