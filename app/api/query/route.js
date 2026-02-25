import { NextResponse } from 'next/server';
import {
  readNodes,
  writeNodes,
  inferNodeFromQuery,
  selectRelevantNodes,
  expandWithDependencies,
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

const BRAIN_RULES = [
  'Never assume full codebase access. Only use provided structure/summaries/files.',
  'Return strict JSON inside a ```json block.',
  'JSON schema:',
  '{',
  '  "phase": "request_read" | "apply_changes",',
  '  "read_requests": [{"path":"...","reason":"..."}],',
  '  "operations": [{"type":"write|read|rename|delete|copy|move","path":"...","from":"...","to":"...","content":"..."}],',
  '  "brain_summary": "short summary for brain memory",',
  '  "user_summary": "short summary for user",',
  '  "change_log": "single-line changelog entry"',
  '}',
  'If file does not exist in structure and change is needed, use write operation to create it.'
].join('\n');

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

function extractJson(text) {
  const raw = String(text || '');
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      return null;
    }
  }

  const objectMatch = raw.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }

  return null;
}

function buildNodeSummaryContext(nodes) {
  return nodes.slice(0, 6).map((node) => ({
    id: node.id,
    name: node.name,
    type: node.type,
    brain_summary: node.tags.brain_summary,
    brain_read: node.tags.brain_read,
    brain_write: node.tags.brain_write
  }));
}

function buildPlannerPrompt({ query, structureMarkdown, historyLines, nodeSummaries, userTags }) {
  return [
    'BRAIN_STAGE:plan',
    BRAIN_RULES,
    '',
    `User Query: ${query}`,
    '',
    `User Tags: ${(userTags || []).join(', ') || 'none'}`,
    '',
    'Project Structure:',
    String(structureMarkdown || '').slice(0, 2400),
    '',
    'Recent Change Log/Summaries:',
    historyLines.join('\n') || '- none',
    '',
    'Brain Node Summaries:',
    JSON.stringify(nodeSummaries, null, 2)
  ].join('\n');
}

function buildFileContextPrompt({ query, previousAiRaw, files, structureMarkdown, historyLines, nodeSummaries, userTags }) {
  const fileBlocks = files
    .map((f) => `FILE: ${f.path}\n\`\`\`\n${String(f.content || '').slice(0, 4000)}\n\`\`\``)
    .join('\n\n');

  return [
    'BRAIN_STAGE:file_context',
    BRAIN_RULES,
    '',
    `User Query: ${query}`,
    '',
    `User Tags: ${(userTags || []).join(', ') || 'none'}`,
    '',
    'Previous AI Plan Response:',
    previousAiRaw,
    '',
    'Project Structure:',
    String(structureMarkdown || '').slice(0, 2400),
    '',
    'Recent Change Log/Summaries:',
    historyLines.join('\n') || '- none',
    '',
    'Brain Node Summaries:',
    JSON.stringify(nodeSummaries, null, 2),
    '',
    'Requested File Payloads:',
    fileBlocks || 'No files available'
  ].join('\n');
}

export async function POST(request) {
  try {
    const {
      query,
      provider,
      model,
      userTags = [],
      summaryMode = 'last5' // last5 | all
    } = await request.json();

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
    const nodeSummaries = buildNodeSummaryContext(contextNodes);

    const projectState = await readProjectFiles();
    const structureMarkdown = await readStructureMarkdown();

    const rawHistory = projectState.history || [];
    const historySource = summaryMode === 'all' ? rawHistory : rawHistory.slice(-5);
    const historyLines = historySource.map((item) => {
      const summary = item.aiBrainSummary || item.changeLog || item.query || 'n/a';
      return `- ${item.when || 'unknown'} | ${summary}`;
    });

    const plannerPrompt = buildPlannerPrompt({
      query,
      structureMarkdown,
      historyLines,
      nodeSummaries,
      userTags
    });

    const taskTrace = [];
    const plannerAI = await callAIViaProxyRoute(request, plannerPrompt, provider, model);
    taskTrace.push({ step: 'plan', output: plannerAI.output.slice(0, 1200) });

    let aiPayload = extractJson(plannerAI.output);

    // Fallback: if planner did not return JSON, use tagged ops directly.
    if (!aiPayload) {
      const userOps = parseUserTagCommands(userTags);
      const aiOps = parseTaggedOperations(plannerAI.output);
      const mergedOps = [...userOps, ...aiOps];
      const { files: updatedFiles, applied } = applyOperations(projectState.files, mergedOps);
      const updatedStructure = generateStructureMarkdown(updatedFiles);

      await writeProjectFiles({
        files: updatedFiles,
        history: [
          ...rawHistory,
          {
            when: new Date().toISOString(),
            query,
            provider: plannerAI.provider || provider || 'stub',
            model: plannerAI.model || model || null,
            operations: applied,
            aiBrainSummary: 'Fallback mode: parsed tag operations directly',
            userSummary: 'Changes applied from tagged output',
            changeLog: `Fallback apply (${applied.length} ops)`
          }
        ].slice(-80)
      });
      await writeStructureMarkdown(updatedStructure);

      const updatedNodes = applyBrainWriteback(
        nodes,
        contextNodes.map((node) => node.id),
        query,
        plannerAI.output
      );
      await writeNodes(updatedNodes);

      const byId = new Map(updatedNodes.map((node) => [node.id, node]));
      const selectedUpdated = contextNodes.map((node) => byId.get(node.id) || node);

      return NextResponse.json({
        response: plannerAI.output,
        aiProtocolMode: 'fallback-tags',
        taskTrace,
        operations: applied,
        structureMarkdown: updatedStructure,
        projectFiles: Object.entries(updatedFiles).map(([path, content]) => ({
          path,
          contentPreview: String(content).slice(0, 600)
        })),
        contextManifest: {
          plannerPromptChars: plannerPrompt.length,
          historyMode: summaryMode,
          historyUsedCount: historyLines.length,
          projectFiles: {
            totalProjectFiles: Object.keys(projectState.files || {}).length,
            selectedFileCount: 0,
            selectedPaths: []
          }
        },
        orchestration: {
          totalNodesInMemory: updatedNodes.length,
          selectedNodeCount: selectedUpdated.length,
          provider: plannerAI.provider || provider || 'stub',
          model: plannerAI.model || model || null,
          operationCount: applied.length,
          aiTurns: 1
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
    }

    let aiTurnCount = 1;
    let readPaths = (aiPayload.read_requests || []).map((item) => item.path).filter(Boolean);
    let finalPayload = aiPayload;
    const existingFiles = projectState.files || {};

    if (aiPayload.phase === 'request_read' && readPaths.length) {
      const readSelection = selectRelevantProjectFiles(
        Object.fromEntries(readPaths.filter((p) => Object.hasOwn(existingFiles, p)).map((p) => [p, existingFiles[p]])),
        query,
        { maxFiles: 3, maxChars: 1500, maxPerFile: 700 }
      );

      const fileContextPrompt = buildFileContextPrompt({
        query,
        previousAiRaw: plannerAI.output,
        files: readSelection.files.map((f) => ({ path: f.path, content: existingFiles[f.path] || '' })),
        structureMarkdown,
        historyLines,
        nodeSummaries,
        userTags
      });

      const finalAI = await callAIViaProxyRoute(request, fileContextPrompt, provider, model);
      aiTurnCount += 1;
      taskTrace.push({ step: 'file_context', output: finalAI.output.slice(0, 1400) });

      finalPayload = extractJson(finalAI.output) || {
        phase: 'apply_changes',
        operations: parseTaggedOperations(finalAI.output),
        brain_summary: 'Fallback parse from second-turn tagged output',
        user_summary: 'Applied updates from second turn',
        change_log: 'Second-turn fallback apply'
      };

      finalPayload._rawAI = finalAI.output;
      finalPayload._contextManifest = readSelection.manifest;
      plannerAI._finalProvider = finalAI.provider || provider || 'stub';
      plannerAI._finalModel = finalAI.model || model || null;
    }

    const userOps = parseUserTagCommands(userTags);
    const aiOps = Array.isArray(finalPayload.operations) ? finalPayload.operations : [];
    const mergedOps = [...userOps, ...aiOps];

    const { files: updatedFiles, applied } = applyOperations(projectState.files, mergedOps);
    const updatedStructure = generateStructureMarkdown(updatedFiles);

    await writeProjectFiles({
      files: updatedFiles,
      history: [
        ...rawHistory,
        {
          when: new Date().toISOString(),
          query,
          provider: plannerAI._finalProvider || plannerAI.provider || provider || 'stub',
          model: plannerAI._finalModel || plannerAI.model || model || null,
          operations: applied,
          aiBrainSummary: finalPayload.brain_summary || 'No brain summary provided',
          userSummary: finalPayload.user_summary || 'No user summary provided',
          changeLog: finalPayload.change_log || `Applied ${applied.length} operations`
        }
      ].slice(-80)
    });
    await writeStructureMarkdown(updatedStructure);

    const finalRaw = finalPayload._rawAI || plannerAI.output;
    const updatedNodes = applyBrainWriteback(
      nodes,
      contextNodes.map((node) => node.id),
      query,
      finalRaw
    );
    await writeNodes(updatedNodes);

    const byId = new Map(updatedNodes.map((node) => [node.id, node]));
    const selectedUpdated = contextNodes.map((node) => byId.get(node.id) || node);

    return NextResponse.json({
      response: finalPayload.user_summary || finalRaw,
      aiProtocolMode: 'task-loop',
      taskTrace,
      operations: applied,
      structureMarkdown: updatedStructure,
      projectFiles: Object.entries(updatedFiles).map(([path, content]) => ({
        path,
        contentPreview: String(content).slice(0, 600)
      })),
      contextManifest: {
        plannerPromptChars: plannerPrompt.length,
        historyMode: summaryMode,
        historyUsedCount: historyLines.length,
        readRequests: readPaths,
        readSelection: finalPayload._contextManifest || {
          totalProjectFiles: Object.keys(projectState.files || {}).length,
          selectedFileCount: 0,
          selectedPaths: []
        }
      },
      orchestration: {
        totalNodesInMemory: updatedNodes.length,
        selectedNodeCount: selectedUpdated.length,
        provider: plannerAI._finalProvider || plannerAI.provider || provider || 'stub',
        model: plannerAI._finalModel || plannerAI.model || model || null,
        operationCount: applied.length,
        aiTurns: aiTurnCount
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
