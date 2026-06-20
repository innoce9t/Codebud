import type { AiRequest, ChatMode } from './types.js';

const MODE_INSTRUCTION: Record<ChatMode, string> = {
  ask: '',
  plan:
    'PLAN MODE: Before making any file edits, start your response with a "## Plan" section ' +
    'that lists every change you will make and why. Then carry out the edits below the plan.',
  agent:
    'AGENT MODE: Operate autonomously. Make every change needed to fully complete the request ' +
    'without asking for confirmation. Touch as many files as required and finish the whole job.',
};

const APP_ROUTES = `
App pages (reference as markdown links so the user can click through):
- [Dashboard](/) — project overview and quick-start templates
- [Workspaces](/workspaces) — view all projects
- [AI Models](/ai-models) — connect providers (Anthropic, OpenAI, Google) and set the active model
- [Theme](/theme) — change color theme and accent
- [Settings](/settings) — account, editor preferences, keybindings, billing
- [Profile](/profile) — name and account info
`;

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
 */
export function buildSystemPrompt(req: AiRequest, mode: ChatMode = 'ask'): string {
  const modeInstruction = MODE_INSTRUCTION[mode];

  return `You are CodeBud, an AI pair-programmer embedded in a "${req.projectType}" coding workspace.
You can read every file in the user's project and you can modify files.
${modeInstruction ? `\n${modeInstruction}\n` : ''}
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
- Be concise and practical.
- When referencing another part of the app (Settings, AI Models, etc.) use the markdown
  links below so the user can navigate with a single click.

Running code:
- You CANNOT execute code yourself. Never fabricate or guess console output.
- If the user asks to run the project, tell them to press the Run button in the
  Console panel (keyboard shortcut Ctrl/Cmd+Enter); for website projects the Live
  Preview updates automatically. Only describe expected behavior if you clearly
  label it as expected, not actual output.
${APP_ROUTES}`;
}

export function buildContextMessage(req: AiRequest): string {
  if (req.files.length === 0) return 'The project currently has no files.';
  const blocks = req.files
    .map((f) => `--- FILE: ${f.path} ---\n${f.content || '(empty)'}`)
    .join('\n\n');
  return `Here are the current project files:\n\n${blocks}`;
}
