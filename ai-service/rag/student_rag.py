"""
student_rag.py
RAG pipeline: converts student data into text chunks, stores them in ChromaDB
(persistent, per-student collection), and retrieves relevant context for queries.

Uses a local HuggingFace sentence-transformers model (all-MiniLM-L6-v2) for
generating embeddings. This runs directly inside the service's own process —
no external embedding server (like Ollama) is required.
"""

import os
from typing import List
from dotenv import load_dotenv

import chromadb
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

load_dotenv()

# Small, fast, CPU-friendly embedding model (~80MB). Runs locally in-process.
EMBED_MODEL_NAME = os.getenv("EMBED_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")

# Cache the embeddings object so the model is loaded into memory only once
# per process, not on every request.
_embeddings_instance = None


def get_embeddings():
    """Returns a locally-run HuggingFace embedding function (all-MiniLM-L6-v2)."""
    global _embeddings_instance
    if _embeddings_instance is None:
        _embeddings_instance = HuggingFaceEmbeddings(
            model_name=EMBED_MODEL_NAME,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
    return _embeddings_instance


def get_vectorstore(username: str) -> Chroma:
    """
    Returns (or creates) a persistent ChromaDB vector store for a specific student.
    Each student gets their own collection: 'student_{username}'.
    """
    collection_name = f"student_{username.replace('-', '_').replace('.', '_').replace('@', '_')}"
    return Chroma(
        collection_name=collection_name,
        embedding_function=get_embeddings(),
        persist_directory=CHROMA_PERSIST_DIR,
    )


def _safe_float(val, default=0.0):
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def build_student_chunks(context: dict) -> List[Document]:
    """
    Converts raw student context dict into a list of LangChain Documents (text chunks).
    Each chunk focuses on a specific aspect for fine-grained retrieval.
    """
    chunks = []
    profile = context.get("profile", {})
    applications = context.get("applications", [])
    stats = context.get("stats", {})
    on_duty = context.get("on_duty", [])
    resources = context.get("resources", [])
    companies = context.get("companies", [])
    username = context.get("username", "")

    # ── Chunk 1: Core identity
    name = profile.get("name", username)
    dept = profile.get("department", "Unknown Department")
    year = profile.get("year", "?")
    cgpa = profile.get("cgpa", "N/A")
    email = profile.get("email", "")
    phone = profile.get("phone", "")

    chunks.append(Document(
        page_content=(
            f"Student Name: {name}. "
            f"Username: {username}. "
            f"Department: {dept}. "
            f"Year: {year}. "
            f"CGPA: {cgpa}. "
            f"Email: {email}. "
            f"Phone: {phone}."
        ),
        metadata={"type": "profile", "username": username}
    ))

    # ── Chunk 2: Academic standing summary
    cgpa_val = _safe_float(cgpa)
    if cgpa_val >= 8.5:
        standing = "top academic tier (excellent CGPA >= 8.5)"
    elif cgpa_val >= 7.0:
        standing = "good academic standing (CGPA 7.0 - 8.5)"
    elif cgpa_val >= 6.0:
        standing = "average academic standing (CGPA 6.0 - 7.0)"
    else:
        standing = "needs academic improvement (CGPA below 6.0)"

    chunks.append(Document(
        page_content=(
            f"{name} is a {year}-year {dept} student with a CGPA of {cgpa}. "
            f"They are in {standing}. "
            f"Their academic performance makes them {'competitive for top-tier companies' if cgpa_val >= 8.0 else 'eligible for most companies' if cgpa_val >= 7.0 else 'eligible for select companies but may have CGPA filters to clear'}."
        ),
        metadata={"type": "academic", "username": username}
    ))

    # ── Chunk 3: Placement statistics summary
    if stats:
        applied = stats.get("applied", 0)
        shortlisted = stats.get("shortlisted", 0)
        next_round = stats.get("nextRound", 0)
        selected = stats.get("selected", 0)
        rejected = stats.get("rejected", 0)
        total = applied + shortlisted + next_round + selected + rejected

        shortlist_rate = round((shortlisted + next_round + selected) / total * 100, 1) if total > 0 else 0

        chunks.append(Document(
            page_content=(
                f"{name}'s placement activity summary: "
                f"Applied to {total} companies in total. "
                f"Shortlisted in {shortlisted} companies. "
                f"Advanced to next round in {next_round} companies. "
                f"Successfully selected/placed in {selected} companies. "
                f"Rejected in {rejected} companies. "
                f"Overall shortlisting rate: {shortlist_rate}%."
            ),
            metadata={"type": "stats", "username": username}
        ))

    # ── Chunk per application (most specific context)
    for app in applications:
        company = app.get("companyName", app.get("company", {}).get("name", "Unknown Company") if isinstance(app.get("company"), dict) else "Unknown Company")
        role = app.get("role", "Unknown Role")
        status = app.get("status", "UNKNOWN")
        next_action = app.get("nextAction", "")
        date_val = app.get("date", "")
        pkg = app.get("packageLpa", "")

        status_text = {
            "APPLIED": "has applied and is awaiting response",
            "SHORTLISTED": "has been shortlisted (interview upcoming)",
            "NEXT_ROUND": "has advanced to the next interview round",
            "SELECTED": "has been successfully selected/placed",
            "REJECTED": "was not selected",
        }.get(status, f"has status: {status}")

        chunk_text = f"{name} {status_text} at {company} for the role of {role}."
        if pkg:
            chunk_text += f" Offered package: {pkg} LPA."
        if next_action:
            chunk_text += f" Next action required: {next_action}."
        if date_val:
            chunk_text += f" Application date: {date_val}."

        chunks.append(Document(
            page_content=chunk_text,
            metadata={
                "type": "application",
                "company": company,
                "status": status,
                "username": username,
            }
        ))

    # ── Chunk: Shortlisted/Selected companies summary
    shortlisted_companies = [
        app.get("companyName", "Unknown")
        for app in applications
        if app.get("status") in ("SHORTLISTED", "NEXT_ROUND", "SELECTED")
    ]
    selected_companies = [
        app.get("companyName", "Unknown")
        for app in applications
        if app.get("status") == "SELECTED"
    ]

    if shortlisted_companies:
        chunks.append(Document(
            page_content=(
                f"{name} is currently shortlisted or in advanced rounds at: "
                f"{', '.join(shortlisted_companies)}. "
                f"{'They have been selected/placed at: ' + ', '.join(selected_companies) + '.' if selected_companies else 'No offers received yet.'}"
            ),
            metadata={"type": "shortlist_summary", "username": username}
        ))

    # ── Chunk: On-duty requests
    if on_duty:
        od_summary = []
        for od in on_duty:
            title = od.get("title", "")
            status_od = od.get("status", "")
            from_d = od.get("fromDate", od.get("from_date", ""))
            to_d = od.get("toDate", od.get("to_date", ""))
            od_summary.append(f"{title} ({status_od}, {from_d} to {to_d})")

        chunks.append(Document(
            page_content=(
                f"{name} has submitted {len(on_duty)} on-duty request(s): "
                f"{'; '.join(od_summary)}."
            ),
            metadata={"type": "on_duty", "username": username}
        ))

    # ── Chunk: Available resources by category
    if resources:
        by_category = {}
        for r in resources:
            cat = r.get("category", "General")
            by_category.setdefault(cat, []).append(r.get("title", ""))

        resource_text_parts = []
        for cat, titles in by_category.items():
            resource_text_parts.append(f"{cat}: {', '.join(titles[:5])}")

        chunks.append(Document(
            page_content=(
                f"Available placement preparation resources for {name}: "
                + "; ".join(resource_text_parts) + ". "
                "These resources cover topics like DSA, DBMS, CN, OS, SQL and more."
            ),
            metadata={"type": "resources", "username": username}
        ))

    # ── Chunk: Available companies in portal
    if companies:
        company_names = [c.get("name", "") for c in companies if c.get("name")]
        chunks.append(Document(
            page_content=(
                f"Companies currently registered in the placement portal that {name} may apply to: "
                f"{', '.join(company_names[:20])}."
            ),
            metadata={"type": "companies_list", "username": username}
        ))

    return chunks


def upsert_student_to_vectorstore(username: str, context: dict) -> None:
    """
    Builds chunks from the student context and upserts them into ChromaDB.
    Deletes old data for this student before reinserting to keep it fresh.
    """
    vectorstore = get_vectorstore(username)
    chunks = build_student_chunks(context)

    # Delete existing documents for this student and reinsert
    try:
        existing = vectorstore.get(where={"username": username})
        if existing and existing.get("ids"):
            vectorstore.delete(ids=existing["ids"])
    except Exception as e:
        print(f"[rag] Note: Could not delete old docs (may not exist yet): {e}")

    if chunks:
        vectorstore.add_documents(chunks)
        print(f"[rag] Upserted {len(chunks)} chunks for student '{username}'")


def retrieve_context(username: str, query: str, top_k: int = 6) -> str:
    """
    Performs similarity search against the student's ChromaDB collection.
    Returns the concatenated text of the top-K most relevant chunks.
    """
    vectorstore = get_vectorstore(username)

    try:
        results = vectorstore.similarity_search(query, k=top_k)
        if not results:
            return "No specific context found for this student."

        context_parts = []
        for i, doc in enumerate(results, 1):
            context_parts.append(f"[Context {i}] {doc.page_content}")

        return "\n\n".join(context_parts)

    except Exception as e:
        print(f"[rag] Error during retrieval: {e}")
        return "Could not retrieve student context."
