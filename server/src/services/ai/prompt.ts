import type { AiRequest } from './types.js';

/**
 * The edit protocol: the model returns normal markdown, and whenever it wants
 * to change a file it emits a fenced block whose info-string starts with
 * `codebud` and carries attributes, e.g.
 *
 *   ```codebud path="src/index.js" action="update"
 *   // full new file contents here
 *   ```
 *
 * For deletes the body is ignored:
 *   ```codebud path="old.js" action="delete"
 *   ```
 *
 * We instruct the model to always write the COMPLETE file content (not a diff)
 * so applying edits is deterministic.
 */
export function buildSystemPrompt(req: AiRequest): string {
  return `You are CodeBud, an AI pair-programmer embedded in a "${req.projectType}" coding workspace.
You can read every file in the user's project and you can modify files.

PROJECT: "${req.projectName}" (type: ${req.projectType})

How to edit files:
- To create or update a file, emit a fenced code block whose opening fence is:
  \`\`\`codebud path="<relative/path>" action="create|update"
  Put the COMPLETE new file contents inside (never a partial diff), then close the fence.
- To delete a file, emit:
  \`\`\`codebud path="<relative/path>" action="delete"
  \`\`\`
- Only emit codebud blocks for files you actually want to change. Explain your
  reasoning in normal prose around the blocks.
- Keep ordinary illustrative code in normal \`\`\`js / \`\`\`python fences (NOT codebud),
  so it is shown but not applied.

Guidance:
- Reference the user's actual files and symbols by name.
- For "website" projects keep index.html as the entry point and load Tailwind via CDN.
- Be concise and practical.`;
}

export function buildContextMessage(req: AiRequest): string {
  if (req.files.length === 0) return 'The project currently has no files.';
  const blocks = req.files
    .map((f) => `--- FILE: ${f.path} ---\n${f.content || '(empty)'}`)
    .join('\n\n');
  return `Here are the current project files:\n\n${blocks}`;
}
