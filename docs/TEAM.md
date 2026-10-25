# NetGraph — team and sprint workflow

NetGraph is built by a team of five Claude Code subagents, defined in `.claude/agents/`. The human founder decides scope and priorities, approves every merge, and does anything that needs an account (Vercel, Upstash, app stores, publishing).

## The product in one paragraph

Professionals import their existing contacts (phone, LinkedIn, Instagram, Excel). They state a need, such as "find my next consulting mission", and NetGraph finds who can help among their contacts and their contacts' contacts, and who can introduce them. An agent suggests who to get back in touch with, and when, based on how often they talk, and drafts the message. **The user always sends it themselves.**

## Non-negotiables (every role)

- **No automated messaging** on LinkedIn, Instagram or WhatsApp. The agent drafts; the user sends.
- **No scraping** of LinkedIn or Instagram. Second-degree contacts come only from users who opted in and imported their own contacts.
- **Personal data** of non-users (imported contacts) is covered by Moroccan law 09-08 (CNDP) and the GDPR for EU contacts. Collect the minimum, encrypt at rest, support deletion, never log contact data.
- **No secrets in the repo.** Environment variables are set in Vercel.
- French UI copy with formal *vous*, following the design system: https://claude.ai/artifact/45uF2g3EoYxJvm2TaM48VB

## Roles

| Agent | Owns | Never does |
| --- | --- | --- |
| `product-owner` | Backlog, user stories, acceptance criteria, sprint goal, demo notes | Write code, pick technical solutions |
| `tech-lead` | Architecture, task breakdown, conventions, code review, merge readiness | Change scope without the PO |
| `dev-frontend` | UI: pages, components, Tailwind, accessibility, client state | Change API contracts alone |
| `dev-backend` | API routes, data model, storage, imports, matching, agent logic | Change UI without the frontend dev |
| `qa-engineer` | Test plans, automated tests, exploratory testing, bug reports, sign-off | Fix product code (reports it instead) |

## Where things live

- **Backlog:** GitHub Issues on `oussamaallaoui/netgraph-landing`. Labels: `story`, `task`, `bug`, `frontend`, `backend`, `qa`, `blocked`. One milestone per sprint (`Sprint 1`, `Sprint 2`, …).
- **Sprint notes:** `docs/sprints/sprint-N.md` (goal, committed stories, demo, retro).
- **Architecture decisions:** `docs/adr/NNNN-title.md`.
- **Code:** one branch per story, `feat/<issue>-<slug>` or `fix/<issue>-<slug>`, one PR per story, linked with `Closes #N`.

## Sprint loop (one week)

1. **Planning.** The PO proposes a sprint goal and 3–6 stories with acceptance criteria. The tech lead breaks each story into tasks and flags risks. The founder approves the scope.
2. **Build.** The two devs work in parallel on separate branches (git worktrees). Each PR includes tests and a short "how to check" section.
3. **Review.** The tech lead reviews every PR against the conventions and the story.
4. **QA.** The QA engineer tests each PR against the acceptance criteria on its Vercel preview URL, and signs off or files bugs.
5. **Merge.** Only the founder merges (production deploys on every push to `master`).
6. **Demo and retro.** The PO writes what shipped, what didn't and why in the sprint notes.

## Definition of done

- Acceptance criteria met and checked by QA on the preview deployment
- Tests added and passing (`npm test`, `npm run build`)
- Reviewed by the tech lead
- No console errors; keyboard and screen-reader basics work; text contrast ≥ 4.5:1 for anything new
- Copy in French, following the design system
- Docs or ADR updated when the architecture changed
