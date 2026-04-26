from fastapi import APIRouter

from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatResponse, IngestRequest, IngestResponse, SourceChunk
from app.services.answering import build_answer
from app.services.retrieval import chunk_text, rank_chunks
from app.services.store import KnowledgeChunk, knowledge_base

router = APIRouter()


@router.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": settings.app_name}


@router.post("/v1/ingest", response_model=IngestResponse)
def ingest_course_content(payload: IngestRequest) -> IngestResponse:
    chunks = chunk_text(payload.content)
    indexed_chunks = [
        KnowledgeChunk(
            course_id=payload.course_id,
            text=chunk,
            chunk_index=index,
            source_label=payload.title or payload.source_type,
            metadata={"source_type": payload.source_type, **payload.metadata},
        )
        for index, chunk in enumerate(chunks)
    ]
    count = knowledge_base.upsert_chunks(payload.course_id, indexed_chunks)
    return IngestResponse(
        success=True,
        course_id=payload.course_id,
        chunks_indexed=count,
        message="Course content indexed successfully",
    )


@router.post("/v1/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    course_chunks = knowledge_base.get_chunks(payload.course_id)
    ranked_pairs = rank_chunks(payload.question, course_chunks)
    ranked_chunks = [chunk for chunk, _ in ranked_pairs]
    answer, used_general_fallback = build_answer(
        question=payload.question,
        mode=payload.mode,
        retrieved_chunks=ranked_chunks,
        general_fallback_enabled=settings.general_fallback_enabled,
    )
    retrieved_chunks = [
        SourceChunk(
            text=chunk.text,
            score=score,
            source_label=chunk.source_label,
            chunk_index=chunk.chunk_index,
        )
        for chunk, score in ranked_pairs
    ]
    return ChatResponse(
        success=True,
        answer=answer,
        course_id=payload.course_id,
        mode=payload.mode,
        used_general_fallback=used_general_fallback,
        retrieved_chunks=retrieved_chunks,
    )
