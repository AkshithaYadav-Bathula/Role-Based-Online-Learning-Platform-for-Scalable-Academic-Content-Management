from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import List, Tuple

import chromadb

from app.core.config import settings
from app.services.embeddings import get_embedding_provider
from app.services.store import KnowledgeChunk


class VectorStore:
    def upsert_course_chunks(self, course_id: str, chunks: List[KnowledgeChunk]) -> int:
        raise NotImplementedError

    def get_course_chunks(self, course_id: str) -> List[Tuple[KnowledgeChunk, float]]:
        raise NotImplementedError

    def search_course_chunks(self, course_id: str, query: str, top_k: int) -> List[Tuple[KnowledgeChunk, float]]:
        raise NotImplementedError


class ChromaVectorStore(VectorStore):
    def __init__(self, path: str) -> None:
        storage_path = Path(path)
        storage_path.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=str(storage_path))
        self._collection = self._client.get_or_create_collection(
            name="course_chunks",
            metadata={"hnsw:space": "cosine"},
        )
        self._embedder = get_embedding_provider()

    def upsert_course_chunks(self, course_id: str, chunks: List[KnowledgeChunk]) -> int:
        if not chunks:
            return 0

        self._collection.delete(where={"course_id": course_id})

        documents = [chunk.text for chunk in chunks]
        embeddings = self._embedder.embed_texts(documents)
        ids = [f"{course_id}:{chunk.chunk_index}" for chunk in chunks]
        metadatas = [self._serialize_metadata(chunk) for chunk in chunks]

        self._collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        return len(chunks)

    def get_course_chunks(self, course_id: str) -> List[Tuple[KnowledgeChunk, float]]:
        result = self._collection.get(where={"course_id": course_id}, include=["documents", "metadatas"])
        return self._build_chunks(result, default_score=1.0)

    def search_course_chunks(self, course_id: str, query: str, top_k: int) -> List[Tuple[KnowledgeChunk, float]]:
        query_embedding = self._embedder.embed_query(query)
        result = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=max(top_k, 1),
            where={"course_id": course_id},
            include=["documents", "metadatas", "distances"],
        )
        return self._build_chunks(result, default_score=0.0)

    def _build_chunks(self, result: dict, default_score: float) -> List[Tuple[KnowledgeChunk, float]]:
        documents = self._unwrap_result_items(result.get("documents"))
        metadatas = self._unwrap_result_items(result.get("metadatas"))
        distances = self._unwrap_result_items(result.get("distances"))

        paired_chunks: List[Tuple[KnowledgeChunk, float]] = []
        for document, metadata, distance in zip(documents, metadatas, distances or [None] * len(documents)):
            metadata = metadata if isinstance(metadata, dict) else {}
            chunk = KnowledgeChunk(
                course_id=str(metadata.get("course_id") or ""),
                text=document,
                chunk_index=int(metadata.get("chunk_index") or 0),
                source_label=metadata.get("source_label"),
                metadata=self._deserialize_metadata(metadata),
            )
            score = default_score if distance is None else 1.0 - float(distance)
            paired_chunks.append((chunk, round(max(score, 0.0), 4)))

        paired_chunks.sort(key=lambda item: item[0].chunk_index)
        return paired_chunks

    def _unwrap_result_items(self, values):
        if not values:
            return []
        first_item = values[0]
        if isinstance(first_item, list):
            return first_item
        return values

    def _serialize_metadata(self, chunk: KnowledgeChunk) -> dict:
        safe_metadata = {
            key: self._normalize_value(value)
            for key, value in chunk.metadata.items()
            if value is not None
        }
        safe_metadata["course_id"] = chunk.course_id
        safe_metadata["chunk_index"] = chunk.chunk_index
        if chunk.source_label:
            safe_metadata["source_label"] = chunk.source_label
        return {key: value for key, value in safe_metadata.items() if value is not None}

    def _deserialize_metadata(self, metadata: dict) -> dict:
        return {
            key: self._parse_value(value)
            for key, value in metadata.items()
            if key not in {"course_id", "chunk_index", "source_label"}
        }

    def _normalize_value(self, value):
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        return json.dumps(value, ensure_ascii=False)

    def _parse_value(self, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return value
        return value


@lru_cache(maxsize=1)
def get_vector_store() -> VectorStore:
    return ChromaVectorStore(settings.vector_store_path)