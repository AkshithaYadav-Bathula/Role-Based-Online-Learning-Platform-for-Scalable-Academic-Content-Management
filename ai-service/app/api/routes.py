from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatResponse, IngestRequest, IngestResponse, SourceChunk
from app.services.assistant import get_course_ai_service

router = APIRouter()
service = get_course_ai_service()


@router.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": settings.app_name}


@router.post("/v1/ingest", response_model=IngestResponse)
def ingest_course_content(payload: IngestRequest) -> IngestResponse:
    try:
        result = service.ingest(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return IngestResponse(
        success=True,
        course_id=result.course_id,
        chunks_indexed=result.chunks_indexed,
        message=result.message,
    )


@router.post("/v1/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    result = service.chat(payload)
    retrieved_chunks = [
        SourceChunk(
            text=chunk.text,
            score=score,
            source_label=chunk.source_label,
            chunk_index=chunk.chunk_index,
        )
        for chunk, score in result.retrieved_chunks
    ]
    return ChatResponse(
        success=True,
        answer=result.answer,
        course_id=payload.course_id,
        mode=payload.mode,
        used_general_fallback=result.used_general_fallback,
        retrieved_chunks=retrieved_chunks,
    )
