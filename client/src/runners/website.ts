import type { FileNode } from '../types';

/**
 * Assembles a self-contained HTML document for the live preview by inlining
 * local <link> stylesheets and <script src> files from the project. External
 * URLs (e.g. the Tailwind CDN) are left untouched.
 */
export function buildPreviewDoc(files: FileNode[]): string {
  const byPath = new Map(files.map((f) => [f.path.replace(/^\.?\//, ''), f.content]));
  const entry =
    byPath.get('index.html') ??
    [...byPath.entries()].find(([p]) => p.endsWith('.html'))?.[1] ??
    '<!doctype html><body style="font-family:sans-serif;padding:2rem">No index.html found.</body>';

  let html = entry;

  // Inline <link rel="stylesheet" href="local.css">
  html = html.replace(
    /<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi,
    (tag, href: string) => {
      if (/^https?:\/\//i.test(href)) return tag;
      const css = byPath.get(href.replace(/^\.?\//, ''));
      return css != null ? `<style>\n${css}\n</style>` : tag;
    },
  );

  // Inline <script src="local.js">
  html = html.replace(
    /<script\b[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (tag, src: string) => {
      if (/^https?:\/\//i.test(src)) return tag;
      const js = byPath.get(src.replace(/^\.?\//, ''));
      return js != null ? `<script>\n${js}\n</script>` : tag;
    },
  );

  return html;
}
