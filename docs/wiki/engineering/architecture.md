# Architecture

## Today (as of 2026-10-25)

A single Next.js app: the marketing landing page and a signup endpoint.

```
Browser ──> Vercel (Next.js 14, App Router)
              ├─ app/page.js          landing page (client component)
              ├─ app/layout.js        metadata, global CSS
              └─ app/api/subscribe    POST: beta signup · GET: subscriber list (to remove)
                    └─ subscribers.json   local file — doesn't work on Vercel
```

- **Stack:** Next.js 14.2, React 18, Tailwind CSS 3, Inter from Google Fonts.
- **Styling:** Tailwind tokens in `tailwind.config.js` (`ink`, `slate`, `mist`, `violet`, `signal`), matching the [design system](../design/design-system.md).
- **Components:** everything is in `app/page.js` for now; `components/` is empty.
- **Hosting:** Vercel, see [Deployment](deployment.md).

## Where it's going

Decisions will be recorded as ADRs in [`docs/adr/`](../../adr/). The likely shape:

- **Storage:** Upstash Redis first, for beta signups. A relational database (Postgres) once there are users, contacts and requests.
- **Auth:** user accounts before any contact import.
- **Contacts:** owned by the user who imported them, minimal fields, encrypted at rest, deletable. See [Data and privacy](../compliance/data-privacy.md).
- **Matching:** pure, testable functions for parsing imports, scoring link strength and finding paths.
- **Agent:** produces suggestions and drafts only; nothing is sent automatically.

## Repository layout

```
app/                 pages and API routes (Next.js App Router)
components/          shared React components (empty for now)
public/              static files
docs/wiki/           this wiki
docs/adr/            architecture decision records
docs/sprints/        sprint notes
docs/TEAM.md         team and sprint workflow
.claude/agents/      the sprint team's subagent definitions
```
