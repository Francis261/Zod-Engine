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

/**
 * Reads node memory from JSON for v0 persistence.
 */
export async function readNodes() {
  const raw = await fs.readFile(nodesPath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Writes node memory back to JSON after mutations.
 */
export async function writeNodes(nodes) {
  await fs.writeFile(nodesPath, JSON.stringify(nodes, null, 2), 'utf-8');
}

/**
 * Creates default tags required by the brain schema.
 */
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

/**
 * Lightweight helper for generating ID-safe strings.
 */
function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Infer node type and name from the query for new-project bootstrap behavior.
 */
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
 * Very lightweight relevance check for selecting nodes from a query.
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

  if (!scored.length) {
    return nodes.slice(0, 2);
  }

  return scored.slice(0, 4).map((item) => item.node);
}

/**
 * Expands context with dependency-linked nodes while keeping prompt size manageable.
 */
export function expandWithDependencies(nodes, selectedNodes, maxNodes = 6) {
  const mapByName = new Map(nodes.map((node) => [node.name.toLowerCase(), node]));
  const chosen = new Map(selectedNodes.map((node) => [node.id, node]));

  for (const node of selectedNodes) {
    const dependencies = node.tags.brain_dependencies || [];
    for (const dep of dependencies) {
      const dependencyNode = mapByName.get(String(dep).toLowerCase());
      if (dependencyNode && !chosen.has(dependencyNode.id)) {
        chosen.set(dependencyNode.id, dependencyNode);
        if (chosen.size >= maxNodes) {
          return Array.from(chosen.values());
        }
      }
    }
  }

  return Array.from(chosen.values());
}

/**
 * Chunk large code snippets to avoid oversized context payloads.
 */
export function chunkCodeSnippet(codeSnippet, chunkSize = 700) {
  if (!codeSnippet) return [];
  const chunks = [];
  for (let i = 0; i < codeSnippet.length; i += chunkSize) {
    chunks.push(codeSnippet.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Builds external AI prompt from node tags and user query with soft token budgeting.
 */
export function buildPrompt(query, selectedNodes, options = {}) {
  const maxContextChars = options.maxContextChars || 6000;
  const lines = [
    'You are an external AI assistant helping an internal codebase brain.',
    'Return practical engineering guidance and code suggestions when relevant.',
    '',
    `User Query: ${query}`,
    '',
    'Relevant Node Context:'
  ];

  for (const node of selectedNodes) {
    const chunks = chunkCodeSnippet(node.code_snippet || '', options.chunkSize || 700);
    const firstChunk = chunks[0] || 'No code snippet yet.';

    lines.push(`Node: ${node.name} (${node.type})`);
    lines.push(`Summary: ${node.tags.brain_summary}`);
    lines.push(`Read Signals: ${(node.tags.brain_read || []).join(', ') || 'none'}`);
    lines.push(`Write Signals: ${(node.tags.brain_write || []).join(', ') || 'none'}`);
    lines.push(`Dependencies: ${(node.tags.brain_dependencies || []).join(', ') || 'none'}`);
    lines.push(`Code Chunk 1/${Math.max(chunks.length, 1)}: ${firstChunk}`);
    lines.push('');

    if (lines.join('\n').length > maxContextChars) {
      lines.push('[Context truncated by brain budget to stay under AI token limits.]');
      break;
    }
  }

  return lines.join('\n').slice(0, maxContextChars);
}

/**
 * Merge AI result into selected nodes' memory tags.
 */
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
