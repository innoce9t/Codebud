import type { AiRequest, ChatMode, GenerationParams } from './types.js';

const STYLE_INSTRUCTION: Record<string, string> = {
  concise: 'Response style: be brief and to the point. Short paragraphs, minimal preamble, no filler.',
  balanced: '',
  detailed:
    'Response style: be thorough. Explain your reasoning and include relevant examples and edge cases.',
};

/**
 * Fold the user's tunable behaviour into a system prompt: response-style guidance
 * and any custom instruction they configured in AI Settings.
 */
export function withBehaviour(system: string, params?: GenerationParams): string {
  if (!params) return system;
  const extra: string[] = [];
  const style = params.responseStyle ? STYLE_INSTRUCTION[params.responseStyle] : '';
  if (style) extra.push(style);
  const custom = params.systemInstruction?.trim();
  if (custom) extra.push(`The user has set these custom instructions — follow them:\n${custom}`);
  return extra.length ? `${system}\n\n${extra.join('\n\n')}` : system;
}

const MODE_INSTRUCTION: Record<ChatMode, string> = {
  ask:
    'ASK MODE: This is a read-only conversation. Answer questions and explain code, but you MUST ' +
    'NOT modify any files. Never emit ```codebud edit blocks. If illustrating code, use normal ' +
    '```js / ```python fences. If the user wants changes applied, tell them to switch to Agent mode.',
  plan:
    'PLAN MODE: Produce a plan ONLY — do NOT modify any files. Start with a "## Plan" section that ' +
    'lists every change you would make and why. Never emit ```codebud edit blocks; show illustrative ' +
    'code in normal ```js / ```python fences. Tell the user to switch to Agent mode to apply the plan.',
  agent:
    'AGENT MODE: Operate autonomously. Make every change needed to fully complete the request ' +
    'without asking for confirmation. Touch as many files as required and finish the whole job.',
};

const APP_ROUTES = `
App pages — reference these as clickable markdown links when relevant (the user clicks
to go there; do NOT navigate them automatically):
- [Dashboard](/) — project overview and quick-start templates
- [New Project](/new) — create a project (pick JavaScript, Python, or Website workspace)
- [Workspaces](/workspaces) — view all projects grouped by workspace
- [AI Models](/ai-models) — connect providers (Anthropic, OpenAI, Google) and set the active model
- [Theme](/theme) — change color theme and accent
- [Settings](/settings) — account, editor preferences, keybindings, billing
- [Profile](/profile) — name and account info

You are working inside the user's open project. Stay focused on it — never pull the user out of
their project. If something belongs in a different project (e.g. a browser game in a Node project),
recommend it and give them the [New Project](/new) link to follow themselves; do not switch pages
for them.`;

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

  // Only Agent mode is allowed to actually change files, so only it learns the edit protocol.
  const editProtocol =
    mode === 'agent'
      ? `
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
`
      : `
You are in a read-only mode and CANNOT modify files. Never emit \`\`\`codebud blocks.
Show any code only in normal \`\`\`js / \`\`\`python fences.
`;

  return `You are CodeBud, an AI pair-programmer embedded in a "${req.projectType}" coding workspace.
You can read every file in the user's project.
${modeInstruction ? `\n${modeInstruction}\n` : ''}
PROJECT: "${req.projectName}" (type: ${req.projectType})
${editProtocol}
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

/**
 * Defuse app directive syntax embedded in untrusted content (file contents,
 * collaborator-authored text). The client executes `[[action:...]]` and
 * `[[navigate:...]]` found in model output; if the model echoes such a string
 * from a file, that would be a prompt-injection vector. We break the leading
 * `[[` of any directive-shaped token so it can never re-form into a live
 * directive, while leaving unrelated `[[` usage (C++ attributes, bash tests)
 * intact.
 */
const ZWSP = String.fromCharCode(0x200b); // zero-width space

export function sanitizeUntrusted(content: string): string {
  // Insert a zero-width space between the brackets so the client's `\[\[` directive
  // regex can never match, even if the model reproduces the token verbatim.
  return content.replace(/\[\[(\s*)(navigate|action)(\s*):/gi, `[${ZWSP}[$1$2$3:`);
}

export function buildContextMessage(req: AiRequest): string {
  if (req.files.length === 0) return 'The project currently has no files.';
  const blocks = req.files
    .map((f) => `--- FILE: ${f.path} ---\n${sanitizeUntrusted(f.content || '(empty)')}`)
    .join('\n\n');
  return `Here are the current project files:\n\n${blocks}`;
}
