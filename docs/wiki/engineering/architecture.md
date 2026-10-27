# Architecture

## Today (as of 2026-10-27, start of Sprint 1)

A single Next.js app: the marketing landing page and a signup endpoint. Sprint 1 adds the public try-it page `/essayer`, which runs entirely in the browser.

```
Browser ──> Vercel (Next.js 14, App Router)
              ├─ app/page.js          landing page (client component)
              ├─ app/layout.js        metadata, global CSS
              ├─ app/essayer/         Sprint 1: import → request → results → draft (client-side only)
              └─ app/api/subscribe    POST: beta signup · GET: subscriber list (to remove, #10)
                    └─ subscribers.json   local file — doesn't work on Vercel (#11)

Inside the browser, on /essayer (Sprint 1):
  Connections.csv ──> lib/linkedin.js ──> Contact[] ──> lib/store.js (IndexedDB, this device only)
  demande ──> lib/match.js + lib/introducers.js ──> results + « pourquoi » ──> lib/drafts.js ──> copy / mailto / LinkedIn profile
  Nothing about contacts or requests is sent to any server.
```

- **Stack:** Next.js 14.2, React 18, Tailwind CSS 3, Inter from Google Fonts.
- **Styling:** Tailwind tokens in `tailwind.config.js` (`ink`, `slate`, `mist`, `violet`, `signal`), matching the [design system](../design/design-system.md).
- **Hosting:** Vercel, see [Deployment](deployment.md). Every merge to `master` is public immediately, so each story must be presentable on its own when merged.

## Local-first contacts (Sprint 1)

Decision record: [ADR 0001](../../adr/0001-local-first-contacts.md). In short:

- Contacts are parsed, matched and stored **only in the browser**. No server route receives contacts or requests; no analytics or error reporting on `/essayer`; no `console.*` with contact data.
- **Storage:** IndexedDB (`netgraph` database, `kv` store, key `contacts`), one record replaced on each import. Requests, results and drafts are not persisted. UI preferences only may go in `localStorage` under `netgraph:*`.
- **Deletion:** « Effacer mes données de cet appareil » deletes the IndexedDB database and the `netgraph:*` keys.
- **Guard rail:** `/essayer` is served with `Content-Security-Policy: connect-src 'self'` and `Referrer-Policy: no-referrer` (set in `next.config.js` `headers()`). Side effect: the Vercel toolbar on preview deployments can't connect on that page; that's expected.
- **Hand-offs** (`mailto:`, LinkedIn profile, `wa.me` for #9) are user-triggered navigations to the user's own apps; nothing is sent by NetGraph.

## The `/essayer` route

- **URL:** `/essayer` (« Essayer NetGraph »), public, linked from the landing page as a secondary « Essayer maintenant » link next to the beta signup (the signup section stays). French slug, consistent with the UI language. Not an ADR: a route can be renamed with a redirect.
- `app/essayer/page.js` is a **server component** that only exports `metadata` and renders one client component, `components/essayer/TryApp.js` (`'use client'`). That keeps the page's HTML static and all contact handling in the client.
- One page with steps (import → request → results/introducers → draft), no sub-routes, so no contact state is ever put in a URL.

## Code layout (Sprint 1)

```
app/essayer/page.js          server component: metadata + <TryApp/>
components/essayer/          client UI, one small component per file
  TryApp.js                  step state, loads/saves via lib/store
  ImportStep.js              drop zone, file picker, LinkedIn instructions, sample button
  ContactPreview.js          count + first rows (name, position, company)
  ClearDataButton.js         « Effacer mes données de cet appareil »
  RequestForm.js             demande input + example requests
  ResultsList.js / ResultCard.js
  IntroducersSection.js
  DraftEditor.js             tone, textarea, Copier / LinkedIn / email (/ WhatsApp)
  importErrors.js            error code → French message
lib/                         pure functions, no React, no DOM (except store.js)
  types.js                   JSDoc typedefs: Contact, MatchResult, …
  csv.js                     small RFC 4180 parser
  linkedin.js                parseLinkedInCsv
  text.js                    normalize, tokenize, stopwords
  company.js                 companyKey (legal suffixes, case, accents)
  vocabulary.js              concepts and synonyms (FR/EN), example requests
  match.js                   buildIndex, match
  introducers.js             introducers
  explain.js                 « pourquoi » sentences from structured reasons
  drafts.js                  draftMessage, mailtoUrl, linkedInUrl (+ whatsappUrl for #9)
  store.js                   IndexedDB wrapper: loadContacts, saveContacts, clearAllData
  vcard.js, phone.js, merge.js   #9 stretch only
  fixtures/                  sample-contacts.js, Connections.sample.csv, reference-requests.js, synthetic.js
```

`lib/` is owned by dev-backend (it is the "imports, matching, agent logic" of `docs/TEAM.md`, running client-side); `components/` and `app/essayer/` by dev-frontend. The function signatures and data shapes between them are the **contracts** posted on issues #5–#9; changing one needs both devs and the tech lead.

## Tests

- **Runner:** [Vitest](https://vitest.dev/) **3.x** (`vitest@^3.2`), dev dependency, `npm test` = `vitest run`. Vitest 4+ requires Node 22; we are on Node 20 (`.nvmrc`), so stay on 3.x until we move Node.
- **Scope:** unit tests for everything in `lib/`, next to the code (`lib/match.test.js`). `lib/store.js` is tested with `fake-indexeddb` (dev dependency) so the deletion path is checked automatically. No component tests this sprint (no jsdom/Testing Library): UI is checked by QA on the preview.
- **Quality bar for matching:** `lib/match.reference.test.js` runs every request in `lib/fixtures/reference-requests.js` against the sample contacts and fails if an expected person is missing from the top 3. A 5,000-contact synthetic set checks the time budget.
- **Set up on day 1 by dev-backend** in a small `chore/test-setup` PR (Vitest, `npm test`, shared fixtures, `lib/types.js`). It changes nothing visible on production, so the founder can merge it the same day and both devs branch from it.

## Dependencies

Sprint 1 adds **no runtime dependency**. Dev dependencies only: `vitest` (test runner) and `fake-indexeddb` (tests for `lib/store.js`).

- **CSV parsing:** a small in-house parser (`lib/csv.js`, quotes, escaped quotes, commas and newlines inside quotes, CRLF, BOM). LinkedIn's file is a single, simple format; a ~60-line tested function is less to audit than a library. If real exports break it, Papa Parse (MIT, no dependencies) is the fallback, with a tech lead review.
- **IndexedDB:** no `idb` wrapper; the three functions we need fit in `lib/store.js`.
- **Matching:** rules and a vocabulary, no search library, no AI service (see ADR 0001).

## Where it's going

Decisions are recorded as ADRs in [`docs/adr/`](../../adr/). The likely shape after Sprint 1:

- **Storage:** Upstash Redis first, for beta signups (#11, after the security fix #10). A relational database (Postgres) once there are users and server-side data.
- **Auth:** user accounts (#13) before anything about contacts is stored server-side (sync across devices, second-degree paths). This supersedes the earlier "accounts before any contact import" line: local-first import ships first (ADR 0001).
- **Contacts on the server (later):** owned by the user who imported them, minimal fields, encrypted at rest, deletable. A new ADR will supersede 0001. See [Data and privacy](../compliance/data-privacy.md).
- **Matching:** pure, testable functions (Sprint 1); link strength and path-finding when interaction data and opted-in second-degree contacts exist.
- **Agent:** produces suggestions and drafts only; nothing is sent automatically.

## Repository layout

```
app/                 pages and API routes (Next.js App Router)
components/          shared React components (Sprint 1: components/essayer/)
lib/                 pure logic and browser storage wrapper, with *.test.js next to it
public/              static files
docs/wiki/           this wiki
docs/adr/            architecture decision records
docs/sprints/        sprint notes
docs/TEAM.md         team and sprint workflow
.claude/agents/      the sprint team's subagent definitions
```
