// md-to-pdf.ts — render a markdown doc into a branded, print-ready HTML (concierge palette).
// Then a headless-Chrome call (see the npm-less command in the guide build) turns it into PDF.
// Focused converter: handles the subset this project's docs use (headings, tables, code,
// lists/checklists, blockquotes, hr, bold, inline code, links).
import { readFile, writeFile } from "node:fs/promises";

const inPath = process.argv[2];
const outPath = process.argv[3] || inPath.replace(/\.md$/, ".html");
if (!inPath) { console.log("Usage: bun scripts/md-to-pdf.ts <in.md> [out.html]"); process.exit(1); }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s: string) =>
  esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

const src = await readFile(inPath, "utf8");
const lines = src.split(/\r?\n/);
const html: string[] = [];
let i = 0;
let inList = false;
const closeList = () => { if (inList) { html.push("</ul>"); inList = false; } };

while (i < lines.length) {
  const line = lines[i];
  // fenced code
  if (/^```/.test(line)) {
    closeList();
    const buf: string[] = [];
    i++;
    while (i < lines.length && !/^```/.test(lines[i])) { buf.push(esc(lines[i])); i++; }
    i++;
    html.push(`<pre><code>${buf.join("\n")}</code></pre>`);
    continue;
  }
  // table: header row + separator
  if (/^\s*\|/.test(line) && /^\s*\|?[\s:-]+\|/.test(lines[i + 1] || "")) {
    closeList();
    const row = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    const head = row(line);
    i += 2;
    const body: string[][] = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) { body.push(row(lines[i])); i++; }
    html.push(
      `<table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead>` +
      `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    );
    continue;
  }
  // headings
  const h = line.match(/^(#{1,4})\s+(.*)$/);
  if (h) { closeList(); html.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
  // hr
  if (/^---+\s*$/.test(line)) { closeList(); html.push("<hr>"); i++; continue; }
  // blockquote
  if (/^>\s?/.test(line)) {
    closeList();
    const buf: string[] = [];
    while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(inline(lines[i].replace(/^>\s?/, ""))); i++; }
    html.push(`<blockquote>${buf.join("<br>")}</blockquote>`);
    continue;
  }
  // list items (incl. checkboxes)
  const li = line.match(/^\s*[-*]\s+(.*)$/);
  if (li) {
    if (!inList) { html.push("<ul>"); inList = true; }
    const box = li[1].match(/^\[([ x])\]\s+(.*)$/);
    if (box) html.push(`<li class="chk"><span class="bx">${box[1] === "x" ? "✓" : ""}</span> ${inline(box[2])}</li>`);
    else html.push(`<li>${inline(li[1])}</li>`);
    i++;
    continue;
  }
  // blank
  if (/^\s*$/.test(line)) { closeList(); i++; continue; }
  // paragraph
  closeList();
  html.push(`<p>${inline(line)}</p>`);
  i++;
}
closeList();

const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page{margin:18mm 16mm}
  :root{--ink:#11212b;--brass:#c79a4b;--brass-deep:#a87f33;--paper:#f6f1e9;--muted:#5b6670;--line:#e4dccb}
  *{box-sizing:border-box}
  body{font-family:"Inter",system-ui,sans-serif;color:#22303a;line-height:1.6;font-size:11.5pt;margin:0}
  h1{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:30pt;color:var(--ink);letter-spacing:-.02em;line-height:1.08;margin:0 0 4pt;border-bottom:3px solid var(--brass);padding-bottom:10pt}
  h2{font-family:"Fraunces",Georgia,serif;font-weight:500;font-size:17pt;color:var(--ink);letter-spacing:-.01em;margin:22pt 0 6pt;break-after:avoid}
  h3{font-family:"Fraunces",Georgia,serif;font-weight:500;font-size:13pt;color:var(--brass-deep);margin:14pt 0 4pt;break-after:avoid}
  p{margin:6pt 0}
  em{color:var(--muted)}
  a{color:var(--brass-deep);text-decoration:none}
  strong{color:var(--ink)}
  code{font-family:ui-monospace,Consolas,monospace;background:#efe8da;padding:1px 5px;border-radius:4px;font-size:10pt}
  pre{background:var(--ink);color:#f4ecda;border-radius:8px;padding:12pt 14pt;overflow:auto;break-inside:avoid;font-size:9.5pt}
  pre code{background:none;color:inherit;padding:0}
  hr{border:0;border-top:1px solid var(--line);margin:18pt 0}
  table{width:100%;border-collapse:collapse;margin:10pt 0;font-size:10pt;break-inside:avoid}
  th,td{border:1px solid var(--line);padding:6pt 8pt;text-align:left;vertical-align:top}
  th{background:#efe8da;font-family:"Inter";font-weight:600;color:var(--ink)}
  blockquote{margin:10pt 0;padding:10pt 14pt;background:#fffdf8;border:1px solid var(--brass);border-radius:8px;color:#3a4750}
  ul{margin:6pt 0;padding-left:18pt}
  li{margin:3pt 0}
  li.chk{list-style:none;margin-left:-18pt}
  li.chk .bx{display:inline-block;width:13pt;height:13pt;border:1.5px solid var(--brass);border-radius:3px;text-align:center;line-height:12pt;color:var(--brass-deep);font-weight:700;margin-right:6pt;vertical-align:middle}
</style></head>
<body>${html.join("\n")}</body></html>`;

await writeFile(outPath, doc);
console.log("Wrote", outPath);
process.exit(0);
