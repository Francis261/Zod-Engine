import { NextResponse } from 'next/server';
import { callExternalAI } from '@/lib/brainRuntime';

export async function POST(request) {
  try {
    const { prompt, provider } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt must be a non-empty string' }, { status: 400 });
    }

    const result = await callExternalAI({ prompt, provider });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to call external AI' }, { status: 500 });
  }
}
