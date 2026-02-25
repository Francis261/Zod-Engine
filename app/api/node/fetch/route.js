import { NextResponse } from 'next/server';
import { readNodes } from '@/lib/nodeStore';

/**
 * Fetch one node (id/name) or a summarized node list.
 * Useful for inspecting dependencies and tags from Studio or scripts.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const name = searchParams.get('name');

  const nodes = await readNodes();

  if (!id && !name) {
    return NextResponse.json({
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        name: node.name,
        brain_summary: node.tags?.brain_summary,
        brain_dependencies: node.tags?.brain_dependencies || []
      }))
    });
  }

  const lookup = id
    ? (node) => node.id === id
    : (node) => node.name.toLowerCase() === String(name).toLowerCase();

  const node = nodes.find(lookup);

  if (!node) {
    const key = id ? `id=${id}` : `name=${name}`;
    return NextResponse.json({ error: `Node not found for ${key}` }, { status: 404 });
  }

  return NextResponse.json({ node });
}
