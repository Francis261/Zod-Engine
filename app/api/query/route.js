import { NextResponse } from 'next/server';
import {
  applyBrainWriteback,
  buildPrompt,
  expandWithDependencies,
  inferNodeFromQuery,
  readNodes,
  selectRelevantNodes,
  writeNodes
} from '@/lib/nodeStore';
import { readProjectFiles, selectRelevantProjectFiles } from '@/lib/projectStore';

/**
 * v0 brain orchestration route.
 *
 * Goal: keep provider logic outside the brain while exposing enough
 * debugging/trace context to the Studio UI so users can see what happened.
 */
export async function POST(request) {
  try {
    const {
      query,
      provider = 'stub',
      model,
      summaryMode = 'last5' // last5 | all
    } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query must be a non-empty string' }, { status: 400 });
    }

    // 1) Load/create node memory.
    let nodes = await readNodes();
    if (!nodes.length) {
      nodes = [inferNodeFromQuery(query)];
      await writeNodes(nodes);
    }

    // 2) Select relevant nodes and expand dependencies.
    let selectedNodes = selectRelevantNodes(nodes, query);
    if (!selectedNodes.length) {
      const inferred = inferNodeFromQuery(query);
      nodes = [...nodes, inferred];
      selectedNodes = [inferred];
      await writeNodes(nodes);
    }

    const contextNodes = expandWithDependencies(nodes, selectedNodes, 6);

    // 3) Pull project-level context so Studio can show "what was considered".
    const projectState = await readProjectFiles();
    const history = projectState.history || [];
    const historySlice = summaryMode === 'all' ? history : history.slice(-5);

    const historySummaries = historySlice.map((item) => ({
      when: item.when || 'unknown',
      summary: item.aiBrainSummary || item.changeLog || item.query || 'No summary'
    }));

    const projectFileSelection = selectRelevantProjectFiles(projectState.files || {}, query, {
      maxFiles: 5,
      maxChars: 2400,
      maxPerFile: 900
    });

    // 4) Build prompt used for external AI call.
    const prompt = buildPrompt(query, contextNodes, {
      maxContextChars: 7000,
      recentHistory: historySummaries.map((item) => `${item.when} | ${item.summary}`),
      projectFileContext: projectFileSelection.files.map((file) => ({
        path: file.path,
        snippet: file.snippet
      }))
    });

    const taskTrace = [
      {
        step: 'plan',
        output: {
          selectedNodeIds: contextNodes.map((node) => node.id),
          selectedNodeCount: contextNodes.length,
          summaryMode,
          historyUsedCount: historySummaries.length,
          projectFilesSelected: projectFileSelection.manifest.selectedPaths
        }
      },
      {
        step: 'prompt_build',
        output: {
          promptChars: prompt.length,
          provider,
          model: model || null
        }
      }
    ];

    // 5) Proxy the prompt through /api/ai-call.
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const aiUrl = `${proto}://${host}/api/ai-call`;

    const aiRes = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, provider, model })
    });

    const aiPayload = await aiRes.json();
    if (!aiRes.ok) {
      return NextResponse.json({ error: aiPayload.error || 'Failed to get AI response' }, { status: aiRes.status });
    }

    const aiOutput = aiPayload.output || 'No output returned from AI proxy.';

    taskTrace.push({
      step: 'ai_call',
      output: {
        provider: aiPayload.provider || provider,
        model: aiPayload.model || model || null,
        outputPreview: aiOutput.slice(0, 300)
      }
    });

    // 6) Persist writeback on selected nodes.
    const updatedNodes = applyBrainWriteback(
      nodes,
      contextNodes.map((node) => node.id),
      query,
      aiOutput
    );

    await writeNodes(updatedNodes);

    taskTrace.push({
      step: 'node_writeback',
      output: {
        updatedNodeCount: contextNodes.length
      }
    });

    const updatedById = new Map(updatedNodes.map((node) => [node.id, node]));
    const selectedUpdated = contextNodes.map((node) => updatedById.get(node.id) || node);

    return NextResponse.json({
      query,
      provider: aiPayload.provider || provider,
      model: aiPayload.model || model || null,
      summaryMode,
      prompt,
      response: aiOutput,
      taskTrace,
      selectedNodes: selectedUpdated,
      historySummaries,
      projectFileContext: projectFileSelection.files,
      contextManifest: {
        planner: {
          selectedNodeCount: contextNodes.length,
          summaryMode,
          historyUsedCount: historySummaries.length
        },
        projectFiles: projectFileSelection.manifest,
        promptChars: prompt.length
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Query pipeline failed' }, { status: 500 });
  }
}
