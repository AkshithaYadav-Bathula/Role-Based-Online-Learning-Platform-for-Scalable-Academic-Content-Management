# AI Service

This folder contains the standalone Python AI service for the LMS.

## What this service does now
- Accepts course content through an ingest endpoint
- Splits course text into chunks
- Stores chunks in memory for now
- Ranks chunks against a question with a lightweight retrieval step
- Returns a course-grounded answer draft
- Falls back to a general explanation when course material is missing

## Where to test it
Test this service inside this folder only:
- API docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`
- Automated tests: `pytest`

## Local setup
Create and activate a virtual environment, then install dependencies:

```powershell
cd A:\LMS\LMS\ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run the service

```powershell
uvicorn app.main:app --reload --port 8000
```

## Run tests

```powershell
pytest
```

## Smoke test flow
1. Start Uvicorn.
2. Open `/docs` and try `POST /v1/ingest` with a small course text.
3. Call `POST /v1/chat` with a question from that text.
4. Verify the response includes retrieved chunks and the answer is grounded in the ingested course content.

## Current architecture
- `app/main.py` creates the FastAPI application
- `app/api/routes.py` exposes `/health`, `/v1/ingest`, and `/v1/chat`
- `app/services/store.py` keeps indexed course chunks in memory for now
- `app/services/retrieval.py` chunks and scores content
- `app/services/answering.py` composes the response and fallback text

## Important note
This is the first implementation step. The retrieval layer is intentionally simple and local so we can verify the flow before replacing it with embeddings + vector search + a real LLM provider.
