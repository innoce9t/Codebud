import type { FileNode } from '../types';

/**
 * Assembles a self-contained HTML document for the live preview by inlining
 * local <link> stylesheets and <script src> files from the project. External
 * URLs (e.g. the Tailwind CDN) are left untouched.
 */
export function buildPreviewDoc(files: FileNode[], tailwindSrc?: string): string {
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

  // Tailwind. The preview iframe is sandboxed WITHOUT allow-same-origin (so untrusted
  // project/collaborator code can't reach the parent), which means it cannot fetch the
  // cross-origin `cdn.tailwindcss.com` / `/vendor/tailwind.js` subresource — a render-blocking
  // <head> <script src> would stall and the page would never paint. So we INLINE the vendored
  // Tailwind source directly (no subresource fetch). When the source isn't available yet, fall
  // back to the same-origin /vendor copy reference.
  const inline = tailwindSrc
    ? `<script>\n${tailwindSrc.replace(/<\/script/gi, '<\\/script')}\n</script>`
    : '<script src="/vendor/tailwind.js"></script>';
  // Use a replacement FUNCTION so `$` sequences in the Tailwind source are inserted
  // literally (a string replacement would treat `$&`, `$1`, `$$`, … as special).
  html = html.replace(
    /<script\b[^>]*src=["'](?:https?:\/\/cdn\.tailwindcss\.com[^"']*|\/vendor\/tailwind\.js)["'][^>]*>\s*<\/script>/gi,
    () => inline,
  );

  return html;
}
