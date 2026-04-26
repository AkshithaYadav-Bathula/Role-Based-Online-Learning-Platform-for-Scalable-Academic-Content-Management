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

### Payments (Stripe)

Course enrollment is gated behind a Stripe payment flow. Students are redirected to a Stripe checkout page and gain access immediately after successful payment.

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
| Payments | Stripe |
| AI Service | Python, FastAPI, LangChain, ChromaDB, youtube_transcript_api |
| Vector DB | ChromaDB |
| LLM Runtime | Ollama – Llama 3.2 (local) |

---

## Screenshots

### Student Flow

**Login / Signup**

![Login Signup](https://github.com/user-attachments/assets/2b400410-cf4b-4d65-b9a6-de001ef91017)

**Course Browsing and Navigation**

![Course Navigation](https://github.com/user-attachments/assets/993ab9e1-3951-4a60-9510-383d7ef89267)

**Enroll in a Course**

![Enroll](https://github.com/user-attachments/assets/a3abe28f-c419-4d7b-acb1-30f6bac93ca5)

**Stripe Payment**

![Stripe Payment](https://github.com/user-attachments/assets/6bf98026-681b-4fcd-b76c-f268723e6a8e)

**After Enrollment — Course Access**

![After Enrollment](https://github.com/user-attachments/assets/f44aafdb-4600-4125-9364-570b4c30da52)

**Lecture View**

![Lecture View](https://github.com/user-attachments/assets/247695a1-e730-4304-9831-879b46ccc231)

**Q&A / Discussions**

![Q and A](https://github.com/user-attachments/assets/13ebc97a-092a-4ebd-a628-6634d4d77b73)

**Announcements**

![Announcements](https://github.com/user-attachments/assets/3f34ac6c-0961-4e5e-b273-5c6932645244)

**AI Chatbot and Resources**

![AI Chatbot](https://github.com/user-attachments/assets/39698482-00bd-492a-92be-49609a1f0a33)

**Notification Management**

![Notifications](https://github.com/user-attachments/assets/bc45a66b-b6dc-4e7e-800e-beae78a2f62f)

**Progress Tracking**

![Progress Tracking](https://github.com/user-attachments/assets/669f97fd-df26-4ac1-b45f-546e32d61c5b)

---

### Educator Flow

**Educator Dashboard**

![Educator Dashboard](https://github.com/user-attachments/assets/f389c6d9-099c-442f-be28-1b49324ae748)

**Adding a Course**

![Adding Course](https://github.com/user-attachments/assets/df00308e-d46f-4393-89a3-f792a071ec5b)

**Updating Course and Adding Lectures**

![Updating Course](https://github.com/user-attachments/assets/69ede057-cb6d-4b38-bd25-e934ada2fb63)

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
