# Role-Based Learning Management System with AI Assistant

A role-based LMS that allows educators to create structured course content and students to learn through a course player with progress tracking, discussions, announcements, ratings, and an integrated AI tutoring assistant.

The system includes an AI service that processes lecture content and video transcripts and answers student questions using a Retrieval-Augmented Generation (RAG) pipeline powered by a local language model.

---

## System Architecture

```
Frontend (React)
        ↓
Backend API (User + Course + Progress + Discussion + Purchase)
        ↓
AI Service (FastAPI)
        ↓
Vector Database (ChromaDB)
        ↓
Local LLM Runtime (Ollama – Llama 3.2)
```

---

## Features

### Authentication and Role-Based Access

Two roles are supported: **Educator** and **Student**. Authentication uses JWT tokens with role-specific permissions.

**Educators can:** create courses, chapters, and lectures; upload content and files; embed videos; publish announcements.

**Students can:** browse and enroll in courses, track progress, post doubts, participate in discussions, and use the AI tutor.

---

### Course Structure

Courses follow a three-level hierarchy:

```
Course
 └── Chapters
      └── Lectures
```

Each lecture supports text content, file attachments, embedded video links, and transcript-based indexing for AI tutor support.

---

### Course Player

Students access content through a structured player with chapter navigation, lecture tracking, completion tracking, and resume support.

---

### Progress Tracking

Tracks completed lectures, remaining lectures, and course completion percentage — per student, per course.

---

### Discussions

Students can post doubts, reply to others, and upvote questions. Educators can respond directly. Upvotes surface the most common issues.

---

### Announcements

Educators can publish course announcements. Students receive notifications for new announcements, doubt replies, and content updates.

---

### Ratings and Reviews

Students can rate and review courses. Ratings are visible to prospective students before enrollment.

---

### AI Tutor (Course-Aware Assistant)

The AI tutor is integrated inside the course player and answers questions using lecture content rather than general knowledge.

**Ingestion pipeline (on lecture creation):**

```
Lecture text extracted → video transcript downloaded →
content chunked → embeddings generated → stored in ChromaDB
```

**Query pipeline (on student question):**

```
Relevant chunks retrieved → context passed to LLM → response generated
```

The tutor can answer lecture-specific questions, summarize topics, and simplify explanations. No external AI APIs are required.

**Technologies:** LangChain, ChromaDB, Ollama (Llama 3.2), youtube_transcript_api

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router, Axios |
| Backend API | Ruby on Rails, JWT, REST, ActiveStorage |
| AI Service | Python, FastAPI, LangChain, ChromaDB, youtube_transcript_api |
| Vector DB | ChromaDB |
| LLM Runtime | Ollama – Llama 3.2 (local) |

---

## Screenshots

| | |
|---|---|
| ![Dashboard](https://github.com/user-attachments/assets/89fa775e-5700-4518-b4c1-b154a01bf3f6) | ![Course Structure](https://github.com/user-attachments/assets/9dbe09c3-4485-4110-9b83-35ede16898e1) |
| Dashboard | Course Structure |
| ![Lecture View](https://github.com/user-attachments/assets/f14c778f-675c-469c-8a22-abc94c66ac68) | ![Course Navigation](https://github.com/user-attachments/assets/9d385ca7-44ab-4b2d-98e7-a88e779f4d40) |
| Lecture View | Course Navigation |
| ![Discussions](https://github.com/user-attachments/assets/7cb74feb-db2b-44e9-8e6d-cc4f9d38408a) | ![Progress Tracking](https://github.com/user-attachments/assets/98caf5a6-333a-4e9e-8975-c30df979261c) |
| Discussion System | Progress Tracking |
| ![AI Tutor](https://github.com/user-attachments/assets/f766dc31-2388-42d1-8e2b-4d7c47e125cb) | ![Educator Dashboard](https://github.com/user-attachments/assets/3e15175c-1d83-4625-9f5c-12abede15769) |
| AI Tutor Panel | Educator Dashboard |
| ![Announcements](https://github.com/user-attachments/assets/248828f9-5ea4-4399-a5f6-c62dc5611610) | ![Ratings](https://github.com/user-attachments/assets/cd2596b5-959c-44e6-974c-569139dc172c) |
| Announcements | Ratings and Reviews |

---

## Demo

[Watch the project walkthrough on Google Drive](https://drive.google.com/file/d/1m25kif2HDuzrPqbzhUP0HegchgSoe7PW/view?usp=sharing)

---

## Running Locally

### Backend API

```bash
bundle install
rails db:create
rails db:migrate
rails server
```

### Frontend

```bash
npm install
npm run dev
```

### AI Service

```bash
cd ai-service2
uvicorn main:app --reload --port 8000
```

Ensure Ollama is running:

```bash
ollama run llama3.2
```
