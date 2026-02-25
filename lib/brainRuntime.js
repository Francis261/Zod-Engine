/**
 * External AI proxy runtime.
 * - In v0, defaults to a deterministic stub response.
 * - If GEMINI_API_KEY is set and provider=gemini is requested, calls Gemini REST API.
 */
export async function callExternalAI({ prompt, provider = 'stub', model }) {
  if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
    return callGemini(prompt, process.env.GEMINI_API_KEY, model);
  }

  // Simulate network latency for local UX.
  await new Promise((resolve) => setTimeout(resolve, 120));

  return {
    provider: 'stub',
    model: 'stub-local',
    output: [
      'Stubbed external AI response:',
      '',
      prompt.slice(0, 500),
      '',
      'Set GEMINI_API_KEY + provider="gemini" to use the Gemini proxy path.'
    ].join('\n')
  };
}

/**
 * Returns Gemini models available for generateContent.
 */
export async function listGeminiModels(apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(endpoint, { method: 'GET' });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error?.message || 'Failed to list Gemini models');
  }

  const models = (json.models || [])
    .filter((item) => (item.supportedGenerationMethods || []).includes('generateContent'))
    .map((item) => item.name?.replace('models/', ''))
    .filter(Boolean)
    .sort();

  return models;
}

async function callGemini(prompt, apiKey, requestedModel) {
  const defaultModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = requestedModel || defaultModel;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    })
  });

  const json = await res.json();
  if (!res.ok) {
    const errText = json?.error?.message || 'Gemini API request failed';
    const maybeModelMissing = /not found|not supported/i.test(errText);

    if (maybeModelMissing) {
      try {
        const availableModels = await listGeminiModels(apiKey);
        throw new Error(
          `${errText}. Available generateContent models: ${availableModels.slice(0, 20).join(', ') || 'none found'}`
        );
      } catch (listErr) {
        throw new Error(`${errText}. Also failed to list models: ${listErr.message}`);
      }
    }

    throw new Error(errText);
  }

  const output =
    json?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') ||
    'Gemini returned no text output.';

  return { provider: 'gemini', model, output };
}
