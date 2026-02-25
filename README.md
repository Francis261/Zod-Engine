# AI Brain Studio (Next.js v0)

A lightweight Next.js 14 App Router project that implements an **AI Brain** as a structured **memory + logic proxy**.

The brain does **not** send the whole codebase to the AI provider. It stores codebase knowledge as node memory, retrieves only relevant context, then proxies compact prompts to external AI.

## Features

- Next.js 14 App Router scaffold.
- API routes:
  - `POST /api/query` - orchestrates retrieval, prompt building, AI proxy call, and memory write-back.
  - `POST /api/ai-call` - external AI proxy endpoint (stub + optional Gemini call), supports model override.
  - `GET /api/ai-call?provider=gemini&listModels=1` - lists available Gemini generateContent models.
  - `GET /api/node/list` - list all nodes.
  - `GET /api/node/fetch?id=<nodeId>` - fetch one node.
  - `POST /api/node/update` - partial node updates.
- JSON memory store at `data/nodes.json`.
- Interactive Studio UI at `/studio`.
- Dynamic placeholder node creation for new/empty projects.
- Dependency-aware context expansion + code chunking to stay under prompt budgets.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/studio`.

## Environment

Create `.env.local` from `.env.example`:

- `GEMINI_API_KEY` - optional API key for Gemini proxy mode.
- `GEMINI_MODEL` - optional backend default model (default: `gemini-2.5-flash`).
- `NEXT_PUBLIC_DEFAULT_GEMINI_MODEL` - default Studio model value.
- `NEXT_PUBLIC_DEFAULT_AI_PROVIDER` - `stub` or `gemini`.

## Brain orchestration flow

1. User sends query to `/api/query`.
2. Brain loads nodes from memory.
3. If project memory is empty or no context matches, brain creates placeholder node(s) from intent.
4. Brain selects relevant nodes and expands with dependencies.
5. Brain chunks code snippets and builds a bounded prompt (context budget).
6. Brain calls `/api/ai-call` (which then calls stub or Gemini with selected model).
7. Brain updates selected nodes (`brain_write`, `brain_history`) and persists memory.
8. Response + orchestration metadata is returned to Studio.

## Node schema

Each node follows this shape:

```json
{
  "id": "string",
  "type": "function|class|module|variable|test",
  "name": "string",
  "code_snippet": "string",
  "tags": {
    "brain_summary": "string",
    "brain_behavior": "string",
    "brain_constraints": "string",
    "brain_examples": ["string"],
    "brain_usage": ["string"],
    "brain_dependencies": ["string"],
    "brain_callers": ["string"],
    "brain_called": ["string"],
    "brain_history": ["string"],
    "brain_read": ["string"],
    "brain_write": ["string"],
    "brain_priority": "string",
    "brain_context": "string"
  }
}
```

## Notes

- Core brain logic is provider-agnostic.
- External AI logic is isolated in the proxy runtime (`lib/brainRuntime.js`).
- JSON persistence is v0-friendly and can be swapped with a DB later.
