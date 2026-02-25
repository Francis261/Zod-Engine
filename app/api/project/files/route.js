import { NextResponse } from 'next/server';
import { readProjectFiles, readStructureMarkdown } from '@/lib/projectStore';

export async function GET() {
  try {
    const project = await readProjectFiles();
    const structureMarkdown = await readStructureMarkdown();

    return NextResponse.json({
      files: Object.entries(project.files || {}).map(([path, content]) => ({
        path,
        contentPreview: String(content).slice(0, 600)
      })),
      structureMarkdown,
      history: project.history || []
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to load project files' }, { status: 500 });
  }
}
