---
id: 0002
title: Date folders for reports + active/archive split for handoffs
status: accepted
date: 2026-05-16
deciders: bithun (proposed the structure), opus-s01 (implemented)
---

## Context

The first iteration of the agent protocol (ADR 0001) put session summaries and handoffs as flat files with date-prefixed names:

```
_docs/agent-reports/
  2026-05-16-opus-s01-execution-summary.md
  2026-05-16-opus-s01-pending-audit.md
  2026-05-16-codex-phase-1.md
  ...
_docs/agent-handoffs/
  2026-05-16-opus-s01-to-next-agent-deferred-items.md
```

Two problems surfaced almost immediately:

1. **Filenames are long and visually noisy.** Once we accumulate sessions across many days, scanning the folder becomes painful.
2. **Finding "what's currently open" requires reading every handoff's `status:` field.** When there are five handoffs in flight from various senders to various recipients, you can't tell at a glance which ones are still waiting on someone.

Bithun explicitly asked for a different structure on 2026-05-16: per-day folders for reports, and an active/archive split for handoffs based on completion date (not creation date).

## Decision

### Reports

Group by calendar date:

```
_docs/agent-reports/
└── <YYYY-MM-DD>/                      ← one folder per session date (Europe/Oslo)
    └── <agent>-<session>-<title>.md   ← no date prefix on filenames
```

Examples:
- `_docs/agent-reports/2026-05-16/opus-s01-execution-summary.md`
- `_docs/agent-reports/2026-05-17/codex-stripe-integration.md`

Sessions that cross midnight live in their start-date folder.

### Handoffs

Split by lifecycle status:

```
_docs/agent-handoffs/
├── active/                            ← open handoffs only
│   └── <from>-<session>-to-<recipient>-<topic>.md
└── archive/
    └── <YYYY-MM-DD>/                  ← completed/superseded handoffs, filed by COMPLETION date
        └── <same filename, moved>
```

When a handoff completes:
1. Update `status: completed` + add `date_completed:` + `final_commit:` in frontmatter
2. **Move** the file from `active/` to `archive/<date_completed>/`. Same filename, just a different folder.

When a handoff is superseded: same — move to `archive/<today>/` with `status: superseded` and `superseded_by:` pointing at the replacement.

## Consequences

**Positive:**
- Filenames are short and readable. Date is encoded in the folder, not the filename.
- Glancing at `_docs/agent-handoffs/active/` shows the full active workload — no scanning of YAML frontmatter required.
- Same-day work is visually grouped.
- The completion-date archive subfolder makes it easy to answer "what got finished on date X?"
- Handoff opened on day 1 and completed on day 3 ends up in `archive/<day-3>/`, which matches how a human thinks about "when was this finished?"

**Negative trade-offs accepted:**
- One-time restructure cost. Mitigated by using `git mv` so commit history is preserved per-file.
- Slightly more folders to navigate than the flat layout. Acceptable because the structure is shallow (2 levels max).

## Alternatives considered

- **Flat filenames with explicit status field** — keep the date-prefixed flat layout, sort/grep by status. Rejected: requires reading frontmatter to know what's open; doesn't visually group same-day work.
- **Per-agent subfolders** (`reports/claude/`, `reports/codex/`) — Rejected: makes cross-agent handoffs awkward; doesn't align with how Bithun thinks (by date, by status — not by author).
- **Year/month/day nesting** (`reports/2026/05/16/`) — Rejected: too deep for a small project; flat `<date>/` folders are sufficient until we have thousands of sessions.

## Notes

This structure was implemented in commit `f5efa49` on `claude/supabase-and-admin-wiring`. All existing files moved via `git mv` to preserve per-file history. Cross-references inside files (e.g., the `read_first:` list in the open handoff) were updated in the same commit.
