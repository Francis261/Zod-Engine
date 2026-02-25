# AI Brain Studio (Next.js v0)

A lightweight **Next.js 14 App Router** skeleton for an "AI Brain" that manages codebase memory nodes and proxies calls to an external AI provider.

## Features

- App Router pages with a minimal interactive Studio UI (`/studio`)
- API routes:
  - `POST /api/query` - orchestrates node selection, prompt generation, AI proxy call, and node writeback
  - `GET /api/node/list` - list all nodes
  - `GET /api/node/fetch` - fetch by `id`, by `name`, or summarized list when no params are provided
  - `POST /api/node/update` - update a node and/or tags
  - `POST /api/ai-call` - external AI proxy boundary
- JSON node memory (`data/nodes.json`) with sample nodes
- Clear separation: brain orchestration vs. provider runtime

## Node memory shape

`data/nodes.json` uses this structure:

```json
{
  "id": "string",
  "type": "function | class | module | variable | test",
  "name": "string",
  "code_snippet": "string",
  "tags": {
    "brain_summary": "string",
    "brain_behavior": "string",
    "brain_constraints": "string",
    "brain_examples": [],
    "brain_usage": [],
    "brain_dependencies": [],
    "brain_callers": [],
    "brain_called": [],
    "brain_history": [],
    "brain_read": [],
    "brain_write": [],
    "brain_priority": "string",
    "brain_context": "string"
  }
}
```

## How `/api/query` works

1. Accepts user query (`query`) and optional `provider`/`model`
2. Selects relevant nodes from JSON memory
3. Builds prompt using node tags (`brain_summary`, `brain_read`, `brain_write`, dependencies), project structure (`data/structure.md`), and history summaries/change logs (`last5` or `all`)
4. Calls `/api/ai-call`
5. Updates selected nodes (`brain_write`, `brain_history`)
6. Returns AI response + selected nodes + generated prompt

## Studio page (`/studio`)

- Query textarea
- Provider/model fields
- Summary scope selector (`last5` or `all`)
- Send button
- Displays project snapshot (structure + file list), AI response, prompt preview, task trace, context manifest, selected project file snippets, history summaries, change logs, and selected nodes

This is intentionally lightweight for v0 testing, but now includes trace/debug panels for planning, selected project files, context manifest, and summary scope.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/studio`.

## Optional Gemini setup

Create `.env.local`:

```bash
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.5-flash
```

If `GEMINI_API_KEY` is missing, `/api/ai-call` still works in `stub` mode.
