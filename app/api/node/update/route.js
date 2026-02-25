import { NextResponse } from 'next/server';
import { readNodes, writeNodes } from '@/lib/nodeStore';

export async function POST(request) {
  try {
    const { id, updates } = await request.json();

    if (!id || typeof updates !== 'object') {
      return NextResponse.json({ error: 'id and updates object are required' }, { status: 400 });
    }

    const nodes = await readNodes();
    const index = nodes.findIndex((node) => node.id === id);

    if (index === -1) {
      return NextResponse.json({ error: `Node ${id} not found` }, { status: 404 });
    }

    // Shallow update for v0; can be replaced by schema-validated merges later.
    nodes[index] = {
      ...nodes[index],
      ...updates,
      tags: {
        ...nodes[index].tags,
        ...(updates.tags || {})
      }
    };

    await writeNodes(nodes);
    return NextResponse.json({ node: nodes[index] });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to update node' }, { status: 500 });
  }
}
