const MAX_CONTENT_SIZE = 20000;

function safeContent(content) {
  return String(content || '').slice(0, MAX_CONTENT_SIZE);
}

/**
 * Parse AI response tags into executable file operations.
 * Supported tags:
 * [WRITE path="src/app/page.tsx"]...[/WRITE]
 * [READ path="..."]
 * [DELETE path="..."]
 * [RENAME from="a" to="b"]
 * [MOVE from="a" to="b"]
 * [COPY from="a" to="b"]
 * [THINK]...[/THINK]
 */
export function parseTaggedOperations(text) {
  const input = String(text || '');
  const operations = [];

  const writeRegex = /\[WRITE\s+path="([^"]+)"\]([\s\S]*?)\[\/WRITE\]/g;
  let match;
  while ((match = writeRegex.exec(input)) !== null) {
    operations.push({ type: 'write', path: match[1], content: safeContent(match[2].trim()) });
  }

  const readRegex = /\[READ\s+path="([^"]+)"\]/g;
  while ((match = readRegex.exec(input)) !== null) {
    operations.push({ type: 'read', path: match[1] });
  }

  const deleteRegex = /\[DELETE\s+path="([^"]+)"\]/g;
  while ((match = deleteRegex.exec(input)) !== null) {
    operations.push({ type: 'delete', path: match[1] });
  }

  const renameRegex = /\[(RENAME|MOVE)\s+from="([^"]+)"\s+to="([^"]+)"\]/g;
  while ((match = renameRegex.exec(input)) !== null) {
    operations.push({ type: match[1].toLowerCase(), from: match[2], to: match[3] });
  }

  const copyRegex = /\[COPY\s+from="([^"]+)"\s+to="([^"]+)"\]/g;
  while ((match = copyRegex.exec(input)) !== null) {
    operations.push({ type: 'copy', from: match[1], to: match[2] });
  }

  const thinkRegex = /\[THINK\]([\s\S]*?)\[\/THINK\]/g;
  while ((match = thinkRegex.exec(input)) !== null) {
    operations.push({ type: 'think', thought: match[1].trim().slice(0, 1000) });
  }

  return operations;
}

/**
 * Parse user-side operation tags from Studio inputs.
 * Format examples:
 * - read:src/app/page.tsx
 * - write:src/app/page.tsx
 * - rename:old.tsx=>new.tsx
 */
export function parseUserTagCommands(commands = []) {
  const ops = [];

  for (const raw of commands) {
    const value = String(raw || '').trim();
    if (!value) continue;

    if (value.startsWith('read:')) ops.push({ type: 'read', path: value.slice(5).trim() });
    else if (value.startsWith('write:')) ops.push({ type: 'write', path: value.slice(6).trim(), content: '' });
    else if (value.startsWith('delete:')) ops.push({ type: 'delete', path: value.slice(7).trim() });
    else if (value.startsWith('rename:') || value.startsWith('move:') || value.startsWith('copy:')) {
      const [kind, rest] = value.split(':');
      const [from, to] = (rest || '').split('=>').map((x) => x?.trim());
      if (from && to) {
        ops.push({ type: kind, from, to });
      }
    } else if (value.startsWith('think')) {
      ops.push({ type: 'think', thought: value.slice('think'.length).trim() });
    }
  }

  return ops;
}
