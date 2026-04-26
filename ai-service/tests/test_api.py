from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ingest_and_chat_flow() -> None:
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
