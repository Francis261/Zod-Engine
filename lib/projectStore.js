import { promises as fs } from 'fs';
import path from 'path';

const projectFilesPath = path.join(process.cwd(), 'data', 'projectFiles.json');
const structurePath = path.join(process.cwd(), 'data', 'structure.md');

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

/**
 * Applies file operations (AI tags and/or user tags) to project files.
 */
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

export function getTopFilesForContext(filesMap, maxFiles = 6, maxChars = 2400) {
  const entries = Object.entries(filesMap || {}).slice(0, maxFiles);
  const selected = [];
  let used = 0;

  for (const [filePath, content] of entries) {
    const snippet = String(content || '').slice(0, 700);
    const block = `File: ${filePath}\n${snippet}`;
    if (used + block.length > maxChars) break;
    selected.push({ path: filePath, snippet });
    used += block.length;
  }

  return selected;
}
