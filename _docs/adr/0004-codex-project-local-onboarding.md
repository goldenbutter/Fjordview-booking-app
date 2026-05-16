---
id: 0004
title: Add Codex project-local onboarding and scratch config convention
status: accepted
date: 2026-05-16
deciders: bithun (requested), codex (implemented)
---

## Context

ADR 0001 established the shared multi-agent coordination protocol, and ADR 0003 added context-budget self-management rules. ADR 0003 also notes that Codex needs an equivalent local pointer so future Codex sessions automatically read the protocol and apply the Codex-scale 250k context thresholds.

This repository already has a `.claude/` convention for Claude-specific project-local files. Codex needs the same kind of project-local place for hooks, scratch notes, generated local state, and session-only helper config.

## Decision

Add a local `AGENTS.md` pointer for Codex sessions. It directs Codex to read:

- `_docs/AGENT-PROTOCOL.md`
- `_docs/adr/0001-multi-agent-coordination-protocol.md`
- `_docs/adr/0003-context-budget-self-management.md`

It also reminds Codex to check `_docs/agent-handoffs/active/`, read the latest `_docs/agent-reports/<latest-date>/` entry, branch as `codex/<topic>`, and monitor the 250k-token context window at the ADR 0003 thresholds: Yellow 125k, Orange 175k, Red 225k.

Create `.codex/README.md` to document that `.codex/` is the Codex-specific project-local config and scratch directory. `.gitignore` already ignores everything under `.codex/` except `.codex/README.md`, matching the existing `.claude/` pattern.

## Consequences

**Positive:**

- Future Codex sessions get a project-local reminder to follow the multi-agent protocol before doing work.
- Codex has a documented local scratch/config location that does not pollute the repository.
- The convention mirrors `.claude/`, reducing per-agent drift.

**Trade-offs:**

- `AGENTS.md` is ignored by `.gitignore`, so it remains a local pointer unless force-added intentionally. This keeps local agent instructions out of ordinary commits, but it means repository clones need the file recreated or explicitly tracked if the team wants it versioned.
- This ADR records a process/config convention, not application behavior.

## Notes

This is an architecture/process-level change only. It does not alter application code, runtime behavior, database schema, or user-facing UI.
