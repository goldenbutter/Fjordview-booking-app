# Fjordview Booking App

Prototype booking system for the fictional Fjordview Lodge demo property.

The source requirements live in `_docs/_prompt/guesthub-booking-system-dev-prompt.md`.
The implementation is intended to stay reusable for future accommodation clients:
property-specific names, colors, contacts, rooms, prices, and policies should come
from seed/config data rather than hardcoded application logic.

## Agent Workflow

- `main` holds stable baseline commits.
- `codex/main-build` is the active implementation branch.
- Each development phase should be committed separately.
- Codex acts as implementation agent.
- OPUS can be used for review and product/architecture critique.
- Session summaries and handoff prompts live under `_docs/agent-reports/`.

## Local Demo First

The first build target is a local demo that runs without production credentials.
Supabase, Stripe, and Resend credentials can be added later through environment
variables documented in `.env.example`.
