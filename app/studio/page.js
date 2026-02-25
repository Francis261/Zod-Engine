'use client';

import { useEffect, useMemo, useState } from 'react';

const GEMINI_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
const USER_TAG_PRESETS = ['read', 'write', 'rename', 'delete', 'copy', 'move', 'think'];

export default function StudioPage() {
  const defaultProvider = process.env.NEXT_PUBLIC_DEFAULT_AI_PROVIDER || 'stub';
  const defaultGeminiModel = process.env.NEXT_PUBLIC_DEFAULT_GEMINI_MODEL || 'gemini-2.5-flash';

  const [query, setQuery] = useState('Build a landing page hero section for my website builder project.');
  const [provider, setProvider] = useState(defaultProvider);
  const [model, setModel] = useState(defaultGeminiModel);
  const [availableModels, setAvailableModels] = useState(GEMINI_FALLBACK_MODELS);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState(['write', 'think']);
  const [customTagCommands, setCustomTagCommands] = useState('write:src/app/page.tsx');

  const [response, setResponse] = useState('');
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [orchestration, setOrchestration] = useState(null);
  const [operations, setOperations] = useState([]);
  const [projectFiles, setProjectFiles] = useState([]);
  const [structureMarkdown, setStructureMarkdown] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canSend = useMemo(() => Boolean(query.trim()), [query]);

  useEffect(() => {
    async function loadGeminiModels() {
      if (provider !== 'gemini') return;
      setModelsLoading(true);
      try {
        const res = await fetch('/api/ai-call?provider=gemini&listModels=1');
        const data = await res.json();
        if (res.ok && Array.isArray(data.models) && data.models.length) {
          setAvailableModels(data.models);
          if (!data.models.includes(model) && data.models[0]) {
            setModel(data.models[0]);
          }
        }
      } catch {
        // Keep fallback models for local/stub mode.
      } finally {
        setModelsLoading(false);
      }
    }

    loadGeminiModels();
  }, [provider, model]);

  useEffect(() => {
    async function loadProjectView() {
      try {
        const res = await fetch('/api/project/files');
        const data = await res.json();
        if (res.ok) {
          setProjectFiles(data.files || []);
          setStructureMarkdown(data.structureMarkdown || '');
        }
      } catch {
        // Silent optional load.
      }
    }

    loadProjectView();
  }, []);

  function toggleTag(tag) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  }

  function buildUserTagCommands() {
    const presetCommands = selectedTags.map((tag) => `${tag}:`);
    const customCommands = customTagCommands
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return [...presetCommands, ...customCommands];
  }

  async function handleSend() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          provider,
          model: provider === 'gemini' ? model : undefined,
          userTags: buildUserTagCommands()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      setResponse(data.response || 'No response returned.');
      setSelectedNodes(data.selectedNodes || []);
      setOrchestration(data.orchestration || null);
      setOperations(data.operations || []);
      setProjectFiles(data.projectFiles || []);
      setStructureMarkdown(data.structureMarkdown || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 48px' }}>
      <h1 style={{ marginBottom: 4 }}>AI Brain Studio (v0)</h1>
      <p style={{ marginTop: 0, color: '#4f5b76' }}>
        User Prompt → Brain → AI → Brain → file operations. Built for large codebases with selective context + tags.
      </p>

      <section style={{ background: '#fff', border: '1px solid #dce3f0', borderRadius: 12, padding: 16 }}>
        <label htmlFor="provider" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
          AI Provider
        </label>
        <select
          id="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          style={{ marginBottom: 12, borderRadius: 8, border: '1px solid #c7d2e8', padding: 8 }}
        >
          <option value="stub">stub (local)</option>
          <option value="gemini">gemini</option>
        </select>

        {provider === 'gemini' && (
          <>
            <label htmlFor="model" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
              Gemini Model {modelsLoading ? '(loading...)' : ''}
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ marginBottom: 12, borderRadius: 8, border: '1px solid #c7d2e8', padding: 8 }}
            >
              {availableModels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </>
        )}

        <p style={{ marginBottom: 8, fontWeight: 600 }}>User-side Tags</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {USER_TAG_PRESETS.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                style={{
                  border: '1px solid #c7d2e8',
                  background: active ? '#3557ff' : '#fff',
                  color: active ? '#fff' : '#222',
                  borderRadius: 999,
                  padding: '4px 10px'
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <label htmlFor="customTags" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
          Custom Tag Commands (one per line)
        </label>
        <textarea
          id="customTags"
          rows={3}
          value={customTagCommands}
          onChange={(e) => setCustomTagCommands(e.target.value)}
          style={{ width: '100%', borderRadius: 8, border: '1px solid #c7d2e8', padding: 12, resize: 'vertical', marginBottom: 10 }}
        />

        <label htmlFor="query" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
          Query
        </label>
        <textarea
          id="query"
          rows={5}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', borderRadius: 8, border: '1px solid #c7d2e8', padding: 12, resize: 'vertical' }}
        />

        <button
          onClick={handleSend}
          disabled={loading || !canSend}
          style={{ marginTop: 12, background: '#3557ff', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px' }}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </section>

      {error && (
        <p style={{ color: '#c8002f', marginTop: 12 }}>
          <strong>Error:</strong> {error}
        </p>
      )}

      <section style={{ marginTop: 18, background: '#fff', border: '1px solid #dce3f0', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Orchestration Stats</h2>
        {!orchestration ? (
          <p style={{ margin: 0 }}>No run yet.</p>
        ) : (
          <ul style={{ margin: 0 }}>
            <li>Total nodes in memory: {orchestration.totalNodesInMemory}</li>
            <li>Selected nodes: {orchestration.selectedNodeCount}</li>
            <li>Prompt chars: {orchestration.promptSizeChars}</li>
            <li>Chunking used: {String(orchestration.usedChunking)}</li>
            <li>Provider: {orchestration.provider || 'n/a'}</li>
            <li>Model: {orchestration.model || 'n/a'}</li>
            <li>Operations applied: {orchestration.operationCount || 0}</li>
          </ul>
        )}
      </section>

      <section style={{ marginTop: 18, background: '#fff', border: '1px solid #dce3f0', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Applied Operations</h2>
        {!operations.length ? <p style={{ margin: 0 }}>No operations yet.</p> : <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(operations, null, 2)}</pre>}
      </section>

      <section style={{ marginTop: 18, background: '#fff', border: '1px solid #dce3f0', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Project Structure (structure.md)</h2>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{structureMarkdown || 'No structure loaded.'}</pre>
      </section>

      <section style={{ marginTop: 18, background: '#fff', border: '1px solid #dce3f0', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Generated Project Files</h2>
        {!projectFiles.length && <p style={{ margin: 0 }}>No files yet.</p>}
        {projectFiles.map((file) => (
          <article key={file.path} style={{ borderTop: '1px solid #eef2fa', paddingTop: 10, marginTop: 10 }}>
            <h3 style={{ margin: 0 }}>{file.path}</h3>
            <pre style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{file.contentPreview}</pre>
          </article>
        ))}
      </section>

      <section style={{ marginTop: 18, background: '#fff', border: '1px solid #dce3f0', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>AI Response</h2>
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{response || 'No response yet.'}</pre>
      </section>

      <section style={{ marginTop: 18, background: '#fff', border: '1px solid #dce3f0', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Selected Brain Nodes</h2>
        {!selectedNodes.length && <p style={{ margin: 0 }}>No nodes selected yet.</p>}
        {selectedNodes.map((node) => (
          <article key={node.id} style={{ borderTop: '1px solid #eef2fa', paddingTop: 10, marginTop: 10 }}>
            <h3 style={{ margin: 0 }}>
              {node.name} <small style={{ color: '#6e7a97' }}>({node.type})</small>
            </h3>
            <p style={{ margin: '6px 0' }}>{node.summary}</p>
            <p style={{ margin: '6px 0' }}>
              <strong>brain_dependencies:</strong> {(node.brain_dependencies || []).join(', ') || 'none'}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
