import { NextResponse } from 'next/server';
import { callExternalAI, listGeminiModels } from '@/lib/brainRuntime';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'stub';
    const listModels = searchParams.get('listModels') === '1';

    if (provider === 'gemini' && listModels) {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 400 });
      }

      const models = await listGeminiModels(process.env.GEMINI_API_KEY);
      return NextResponse.json({ provider: 'gemini', models });
    }

    return NextResponse.json({ provider, models: [] });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to get model list' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { prompt, provider, model } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt must be a non-empty string' }, { status: 400 });
    }

    const result = await callExternalAI({ prompt, provider, model });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to call external AI' }, { status: 500 });
  }
}
