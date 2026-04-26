from dataclasses import dataclass, field
from threading import Lock
from typing import Dict, List, Optional


@dataclass
class KnowledgeChunk:
    course_id: str
    text: str
    chunk_index: int
    source_label: Optional[str] = None
    metadata: dict = field(default_factory=dict)


class InMemoryKnowledgeBase:
    def __init__(self) -> None:
        self._chunks: Dict[str, List[KnowledgeChunk]] = {}
        self._lock = Lock()

    def upsert_chunks(self, course_id: str, chunks: List[KnowledgeChunk]) -> int:
        with self._lock:
            self._chunks[course_id] = chunks
            return len(chunks)

    def get_chunks(self, course_id: str) -> List[KnowledgeChunk]:
        with self._lock:
            return list(self._chunks.get(course_id, []))


knowledge_base = InMemoryKnowledgeBase()
