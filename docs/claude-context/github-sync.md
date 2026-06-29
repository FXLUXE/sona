---
name: github-sync
description: "Sona code is on GitHub (FXLUXE/sona, private) for cross-device sync — repo, gh setup, sync loop, memory snapshot location"
metadata: 
  node_type: memory
  type: project
  originSessionId: a0c34744-74fa-41da-a24c-63bc3ac5a29f
---

Sona product (`product/`) is version-controlled + on **GitHub for cross-device sync** (set up 2026-06-29 at Daniel's request: "synced across any device... seamlessly picked up").

**Repo:** `https://github.com/FXLUXE/sona` — **PRIVATE**. GitHub account = **FXLUXE** (`gh auth status` confirms; keyring). Git identity: Daniel / daniellheads@gmail.com. Git repo root = `product/` (siblings `digital`/`sales` were empty; `venture/.claude`, `.impeccable` excluded). GitHub CLI installed via winget at `C:\Program Files\GitHub CLI\gh.exe` (v2.95.0) — NOT on the Git-Bash `!`-runner PATH, so call it by full path from bash or use a fresh PowerShell window. Daniel did `gh auth login` himself (I can't — entering account credentials is prohibited).

**Secrets/PII kept OFF GitHub** via `.gitignore`: `.env`, `*.key/*.pem`, `outreach-store.json`, `prospects-*.json`, `outreach.csv/.md`, `.impeccable/`, `node_modules/`. `.env.example` (no real values) IS committed. Always re-verify `.env` not staged before any commit (`git ls-files --cached | grep -x .env` must be empty). See [[venture-ai-website-assistant]] for what needs `.env`.

**Cross-device "seamless pickup":** `SETUP-NEW-DEVICE.md` (repo root) = plain-English guide (install Git/Bun/gh → `gh auth login` → `git clone` → copy `.env.example`→`.env` + fill keys → `bun install` → `bun run dev`, usually :3000). A **snapshot of this Claude memory** is copied into `product/docs/claude-context/*.md` so a new machine's Claude can resume with full context (guide step 6 restores it to `~/.claude/projects/.../memory`). That snapshot is a COPY — when memory changes materially, re-copy + commit to keep it fresh.

**Sync loop (low-touch, [[daniel-low-touch-saas]]):** `git pull` before starting on a device, `git add -A && commit && push` when done. Daniel is non-technical ([[plain-english-no-jargon]]) — offer to run these for him. Commit messages: normal English + `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Pushing is outward-facing — fine here (Daniel authorized GitHub sync), but confirm before any NEW external/public action.
