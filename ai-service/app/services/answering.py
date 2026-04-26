import re
from typing import List

from app.services.store import KnowledgeChunk
from app.services.retrieval import tokenize

_SENTENCE_PATTERN = re.compile(r"(?<=[.!?])\s+")


def split_sentences(text: str) -> List[str]:
    sentences = [sentence.strip() for sentence in _SENTENCE_PATTERN.split(text) if sentence.strip()]
    return sentences or [text.strip()]


def best_sentence(question: str, chunk_text: str) -> str:
    question_tokens = set(tokenize(question))
    sentences = split_sentences(chunk_text)

    best = sentences[0]
    best_score = -1
    for sentence in sentences:
        sentence_tokens = set(tokenize(sentence))
        overlap = len(question_tokens & sentence_tokens)
        if overlap > best_score:
            best_score = overlap
            best = sentence

    return best


def short_summary_from_chunks(chunks: List[KnowledgeChunk]) -> str:
    bullet_points = []
    for chunk in chunks[:4]:
        sentence = split_sentences(chunk.text)[0]
        bullet_points.append(f"- {sentence}")
    return "\n".join(bullet_points)


def build_answer(question: str, mode: str, retrieved_chunks: List[KnowledgeChunk], general_fallback_enabled: bool) -> tuple[str, bool]:
    if not retrieved_chunks:
        if general_fallback_enabled:
            return (
                "I could not find enough course material for this question in the selected course. "
                "Please ingest lecture text, notes, or a transcript first. If you still want a general explanation, here it is: "
                f"{question.strip()}",
                True,
            )
        return (
            "I could not find enough course material for this question in the selected course. Please ingest course content first.",
            False,
        )

    if mode == "summary":
        return ("Here is a course-grounded summary:\n" + short_summary_from_chunks(retrieved_chunks), False)

    if mode == "explain":
        primary = best_sentence(question, retrieved_chunks[0].text)
        return (
            "Course-grounded explanation: "
            f"{primary}",
            False,
        )

    primary = best_sentence(question, retrieved_chunks[0].text)
    supporting = [best_sentence(question, chunk.text) for chunk in retrieved_chunks[1:4]]

    answer = "Based on the course material, the answer is: " + primary
    if supporting:
        supporting = [point for point in supporting if point and point != primary]
    if supporting:
        answer += "\n\nSupporting points:\n"
        answer += "\n".join(f"- {point}" for point in supporting)
    return answer, False
