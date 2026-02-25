import { promises as fs } from 'fs';
import path from 'path';

const nodesPath = path.join(process.cwd(), 'data', 'nodes.json');

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'my',
  'of',
  'on',
  'or',
  'the',
  'to',
  'we',
  'with'
]);

export const NODE_TYPES = ['function', 'class', 'module', 'variable', 'test'];

export async function readNodes() {
  const raw = await fs.readFile(nodesPath, 'utf-8');
  return JSON.parse(raw);
}

export async function writeNodes(nodes) {
  await fs.writeFile(nodesPath, JSON.stringify(nodes, null, 2), 'utf-8');
}

export function createDefaultTags(summary = 'Placeholder node summary.') {
  return {
    brain_summary: summary,
    brain_behavior: 'Node created as part of AI brain memory orchestration.',
    brain_constraints: 'Keep provider-specific AI logic outside core brain orchestration.',
    brain_examples: [],
    brain_usage: [],
    brain_dependencies: [],
    brain_callers: [],
    brain_called: [],
    brain_history: [],
    brain_read: [],
    brain_write: [],
    brain_priority: 'medium',
    brain_context: 'Created dynamically from user request in a new/partial project state.'
  };
}

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function inferNodeFromQuery(query) {
  const q = query.toLowerCase();
  const explicitType = NODE_TYPES.find((type) => q.includes(type));
  const type = explicitType || (q.includes('project') ? 'module' : 'function');

  const rawTokens = q
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9_]/g, ''))
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token));

  const name = rawTokens.slice(0, 4).join('_') || `new_${type}`;
  const safeName = toSlug(name).replace(/-/g, '_');

  return {
    id: `node-${toSlug(`${type}-${name}-${Date.now()}`)}`,
    type,
    name: safeName,
    code_snippet: '',
    tags: createDefaultTags(`Scaffolded ${type} node for: ${query.slice(0, 120)}`)
  };
}

/**
 * Weighted lexical retrieval v0 (can be replaced by embeddings later).
 */
export function selectRelevantNodes(nodes, query) {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = nodes
    .map((node) => {
      const haystack = [
        node.id,
        node.name,
        node.type,
        node.code_snippet,
        node.tags.brain_summary,
        node.tags.brain_context,
        ...(node.tags.brain_usage || []),
        ...(node.tags.brain_dependencies || []),
        ...(node.tags.brain_read || []),
        ...(node.tags.brain_write || [])
      ]
        .join(' ')
        .toLowerCase();

      let score = 0;
      for (const token of tokens) {
        if (token.length < 2) continue;
        if (haystack.includes(token)) score += 1;
      }

      if ((node.tags.brain_priority || '').toLowerCase() === 'high') {
        score += 0.25;
      }

      return { node, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return nodes.slice(0, 2);
  return scored.slice(0, 6).map((item) => item.node);
}

export function expandWithDependencies(nodes, selectedNodes, maxNodes = 10) {
  const mapByName = new Map(nodes.map((node) => [node.name.toLowerCase(), node]));
  const chosen = new Map(selectedNodes.map((node) => [node.id, node]));

  for (const node of selectedNodes) {
    const dependencies = node.tags.brain_dependencies || [];
    for (const dep of dependencies) {
      const dependencyNode = mapByName.get(String(dep).toLowerCase());
      if (dependencyNode && !chosen.has(dependencyNode.id)) {
        chosen.set(dependencyNode.id, dependencyNode);
        if (chosen.size >= maxNodes) return Array.from(chosen.values());
      }
    }
  }

  return Array.from(chosen.values());
}

export function chunkCodeSnippet(codeSnippet, chunkSize = 700) {
  if (!codeSnippet) return [];
  const chunks = [];
  for (let i = 0; i < codeSnippet.length; i += chunkSize) {
    chunks.push(codeSnippet.slice(i, i + chunkSize));
  }
  return chunks;
}

function appendWithBudget(lines, nextLine, state) {
  const attempt = `${lines.join('\n')}\n${nextLine}`;
  if (attempt.length > state.maxContextChars) return false;
  lines.push(nextLine);
  return true;
}

/**
 * Builds prompt with context budget, history compression, and dual-tag instructions.
 */
export function buildPrompt(query, selectedNodes, options = {}) {
  const state = {
    maxContextChars: options.maxContextChars || 7000
  };

  const lines = [
    'You are an external AI assistant helping an internal codebase brain for a website-builder product.',
    'Answer ONLY from given context. If missing context, say what is needed.',
    'Use operation tags when proposing file actions: [WRITE], [READ], [RENAME], [DELETE], [COPY], [MOVE], [THINK].',
    '',
    `User Query: ${query}`,
    ''
  ];

  if (options.userTags?.length) {
    appendWithBudget(lines, `User Tags: ${options.userTags.join(', ')}`, state);
  }

  if (options.structureMarkdown) {
    appendWithBudget(lines, 'Project Structure (structure.md excerpt):', state);
    appendWithBudget(lines, String(options.structureMarkdown).slice(0, 1000), state);
    appendWithBudget(lines, '', state);
  }

  if (options.recentHistory?.length) {
    appendWithBudget(lines, 'Recent Conversation Summary:', state);
    for (const item of options.recentHistory.slice(-3)) {
      if (!appendWithBudget(lines, `- ${item}`, state)) break;
    }
    appendWithBudget(lines, '', state);
  }

  if (options.projectFileContext?.length) {
    appendWithBudget(lines, 'Relevant Project Files:', state);
    for (const file of options.projectFileContext) {
      if (!appendWithBudget(lines, `File: ${file.path}`, state)) break;
      if (!appendWithBudget(lines, file.snippet, state)) break;
      if (!appendWithBudget(lines, '', state)) break;
    }
  }

  appendWithBudget(lines, 'Relevant Brain Nodes:', state);

  for (const node of selectedNodes) {
    const chunks = chunkCodeSnippet(node.code_snippet || '', options.chunkSize || 700);
    const firstChunk = chunks[0] || 'No code snippet yet.';

    if (!appendWithBudget(lines, `Node: ${node.name} (${node.type})`, state)) break;
    if (!appendWithBudget(lines, `Summary: ${node.tags.brain_summary}`, state)) break;
    if (!appendWithBudget(lines, `Read Signals: ${(node.tags.brain_read || []).join(', ') || 'none'}`, state)) break;
    if (!appendWithBudget(lines, `Write Signals: ${(node.tags.brain_write || []).join(', ') || 'none'}`, state)) break;
    if (!appendWithBudget(lines, `Dependencies: ${(node.tags.brain_dependencies || []).join(', ') || 'none'}`, state)) break;
    if (!appendWithBudget(lines, `Code Chunk 1/${Math.max(chunks.length, 1)}: ${firstChunk}`, state)) break;
    if (!appendWithBudget(lines, '', state)) break;
  }

  appendWithBudget(lines, 'Output Format:', state);
  appendWithBudget(lines, '1) Brief answer', state);
  appendWithBudget(lines, '2) Optional tagged operations, e.g. [WRITE path="src/app/page.tsx"]...[/WRITE]', state);

  return lines.join('\n').slice(0, state.maxContextChars);
}

export function applyBrainWriteback(nodes, selectedNodeIds, query, aiOutput) {
  const now = new Date().toISOString();
  const selectedSet = new Set(selectedNodeIds);

  return nodes.map((node) => {
    if (!selectedSet.has(node.id)) return node;

    const writeEntry = `${now} | handled query: ${query.slice(0, 160)}`;
    const historyEntry = `${now} | response_preview="${(aiOutput || '').slice(0, 180)}"`;

    return {
      ...node,
      tags: {
        ...node.tags,
        brain_write: [...(node.tags.brain_write || []), writeEntry],
        brain_history: [...(node.tags.brain_history || []), historyEntry]
      }
    };
  });
}
