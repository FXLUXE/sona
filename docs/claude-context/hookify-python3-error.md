---
name: hookify-python3-error
description: "Fix for the repeating \"python3: command not found\" hook error on every reply"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 81e1d05a-bf2e-4d54-88fb-100628baa21c
---

Symptom: `PostToolUse:Bash hook error — Failed with non-blocking status code: /usr/bin/bash: line 1: python3: command not found` firing on every tool use / reply.

Cause: the **hookify** plugin (`hookify@claude-code-plugins`) registers PreToolUse/PostToolUse/Stop/UserPromptSubmit hooks that all invoke bare `python3`. This Windows box has `python` (C:\Python314) + `py` but NO `python3`, so every hook crashes. Hooks did nothing useful anyway (no `.local.md` rules defined).

Fix applied 2026-06-24: set `"hookify@claude-code-plugins": false` in `C:\Users\Daniel\.claude\settings.json`. Takes effect on session RESTART.

To re-enable hookify properly: install/alias `python3` → `python` on PATH, then flip back to `true`.
