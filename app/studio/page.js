'use client';

import { useMemo, useState } from 'react';

export default function StudioPage() {
  const [query, setQuery] = useState('How does /api/query select and update nodes?');
  const [provider, setProvider] = useState('stub');
  const [model, setModel] = useState('');
  const [summaryMode, setSummaryMode] = useState('last5');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const canSend = useMemo(() => Boolean(query.trim()), [query]);

  async function handleSend() {
    if (!query.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          provider,
          model: model || undefined,
          summaryMode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResult(data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 48px' }}>
      <h1 style={{ marginBottom: 4 }}>AI Brain Studio (v0)</h1>
      <p style={{ marginTop: 0, color: '#44506a' }}>
        Interactive brain playground with visible planning, selected file context, and summaries.
      </p>

      <section style={{ border: '1px solid #d5deef', borderRadius: 12, background: '#fff', padding: 16 }}>
        <label htmlFor="query" style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
          Query
        </label>
        <textarea
          id="query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={7}
          style={{ width: '100%', borderRadius: 8, border: '1px solid #b7c4de', padding: 10, marginBottom: 12 }}
          placeholder="Ask the brain about the project..."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label htmlFor="provider" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Provider
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              style={{ width: '100%', borderRadius: 8, border: '1px solid #b7c4de', padding: 8 }}
            >
              <option value="stub">stub</option>
              <option value="gemini">gemini</option>
            </select>
          </div>

          <div>
            <label htmlFor="model" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Model (optional)
            </label>
            <input
              id="model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              style={{ width: '100%', borderRadius: 8, border: '1px solid #b7c4de', padding: 8 }}
              placeholder="gemini-2.5-flash"
            />
          </div>

          <div>
            <label htmlFor="summaryMode" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              History Summary Scope
            </label>
            <select
              id="summaryMode"
              value={summaryMode}
              onChange={(event) => setSummaryMode(event.target.value)}
              style={{ width: '100%', borderRadius: 8, border: '1px solid #b7c4de', padding: 8 }}
            >
              <option value="last5">Last 5 summaries</option>
              <option value="all">All summaries</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !canSend}
          style={{
            border: 'none',
            borderRadius: 8,
            background: loading ? '#9aa8c7' : '#2d5bff',
            color: '#fff',
            padding: '10px 16px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </section>

      {error && (
        <p style={{ color: '#b12525', marginTop: 12 }}>
          <strong>Error:</strong> {error}
        </p>
      )}

      {result && (
        <>
          <section style={{ marginTop: 18, border: '1px solid #d5deef', borderRadius: 12, background: '#fff', padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>AI Response</h2>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f8ff', padding: 12, borderRadius: 8 }}>{result.response}</pre>
          </section>

          <section style={{ marginTop: 18, border: '1px solid #d5deef', borderRadius: 12, background: '#fff', padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>What happened (Task Trace)</h2>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f8ff', padding: 12, borderRadius: 8 }}>
              {JSON.stringify(result.taskTrace || [], null, 2)}
            </pre>
          </section>

          <section style={{ marginTop: 18, border: '1px solid #d5deef', borderRadius: 12, background: '#fff', padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Context Manifest</h2>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f8ff', padding: 12, borderRadius: 8 }}>
              {JSON.stringify(result.contextManifest || {}, null, 2)}
            </pre>
          </section>

          <section style={{ marginTop: 18, border: '1px solid #d5deef', borderRadius: 12, background: '#fff', padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Project file context sent to AI</h2>
            {(result.projectFileContext || []).length === 0 ? (
              <p style={{ margin: 0 }}>No project files were selected for this query.</p>
            ) : (
              (result.projectFileContext || []).map((file) => (
                <article
                  key={file.path}
                  style={{ marginBottom: 12, border: '1px solid #e2e8f6', borderRadius: 8, padding: 10, background: '#fdfdff' }}
                >
                  <h3 style={{ marginTop: 0, marginBottom: 8 }}>{file.path}</h3>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{file.snippet}</pre>
                </article>
              ))
            )}
          </section>

          <section style={{ marginTop: 18, border: '1px solid #d5deef', borderRadius: 12, background: '#fff', padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>History summaries used ({result.summaryMode})</h2>
            {(result.historySummaries || []).length === 0 ? (
              <p style={{ margin: 0 }}>No history yet.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {(result.historySummaries || []).map((item, index) => (
                  <li key={`${item.when}-${index}`} style={{ marginBottom: 6 }}>
                    <strong>{item.when}</strong> — {item.summary}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ marginTop: 18, border: '1px solid #d5deef', borderRadius: 12, background: '#fff', padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Selected Nodes</h2>
            <ul style={{ marginTop: 0 }}>
              {(result.selectedNodes || []).map((node) => (
                <li key={node.id} style={{ marginBottom: 10 }}>
                  <strong>{node.name}</strong> ({node.type})
                  <div style={{ color: '#3f4a63', marginTop: 4 }}>{node.tags?.brain_summary || 'No summary available'}</div>
                  <div style={{ color: '#68738d', fontSize: 14, marginTop: 4 }}>
                    read: {(node.tags?.brain_read || []).join(', ') || 'none'} | write:{' '}
                    {(node.tags?.brain_write || []).slice(-2).join(' | ') || 'none'}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
