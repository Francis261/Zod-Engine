/**
 * External AI proxy runtime.
 * - v0 stub now follows a task-loop JSON protocol for the brain.
 * - If GEMINI_API_KEY is set and provider=gemini is requested, calls Gemini REST API.
 */
export async function callExternalAI({ prompt, provider = 'stub', model }) {
  if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
    return callGemini(prompt, process.env.GEMINI_API_KEY, model);
  }

  await new Promise((resolve) => setTimeout(resolve, 120));

  const output = buildStubProtocolResponse(prompt);
  return { provider: 'stub', model: 'stub-local', output };
}

function buildStubProtocolResponse(prompt) {
  const text = String(prompt || '').toLowerCase();
  const isPlanStage = text.includes('brain_stage:plan');
  const hasLoginPage = text.includes('login/page.tsx');
  const asksLogin = text.includes('login');

  if (isPlanStage) {
    const readPath = asksLogin && hasLoginPage ? 'src/app/login/page.tsx' : 'src/app/page.tsx';
    const plan = {
      phase: 'request_read',
      read_requests: [{ path: readPath, reason: 'Need current implementation before editing' }],
      operations: [],
      brain_summary: 'Planning stage complete. Requested focused file read.',
      user_summary: 'I need to read a target file before generating safe changes.',
      change_log: `Planner requested read for ${readPath}`
    };

    return `Here is the task response:\n\n\`\`\`json\n${JSON.stringify(plan, null, 2)}\n\`\`\``;
  }

  const operations = asksLogin
    ? [
        {
          type: 'write',
          path: 'src/app/login/page.tsx',
          content:
            "export default function LoginPage() {\n  return <main><h1>Login</h1><p>Secure sign-in flow placeholder</p></main>;\n}\n"
        }
      ]
    : [
        {
          type: 'write',
          path: 'src/app/page.tsx',
          content:
            "import { Header } from '@/components/Header';\n\nexport default function HomePage() {\n  return <main><Header /><section><h1>Updated Home</h1></section></main>;\n}\n"
        }
      ];

  const apply = {
    phase: 'apply_changes',
    read_requests: [],
    operations,
    brain_summary: 'Applied targeted update after reading requested file.',
    user_summary: asksLogin
      ? 'Created/updated login page with a minimal secure-entry placeholder.'
      : 'Updated homepage structure with a focused feature change.',
    change_log: asksLogin ? 'Added/updated src/app/login/page.tsx' : 'Updated src/app/page.tsx'
  };

  return `\`\`\`json\n${JSON.stringify(apply, null, 2)}\n\`\`\``;
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
