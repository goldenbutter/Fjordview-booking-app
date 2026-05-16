---
id: 0005
title: Dispatch prompts and long-form instructions live on disk, not in chat
status: accepted
date: 2026-05-16
deciders: bithun (raised the problem from past experience), opus-s01 (formalized)
---

## Context

Throughout S01, Opus repeatedly drafted long "kickoff prompts" or "dispatch prompts" in the chat reply, intending for Bithun to copy-paste them into the next agent session. Examples: the multi-paragraph S02 spawn instructions, the Codex bootstrap one-liner that grew into three paragraphs, the various "paste this when you start Codex" blocks.

Bithun called this out on 2026-05-16 with a specific concern: in a previous project, copy-pasting large text blocks between Claude Code and Codex CLI (often across windows or machines) produced corruption — truncated content, line-wrap mangling, dropped lines. The result was agents starting from broken instructions.

The protocol already has a perfectly good place for instructions to future agents: `agent-handoffs/active/`. Files on disk don't get corrupted on transfer; the user copies one short pointer instead of an entire prompt body.

## Decision

**Any agent-to-human or agent-to-agent message longer than two lines must be saved to disk, not pasted in chat.**

The chat reply gives a one-line pointer at most: *"Saved to `<path>`."*

Categories of content that go on disk:

- **Kickoff / dispatch prompts** for a future session → `_docs/agent-handoffs/active/<from>-to-<to>-<topic>.md`
- **Long status summaries / session reports** → `_docs/agent-reports/<date>/<filename>.md`
- **Decision rationale spanning multiple paragraphs** → `_docs/adr/NNNN-<title>.md`
- **Investigation findings, comparison tables, evaluation notes** → a markdown note in the appropriate folder (`agent-reports/` if session-scoped, `adr/` if decision-grade)

The chat reply MAY contain a one-paragraph executive summary of what was saved, plus the on-disk pointer. The chat reply MUST NOT be the authoritative version.

When the human spawns a new agent session, the kickoff prompt is one line:

```
Read `_docs/agent-handoffs/active/<latest-handoff-for-you>.md` and follow it.
```

## Consequences

**Positive:**
- Zero copy-paste corruption risk for substantive content.
- A spawn prompt becomes a tiny, reliable string — easy to retype if needed.
- Handoffs are versioned in git, searchable, diff-able.
- Future agents (Claude, Codex, future) can reconstruct any past session from disk without depending on chat history.
- Forces discipline: if it's worth saying, it's worth saving.

**Negative trade-offs accepted:**
- Slight chat-side awkwardness: the human can't read the dispatch instructions in the chat conversation directly; they must open the file. Mitigated by the agent including a one-paragraph summary in chat alongside the pointer.
- Two-line threshold is a heuristic, not a precise rule. Sometimes a four-line list is genuinely chat-appropriate (e.g., "here are the 4 things I just did"). Agents use judgment; when in doubt, save on disk.

## Alternatives considered

- **Inline all instructions in chat** — the status quo until this ADR. Rejected: copy-paste corruption is a real, recurring problem per Bithun's experience.
- **Single shared "next steps" file at a fixed path** — everyone reads `_docs/NEXT.md`. Rejected: doesn't capture sender → recipient routing; doesn't support multiple parallel pending handoffs.
- **Use a kanban-style external tool (Linear, Notion)** — Rejected: external dependency; not all agents have access; pulls coordination state out of the repo.

## Notes

This ADR was prompted by a specific instance during S01 where Opus had just drafted ~10 lines of S02 spawn instructions in chat, and Bithun immediately flagged the copy-paste risk. The ADR captures the rule so it doesn't happen again — to Opus or to any other agent.

When this ADR was written, the corresponding fix happened in the same commit: the existing handoff was renamed from `opus-s01-to-next-agent-deferred-items.md` to `opus-s01-to-opus-s02-deferred-items.md` and a full bootstrap checklist (verify branch, read protocol/ADRs, update status to acknowledged, etc.) was folded into the handoff body. Now the entire S02 onboarding lives in one disk file; the human's spawn prompt for S02 is a single sentence.
