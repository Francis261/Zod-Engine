/**
 * External AI proxy runtime.
 * - In v0, defaults to a deterministic stub response.
 * - If GEMINI_API_KEY is set and provider=gemini is requested, calls Gemini REST API.
 */
export async function callExternalAI({ prompt, provider = 'stub' }) {
  if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
    return callGemini(prompt, process.env.GEMINI_API_KEY);
  }

  // Simulate network latency for local UX.
  await new Promise((resolve) => setTimeout(resolve, 120));

  return {
    provider: 'stub',
    output: [
      'Stubbed external AI response:',
      '',
      prompt.slice(0, 500),
      '',
      'Set GEMINI_API_KEY + provider="gemini" to use the Gemini proxy path.'
    ].join('\n')
  };
}

async function callGemini(prompt, apiKey) {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
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
    throw new Error(json?.error?.message || 'Gemini API request failed');
  }

  const output =
    json?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') ||
    'Gemini returned no text output.';

  return { provider: 'gemini', output };
}
