# Set up Sona on a new device

Follow these steps top to bottom on any new computer. ~10 minutes.

## 1. Install the three tools you need

| Tool | What it is | Install (Windows PowerShell) |
|------|-----------|------------------------------|
| **Git** | Downloads/syncs the code | `winget install Git.Git` |
| **Bun** | Runs the app | `powershell -c "irm bun.sh/install.ps1 \| iex"` |
| **GitHub CLI** | Logs you into GitHub | `winget install GitHub.cli` |

Close and reopen PowerShell after installing so the tools are found.

## 2. Log into GitHub

```
gh auth login
```
Answer: **GitHub.com** → **HTTPS** → **Login with a web browser**, then paste the code it shows.

## 3. Download the code

```
git clone https://github.com/FXLUXE/sona.git
cd sona
```

## 4. Add your secret keys

The real keys are **never** stored on GitHub (on purpose). Copy the template and fill it in:

```
copy .env.example .env
notepad .env
```
Fill the blanks (Supabase URL + keys, Gemini key — same values you use on your main PC). Save and close.

## 5. Install + run

```
bun install
bun run dev
```
Open the address it prints (usually `http://localhost:3000`).

## 6. (Optional) Give Claude its memory back

So Claude on this device resumes with full project history:

```
mkdir "%USERPROFILE%\.claude\projects\C--Users-Daniel-Desktop-venture\memory"
copy docs\claude-context\*.md "%USERPROFILE%\.claude\projects\C--Users-Daniel-Desktop-venture\memory\"
```

---

## Keeping every device in sync

**After you change anything, on the device you worked on:**
```
git add -A
git commit -m "what you changed"
git push
```

**On any other device, before you start work:**
```
git pull
```

That's the whole loop: `pull` before you start, `push` when you finish. Every device stays identical.
