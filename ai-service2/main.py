# from fastapi import FastAPI
# from pydantic import BaseModel
# from langchain_ollama import OllamaEmbeddings, ChatOllama
# from langchain_community.vectorstores import Chroma
# from langchain_text_splitters import RecursiveCharacterTextSplitter
# from langchain.prompts import PromptTemplate
# from langchain.schema.runnable import RunnablePassthrough
# from langchain.schema.output_parser import StrOutputParser
from fastapi import FastAPI
from pydantic import BaseModel
from langchain_ollama import OllamaEmbeddings, ChatOllama
# from langchain_community.vectorstores import Chroma
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

app = FastAPI()

print("\n[STARTUP] Loading embedding model: nomic-embed-text via Ollama...")
embedding_model = OllamaEmbeddings(model="nomic-embed-text")
print("[STARTUP] Embedding model loaded successfully.")

print("[STARTUP] Loading LLM: llama3.2 via Ollama...")
llm = ChatOllama(model="llama3.2", temperature=0.1)
print("[STARTUP] LLM loaded successfully.")

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


class IngestRequest(BaseModel):
    lecture_id: int
    lecture_title: str
    lecture_content: str
    course_id: int


class ChatRequest(BaseModel):
    question: str
    course_id: int


@app.post("/ingest")
def ingest_lecture(data: IngestRequest):
    print(f"\n[INGEST] Starting ingestion for lecture: '{data.lecture_title}'")

    print("[INGEST] Splitting lecture text into chunks...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_text(data.lecture_content)
    print(f"[INGEST] Created {len(chunks)} chunks.")

    for i, chunk in enumerate(chunks):
        print(f"  Chunk {i+1}: '{chunk[:60]}...'")

    print(f"[INGEST] Storing in ChromaDB collection: course_{data.course_id}...")
    vectorstore = Chroma(
        collection_name=f"course_{data.course_id}",
        embedding_function=embedding_model,
        persist_directory="./chroma_db"
    )

    metadatas = [
        {"lecture_id": str(data.lecture_id), "lecture_title": data.lecture_title}
        for _ in chunks
    ]

    vectorstore.add_texts(texts=chunks, metadatas=metadatas)
    print(f"[INGEST] Done. {len(chunks)} chunks stored.")

    return {
        "status": "success",
        "lecture": data.lecture_title,
        "chunks_stored": len(chunks)
    }


@app.post("/chat")
def chat(data: ChatRequest):
    print(f"\n[CHAT] Question received: '{data.question}'")

    print(f"[CHAT] Loading ChromaDB collection: course_{data.course_id}...")
    vectorstore = Chroma(
        collection_name=f"course_{data.course_id}",
        embedding_function=embedding_model,
        persist_directory="./chroma_db"
    )

    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 3}
    )

    def format_docs(docs):
        print(f"[CHAT] Retrieved {len(docs)} chunks from ChromaDB.")
        for i, doc in enumerate(docs):
            print(f"  Chunk {i+1}: '{doc.page_content[:80]}...'")
        return "\n\n".join(doc.page_content for doc in docs)

    print("[CHAT] Running RAG chain: retrieve → prompt → LLM → answer...")
    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | rag_prompt
        | llm
        | StrOutputParser()
    )

    answer = rag_chain.invoke(data.question)
    print(f"[CHAT] Answer: {answer}")

    return {"answer": answer.strip()}


@app.get("/health")
def health():
    return {"status": "AI service is running"}