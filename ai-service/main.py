"""
main.py — NextGen AI Service (FastAPI)

Provides a personalized AI chat endpoint for the placement portal.

Pipeline per request:
  1. Receive { username, query, token } from frontend
  2. Fetch student profile + applications from Spring Boot (using JWT)
  3. Upsert fresh student data into ChromaDB RAG vector store
  4. Retrieve top relevant context chunks for the query
  5. Send (context + query) to Ollama llama3.1:8b for reasoned response
  6. Return { answer, reasoning } to the frontend

Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from services.profile_fetcher import get_full_student_context
from rag.student_rag import upsert_student_to_vectorstore, retrieve_context
from llm.chain import call_llm, stream_llm

# ────────────────────────────────────────────
# App setup
# ────────────────────────────────────────────
app = FastAPI(
    title="NextGen AI Service",
    description="Personalized placement advisor powered by Ollama + RAG (ChromaDB)",
    version="1.0.0",
)

# Allow requests from the React frontend (port 5173 by default)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ────────────────────────────────────────────
# Request / Response models
# ────────────────────────────────────────────
class ChatRequest(BaseModel):
    username: str
    query: str
    token: str  # JWT from frontend (forwarded to Spring Boot)


class ChatResponse(BaseModel):
    answer: str
    reasoning: Optional[str] = ""
    student_name: Optional[str] = ""
    context_used: Optional[str] = ""
    rejected: Optional[bool] = False        # True when query is off-topic or privacy blocked
    privacy_blocked: Optional[bool] = False  # True specifically for cross-student queries


# ────────────────────────────────────────────
# Health check
# ────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "NextGen AI Service"}


# ────────────────────────────────────────────
# Main chat endpoint
# ────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Personalized AI chat endpoint.

    Accepts the student's username, query, and JWT token.
    Returns a personalized, reasoned answer grounded in the student's actual data.
    The response is STRICTLY scoped to the authenticated student — no other
    student's data is ever loaded, and the LLM system prompt enforces a privacy wall.
    """
    if not req.username or not req.query.strip():
        raise HTTPException(status_code=400, detail="username and query are required.")

    print(f"\n[chat] Request from '{req.username}': {req.query[:80]}")

    # ── Step 1: Fetch student data from Spring Boot (ONLY this student's data) ──
    print("[chat] Step 1: Fetching student context from Spring Boot...")
    student_context = await get_full_student_context(req.username, req.token)

    profile = student_context.get("profile", {})
    student_name = profile.get("name", req.username)
    print(f"[chat] Student resolved: {student_name}")

    # ── Step 2: Upsert to ChromaDB RAG store (per-student collection) ─────────
    print("[chat] Step 2: Upserting student data to ChromaDB...")
    upsert_student_to_vectorstore(req.username, student_context)

    # ── Step 3: Retrieve relevant context for query ───────────────────
    print("[chat] Step 3: Retrieving RAG context...")
    retrieved_context = retrieve_context(req.username, req.query, top_k=5)

    # ── Step 4: Call Ollama LLM (with privacy + relevance guard) ──────────
    print("[chat] Step 4: Calling Ollama LLM (with privacy + relevance guard)...")
    llm_result = await call_llm(profile, student_context, retrieved_context, req.query)

    if llm_result.get("privacy_blocked"):
        print(f"[chat] 🔒 Cross-student query BLOCKED for '{student_name}'")
    elif llm_result.get("rejected"):
        print(f"[chat] ⛔ Query rejected as off-topic for '{student_name}'")
    else:
        print(f"[chat] ✓ Response generated for '{student_name}'")

    return ChatResponse(
        answer=llm_result.get("answer", ""),
        reasoning=llm_result.get("reasoning", ""),
        student_name=student_name,
        context_used="" if llm_result.get("rejected") else retrieved_context,
        rejected=llm_result.get("rejected", False),
        privacy_blocked=llm_result.get("privacy_blocked", False),
    )


# ────────────────────────────────────────────
# Streaming endpoint — SSE (Server-Sent Events)
# ────────────────────────────────────────────
@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """
    Streaming AI chat endpoint via Server-Sent Events (SSE).

    Same pipeline as /chat but streams Ollama tokens progressively.
    The frontend reads events as they arrive and renders tokens in real-time,
    providing a ChatGPT-style typing experience.

    Event types emitted:
        {"type": "token",   "content": "..."}  — partial text token
        {"type": "done",    "reasoning": "..."} — stream finished + reasoning
        {"type": "rejected","content": "..."}  — query blocked (off-topic or privacy)
        {"type": "error",   "content": "..."}  — error occurred
        {"type": "meta",    ...}               — student metadata
    """
    if not req.username or not req.query.strip():
        raise HTTPException(status_code=400, detail="username and query are required.")

    print(f"\n[chat/stream] Request from '{req.username}': {req.query[:80]}")

    async def event_generator():
        import json

        def sse(payload: dict) -> str:
            return f"data: {json.dumps(payload)}\n\n"

        try:
            # ── Step 1: Fetch student data ─────────────────────────────
            student_context = await get_full_student_context(req.username, req.token)
            profile = student_context.get("profile", {})
            student_name = profile.get("name", req.username)

            # Emit student metadata so frontend can show name immediately
            yield sse({"type": "meta", "student_name": student_name})

            # ── Step 2: Upsert to ChromaDB ───────────────────────────
            upsert_student_to_vectorstore(req.username, student_context)

            # ── Step 3: Retrieve RAG context ─────────────────────────
            retrieved_context = retrieve_context(req.username, req.query, top_k=5)

            # ── Step 4: Stream LLM tokens ───────────────────────────
            async for event in stream_llm(profile, student_context, retrieved_context, req.query):
                yield event

        except Exception as e:
            import json
            print(f"[chat/stream] Unexpected error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable Nginx buffering
        },
    )


# ────────────────────────────────────────────
# Optional: Clear a student's RAG cache
# ────────────────────────────────────────────
@app.delete("/rag/{username}")
async def clear_student_rag(username: str):
    """Clears the ChromaDB collection for a specific student (admin use)."""
    from langchain_chroma import Chroma
    from rag.student_rag import get_embeddings, CHROMA_PERSIST_DIR

    collection_name = f"student_{username.replace('-', '_').replace('.', '_')}"
    try:
        vs = Chroma(
            collection_name=collection_name,
            embedding_function=get_embeddings(),
            persist_directory=CHROMA_PERSIST_DIR,
        )
        vs.delete_collection()
        return {"message": f"RAG cache cleared for student '{username}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
