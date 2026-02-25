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
import {
  applyOperations,
  generateStructureMarkdown,
  readProjectFiles,
  readStructureMarkdown,
  writeProjectFiles,
  writeStructureMarkdown
} from '@/lib/projectStore';
import { parseTaggedOperations } from '@/lib/operationTags';

const TOOL_RULES = [
  'You are an autonomous website-builder AI working through an internal brain orchestrator.',
  'Do NOT assume full source code is available. Work from structure, summaries, change logs, and tool tags only.',
  'When you need to make changes, emit tool tags and include complete content for writes.',
  'Available tool tags:',
  '[WRITE path="..."]...[/WRITE]',
  '[DELETE path="..."]',
  '[RENAME from="..." to="..."]',
  '[MOVE from="..." to="..."]',
  '[COPY from="..." to="..."]',
  '[THINK]internal planning note[/THINK]',
  'If task is complete, include line: DONE: true'
].join('\n');

function historyLine(item) {
  const when = item.when || 'unknown';
  const summary = item.aiBrainSummary || item.query || 'No summary';
  const changeLog = item.changeLog || 'No change log';
  return `${when} | summary=${summary} | change_log=${changeLog}`;
}

function buildIterationPrompt({ query, contextNodes, structureMarkdown, historySlice, previousSteps }) {
  const stepNotes = previousSteps
    .map((step, index) => `Step ${index + 1}: ops=${step.appliedOps.length}, preview=${step.output.slice(0, 220)}`)
    .join('\n');

  return buildPrompt(query, contextNodes, {
    maxContextChars: 9000,
    structureMarkdown,
    recentHistory: historySlice.map(historyLine),
    projectFileContext: [
      {
        path: 'brain_rules.md',
        snippet: TOOL_RULES
      },
      {
        path: 'brain_previous_steps.md',
        snippet: stepNotes || 'No previous execution steps yet.'
      }
    ]
  });
}

/**
 * v0 brain orchestration route.
 *
 * Multi-step execution model:
 * - Always provides AI with structure, summaries, change logs, and tool rules.
 * - Applies tagged file operations iteratively.
 * - Regenerates and persists project structure after each operation batch.
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

    // 2) Node retrieval based on query intent.
    let selectedNodes = selectRelevantNodes(nodes, query);
    if (!selectedNodes.length) {
      const inferred = inferNodeFromQuery(query);
      nodes = [...nodes, inferred];
      selectedNodes = [inferred];
      await writeNodes(nodes);
    }
    const contextNodes = expandWithDependencies(nodes, selectedNodes, 8);

    // 3) Brain context sources (structure + summaries + change logs).
    const projectState = await readProjectFiles();
    let filesMap = { ...(projectState.files || {}) };
    let structureMarkdown = await readStructureMarkdown();
    const history = projectState.history || [];
    const historySlice = summaryMode === 'all' ? history : history.slice(-5);

    const historySummaries = historySlice.map((item) => ({
      when: item.when || 'unknown',
      summary: item.aiBrainSummary || item.query || 'No summary'
    }));

    const changeLogsUsed = historySlice.map((item) => ({
      when: item.when || 'unknown',
      changeLog: item.changeLog || 'No change log recorded'
    }));

    // 4) Multi-step autonomous execution loop.
    const taskTrace = [];
    const appliedOperations = [];
    const stepOutputs = [];

    const maxSteps = 4;

    for (let step = 1; step <= maxSteps; step += 1) {
      const prompt = buildIterationPrompt({
        query,
        contextNodes,
        structureMarkdown,
        historySlice,
        previousSteps: stepOutputs
      });

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

      const output = aiPayload.output || 'No output returned from AI proxy.';
      const parsedOps = parseTaggedOperations(output);
      const { files: nextFiles, applied } = applyOperations(filesMap, parsedOps);

      // ALWAYS refresh project structure after any step so AI has latest file map.
      filesMap = nextFiles;
      structureMarkdown = generateStructureMarkdown(filesMap);
      await writeStructureMarkdown(structureMarkdown);

      appliedOperations.push(...applied.map((item) => ({ ...item, step })));

      taskTrace.push({
        step: `ai_step_${step}`,
        output: {
          promptChars: prompt.length,
          outputPreview: output.slice(0, 280),
          parsedOperationCount: parsedOps.length,
          appliedOperationCount: applied.length,
          structureCharsAfterStep: structureMarkdown.length
        }
      });

      stepOutputs.push({
        output,
        appliedOps: applied
      });

      const done = /DONE:\s*true/i.test(output);
      if (done || parsedOps.length === 0) {
        break;
      }
    }

    // Persist project files/history after loop.
    const finalOutput = stepOutputs.at(-1)?.output || 'No AI output returned.';
    const historyEntry = {
      when: new Date().toISOString(),
      query,
      provider,
      model: model || null,
      aiBrainSummary: finalOutput.slice(0, 180),
      changeLog: `Completed task loop with ${appliedOperations.length} operation(s).`
    };

    await writeProjectFiles({
      files: filesMap,
      history: [...history, historyEntry].slice(-120)
    });

    const updatedNodes = applyBrainWriteback(
      nodes,
      contextNodes.map((node) => node.id),
      query,
      finalOutput
    );
    await writeNodes(updatedNodes);

    const byId = new Map(updatedNodes.map((node) => [node.id, node]));
    const selectedUpdated = contextNodes.map((node) => byId.get(node.id) || node);

    return NextResponse.json({
      query,
      provider,
      model: model || null,
      summaryMode,
      response: finalOutput,
      appliedOperations,
      taskTrace,
      selectedNodes: selectedUpdated,
      historySummaries,
      changeLogsUsed,
      structureContextUsed: String(structureMarkdown || '').slice(0, 2000),
      contextManifest: {
        planner: {
          selectedNodeCount: contextNodes.length,
          summaryMode,
          historyUsedCount: historySlice.length,
          changeLogsUsedCount: changeLogsUsed.length,
          structureChars: structureMarkdown.length,
          totalExecutionSteps: stepOutputs.length
        },
        projectFiles: {
          totalProjectFiles: Object.keys(filesMap).length
        },
        rulesIncluded: true
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Query pipeline failed' }, { status: 500 });
  }
}
