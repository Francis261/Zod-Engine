'use client';

import { useMemo, useState } from 'react';

export default function StudioPage() {
  const defaultProvider = process.env.NEXT_PUBLIC_DEFAULT_AI_PROVIDER || 'stub';

  const [query, setQuery] = useState('Start a new project module for todo auth and scaffold initial code.');
  const [provider, setProvider] = useState(defaultProvider);
  const [response, setResponse] = useState('');
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [orchestration, setOrchestration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSend = useMemo(() => Boolean(query.trim()), [query]);

  async function handleSend() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, provider })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResponse(data.response || 'No response returned.');
      setSelectedNodes(data.selectedNodes || []);
      setOrchestration(data.orchestration || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '24px 16px 48px' }}>
      <h1 style={{ marginBottom: 4 }}>AI Brain Studio (v0)</h1>
      <p style={{ marginTop: 0, color: '#4f5b76' }}>
        Interactive brain memory + proxy demo. Query route retrieves selective node context instead of full project payload.
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
          <option value="gemini">gemini (requires GEMINI_API_KEY)</option>
        </select>

        <label htmlFor="query" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
          Query
        </label>
        <textarea
          id="query"
          rows={6}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', borderRadius: 8, border: '1px solid #c7d2e8', padding: 12, resize: 'vertical' }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !canSend}
          style={{
            marginTop: 12,
            background: '#3557ff',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            cursor: loading ? 'wait' : 'pointer'
          }}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </section>

      {error && (
        <p style={{ color: '#c8002f', marginTop: 12 }}>
          <strong>Error:</strong> {error}
        </p>
      )}

      <section style={{ marginTop: 20, background: '#fff', border: '1px solid #dce3f0', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Orchestration Stats</h2>
        {!orchestration ? (
          <p style={{ margin: 0 }}>No run yet.</p>
        ) : (
          <ul style={{ margin: 0 }}>
            <li>Total nodes in memory: {orchestration.totalNodesInMemory}</li>
            <li>Selected nodes: {orchestration.selectedNodeCount}</li>
            <li>Prompt chars: {orchestration.promptSizeChars}</li>
            <li>Chunking used: {String(orchestration.usedChunking)}</li>
          </ul>
        )}
      </section>

      <section style={{ marginTop: 20, background: '#fff', border: '1px solid #dce3f0', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>AI Response</h2>
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{response || 'No response yet.'}</pre>
      </section>

      <section style={{ marginTop: 20, background: '#fff', border: '1px solid #dce3f0', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Selected Nodes</h2>
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
            <p style={{ margin: '6px 0' }}>
              <strong>brain_read:</strong> {(node.brain_read || []).join(', ') || 'none'}
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>brain_write:</strong> {(node.brain_write || []).join(', ') || 'none'}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
