# Chatbot Platform

A lightweight chatbot platform where users create AI-powered conversational agents, configure them with system prompts and knowledge documents, and interact through a dashboard or embeddable widget.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, Flask, PyMongo |
| Database | MongoDB Atlas |
| Auth | JWT (PyJWT + bcrypt) |
| LLM | OpenRouter API (Llama 3.1 8B) |
| Frontend | React 18, Vite, Tailwind CSS |

## Installation

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## Environment Variables

Create `backend/.env`:

```env
PORT=8000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/chatbot-platform
JWT_SECRET=<any-random-string>
OPENROUTER_API_KEY=<your-openrouter-key>
```

| Variable | Source |
|----------|--------|
| `MONGODB_URI` | [MongoDB Atlas](https://www.mongodb.com/atlas) — free tier works |
| `JWT_SECRET` | Any random string for signing tokens |
| `OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai/keys) — free tier available |

## Running Locally

Terminal 1 (backend):

```bash
cd backend
source venv/bin/activate
python app.py
```

Terminal 2 (frontend):

```bash
cd frontend
npm run dev
```

Backend runs on `http://localhost:8000`, frontend on `http://localhost:5173`.

## Architecture

```
backend/
├── app.py              Flask entry, CORS, rate limiting, security headers
├── config.py           Environment config
├── db.py               MongoDB connection + indexes
├── middleware.py        JWT and API key auth decorators
├── services.py         Shared LLM call + system prompt builder
└── routes/
    ├── auth.py         Register, login, current user
    ├── projects.py     Project CRUD + API key management
    ├── prompts.py      Knowledge prompt CRUD
    ├── chat.py         Authenticated chat with LLM
    ├── files.py        Document upload + text extraction
    └── embed.py        Public chat API + embeddable widget

frontend/src/
├── api/index.js        Axios client with JWT interceptor
├── context/AuthContext.jsx
├── components/Navbar.jsx
└── pages/
    ├── Login.jsx / Register.jsx
    ├── Dashboard.jsx       Project list
    ├── ProjectDetail.jsx   Prompts, files, integration config
    └── Chat.jsx            Conversation UI
```

### Request Flow (Chat)

```
Client POST /api/chat/:projectId { message }
  → JWT auth middleware
  → Parallel DB queries (project, chat history, prompts, files) via ThreadPoolExecutor
  → Build system prompt from project config + knowledge base
  → Call OpenRouter LLM API (30s timeout)
  → Persist user + assistant messages to MongoDB
  → Return { reply, chat }
```

### Dual Chat Paths

1. **Authenticated** (`/api/chat`) — per-user chat history, JWT auth, used by the dashboard
2. **Public embed** (`/api/embed/chat`) — per-session via API key, used by the iframe widget

Both share `services.py` for prompt construction and LLM calls.

## Design Decisions

**Parallelized DB queries** — The chat endpoint fires 4 MongoDB queries (project, chat, prompts, files) concurrently via `ThreadPoolExecutor` instead of sequentially. This cuts ~60ms of pre-LLM overhead per request.

**Shared service layer** — `services.py` contains `build_system_content()` and `call_llm()`, eliminating duplication between authenticated and public chat paths. `call_llm()` returns `(reply, error)` tuples for clean error propagation.

**Context stuffing over embeddings** — Knowledge base content (prompts + uploaded documents) is injected directly into the system prompt. This avoids the complexity of vector databases and embedding pipelines while working well within the 8B model's context window. File content is capped at 30k chars per document.

**Optimistic response construction** — After updating chat history in MongoDB, the response is built from in-memory data rather than re-fetching the document, saving one DB round trip per message.

**MongoDB field projections** — Prompt and file queries only fetch the fields needed for system prompt construction (`title`, `content`, `originalName`), reducing BSON deserialization overhead.

**In-memory rate limiting** — `flask-limiter` with `memory://` storage. Sufficient for single-process deployment; swap to Redis URI for multi-worker setups.

**30s LLM timeout** — Reduced from 60s to fail faster on stuck requests. The free-tier Llama 3.1 8B model typically responds within 3-5 seconds.

## Trade-offs

| Decision | Benefit | Ceiling |
|----------|---------|---------|
| Context stuffing (no embeddings) | Zero infrastructure overhead | Limited by model context window (~8k tokens for Llama 3.1 8B) |
| In-memory rate limiting | No Redis dependency | Resets on restart, doesn't work across multiple workers |
| Synchronous Flask | Simple deployment and debugging | One request per thread; consider async framework for high concurrency |
| No response streaming | Simpler client/server contract | User sees full response only after LLM completes |
| Single LLM provider | Clean, minimal code | Switching providers requires changing `services.py` |
| File stored on disk | Simple upload flow | Not suitable for multi-server or serverless deployment |

## Future Extension Points

| Feature | Where to add |
|---------|-------------|
| Additional AI providers | Add provider logic to `services.py`, parameterize model in project config |
| Analytics | Add middleware or after-request hook in `app.py` to log usage metrics |
| Authentication (OAuth, SSO) | Extend `auth.py` and `middleware.py` |
| Response streaming | Add SSE endpoint in `chat.py`, use `stream=True` in `call_llm()` |
| Conversation history export | Add GET endpoint in `chat.py` with pagination |
| External integrations (Slack, etc.) | Add new blueprint, reuse `services.call_llm()` |
| Multi-tenant / teams | Add `org` field to projects, extend auth middleware |

