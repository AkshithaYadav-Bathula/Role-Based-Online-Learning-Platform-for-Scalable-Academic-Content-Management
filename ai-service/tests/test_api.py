from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ingest_and_chat_flow(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.assistant.generate_answer",
        lambda sys_prompt, user_prompt: "Based on the course material, dependency injection helps manage objects."
    )
    
    ingest_response = client.post(
        "/v1/ingest",
        json={
            "course_id": "course-101",
            "title": "Spring Basics",
            "source_type": "text",
            "content": "Spring Boot simplifies application setup. Dependency injection helps manage objects. Beans are created by the container.",
            "metadata": {"lecture": "Lecture 1"},
        },
    )
    assert ingest_response.status_code == 200
    assert ingest_response.json()["chunks_indexed"] >= 1

    chat_response = client.post(
        "/v1/chat",
        json={
            "course_id": "course-101",
            "question": "What does dependency injection do?",
            "mode": "qa",
        },
    )
    assert chat_response.status_code == 200
    body = chat_response.json()
    assert body["success"] is True
    assert body["retrieved_chunks"]
    assert "dependency" in body["answer"].lower() or "based on the course material" in body["answer"].lower()


def test_summary_and_explain_use_course_content(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.assistant.generate_answer",
        lambda sys_prompt, user_prompt: "Here is a summary:\n- Topic 1\nAnd for explain: left join means keeping all records from the left table."
    )
    client.post(
        "/v1/ingest",
        json={
            "course_id": "course-202",
            "title": "SQL Fundamentals",
            "source_type": "text",
            "content": "SQL joins combine rows from two tables. Inner joins keep matching rows. Left joins keep every row from the left table.",
        },
    )

    summary_response = client.post(
        "/v1/chat",
        json={
            "course_id": "course-202",
            "question": "Summarize this lecture",
            "mode": "summary",
        },
    )
    assert summary_response.status_code == 200
    summary_body = summary_response.json()
    assert summary_body["used_general_fallback"] is False
    assert "summary" in summary_body["answer"].lower()

    explain_response = client.post(
        "/v1/chat",
        json={
            "course_id": "course-202",
            "question": "Explain left joins simply",
            "mode": "explain",
        },
    )
    assert explain_response.status_code == 200
    explain_body = explain_response.json()
    assert explain_body["used_general_fallback"] is False
    assert "left join" in explain_body["answer"].lower()


def test_youtube_ingest_uses_transcript(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.assistant.fetch_youtube_transcript",
        lambda source_url, language="en": (
            "Transcript line one. Transcript line two.",
            {"video_id": "abc123xyz99", "source_url": source_url, "language": language},
        ),
    )

    response = client.post(
        "/v1/ingest",
        json={
            "course_id": "course-youtube",
            "title": "YouTube Lecture",
            "source_type": "youtube",
            "source_url": "https://youtu.be/abc123xyz99",
            "content": "",
        },
    )

    assert response.status_code == 200
    assert response.json()["chunks_indexed"] >= 1


def test_chat_without_ingest_uses_fallback(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.assistant.generate_answer",
        lambda sys_prompt, user_prompt: "Fallback answer"
    )
    
    response = client.post(
        "/v1/chat",
        json={
            "course_id": "course-empty",
            "question": "Explain this topic simply",
            "mode": "explain",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["used_general_fallback"] is True
    assert body["retrieved_chunks"] == []
