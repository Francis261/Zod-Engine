# AI Brain Studio (Next.js v0)

A lightweight Next.js 14 App Router project implementing an **AI Brain** for very large codebases on limited-context models.

## New brain logic (task-loop)

This version uses a strict multi-step protocol:

1. **Plan turn**: Brain sends rules + user prompt + project structure + changelog summaries + node summaries (no full files).
2. AI returns JSON protocol. Usually either:
   - `phase: request_read` with specific paths, or
   - `phase: apply_changes` with operations.
3. **Read turn (if requested)**: Brain sends only requested file payloads with strict caps.
4. AI returns `apply_changes` JSON with operations + `brain_summary` + `user_summary` + `change_log`.
5. Brain applies operations, updates `structure.md`, updates history and node memory tags.

This keeps AI context bounded and auditable for massive projects.

## API routes

- `POST /api/query`
  - Accepts: `query`, `provider`, `model`, `userTags[]`, `summaryMode` (`last5|all`)
  - Runs the task-loop protocol and returns:
    - `response`
    - `operations`
    - `taskTrace`
    - `contextManifest`
    - `projectFiles`
    - `structureMarkdown`
- `POST /api/ai-call` - provider proxy (stub/Gemini)
- `GET /api/ai-call?provider=gemini&listModels=1` - list Gemini models
- `GET /api/node/list`, `GET /api/node/fetch`, `POST /api/node/update` - node memory
- `GET /api/project/files` - files + structure + history

## Studio (`/studio`)

- Query + provider/model selectors
- User-side operation tags (`read/write/rename/delete/copy/move/think`)
- Summary mode selector (`last5` vs `all` summaries)
- Panels for:
  - context manifest
  - task trace
  - applied operations
  - structure.md
  - generated files
  - selected brain nodes

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/studio`.

## Notes

- JSON stores are intentionally used for v0.
- Provider integration remains isolated in `lib/brainRuntime.js`.
- Architecture is ready to swap lexical retrieval for embedding/vector/graph retrieval later.
