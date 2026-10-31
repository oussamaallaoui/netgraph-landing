# Data and privacy

> This page records the team's rules. It isn't legal advice; have a lawyer check it before launch.

NetGraph handles personal data of two kinds of people: **users** (who signed up and consented) and **their contacts** (who never signed up). The second group needs the most care.

## Laws that apply

- **Morocco: law 09-08** on the protection of personal data, supervised by the **CNDP** (Commission nationale de contrôle de la protection des données à caractère personnel). Processing personal data generally requires a declaration or authorisation from the CNDP before launch.
- **EU: GDPR**, for users or contacts in the European Union.

## Sprint 1: contacts never leave the device (as of 2026-10-27)

Decision record: [ADR 0001](../../adr/0001-local-first-contacts.md). On the public page `/essayer`:

- The LinkedIn export (and, for the stretch story #9, the phone `.vcf`) is read, matched and stored **only in the user's browser** (IndexedDB). The user's request (« demande ») and drafts never leave the device either. **NetGraph's servers receive none of it**, and no server route handles contacts.
- **Minimum fields** kept from the file: first name, last name, company, position, connected on, LinkedIn profile URL, email if present (phone number for #9). Every other column is dropped at import.
- **Still no logging, analytics or error reporting** that could carry contact data: no Vercel Web Analytics, Speed Insights, Sentry or third-party scripts on `/essayer`, and no `console.*` with contacts, requests or drafts. The page is served with `Content-Security-Policy: connect-src 'self'` as a guard rail, set on every route (so client-side navigation from `/` keeps it).
- **Deletion:** « Effacer mes données de cet appareil » deletes everything NetGraph stored in this browser (IndexedDB database `netgraph` and `localStorage` keys `netgraph:*`). Clearing the browser's site data does the same.
- **Encryption at rest** (rule 5) is not applied in the browser this sprint: the key would sit next to the data. The device's own protection (OS account, disk encryption) applies. Rule 5 remains mandatory for anything stored on our servers.
- **Hand-offs:** `mailto:` and `wa.me` links put the draft and the recipient's address or number in a link the user clicks to open their own app. The "no personal data in URLs" rule (rule 6) targets our own URLs, query strings and analytics, not these user-triggered hand-offs. A `wa.me` link goes through WhatsApp's servers, as any WhatsApp message would.
- The UI states it plainly: « Vos contacts restent sur cet appareil : ils ne sont jamais envoyés à NetGraph » and « NetGraph n'envoie rien à votre place ».
- **QA checks on every story** that no network request carries a contact, a request or a draft.
- *Assumption, not legal advice:* processing only on the user's device may keep NetGraph out of most obligations for these contacts. The founder has a lawyer review this reading (and the privacy text) **before any broad promotion** of the product.

Rules 2–4 below (ownership, second-degree consent, server-side deletion) apply as soon as anything about contacts is stored server-side (accounts, #13, and later).

## Team rules

1. **Minimum data.** Store only what a feature needs. For contacts: name, organisation, and normalised identifiers (hashed where possible) for matching and deduplication.
2. **Ownership.** Imported contacts belong to the user who imported them. Another user never sees them, except as a path through a contact who opted in to be found.
3. **Consent for second-degree paths.** Someone appears as a second-degree contact only if the user in the middle has opted in to let their network be used for introductions.
4. **Deletion.** A user can delete their account and all their imported contacts. Plan for contacts to be able to ask for removal too.
5. **Security.** Encrypt contact data at rest; HTTPS everywhere; access controlled per user.
6. **No personal data in logs, URLs, analytics or error messages.**
7. **No secrets or real data in the repo**, which is public. Use obviously fake fixtures (`test+qa1@netgraph.test`).

## Platform rules

- **No scraping** of LinkedIn, Instagram or other platforms; it breaks their terms of use. Only use files the user exports themselves or official APIs within their terms.
- **No automated messages.** Sending DMs automatically on LinkedIn, Instagram or WhatsApp breaks their terms and can get the user's account banned. The agent drafts; the user sends with one tap (for example a pre-filled WhatsApp link).

## Beta signups

The landing page collects email, name, company and role, with a promise of "Données 100% privées". Until the issues in [Known issues](../engineering/known-issues.md) are fixed, that promise isn't fully kept: the subscriber list would be exposed by `GET /api/subscribe` and emails would be logged as soon as storage works (today nothing can be saved on Vercel, so the list is empty). Fixes: #10 (security, must ship first), then #11 (storage). A privacy notice for the signup form is #12.
