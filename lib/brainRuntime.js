/**
 * External AI proxy runtime.
 * - In v0, defaults to deterministic stub response with operation tags.
 * - If GEMINI_API_KEY is set and provider=gemini is requested, calls Gemini REST API.
 */
export async function callExternalAI({ prompt, provider = 'stub', model }) {
  if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
    return callGemini(prompt, process.env.GEMINI_API_KEY, model);
  }

  await new Promise((resolve) => setTimeout(resolve, 120));

  const lower = String(prompt || '').toLowerCase();
  let taggedBlock = '[THINK]Create a minimal incremental update to stay within token budget.[/THINK]';

  if (lower.includes('hero') || lower.includes('landing')) {
    taggedBlock = `[WRITE path="src/components/Hero.tsx"]export function Hero() {\n  return <section><h1>Launch your website faster with AI Brain</h1></section>;\n}\n[/WRITE]\n[WRITE path="src/app/page.tsx"]import { Header } from '@/components/Header';\nimport { Hero } from '@/components/Hero';\n\nexport default function HomePage() {\n  return <main><Header /><Hero /></main>;\n}\n[/WRITE]`;
  } else if (lower.includes('read')) {
    taggedBlock = '[READ path="src/app/page.tsx"]';
  }

  return {
    provider: 'stub',
    model: 'stub-local',
    output: [
      'Stubbed external AI response (brain-compatible format):',
      'I prepared a focused change using operation tags.',
      taggedBlock
    ].join('\n\n')
  };
}

export async function listGeminiModels(apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(endpoint, { method: 'GET' });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error?.message || 'Failed to list Gemini models');
  }

  return (json.models || [])
    .filter((item) => (item.supportedGenerationMethods || []).includes('generateContent'))
    .map((item) => item.name?.replace('models/', ''))
    .filter(Boolean)
    .sort();
}

async function callGemini(prompt, apiKey, requestedModel) {
  const defaultModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = requestedModel || defaultModel;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
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
