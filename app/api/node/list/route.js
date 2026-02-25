import { NextResponse } from 'next/server';
import { readNodes } from '@/lib/nodeStore';

export async function GET() {
  const nodes = await readNodes();
  return NextResponse.json({ nodes, count: nodes.length });
}
