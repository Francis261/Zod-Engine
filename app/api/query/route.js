import { NextResponse } from 'next/server';
import {
  readNodes,
  writeNodes,
  inferNodeFromQuery,
  selectRelevantNodes,
  expandWithDependencies,
  buildPrompt,
  applyBrainWriteback
} from '@/lib/nodeStore';
import {
  readProjectFiles,
  writeProjectFiles,
  readStructureMarkdown,
  writeStructureMarkdown,
  generateStructureMarkdown,
  applyOperations,
  selectRelevantProjectFiles
} from '@/lib/projectStore';
import { parseTaggedOperations, parseUserTagCommands } from '@/lib/operationTags';

async function callAIViaProxyRoute(request, prompt, provider, model) {
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || 'localhost:3000';
  const url = `${proto}://${host}/api/ai-call`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, provider, model })
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'AI proxy call failed');
  return payload;
}

export async function POST(request) {
  try {
    const { query, provider, model, userTags = [] } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query must be a non-empty string' }, { status: 400 });
    }

    let nodes = await readNodes();
    if (!nodes.length) {
      nodes = [inferNodeFromQuery(query)];
      await writeNodes(nodes);
    }

    let selectedNodes = selectRelevantNodes(nodes, query);
    if (!selectedNodes.length) {
      const placeholder = inferNodeFromQuery(query);
      nodes = [...nodes, placeholder];
      selectedNodes = [placeholder];
      await writeNodes(nodes);
    }

    const contextNodes = expandWithDependencies(nodes, selectedNodes, 10);

    const projectState = await readProjectFiles();
    const structureMarkdown = await readStructureMarkdown();
    const fileSelection = selectRelevantProjectFiles(projectState.files, query, {
      maxFiles: 3,
      maxChars: 900,
      maxPerFile: 260
    });
    const fileContext = fileSelection.files;
    const recentHistory = (projectState.history || []).slice(-6).map((h) => `${h.when}: ${h.query}`);

    const prompt = buildPrompt(query, contextNodes, {
      maxContextChars: 7600,
      chunkSize: 700,
      userTags,
      structureMarkdown,
      recentHistory,
      projectFileContext: fileContext
    });

    const ai = await callAIViaProxyRoute(request, prompt, provider, model);

    const userOps = parseUserTagCommands(userTags);
    const aiOps = parseTaggedOperations(ai.output);
    const mergedOps = [...userOps, ...aiOps];

    const { files: updatedFiles, applied } = applyOperations(projectState.files, mergedOps);
    const updatedStructure = generateStructureMarkdown(updatedFiles);

    const newHistoryEntry = {
      when: new Date().toISOString(),
      query,
      provider: ai.provider || provider || 'stub',
      model: ai.model || model || null,
      operations: applied
    };

    await writeProjectFiles({
      files: updatedFiles,
      history: [...(projectState.history || []), newHistoryEntry].slice(-50)
    });
    await writeStructureMarkdown(updatedStructure);

    const updatedNodes = applyBrainWriteback(
      nodes,
      contextNodes.map((node) => node.id),
      query,
      ai.output
    );
    await writeNodes(updatedNodes);

    const byId = new Map(updatedNodes.map((node) => [node.id, node]));
    const selectedUpdated = contextNodes.map((node) => byId.get(node.id) || node);

    return NextResponse.json({
      response: ai.output,
      operations: applied,
      structureMarkdown: updatedStructure,
      projectFiles: Object.entries(updatedFiles).map(([path, content]) => ({
        path,
        contentPreview: String(content).slice(0, 600)
      })),
      contextManifest: {
        projectFiles: fileSelection.manifest,
        structureChars: String(structureMarkdown || "").slice(0, 1000).length,
        recentHistoryCount: recentHistory.length
      },
      orchestration: {
        totalNodesInMemory: updatedNodes.length,
        selectedNodeCount: selectedUpdated.length,
        promptSizeChars: prompt.length,
        usedChunking: selectedUpdated.some((node) => (node.code_snippet || '').length > 700),
        provider: ai.provider || provider || 'stub',
        model: ai.model || model || null,
        operationCount: applied.length
      },
      selectedNodes: selectedUpdated.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        summary: node.tags.brain_summary,
        brain_dependencies: node.tags.brain_dependencies,
        brain_read: node.tags.brain_read,
        brain_write: node.tags.brain_write,
        brain_history: node.tags.brain_history
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Query pipeline failed' }, { status: 500 });
  }
}
