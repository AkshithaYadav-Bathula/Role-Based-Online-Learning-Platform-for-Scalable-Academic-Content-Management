from typing import List
from app.services.store import KnowledgeChunk


def build_answer(question: str, mode: str, retrieved_chunks: List[KnowledgeChunk], general_fallback_enabled: bool) -> tuple[str, bool]:
    if not retrieved_chunks:
        if general_fallback_enabled:
            return (
                "I could not find enough course material for this question. Here is a general educational explanation: "
                f"{question.strip()}",
                True,
            )
        return (
            "I could not find enough course material for this question in the selected course.",
            False,
        )

    if mode == "summary":
        summary_lines = []
        for chunk in retrieved_chunks[:4]:
            words = chunk.text.split()
            excerpt = " ".join(words[:32])
            summary_lines.append(f"- {excerpt}{'...' if len(words) > 32 else ''}")
        return ("Here is a course-grounded summary:\n" + "\n".join(summary_lines), False)

    if mode == "explain":
        primary = retrieved_chunks[0].text.strip()
        return (
            "Course-grounded explanation: "
            f"{primary[:500]}{'...' if len(primary) > 500 else ''}",
            False,
        )

    main_chunk = retrieved_chunks[0].text.split()
    lead = " ".join(main_chunk[:36]).strip()
    supporting = []
    for chunk in retrieved_chunks[1:4]:
        supporting.append(" ".join(chunk.text.split()[:18]).strip())

    answer = "Based on the course material, the answer is: "
    answer += lead + ("..." if len(main_chunk) > 36 else "")
    if supporting:
        answer += "\n\nSupporting points:\n"
        answer += "\n".join(f"- {point}{'...' if len(point.split()) >= 18 else ''}" for point in supporting)
    answer += "\n\nQuestion asked: " + question.strip()
    return answer, False
