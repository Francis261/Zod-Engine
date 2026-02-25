# AI Brain Studio (Next.js v0)

A lightweight Next.js 14 App Router project implementing an **AI Brain** for large codebases on limited-context models (Gemini free-tier style usage).

## What this brain now does

- Keeps **brain memory tags** in `data/nodes.json`.
- Keeps **project files** in `data/projectFiles.json` and live `data/structure.md`.
- Uses retrieval + dependency expansion + prompt budgeting so only small, relevant context is sent to AI.
- Supports **user-side tags/operations** (`read`, `write`, `rename`, `delete`, `copy`, `move`, `think`) via Studio inputs.
- Parses AI tagged actions and applies file operations in brain memory.

## API routes

- `POST /api/query`
  - Accepts: `query`, `provider`, `model`, `userTags[]`
  - Retrieves relevant nodes + project context
  - Builds bounded prompt using `brain_summary`, `brain_read`, `brain_write`
  - Calls `/api/ai-call`
  - Parses AI/user operation tags and updates project memory
  - Updates node tags (`brain_write`, `brain_history`)
  - Returns AI response + operations + project files + updated structure
- `POST /api/ai-call` - calls stub/Gemini proxy.
- `GET /api/ai-call?provider=gemini&listModels=1` - lists available Gemini models.
- `GET /api/node/list`, `GET /api/node/fetch`, `POST /api/node/update` - brain node memory endpoints.
- `GET /api/project/files` - returns generated files + `structure.md` + history.

## Studio (`/studio`)

- Query textarea + send button
- Provider and Gemini model selector
- User-side tag presets and custom tag-command input
- Shows:
  - Orchestration stats
  - Applied operations
  - `structure.md`
  - Generated project files
  - AI response
  - Selected brain nodes

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/studio`.

## Env

- `GEMINI_API_KEY=`
- `GEMINI_MODEL=gemini-2.5-flash`
- `NEXT_PUBLIC_DEFAULT_AI_PROVIDER=stub`
- `NEXT_PUBLIC_DEFAULT_GEMINI_MODEL=gemini-2.5-flash`

## Notes

- This is intentionally v0 and JSON-backed for easy iteration.
- External provider logic remains isolated in `lib/brainRuntime.js`.
- Retrieval is lexical-weighted today and structured so embedding/vector retrieval can replace it later.
