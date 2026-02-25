import { promises as fs } from 'fs';
import path from 'path';

const projectFilesPath = path.join(process.cwd(), 'data', 'projectFiles.json');
const structurePath = path.join(process.cwd(), 'data', 'structure.md');

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
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with'
]);

export async function readProjectFiles() {
  const raw = await fs.readFile(projectFilesPath, 'utf-8');
  return JSON.parse(raw);
}

export async function writeProjectFiles(payload) {
  await fs.writeFile(projectFilesPath, JSON.stringify(payload, null, 2), 'utf-8');
}

export async function readStructureMarkdown() {
  return fs.readFile(structurePath, 'utf-8');
}

export async function writeStructureMarkdown(markdown) {
  await fs.writeFile(structurePath, markdown, 'utf-8');
}

export function generateStructureMarkdown(filesMap) {
  const files = Object.keys(filesMap || {}).sort();
  const tree = { __children: {}, __file: false };

  for (const file of files) {
    const parts = file.split('/').filter(Boolean);
    let cursor = tree;
    for (const [index, part] of parts.entries()) {
      if (!cursor.__children[part]) {
        cursor.__children[part] = { __children: {}, __file: false };
      }
      cursor = cursor.__children[part];
      if (index === parts.length - 1) {
        cursor.__file = true;
      }
    }
  }

  function render(node, depth = 0) {
    const keys = Object.keys(node.__children).sort();
    const lines = [];

    for (const key of keys) {
      const child = node.__children[key];
      const indent = '  '.repeat(depth);
      lines.push(`${indent}- ${key}${child.__file && Object.keys(child.__children).length === 0 ? '' : '/'}`);
      lines.push(...render(child, depth + 1));
    }

    return lines;
  }

  return ['# Project Structure', '', ...render(tree)].join('\n');
}

export function applyOperations(filesMap, operations = []) {
  const files = { ...(filesMap || {}) };
  const applied = [];

  for (const op of operations) {
    if (op.type === 'write' && op.path) {
      files[op.path] = String(op.content || files[op.path] || '');
      applied.push({ type: 'write', path: op.path });
    } else if (op.type === 'read' && op.path) {
      applied.push({ type: 'read', path: op.path, exists: Object.hasOwn(files, op.path) });
    } else if (op.type === 'delete' && op.path) {
      delete files[op.path];
      applied.push({ type: 'delete', path: op.path });
    } else if ((op.type === 'rename' || op.type === 'move') && op.from && op.to) {
      if (Object.hasOwn(files, op.from)) {
        files[op.to] = files[op.from];
        delete files[op.from];
      }
      applied.push({ type: op.type, from: op.from, to: op.to });
    } else if (op.type === 'copy' && op.from && op.to) {
      if (Object.hasOwn(files, op.from)) {
        files[op.to] = files[op.from];
      }
      applied.push({ type: 'copy', from: op.from, to: op.to });
    } else if (op.type === 'think') {
      applied.push({ type: 'think', thought: String(op.thought || '').slice(0, 200) });
    }
  }

  return { files, applied };
}

function tokenizeQuery(query) {
  return String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9_./-]/g, ''))
    .filter(Boolean)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Returns a strict, relevance-ranked subset of project files for prompt context.
 * This prevents sending full codebase content for large projects.
 */
export function selectRelevantProjectFiles(filesMap, query, options = {}) {
  const tokens = tokenizeQuery(query);
  const maxFiles = options.maxFiles || 3;
  const maxChars = options.maxChars || 900;
  const maxPerFile = options.maxPerFile || 260;

  const scored = Object.entries(filesMap || {})
    .map(([path, content]) => {
      const lowerPath = path.toLowerCase();
      const lowerContent = String(content || '').toLowerCase();
      let score = 0;

      for (const token of tokens) {
        if (lowerPath.includes(token)) score += 3;
        if (lowerContent.includes(token)) score += 1;
      }

      if (!tokens.length) {
        // If no tokens, prioritize top-level project files and app entrypoints.
        if (lowerPath.includes('readme')) score += 2;
        if (lowerPath.includes('app/page')) score += 2;
      }

      return { path, content: String(content || ''), score };
    })
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  const picked = [];
  let used = 0;

  for (const item of scored) {
    if (picked.length >= maxFiles) break;

    const snippet = item.content.slice(0, maxPerFile);
    const blockCost = item.path.length + snippet.length + 24;
    if (used + blockCost > maxChars) continue;

    // Always include at least one file even if score is zero.
    if (item.score > 0 || picked.length === 0) {
      picked.push({ path: item.path, snippet, score: item.score });
      used += blockCost;
    }
  }

  return {
    files: picked,
    manifest: {
      totalProjectFiles: Object.keys(filesMap || {}).length,
      selectedFileCount: picked.length,
      selectedPaths: picked.map((item) => item.path),
      charBudget: maxChars,
      selectedChars: used,
      maxPerFile
    }
  };
}
