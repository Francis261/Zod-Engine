/**
 * External AI proxy runtime.
 *
 * The brain never contains provider-specific logic; this file is the boundary.
 * - provider=stub: deterministic local response for v0 testing
 * - provider=gemini: calls Gemini REST API when GEMINI_API_KEY is configured
 */
export async function callExternalAI({ prompt, provider = 'stub', model }) {
  if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
    return callGemini(prompt, process.env.GEMINI_API_KEY, model);
  }

  await new Promise((resolve) => setTimeout(resolve, 120));

  return {
    provider: 'stub',
    model: 'stub-local',
    output: [
      'Stub AI response (local dev mode):',
      '',
      'I received your prompt and context nodes.',
      'This is where a real external provider answer will appear.',
      '',
      'Prompt preview:',
      String(prompt || '').slice(0, 600)
    ].join('\n')
  };
}

export async function listGeminiModels(apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(endpoint, { method: 'GET' });
  const json = await res.json();

  if (!res.ok) {
    const message = json.error?.message || 'Failed to list Gemini models';
    throw new Error(message);
  }

  return (json.models || []).map((item) => item.name.replace('models/', ''));
}

async function callGemini(prompt, apiKey, model) {
  const selectedModel = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json();

  if (!res.ok) {
    const message = json.error?.message || 'Gemini call failed';
    throw new Error(message);
  }

  const output = json?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();

  return {
    provider: 'gemini',
    model: selectedModel,
    output: output || 'Gemini returned no textual output.'
  };
}
