# Yellow AI — Architecture & Design

Full-stack chatbot platform for building, configuring, and deploying AI agents. Users create projects (agents), configure system prompts and knowledge bases, chat via a dashboard, and embed bots on external sites via API key + iframe widget.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, Flask 3.0.3 |
| Database | MongoDB Atlas (PyMongo) |
| Authentication | JWT (PyJWT, HS256) + bcrypt |
| LLM | OpenRouter API → `meta-llama/llama-3.1-8b-instruct` |
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| Routing | react-router-dom v6 |
| HTTP Client | Axios |
| File Parsing | PyPDF2, stdlib csv/json |
| Rate Limiting | flask-limiter (in-memory) |
| Production | Cloudflare Tunnel |

---

## Project Structure

```
yellow_ai/
├── backend/
│   ├── app.py                  # Flask entry point, blueprint registration, CORS, rate limits
│   ├── config.py               # Environment config (.env loader)
│   ├── db.py                   # MongoDB connection + index creation
│   ├── middleware.py           # @token_required (JWT) & @api_key_required decorators
│   ├── services.py             # Shared LLM call + system prompt builder
│   ├── requirements.txt
│   ├── run.sh                  # Production deploy script (Cloudflare tunnel)
│   ├── .env / .env.example
│   ├── routes/
│   │   ├── auth.py             # Register, login, /me
│   │   ├── projects.py         # Project CRUD + API key regeneration
│   │   ├── prompts.py          # Knowledge prompt CRUD
│   │   ├── chat.py             # Multi-conversation chat (JWT)
│   │   ├── files.py            # Document upload & text extraction
│   │   └── embed.py            # Public embed chat + iframe widget
│   └── uploads/                # Uploaded documents (disk storage)
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx              # Router, protected routes, toast provider
        ├── index.css
        ├── api/index.js         # Axios instance + JWT interceptor
        ├── context/AuthContext.jsx  # JWT in localStorage, login/register/logout
        ├── components/
        │   ├── Navbar.jsx
        │   └── ChatSidebar.jsx
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx       # List/create/delete projects
            ├── ProjectDetail.jsx   # System prompt, knowledge, files, embed config
            └── Chat.jsx            # Multi-conversation chat UI
```

---

## System Architecture

```
┌─────────────────────┐       Axios + JWT        ┌─────────────────────┐
│                     │ ─────────────────────────▸│                     │
│   React SPA         │                           │   Flask API         │
│   (Vite, port 5173) │ ◂─────────────────────── │   (port 8000)       │
│                     │       JSON responses      │                     │
└─────────────────────┘                           └──────────┬──────────┘
                                                             │
                                              ┌──────────────┼──────────────┐
                                              │              │              │
                                              ▼              ▼              ▼
                                       ┌───────────┐  ┌───────────┐  ┌───────────┐
                                       │ MongoDB   │  │ OpenRouter│  │Cloudflare │
                                       │ Atlas     │  │ LLM API  │  │ Tunnel    │
                                       └───────────┘  └───────────┘  └───────────┘

┌─────────────────────┐    X-API-Key header
│  Embed Widget       │ ─────────────────────────▸ Flask API (embed routes)
│  (iframe, HTML/JS)  │
└─────────────────────┘
```

---

## Backend Components

### `app.py` — Entry Point
Registers all 6 Flask blueprints, configures CORS, rate limiting, security headers (`X-Content-Type-Options`, `X-XSS-Protection`, `X-Frame-Options`), and request timing logs. Sets max upload size to 10MB.

### `config.py` — Configuration
Loads environment variables: `PORT`, `MONGODB_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY`, and upload paths.

### `db.py` — Data Layer
MongoClient singleton connecting to MongoDB Atlas. Exposes 5 collections (`users`, `projects`, `prompts`, `files`, `chats`) and creates indexes at startup.

### `middleware.py` — Authentication
Two decorator-based guards:
- **`@token_required`** — Decodes JWT Bearer token, sets `request.user_id`. Used by all dashboard endpoints.
- **`@api_key_required`** — Validates `X-API-Key` header against project's stored key, sets `request.project`. Used by embed endpoints.

### `services.py` — Shared Service Layer
Single integration point for LLM calls, used by both authenticated chat and public embed:
- **`build_system_content()`** — Constructs system prompt by concatenating project's system prompt + knowledge prompts + extracted file text.
- **`call_llm()`** — Sends assembled messages to OpenRouter's API with a 30-second timeout.

---

## Route Blueprints (API Endpoints)

### Auth (`/api/auth`) — Rate limit: 10/min

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | None | Create user account, return JWT |
| POST | `/login` | None | Authenticate, return JWT |
| GET | `/me` | JWT | Current user profile |

### Projects (`/api/projects`) — Rate limit: 200/min

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | List user's projects |
| POST | `/` | JWT | Create project (auto-generates API key) |
| GET | `/:project_id` | JWT | Get project details |
| PUT | `/:project_id` | JWT | Update name/description/systemPrompt |
| DELETE | `/:project_id` | JWT | Delete project + associated data |
| POST | `/:project_id/regenerate-key` | JWT | Regenerate API key |

### Prompts (`/api/prompts`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:project_id` | JWT | List prompts for project |
| POST | `/:project_id` | JWT | Create knowledge prompt |
| PUT | `/:prompt_id` | JWT | Update prompt |
| DELETE | `/:prompt_id` | JWT | Delete prompt |

### Chat (`/api/chat`) — Rate limit: 30/min

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:project_id/conversations` | JWT | List conversations |
| POST | `/:project_id/conversations` | JWT | Create new conversation |
| GET | `/:project_id/conversations/:id` | JWT | Get conversation + messages |
| POST | `/:project_id/conversations/:id` | JWT | Send message, get LLM reply |
| DELETE | `/:project_id/conversations/:id` | JWT | Delete conversation |
| PATCH | `/:project_id/conversations/:id` | JWT | Rename conversation |
| GET | `/:project_id` | JWT | Legacy: get most recent chat |
| POST | `/:project_id` | JWT | Legacy: send to most recent chat |
| DELETE | `/:project_id` | JWT | Legacy: clear most recent chat |

### Files (`/api/files`) — Rate limit: 10/min

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:project_id` | JWT | List uploaded files (metadata only) |
| POST | `/:project_id` | JWT | Upload file (multipart, max 10MB) |
| DELETE | `/delete/:file_id` | JWT | Delete file from DB + disk |

**Supported formats:** `.txt`, `.pdf`, `.json`, `.csv`, `.md`

### Embed (`/api/embed`) — Rate limit: 20/min

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/chat/:project_id` | X-API-Key | Public chat endpoint |
| GET | `/embed/:project_id?key=...` | Query param | Self-contained HTML iframe widget |

---

## Database Schema

**Database:** `chatbot_platform`

### `users`
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,          // unique index
  password: Bytes,        // bcrypt hash (cost factor 10)
  createdAt: DateTime
}
```

### `projects`
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  systemPrompt: String,   // default: "You are a helpful assistant."
  apiKey: String,          // UUID for public embed access
  user: String,            // userId reference
  createdAt: DateTime,
  updatedAt: DateTime
}
// Index: user
```

### `prompts`
```javascript
{
  _id: ObjectId,
  title: String,
  content: String,
  project: String,         // projectId reference
  user: String,
  createdAt: DateTime
}
// Index: project
```

### `files`
```javascript
{
  _id: ObjectId,
  filename: String,        // disk filename
  originalName: String,
  size: Number,
  project: String,
  user: String,
  content: String,         // extracted text (30k char cap)
  createdAt: DateTime
}
// Index: project
```

### `chats`
```javascript
{
  _id: ObjectId,
  project: String,
  user: String,            // userId or "__embed__" for public
  conversationId: String,  // UUID (authenticated multi-chat)
  sessionId: String,       // UUID (embed sessions)
  title: String,
  messages: [{ role: "user"|"assistant", content: String }],
  createdAt: DateTime,
  updatedAt: DateTime
}
// Indexes:
//   (project, user)
//   (project, sessionId)
//   unique sparse (project, user, conversationId)
//   (project, user, updatedAt desc)
```

---

## Chat Request Flow

### Authenticated Chat (Dashboard)

```
1. POST /api/chat/:projectId/conversations/:conversationId { message }
2. JWT middleware validates Bearer token → sets request.user_id
3. ThreadPoolExecutor fetches in parallel:
   - Project document
   - Knowledge prompts for project
   - Uploaded files for project
4. build_system_content() constructs system prompt:
   project.systemPrompt + knowledge prompts + extracted file text
5. Assembles LLM messages:
   [system prompt] + [last 20 history messages] + [new user message]
6. call_llm() → POST to OpenRouter API (30s timeout)
7. Persists user message + assistant reply to MongoDB
8. Returns { reply, conversation }
```

### Public Embed Chat

```
1. POST /api/embed/chat/:projectId { message, sessionId }
2. API key middleware validates X-API-Key header against project.apiKey
3. Parallel fetch: chat document by sessionId + prompts + files
4. Same LLM pipeline via services.py
5. Returns { reply, sessionId }
```

---

## Authentication & Security

### Dashboard Users (JWT)
- Registration/login returns a JWT signed with `JWT_SECRET` (HS256, 7-day expiry)
- Token payload: `{ userId, exp }`
- Frontend stores token in `localStorage`; Axios attaches `Authorization: Bearer <token>`
- All queries filter by `user: request.user_id` (user-scoped authorization)

### Public Embed (API Key)
- Each project gets a UUID `apiKey` on creation
- Public endpoints require `X-API-Key` header matching the project's stored key
- Embed widget passes key via query parameter and uses it in fetch headers
- Sessions tracked via `sessionId` stored in browser `localStorage`

### Security Measures
- bcrypt password hashing (cost factor 10)
- Per-blueprint rate limiting via flask-limiter
- Security headers: `X-Content-Type-Options`, `X-XSS-Protection`, `X-Frame-Options: DENY` (except `/embed/*`)
- Max upload: 10MB per file, 16MB max request body
- Input validation: password 6–128 chars, email length limits

---

## Design Patterns

| Pattern | Where | Rationale |
|---------|-------|-----------|
| Blueprint separation | All routes | Clean domain boundaries, independent rate limits |
| Decorator-based auth | `middleware.py` | Reusable JWT/API-key guards without repeating logic |
| Shared service layer | `services.py` | Single LLM + prompt builder for both chat paths (DRY) |
| Context stuffing | `build_system_content()` | Simple alternative to RAG/vector search |
| Parallel DB reads | `ThreadPoolExecutor` in chat routes | Reduces latency before LLM call (3–4 concurrent queries) |
| Optimistic responses | Chat route handlers | Response built from in-memory state after MongoDB update |
| Server-rendered widget | `embed.py` | Self-contained HTML/JS iframe, no React build needed |
| Legacy route preservation | `chat.py` | Backward compat for single-chat API alongside multi-conversation |
| Serializer functions | Each route file | Consistent JSON output via `serialize_*` helpers |

---

## Configuration

### Backend (`backend/.env`)
```env
PORT=8000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<random-string>
OPENROUTER_API_KEY=<openrouter-key>
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### Running Locally
```bash
# Terminal 1 — Backend
cd backend && source venv/bin/activate && python app.py   # port 8000

# Terminal 2 — Frontend
cd frontend && npm run dev                                 # port 5173
```

Vite dev server proxies `/api` requests to `http://localhost:8000`.

### Production
`run.sh` starts Flask in the background and opens a Cloudflare Tunnel pointing at port 8000.

---

## Known Trade-offs

| Constraint | Impact |
|------------|--------|
| Context stuffing (no embeddings/RAG) | Limited by ~8k token context window |
| In-memory rate limits | Reset on server restart |
| Synchronous Flask | One thread per request, no async I/O |
| No response streaming | Full LLM response wait before display |
| Files on disk | Not suitable for multi-server deployment |
| Single LLM provider (OpenRouter) | Changing provider requires editing `services.py` |
| No WebSocket support | Polling-based UI updates |

---