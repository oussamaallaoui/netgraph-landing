# 0001. Contacts stay on the user's device (local-first) in Sprint 1

- **Status:** Accepted (plan approved by the founder on 2026-10-27; this ADR is to be reviewed by the founder in its PR)
- **Date:** 2026-10-27
- **Deciders:** tech lead, founder
- **Stories:** #5, #6, #7, #8, #9 (stretch)
- **Supersedes:** the wiki line "user accounts before any contact import" ([architecture](../wiki/engineering/architecture.md), as of 2026-10-25)

## Context

Sprint 1 ships, **publicly on production** (https://netgraph-landing.vercel.app), the first real NetGraph flow: import a LinkedIn `Connections.csv`, write a request, see who can help and why, see who can introduce you at a company, and send a drafted message yourself.

The imported contacts are personal data of people who never signed up (law 09-08 / CNDP, GDPR for EU contacts). The team rules require minimum data, encryption at rest, deletion, and no contact data in logs. Today we have no accounts, no database and no working server storage (the signup storage issue, #11, is blocked on Upstash; its security fix, #10, must ship first). Building accounts + an encrypted server store + a deletion path before the first useful flow would take more than the sprint.

The founder approved a local-first plan: everything about contacts happens in the browser.

## Decision

1. **No contact data leaves the device in Sprint 1.**
   - Parsing, normalising, matching, finding introducers and drafting run as pure JavaScript in the browser (`lib/**`, imported by client components).
   - **No server route receives contact data or requests.** No new file under `app/api/**` is part of Sprint 1. Any new route in a later PR needs tech lead review and an update to this ADR.
   - The user's **request text** (« demande ») is treated like contact data: it never leaves the device either.
   - **No analytics, error reporting, session replay or third-party scripts** on the try-it page (no Vercel Web Analytics, no Speed Insights, no Sentry, no tag manager). No `console.*` call that prints a contact, a request or a draft, in any environment.
   - **Defence in depth:** the `/essayer` route is served with `Content-Security-Policy: connect-src 'self'` and `Referrer-Policy: no-referrer`, so an accidental `fetch`/`sendBeacon` to another origin is blocked by the browser. Requests to our own origin (Next.js chunks, RSC prefetches) carry no contact data; QA checks this on every story.
2. **Persistence: IndexedDB, one record, replace on import.**
   - Database `netgraph`, object store `kv`, key `contacts`. Value: `{ schemaVersion: 1, isSample, importedAt, contacts: Contact[] }` (the `Contact` shape is in the Sprint 1 contracts on #5). A new import **replaces** the previous one (merging only arrives with the vCard stretch story, #9).
   - Only the fields matching and drafting need: first name, last name, company, position, connected on, LinkedIn profile URL, email if present (and, for #9, phone number). Other CSV columns are dropped at parse time.
   - **Requests, results and drafts are not persisted.** They live in React state and disappear on reload (no "historique des demandes" this sprint). The only other thing allowed in browser storage is UI preferences (for example the chosen tone « Vous » / « Tu »), in `localStorage` under keys prefixed `netgraph:`, never containing contact data.
   - **Why IndexedDB and not `localStorage`:** `localStorage` is limited to about 5 MB per origin (browser-dependent), is synchronous (blocks the page on large writes) and stores strings only. A contact is about 200–300 bytes as JSON: 5,000 contacts ≈ 1–1.5 MB, and LinkedIn allows up to 30,000 connections (≈ 6–9 MB), which would not fit. IndexedDB is asynchronous, stores structured objects and has a much larger quota (a share of free disk space). We use a ~50-line wrapper in `lib/store.js`; no `idb` dependency.
   - **If IndexedDB is unavailable** (blocked storage, some private modes), the contacts are kept in memory only and the UI says they will not be kept after the tab is closed. Nothing is written to `localStorage` as a fallback.
   - **No client-side encryption in Sprint 1.** The key would have to live on the same device as the data, so it would not protect against someone with access to the browser profile, and a passphrase would add friction the stories don't call for. The protection layer is the device itself (OS account, disk encryption). The team rule "encrypt at rest" applies to our servers and still applies to anything stored server-side later.
3. **Deletion path: « Effacer mes données de cet appareil ».**
   - Always reachable on `/essayer` once something is imported (and also with the sample data).
   - Calls `clearAllData()` in `lib/store.js`, which deletes the whole `netgraph` IndexedDB database (`indexedDB.deleteDatabase`), removes every `localStorage` key starting with `netgraph:`, and the UI resets its in-memory state (contacts, request, results, drafts).
   - After it, a reload shows the empty import screen. QA verifies in DevTools → Application that no `netgraph` database or `netgraph:` key remains.
   - Clearing the browser's site data also deletes everything; the page says so in one line.
4. **Hand-offs to the user's own apps are allowed.** `mailto:` links (email draft in the user's mail app) and, for #9, `https://wa.me/<number>?text=…` links carry the draft text and the recipient's address/number. They are navigations the user triggers with a click, to apps the user then sends from; NetGraph never sends anything. The rule "no personal data in URLs" targets **our** URLs (routes, query strings on our origin) and analytics. Note that a `wa.me` link passes through WhatsApp's (Meta's) servers, as any WhatsApp message would. Links that open in a new tab use `rel="noopener noreferrer"`. `href` values built from contact data are validated: profile URLs must start with `https://www.linkedin.com/` or `https://linkedin.com/`, otherwise they are dropped.

## Consequences

**Good**
- Ships the core promise without accounts, a database or the blocked storage work (#10, #11, #13 stay in the backlog).
- Much smaller legal exposure for non-users' data: we never receive, store or log it. *Assumption, not legal advice:* processing only on the user's own device may keep NetGraph out of most 09-08 / GDPR obligations for those contacts; the founder gets a legal review before any broad promotion.
- The promise « Vos contacts restent sur cet appareil : ils ne sont jamais envoyés à NetGraph » is literally true and checkable by anyone with DevTools.
- The logic is pure functions, easy to unit-test, and reusable later on the server if we move matching there.

**Bad / accepted**
- **No cross-device sync.** Contacts imported on a laptop are not on the phone; the user imports again.
- **No second-degree paths across users.** That needs accounts, server storage and opt-in (#13 and later). Sprint 1 introducers are only the user's own contacts at the target company.
- **Data can be evicted by the browser.** Safari deletes script-written storage for a site after 7 days without interaction, and any browser can evict under disk pressure or when the user clears site data. The user re-imports. We do not call `navigator.storage.persist()` this sprint (it prompts in some browsers and adds no value for a demo-sized flow).
- **Everything ships in the client bundle**, including the matching vocabulary and the sample contacts. Fine: they are not secret.
- **Performance depends on the user's device.** Target: results in under 2 s for 5,000 contacts on a recent laptop (#6); matching uses a precomputed index.
- **No server-side signal of usage.** We cannot count imports or requests without adding analytics, which this ADR forbids for now. Usage feedback comes from demos and testers.
- **Moving to server storage later is a new decision**, with accounts, consent, encryption at rest, a privacy notice (#12) and a server-side deletion path. It will supersede this ADR.

## Alternatives considered

1. **Accounts + server storage first** (the previous wiki plan: #13, then Upstash/Postgres, then import). Rejected for Sprint 1: needs accounts, an encrypted store, a deletion path, the signup security fix and a privacy notice before any user value, i.e. several sprints, and it puts non-users' data on our servers from day one.
2. **Parse in the browser, match on a server route** (stateless, nothing stored). Rejected: the contacts and request would still transit through and could be logged by our server and Vercel; the "never sent to NetGraph" promise would be false.
3. **`localStorage` instead of IndexedDB.** Rejected: ~5 MB cap too small for large networks, synchronous writes. Acceptable only for the small UI preferences above.
4. **No persistence at all (memory only, forget on tab close).** Simplest and most private, but the story requires finding contacts after a reload. Kept as the automatic fallback when IndexedDB is unavailable. If the founder prefers it (open question 3 in the sprint plan), it is a one-line change in `lib/store.js`.
5. **Encrypt the IndexedDB record with WebCrypto.** Rejected for now: without a user secret, the key sits next to the data; with a passphrase, it adds friction and a "lost passphrase = lost data" path. Revisit if we add a lock screen or accounts.
6. **Send contact fields to an AI service for matching/drafts.** Out of scope for Sprint 1; a Sprint 2 candidate with opt-in, minimum fields and a privacy notice (see the sprint plan). It would amend this ADR.
