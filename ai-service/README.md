# AI Service

This folder contains the standalone Python AI service for the LMS.

## What this service does now
- Accepts course content through an ingest endpoint
- Splits course text into chunks
- Stores chunks in a persistent Chroma vector store
- Uses real embedding and LLM provider adapters when configured
- Supports YouTube transcript ingestion
- Returns course-grounded answers, summaries, and explanations
- Falls back to a general answer when course material is missing

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

## Environment variables
These are optional for local development, but they control the real AI stack:

- `VECTOR_STORE_PATH` - where Chroma persists course chunks
- `EMBEDDING_PROVIDER` - `fastembed` or `hashing` for tests
- `EMBEDDING_MODEL` - embedding model name for fastembed
- `LLM_PROVIDER` - `ollama`, `openai`, or `fake` for tests
- `OLLAMA_BASE_URL` - base URL for a local Ollama server
- `LLM_MODEL` - Ollama model name
- `OPENAI_BASE_URL` - OpenAI-compatible chat endpoint
- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_MODEL` - OpenAI chat model name
- `TRANSCRIPT_LANGUAGE` - preferred transcript language for YouTube ingest

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
4. Try `mode=summary` and `mode=explain`.
5. Try `POST /v1/ingest` with `source_type=youtube` and a YouTube URL.
6. Verify the response includes retrieved chunks and the answer is grounded in the ingested course content.

## Current architecture
- `app/main.py` creates the FastAPI application
- `app/api/routes.py` exposes `/health`, `/v1/ingest`, and `/v1/chat`
- `app/services/vector_store.py` persists course chunks in Chroma
- `app/services/embeddings.py` provides embedding backends
- `app/services/llm.py` provides real and test LLM adapters
- `app/services/youtube.py` fetches YouTube transcripts
- `app/services/assistant.py` orchestrates ingest and chat

## Important note
The service now uses a real vector store and provider-based adapters. For production, set `LLM_PROVIDER=ollama` or `LLM_PROVIDER=openai`, and keep `EMBEDDING_PROVIDER=fastembed`.
