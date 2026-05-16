---
id: 0003
title: Agents self-manage their context budget with color-coded thresholds
status: accepted
date: 2026-05-16
deciders: bithun (proposed), opus-s01 (formalized into protocol §5)
---

## Context

Every agent has a finite context window (Claude/Opus ~1M tokens; Codex CLI ~250k; future models vary). When that window fills up:

- The agent produces sloppier output (worse decisions, repetition, dropped detail)
- If the window is exhausted mid-slice, the handoff to the next session is rushed or absent
- Bithun has no advance warning to spawn a fresh agent — by the time the cap hits, work is already in a bad state

In Bithun's words on 2026-05-16: "if he is already 70% full, he will understand his situation and automatically list his pending tasks and create the dispatch prompt in the active folder. He can stay idle so that I understand, okay, now he already has those pending tasks."

This is asking for **agent self-monitoring**: each agent estimates its own context burn and acts proactively before exhausting the window.

## Decision

Adopt four color-coded buckets keyed to percentage of the agent's own context window:

| Bucket | % used | Behaviour |
|---|---|---|
| 🟢 Green | 0 – 50% | Normal work. Take on new slices. |
| 🟡 Yellow | 50 – 70% | Finish current slice cleanly. No new unrelated work. Start mentally drafting what would go into a handoff. |
| 🟠 Orange | 70 – 90% | Commit current state. **Write a handoff to `_docs/agent-handoffs/active/`.** Warn the human in chat. Go idle. |
| 🔴 Red | 90 – 100% | Stop immediately. Write a minimal handoff with whatever state exists. Idle. |

**Reporting in chat:** every chat reply ends with a one-line footer like:
```
> Context: 🟢 ~35% used · 650k remaining (Opus 4.7, 1M window)
```

If the agent crosses Orange or Red mid-response, surface it at the top of the response too — not just the footer.

**Proactive handoff at Orange:** the moment the agent crosses 70%, it stops accepting new work, finishes the current sub-task to a clean stopping point, commits, writes a handoff in `active/`, tells the human, and goes idle. It does NOT keep going to squeeze out 5% more work.

Percentages are **agent-specific** (use percentage of YOUR window, not absolute tokens), so the same convention works for Claude (1M window), Codex (250k window), and any future agent.

## Consequences

**Positive:**
- Handoffs are clean and written while the agent still has enough context to draft them properly — not panicked at the very end.
- Bithun can see the footer and decide whether to keep going or spawn a fresh agent. No surprise cliffs.
- The convention is agent-agnostic. Codex follows the same buckets at its own window size.
- The handoff system (ADR 0001 + 0002) is the natural landing spot for the proactive handoff — no new infrastructure needed.

**Negative trade-offs accepted:**
- Agents can only **estimate** their own context usage, not read exact telemetry. Estimates are based on conversation length + tool output volume + intuition. Off by 10-20% is common.
- The "stop at Orange" rule sometimes leaves the agent stopping with budget still available. Accepted: better to leave a small amount on the table than to crash through into Red.

## Alternatives considered

- **Human-only tracking via Claude Code UI** — Bithun watches the token counter and tells the agent to stop. Rejected: doesn't help when Bithun is offline; doesn't help for Codex sessions in a different terminal; doesn't trigger the proactive handoff.
- **Hard cutoffs (model-side enforcement)** — the model refuses to continue past 70%. Rejected: too rigid; doesn't account for "I'm 71% but mid-sentence finishing a one-liner."
- **No protocol; rely on agent good behaviour** — the status quo. Rejected — agents tend to keep going until they crash, because there's no convention telling them when to stop.

## Notes

The protocol is documented in [`../AGENT-PROTOCOL.md`](../AGENT-PROTOCOL.md) §5. Implementation requires agents to remember the convention every session — hence the memory entry at `~/.claude/projects/<repo>/memory/` and the `READ FIRST` block in CLAUDE.md.

Codex needs an equivalent setup on their side: a pointer in AGENTS.md (or their equivalent) telling Codex sessions to read `_docs/AGENT-PROTOCOL.md` and follow §5 at the 250k threshold scale.
