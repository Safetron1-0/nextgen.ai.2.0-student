# NextGen AI Service

Personalized placement advisor powered by **Ollama (llama3.1:8b)** + **ChromaDB RAG**.

## Prerequisites

### 1. Install Ollama
Download from [https://ollama.com/download](https://ollama.com/download) and install.

### 2. Pull Required Models
```bash
# Chat/reasoning model (~4.7 GB)
ollama pull llama3.1:8b

# Embedding model for RAG (~274 MB)
ollama pull nomic-embed-text
```

### 3. Install Python 3.10+
Ensure you have Python 3.10 or higher installed.

---

## Setup

```bash
# Navigate to the ai-service folder
cd ai-service

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env file (already pre-configured for local use)
copy .env.example .env
```

---

## Running

Make sure Ollama is running and the Spring Boot backend is up on port 8080.

```bash
# Start the AI service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The service will be available at: **http://localhost:8000**

Swagger UI (auto-generated docs): **http://localhost:8000/docs**

---

## API Endpoints

### `POST /chat`
Personalized AI chat for a student.

**Request body:**
```json
{
  "username": "student123",
  "query": "Which companies should I focus on?",
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Response:**
```json
{
  "answer": "Based on your CGPA of 8.5 and shortlist at Google...",
  "reasoning": "Rahul has 8.5 CGPA, shortlisted at Google...",
  "student_name": "Rahul Sharma",
  "context_used": "[Context 1] Rahul has been shortlisted..."
}
```

### `GET /health`
Health check — returns `{"status": "ok"}`.

### `DELETE /rag/{username}`
Clears the ChromaDB RAG cache for a specific student.

---

## Architecture

```
Frontend (React)
    │  POST /chat {username, query, token}
    ▼
FastAPI (port 8000)
  ├── 1. Fetch profile + apps from Spring Boot (port 8080) using JWT
  ├── 2. Build text chunks → upsert to ChromaDB (chroma_db/ folder)
  ├── 3. Similarity search → retrieve top-5 relevant context chunks
  └── 4. Call Ollama llama3.1:8b → return {answer, reasoning}
```

---

## ChromaDB Storage

Student data is stored in `./chroma_db/` (auto-created).
Each student gets their own collection: `student_{username}`.
Data is refreshed on every chat session with the latest profile/application data.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `Connection refused` on port 11434 | Start Ollama: `ollama serve` |
| Model not found | Run `ollama pull llama3.1:8b` |
| Spring Boot 401 error | Make sure you're logged in on the frontend (valid JWT) |
| ChromaDB errors | Delete the `chroma_db/` folder and restart |
