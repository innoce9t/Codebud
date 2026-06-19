import type { AiProvider, AiRequest } from './types.js';

/**
 * A keyless, deterministic provider so the app is fully demoable without any AI
 * credentials. It is genuinely useful: it reads the project files, answers
 * questions about them, and performs simple, real file edits using the same
 * `codebud` block protocol the LLM providers use.
 */
export function createMockProvider(): AiProvider {
  return {
    name: 'mock',
    async complete(req: AiRequest) {
      const msg = req.message.toLowerCase();
      const fileList = req.files.length
        ? req.files.map((f) => `- \`${f.path}\` (${f.content.length} chars)`).join('\n')
        : '_(no files yet)_';

      // 1) "Create a file called X" → actually create it.
      const createMatch = req.message.match(/create\s+(?:a\s+)?file\s+(?:called\s+|named\s+)?["'`]?([\w./-]+)["'`]?/i);
      if (createMatch) {
        const path = createMatch[1];
        const scaffold = scaffoldFor(path, req.projectType);
        return {
          raw: `Sure — I created \`${path}\` for you with a starter scaffold.\n\n\`\`\`codebud path="${path}" action="create"\n${scaffold}\n\`\`\``,
        };
      }

      // 2) "Add a comment / header to <file>" style — small edit demo.
      if (/add (a )?(header|comment|banner)/i.test(req.message) && req.files[0]) {
        const target = req.files.find((f) => msg.includes(f.path.toLowerCase())) ?? req.files[0];
        const banner = commentFor(target.path, `CodeBud edit: ${new Date().toISOString()}`);
        return {
          raw: `Added a header comment to \`${target.path}\`.\n\n\`\`\`codebud path="${target.path}" action="update"\n${banner}\n${target.content}\n\`\`\``,
        };
      }

      // 3) Explain / review / questions.
      if (/explain|what does|how does|review|improve|bug|fix/i.test(req.message)) {
        return {
          raw:
            `Here's what I can see in **${req.projectName}**:\n\n${fileList}\n\n` +
            `> This workspace is running in **mock AI mode** (no API key configured). ` +
            `Set \`AI_PROVIDER=anthropic\` and \`ANTHROPIC_API_KEY\` in \`.env\` for full code-aware answers.\n\n` +
            `Even so, I can create files and apply simple edits. Try: *"create a file called utils.js"* ` +
            `or *"add a header comment to ${req.files[0]?.path ?? 'index.html'}"*.`,
        };
      }

      // 4) Default.
      return {
        raw:
          `You said: "${req.message}".\n\nYour project currently contains:\n${fileList}\n\n` +
          `_(mock AI mode — configure a real provider in \`.env\` for full assistance.)_`,
      };
    },
  };
}

function commentFor(path: string, text: string): string {
  if (path.endsWith('.py')) return `# ${text}`;
  if (path.endsWith('.html')) return `<!-- ${text} -->`;
  if (path.endsWith('.css')) return `/* ${text} */`;
  return `// ${text}`;
}

function scaffoldFor(path: string, type: AiRequest['projectType']): string {
  if (path.endsWith('.py')) return `def main():\n    print("Hello from ${path}")\n\n\nif __name__ == "__main__":\n    main()\n`;
  if (path.endsWith('.html'))
    return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="p-8">\n  <h1 class="text-2xl font-bold">${path}</h1>\n</body>\n</html>\n`;
  if (path.endsWith('.css')) return `/* ${path} */\nbody {\n  font-family: system-ui, sans-serif;\n}\n`;
  return `// ${path}\nexport function hello() {\n  return "Hello from ${path}";\n}\n`;
}
