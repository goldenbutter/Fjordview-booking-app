---
id: 0001
title: Adopt a written multi-agent coordination protocol
status: accepted
date: 2026-05-16
deciders: bithun (human owner), opus-s01 (session that proposed and drafted the protocol)
---

## Context

This codebase is worked on by multiple agents (Codex, Claude/Opus, Claude/Sonnet, possibly others in the future) plus the human owner (Bithun). Bithun routinely bounces between agents — sometimes hitting one agent's usage cap and continuing work with another, sometimes spawning a fresh session because the current one is full.

Without explicit coordination, problems compound rapidly:
- Two agents fix the same bug differently → merge conflict, time wasted reconciling
- One agent rewrites a previous agent's work without understanding why → silent regressions
- An agent runs out of context mid-slice → broken commits, no handoff, lost intent
- Reviewing what's in the repo requires reading the entire git history first
- No clear ownership of decisions; each agent re-litigates the same trade-offs

This ADR was prompted by Bithun's direct request on 2026-05-16: agents should "respect each other and respect their own boundaries — better code quality and better productivity."

## Decision

Adopt a written agent-coordination protocol at [`_docs/AGENT-PROTOCOL.md`](../AGENT-PROTOCOL.md). The protocol is canonical — any conflict with CLAUDE.md, AGENTS.md, READMEs, or local memory is resolved in the protocol's favour.

The protocol covers:

1. **Branch naming** — each author gets a prefix (`codex/`, `claude/`, `bithun/`). One branch per slice. Never commit to `main`.
2. **Session summaries** — every session that produces commits writes a summary in `_docs/agent-reports/<date>/`. Append-only, cites commit hashes, includes verification evidence.
3. **Handoffs** — inter-agent messages live in `_docs/agent-handoffs/` with a defined YAML frontmatter and `open → acknowledged → completed` lifecycle.
4. **Boundary respect** — read latest summary before starting; don't redo documented work; don't touch other agents' branches.
5. **Context-budget self-management** — agents monitor their own usage and hand off proactively before running out (see ADR 0003).
6. **ADRs** — architecture-level decisions captured here in `_docs/adr/` (this folder).

## Consequences

**Positive:**
- Every session is auditable. The git history + summary + handoffs together tell the full story.
- Boundaries between agents are explicit. No silent rewrites.
- Handoffs prevent dropped work when an agent hits a usage cap mid-task.
- The same protocol works for any agent (Claude, Codex, future agents). Per-agent context window differs, but the convention is shared.
- Bithun can review state of the project in 5 minutes by reading `active/` + the newest report.

**Negative trade-offs accepted:**
- Per-session overhead: each session adds ~5 minutes to write summary + (optionally) a handoff.
- Some discipline required: agents must remember to read the protocol at session start and follow it at session end. CLAUDE.md, AGENTS.md, and local memory point at the protocol to reduce drift.

## Alternatives considered

- **Chat-only coordination** — Bithun manually relays context between agents in chat. Rejected: ephemeral; doesn't survive a new conversation window; doesn't survive Bithun being offline.
- **Commit messages only** — let git log carry the full story. Rejected: commit messages are too short for handoff intent; can't capture pending work; can't be addressed to a specific recipient.
- **Single tracking issue in GitHub Issues** — use one long-running issue per workstream. Rejected: external dependency; not all agents have GitHub access; less discoverable from inside the repo.
- **No formal protocol; agents self-organize** — the status quo before this ADR. Rejected — that's exactly what produced the conflicts this ADR addresses.

## Notes

The protocol was drafted by opus-s01 in collaboration with Bithun across an interactive chat session, and refined the same day to add the ADR convention (this folder), the date-folder structure for reports (ADR 0002), and context-budget self-management (ADR 0003).
