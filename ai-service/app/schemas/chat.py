from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class IngestChunk(BaseModel):
    text: str
    chunk_index: int
    score: float = 0.0
    source_label: Optional[str] = None


class IngestRequest(BaseModel):
    course_id: str = Field(..., min_length=1)
    title: Optional[str] = None
    source_type: Literal["text", "youtube", "pdf", "notes"] = "text"
    content: Optional[str] = None
    source_url: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class IngestResponse(BaseModel):
    success: bool
    course_id: str
    chunks_indexed: int
    message: str


class ChatRequest(BaseModel):
    course_id: str = Field(..., min_length=1)
    question: str = Field(..., min_length=1)
    mode: Literal["qa", "summary", "explain"] = "qa"
    lecture_id: Optional[str] = None
    chat_history: List[dict] = Field(default_factory=list)


class SourceChunk(BaseModel):
    text: str
    score: float
    source_label: Optional[str] = None
    chunk_index: int


class ChatResponse(BaseModel):
    success: bool
    answer: str
    course_id: str
    mode: str
    used_general_fallback: bool
    retrieved_chunks: List[SourceChunk] = Field(default_factory=list)
