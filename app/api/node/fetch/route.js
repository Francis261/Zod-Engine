import { NextResponse } from 'next/server';
import { readNodes } from '@/lib/nodeStore';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
  }

  const nodes = await readNodes();
  const node = nodes.find((item) => item.id === id);

  if (!node) {
    return NextResponse.json({ error: `Node ${id} not found` }, { status: 404 });
  }

  return NextResponse.json({ node });
}
