# Fjordview Booking App

Prototype booking system for the fictional **Fjordview Lodge** demo property.

The source requirements live in `_docs/_prompt/guesthub-booking-system-dev-prompt.md`.
The implementation is reusable for future accommodation clients: property names,
colors, contacts, rooms, prices, policies, and branding belong in seed/config
data rather than hardcoded application logic.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Local demo data first
- Integration-ready boundaries for Supabase, Stripe, Resend, Vercel Cron, and Drizzle
- npm for package management

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` when adding real provider credentials. The
local prototype runs without production credentials.

## Agent Workflow

- `main` holds stable baseline commits.
- `codex/main-build` is the active implementation branch.
- Each development phase should be committed separately.
- Codex acts as implementation agent.
- OPUS can be used for review and product/architecture critique.
- Session summaries and handoff prompts live under `_docs/agent-reports/`.
