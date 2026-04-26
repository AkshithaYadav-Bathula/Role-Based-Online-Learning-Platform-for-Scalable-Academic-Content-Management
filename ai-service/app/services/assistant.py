from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import List, Tuple

from app.core.config import settings
from app.schemas.chat import ChatRequest, IngestRequest
from app.services.llm import generate_answer
from app.services.retrieval import chunk_text
from app.services.store import KnowledgeChunk
from app.services.vector_store import get_vector_store
from app.services.youtube import fetch_youtube_transcript


@dataclass
class IngestResult:
    course_id: str
    chunks_indexed: int
    message: str


@dataclass
class ChatResult:
    answer: str
    used_general_fallback: bool
    retrieved_chunks: List[Tuple[KnowledgeChunk, float]]


class CourseAIService:
    def __init__(self) -> None:
        self._vector_store = get_vector_store()

    def ingest(self, payload: IngestRequest) -> IngestResult:
        content = self._resolve_content(payload)
        if not content:
            raise ValueError("Ingested content is empty. Provide lecture text or a YouTube URL.")

        chunks = chunk_text(content)
        if not chunks:
            raise ValueError("The content could not be split into chunks.")

        indexed_chunks = [
            KnowledgeChunk(
                course_id=payload.course_id,
                text=chunk,
                chunk_index=index,
                source_label=payload.title or payload.source_type,
                metadata={
                    "source_type": payload.source_type,
                    "source_url": payload.source_url,
                    **payload.metadata,
                },
            )
            for index, chunk in enumerate(chunks)
        ]
        count = self._vector_store.upsert_course_chunks(payload.course_id, indexed_chunks)
        return IngestResult(
            course_id=payload.course_id,
            chunks_indexed=count,
            message="Course content indexed successfully",
        )

    def chat(self, payload: ChatRequest) -> ChatResult:
        if payload.mode == "summary":
            retrieved_chunks = self._vector_store.get_course_chunks(payload.course_id)[: settings.top_k * 2]
        elif payload.mode == "explain":
            retrieved_chunks = self._vector_store.get_course_chunks(payload.course_id)[: settings.top_k * 3]
        else:
            retrieved_chunks = self._vector_store.search_course_chunks(
                payload.course_id,
                payload.question,
                top_k=settings.top_k,
            )

        if not retrieved_chunks:
            if not settings.general_fallback_enabled:
                return ChatResult(
                    answer="I could not find enough course material for this question in the selected course. Please ingest course content first.",
                    used_general_fallback=False,
                    retrieved_chunks=[],
                )

            sys_prompt, user_prompt = self._build_prompts(payload, [])
            return ChatResult(
                answer=self._safe_generate(sys_prompt, user_prompt),
                used_general_fallback=True,
                retrieved_chunks=[],
            )

        sys_prompt, user_prompt = self._build_prompts(payload, retrieved_chunks)
        return ChatResult(
            answer=self._safe_generate(sys_prompt, user_prompt),
            used_general_fallback=False,
            retrieved_chunks=retrieved_chunks,
        )

    def _resolve_content(self, payload: IngestRequest) -> str:
        direct_content = (payload.content or "").strip()
        if payload.source_type != "youtube":
            return direct_content

        if direct_content:
            return direct_content

        if not payload.source_url:
            raise ValueError("YouTube ingest requires a source_url when content is not provided.")

        transcript_text, transcript_metadata = fetch_youtube_transcript(payload.source_url, settings.transcript_language)
        payload.metadata.update(transcript_metadata)
        return transcript_text

    def _build_prompts(self, payload: ChatRequest, retrieved_chunks: List[Tuple[KnowledgeChunk, float]]) -> Tuple[str, str]:
        context_lines = []
        for index, (chunk, score) in enumerate(retrieved_chunks, start=1):
            label = chunk.source_label or "course material"
            context_lines.append(f"[{index}] {label} (chunk {chunk.chunk_index}):\n{chunk.text}")

        context = "\n\n".join(context_lines) if context_lines else "No course context was available."
        history = self._format_history(payload.chat_history)

        instruction_map = {
            "qa": "Answer the learner's question using ONLY the provided Course Context. Do not include outside facts. If the context does not contain the answer, say 'I cannot find the answer in the course material'. Keep the response concise and pedagogical.",
            "summary": "Provide a concise 4-6 bullet point summary of the provided Course Context.",
            "explain": "Explain the concept from the question or context in plain language designed for a learner. Use analogies if helpful. Base your explanation strictly on the provided Course Context.",
        }
        
        system_instruction = instruction_map.get(payload.mode, instruction_map["qa"])
        
        sys_prompt = f"You are an AI teaching assistant. {system_instruction}\n\nCourse Context:\n{context}"
        
        if history != "None":
            sys_prompt += f"\n\nChat History:\n{history}"
            
        user_prompt = payload.question.strip() if payload.question else "Please proceed according to the instruction."
        
        return sys_prompt, user_prompt

    def _safe_generate(self, sys_prompt: str, user_prompt: str) -> str:
        return generate_answer(sys_prompt, user_prompt)

    def _format_history(self, chat_history: List[dict]) -> str:
        if not chat_history:
            return "None"

        formatted = []
        for item in chat_history[-6:]:
            role = str(item.get("role") or "user")
            content = str(item.get("content") or "").strip()
            if content:
                formatted.append(f"{role.capitalize()}: {content}")
        return "\n".join(formatted) if formatted else "None"


@lru_cache(maxsize=1)
def get_course_ai_service() -> CourseAIService:
    return CourseAIService()
