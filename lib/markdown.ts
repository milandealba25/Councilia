import "server-only";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { Marked } from "marked";

/**
 * Renderer server-side de markdown para páginas legales y de soporte (R2–R7).
 *
 * - Carga el .md desde `docs/` en build/runtime (relativo a `process.cwd()`).
 * - Salida HTML simple, sin shortcodes ni layout: la página decide cómo envolver.
 * - El input proviene SIEMPRE del repo (controlado), no del usuario. No
 *   sanitizamos en el cliente.
 */

const marked = new Marked({
  gfm: true,
  breaks: false,
});

export async function renderDocMarkdown(docName: string): Promise<{
  html: string;
  title: string | null;
}> {
  const file = path.join(process.cwd(), "docs", docName);
  const raw = await readFile(file, "utf8");

  const title = extractTitle(raw);
  const html = await marked.parse(raw);
  return { html, title };
}

function extractTitle(md: string): string | null {
  for (const line of md.split("\n")) {
    if (line.startsWith("# ")) return line.slice(2).trim();
  }
  return null;
}
