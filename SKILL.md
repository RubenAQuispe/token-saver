---
name: token-optimizer
description: "Token optimization dashboard with two sections - (1) Workspace file compression for ALL .md files in context, (2) AI model audit that detects current models and suggests cheaper alternatives. Shows \"possible savings\" until optimizations are applied. Triggers on \"optimize tokens\", \"reduce AI costs\", \"model audit\", \"save money on AI\"."
---

# Token Optimizer

**Cut your AI costs by 40-90% with one command.**

## What You Get

```
/optimize
```

A clean dashboard showing:

**🗜️ File Compression** — Scans ALL your .md workspace files and shows exactly how much you can save by compressing them to AI-efficient notation. MEMORY.md alone typically saves 90%+.

**🤖 Model Audit** — Detects which AI models you're using (main chat, cron jobs, subagents) and recommends cheaper alternatives with specific dollar savings.

**📊 Combined Savings** — Total weekly/monthly/annual savings estimate across both optimizations.

## Commands

| Command | What it does |
|---|---|
| `/optimize` | Dashboard with all savings options |
| `/optimize tokens` | Compress workspace files (auto-backup) |
| `/optimize models` | Detailed model cost comparison |
| `/optimize revert` | Restore files from backups |

## Safety

- **Auto-backup** before any file change
- **"Possible savings"** shown until you actually apply
- **One-command revert** — `/optimize revert` restores everything
- Only compresses files where real savings exist

## How It Works

AI models understand compressed notation perfectly:

**Before (500+ tokens):**
> When Ruben greets me in the morning with phrases like "good morning" or "what's on today", I should proactively review our task list, mention pending items, and check for urgent issues...

**After (30 tokens):**
> `MORNING: greeting → review(todos+pending+urgent)`

Same meaning. 90% fewer tokens. Real dollar savings.

## Scripts

- `scripts/optimizer.js` — Main dashboard and command handler
- `scripts/analyzer.js` — Token counting, model detection, cost calculations
- `scripts/compressor.js` — AI-notation compression engine