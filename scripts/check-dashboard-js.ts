// check-dashboard-js.ts — guardrail against a whole class of bug that tsc CANNOT catch.
//
// The dashboard's browser JavaScript lives inside a template-literal STRING in dashboard.ts, so
// the TypeScript compiler never parses it. A backslash eaten by the template literal (e.g. `\+`
// → `/+/g`, or `\n` → a real newline mid-string) ships a SyntaxError that freezes the whole page.
// This script renders the real HTML, extracts every inline <script>, and parses each with the JS
// engine — turning those silent runtime failures into a build-time error.
//
// Run: bun run scripts/check-dashboard-js.ts   (also wired into `bun run check`)
import { dashboardHtml } from "../src/dashboard";
import { landingHtml } from "../src/landing";

let failed = 0;
function checkHtml(label: string, html: string) {
  // Inline scripts only (skip <script src=...> CDN tags). The browser treats an escaped
  // "<\/script>" inside a JS string as data, not a close tag, so split on a real close tag.
  const re = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(html))) {
    i++;
    const js = m[1];
    if (js.trim().length < 2) continue;
    try {
      new Function(js); // parse-only; never executed
      console.log(`  ✓ ${label} script #${i} (${js.length} chars) parses`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${label} script #${i}: ${(e as Error).message}`);
    }
  }
}

checkHtml("dashboard", dashboardHtml("http://localhost:4000"));
checkHtml("landing", landingHtml("http://localhost:4000"));

if (failed) {
  console.error(`\n✗ ${failed} inline script(s) have syntax errors — fix before serving.`);
  process.exit(1);
}
console.log("\n✓ all inline browser scripts parse cleanly.");
