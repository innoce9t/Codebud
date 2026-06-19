import type { AiResponse, FileEdit } from './types.js';

// Matches: ```codebud path="x" action="update" \n ...body... \n ```
const EDIT_BLOCK =
  /```codebud\s+([^\n]*)\n([\s\S]*?)```/g;

function parseAttrs(header: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(header))) attrs[m[1]] = m[2];
  return attrs;
}

/**
 * Splits a raw model response into a human-readable reply (edit blocks removed)
 * and a list of structured file edits.
 */
export function parseAiResponse(raw: string): AiResponse {
  const edits: FileEdit[] = [];
  let reply = raw.replace(EDIT_BLOCK, (_full, header: string, body: string) => {
    const attrs = parseAttrs(header);
    const path = attrs.path?.trim();
    const action = (attrs.action?.trim() as FileEdit['action']) || 'update';
    if (!path) return ''; // malformed, drop silently
    if (action === 'delete') {
      edits.push({ path, action });
      return `\n_🗑️ Deleted \`${path}\`_\n`;
    }
    edits.push({ path, action, content: body.replace(/\n$/, '') });
    return `\n_✏️ ${action === 'create' ? 'Created' : 'Updated'} \`${path}\`_\n`;
  });

  reply = reply.trim();
  if (!reply) reply = edits.length ? 'Done — applied the changes above.' : '...';
  return { reply, edits };
}
