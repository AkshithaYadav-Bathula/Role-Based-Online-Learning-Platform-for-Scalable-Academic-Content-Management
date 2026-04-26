# # from fastapi import FastAPI
# # from pydantic import BaseModel
# # from langchain_ollama import OllamaEmbeddings, ChatOllama
# # from langchain_community.vectorstores import Chroma
# # from langchain_text_splitters import RecursiveCharacterTextSplitter
# # from langchain.prompts import PromptTemplate
# # from langchain.schema.runnable import RunnablePassthrough
# # from langchain.schema.output_parser import StrOutputParser
# from fastapi import FastAPI
# from pydantic import BaseModel
# from langchain_ollama import OllamaEmbeddings, ChatOllama
# # from langchain_community.vectorstores import Chroma
# from langchain_chroma import Chroma
# from langchain_text_splitters import RecursiveCharacterTextSplitter
# from langchain_core.prompts import PromptTemplate
# from langchain_core.runnables import RunnablePassthrough
# from langchain_core.output_parsers import StrOutputParser

# app = FastAPI()

# print("\n[STARTUP] Loading embedding model: nomic-embed-text via Ollama...")
# embedding_model = OllamaEmbeddings(model="nomic-embed-text")
# print("[STARTUP] Embedding model loaded successfully.")

# print("[STARTUP] Loading LLM: llama3.2 via Ollama...")
# llm = ChatOllama(model="llama3.2", temperature=0.1)
# print("[STARTUP] LLM loaded successfully.")

# rag_prompt = PromptTemplate.from_template("""
# You are a concise course tutor for an online learning platform.
# Keep answers under 4 sentences. No unnecessary explanation.

# Rules:
# 1. If the question is answered by the lecture context below, answer ONLY from that context.
# 2. If it is a general academic or technical question not in context, answer briefly from your knowledge.
# 3. If it is completely off-topic, say: "Please ask questions related to your course material."

# Lecture Context:
# {context}

# Student Question: {question}

# Answer:
# """)


# class IngestRequest(BaseModel):
#     lecture_id: int
#     lecture_title: str
#     lecture_content: str
#     course_id: int


# class ChatRequest(BaseModel):
#     question: str
#     course_id: int


# @app.post("/ingest")
# def ingest_lecture(data: IngestRequest):
#     print(f"\n[INGEST] Starting ingestion for lecture: '{data.lecture_title}'")

#     print("[INGEST] Splitting lecture text into chunks...")
#     splitter = RecursiveCharacterTextSplitter(
#         chunk_size=500,
#         chunk_overlap=50
#     )
#     chunks = splitter.split_text(data.lecture_content)
#     print(f"[INGEST] Created {len(chunks)} chunks.")

#     for i, chunk in enumerate(chunks):
#         print(f"  Chunk {i+1}: '{chunk[:60]}...'")

#     print(f"[INGEST] Storing in ChromaDB collection: course_{data.course_id}...")
#     vectorstore = Chroma(
#         collection_name=f"course_{data.course_id}",
#         embedding_function=embedding_model,
#         persist_directory="./chroma_db"
#     )

#     metadatas = [
#         {"lecture_id": str(data.lecture_id), "lecture_title": data.lecture_title}
#         for _ in chunks
#     ]

#     vectorstore.add_texts(texts=chunks, metadatas=metadatas)
#     print(f"[INGEST] Done. {len(chunks)} chunks stored.")

#     return {
#         "status": "success",
#         "lecture": data.lecture_title,
#         "chunks_stored": len(chunks)
#     }


# @app.post("/chat")
# def chat(data: ChatRequest):
#     print(f"\n[CHAT] Question received: '{data.question}'")

#     print(f"[CHAT] Loading ChromaDB collection: course_{data.course_id}...")
#     vectorstore = Chroma(
#         collection_name=f"course_{data.course_id}",
#         embedding_function=embedding_model,
#         persist_directory="./chroma_db"
#     )

#     retriever = vectorstore.as_retriever(
#         search_type="similarity",
#         search_kwargs={"k": 3}
#     )

#     def format_docs(docs):
#         print(f"[CHAT] Retrieved {len(docs)} chunks from ChromaDB.")
#         for i, doc in enumerate(docs):
#             print(f"  Chunk {i+1}: '{doc.page_content[:80]}...'")
#         return "\n\n".join(doc.page_content for doc in docs)

#     print("[CHAT] Running RAG chain: retrieve → prompt → LLM → answer...")
#     rag_chain = (
#         {"context": retriever | format_docs, "question": RunnablePassthrough()}
#         | rag_prompt
#         | llm
#         | StrOutputParser()
#     )

#     answer = rag_chain.invoke(data.question)
#     print(f"[CHAT] Answer: {answer}")

#     return {"answer": answer.strip()}


# @app.get("/health")
# def health():
#     return {"status": "AI service is running"}
from fastapi import FastAPI
from pydantic import BaseModel
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

app = FastAPI()

# -------------------------------------------------------
# STARTUP: Load embedding model once
# nomic-embed-text converts text into vectors for ChromaDB
# -------------------------------------------------------
print("\n[STARTUP] Loading embedding model: nomic-embed-text via Ollama...")
embedding_model = OllamaEmbeddings(model="nomic-embed-text")
print("[STARTUP] Embedding model loaded successfully.")

# -------------------------------------------------------
# STARTUP: Load LLM once
# temperature=0.1 = factual, not creative
# -------------------------------------------------------
print("[STARTUP] Loading LLM: llama3.2 via Ollama...")
llm = ChatOllama(model="llama3.2", temperature=0.1)
print("[STARTUP] LLM loaded successfully.")

# -------------------------------------------------------
# STARTUP: Vectorstore cache
# ChromaDB collections are loaded once and reused
# Instead of loading from disk on every single request
# -------------------------------------------------------
vectorstore_cache = {}

def get_vectorstore(course_id: int):
    key = f"course_{course_id}"
    if key not in vectorstore_cache:
        print(f"[CACHE] Loading ChromaDB collection '{key}' into memory for first time...")
        vectorstore_cache[key] = Chroma(
            collection_name=key,
            embedding_function=embedding_model,
            persist_directory="./chroma_db"
        )
        print(f"[CACHE] Collection '{key}' loaded and cached.")
    else:
        print(f"[CACHE] Reusing cached collection '{key}' — no disk read needed.")
    return vectorstore_cache[key]

# -------------------------------------------------------
# PROMPT TEMPLATE
# Controls exactly how the LLM answers
# Rule 1: answer from lecture context if available
# Rule 2: answer from general knowledge if academic
# Rule 3: redirect if completely off-topic
# -------------------------------------------------------
rag_prompt = PromptTemplate.from_template("""
You are a concise course tutor for an online learning platform.
Keep answers under 4 sentences. No unnecessary explanation.

Rules:
1. If the question is answered by the lecture context below, answer ONLY from that context.
2. If it is a general academic or technical question not in context, answer briefly from your knowledge.
3. If it is completely off-topic, say: "Please ask questions related to your course material."

Lecture Context:
{context}

Student Question: {question}

Answer:
""")


# -------------------------------------------------------
# REQUEST MODELS
# These define what JSON data each endpoint accepts
# -------------------------------------------------------
class IngestRequest(BaseModel):
    lecture_id: int
    lecture_title: str
    lecture_content: str
    course_id: int


class ChatRequest(BaseModel):
    question: str
    course_id: int


# -------------------------------------------------------
# ENDPOINT 1: POST /ingest
# Called when educator saves a lecture
# Splits content into chunks and stores in ChromaDB
# -------------------------------------------------------
@app.post("/ingest")
def ingest_lecture(data: IngestRequest):
    print(f"\n[INGEST] Starting ingestion for lecture: '{data.lecture_title}'")
    print(f"[INGEST] Course ID: {data.course_id}, Lecture ID: {data.lecture_id}")

    # Split lecture text into chunks
    # chunk_size=500 means each chunk is ~500 characters
    # chunk_overlap=50 means chunks share 50 chars at edges so context is not lost
    print("[INGEST] Splitting lecture text into chunks...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_text(data.lecture_content)
    print(f"[INGEST] Created {len(chunks)} chunks from the lecture text.")

    for i, chunk in enumerate(chunks):
        print(f"  Chunk {i+1}: '{chunk[:60]}...'")

    # Load vectorstore for this course (cached after first load)
    print(f"[INGEST] Getting ChromaDB collection for course_{data.course_id}...")
    vectorstore = get_vectorstore(data.course_id)

    # Each chunk gets metadata so we know which lecture it came from
    metadatas = [
        {
            "lecture_id": str(data.lecture_id),
            "lecture_title": data.lecture_title
        }
        for _ in chunks
    ]

    # Store chunks as embeddings in ChromaDB
    print(f"[INGEST] Converting chunks to embeddings and storing in ChromaDB...")
    vectorstore.add_texts(texts=chunks, metadatas=metadatas)
    print(f"[INGEST] Done. {len(chunks)} chunks stored in ChromaDB.")

    return {
        "status": "success",
        "lecture": data.lecture_title,
        "chunks_stored": len(chunks)
    }


# -------------------------------------------------------
# ENDPOINT 2: POST /chat
# Called when student sends a message
# Retrieves relevant chunks and generates answer
# -------------------------------------------------------
@app.post("/chat")
def chat(data: ChatRequest):
    print(f"\n[CHAT] Student question: '{data.question}'")
    print(f"[CHAT] Course ID: {data.course_id}")

    # Load the course vectorstore (from cache if already loaded)
    print(f"[CHAT] Getting ChromaDB collection for course_{data.course_id}...")
    vectorstore = get_vectorstore(data.course_id)
    print("[CHAT] ChromaDB collection ready.")

    # Retriever: finds top 3 chunks most similar to the question
    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 3}
    )

    # Format chunks into a single context string for the prompt
    def format_docs(docs):
        print(f"[CHAT] Retrieved {len(docs)} relevant chunks from ChromaDB:")
        for i, doc in enumerate(docs):
            print(f"  Chunk {i+1}: '{doc.page_content[:80]}...'")
        return "\n\n".join(doc.page_content for doc in docs)

    # Build the RAG chain:
    # 1. retriever finds relevant chunks
    # 2. format_docs joins them into context string
    # 3. rag_prompt fills in context + question
    # 4. llm generates the answer
    # 5. StrOutputParser extracts the text from the LLM response
    print("[CHAT] Running RAG chain: retrieve → prompt → LLM → answer...")
    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | rag_prompt
        | llm
        | StrOutputParser()
    )

    answer = rag_chain.invoke(data.question)
    print(f"[CHAT] Final answer: {answer}")

    return {"answer": answer.strip()}


# -------------------------------------------------------
# ENDPOINT 3: GET /health
# Quick check to confirm service is running
# -------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "AI service is running"}