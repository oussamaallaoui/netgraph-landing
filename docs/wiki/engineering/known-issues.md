# Known issues

As of 2026-11-01. Each item should have a GitHub issue; items without one are flagged for the PO to triage.

## Blocking

### The beta signup form fails in production — #11

`app/api/subscribe/route.js` saves signups to `subscribers.json`. Vercel's filesystem is read-only, so on https://netgraph-landing.vercel.app every submission returns an error ("Une erreur s'est produite. Réessayez."). Nothing is saved.

**Fix:** store signups in Upstash Redis (#11, labelled `blocked`). The founder creates the database in Vercel (Storage → Upstash for Redis) and connects it to the project; then the route is changed to use it. **Only together with or after #10.**

Sprint 1 doesn't touch signup storage or `/api/subscribe`.

## Security and privacy

### The subscriber list is public — #10

`GET /api/subscribe` returns every subscriber's email, name, company and role to anyone. On Vercel the list is empty today only because nothing can be saved (`subscribers.json` is git-ignored and absent from the deployment). It would leak as soon as storage works. QA checks at the end of Sprint 1 that it still returns an empty list on production.

**Fix:** remove the `GET` handler, or protect it with a secret and move it to an admin-only route. **Do this before or together with the storage fix (#11).**

### Emails are written to the logs — #10

The route logs every new subscriber's email (`console.log`). On Vercel this line is never reached today (the save fails first), but on a developer's machine the file is writable, so local runs do log emails: use only fake test emails (`test+qa1@netgraph.test`).

**Fix:** log only a count or nothing (#10).

## Limitations by design (Sprint 1, local-first)

See [ADR 0001](../../adr/0001-local-first-contacts.md). These are accepted, not bugs:

- Imported contacts live only in one browser on one device: no sync, no second-degree paths across users.
- The browser may delete them (Safari after 7 days without visiting the site, low disk space, clearing site data). The user imports again.
- If IndexedDB is unavailable (some private modes), contacts are kept only until the tab is closed.
- The Vercel toolbar on preview deployments can't connect on `/essayer` because of its `connect-src 'self'` policy.

## Introducers (#7, Sprint 2)

Accepted limits of « Qui peut vous présenter chez … » (`lib/introducers.js`). Detection uses rules and the user's own file only: no fuzzy matching and no partial names this sprint.

- **Partial company names show nothing.** « chez ATLAS » when the file has « Atlas Conseil », or « chez Oasis » for « Oasis Capital Démo »: there is no section and no « absent » notice (PO decision, 2026-11-01). The notice would contradict the #6 list, which matches the word « atlas ». Before that decision, these requests showed the notice. Opening the section on a partial name needs a separate backlog story (pending).
- **A one-word generic company can't be named.** A company called only « Conseil » (one vocabulary word) is never detected in a request, even after « chez », because `buildIndex` doesn't make it mentionable. The user sees nothing, not a false notice. Multi-word generic names (« Finance Conseil ») work after a cue.
- **A capitalised place after a role word reads as a company.** « DAF de Casablanca » shows « Aucune personne de votre réseau ne travaille chez Casablanca… ». Lowercase words (« DAF de la région », « responsable d'agence ») and « quelqu'un à Rabat » show nothing.
- **#22 still affects the #6 list on the same screen.** A legal suffix typed in the request (« chez Oasis Capital Démo SARL ») gives the right introducer section, but the #6 results below rank and explain people by « SARL » (« son nom contient « SARL » »). Fix proposed in #22, not approved yet.
- **Focus-mode announcement gap.** Focus moves to the first heading only after an example button, and no example request opens an introducer section or notice. So that path is never exercised with the #7 area: keyboard and screen-reader users who type their own request rely on the single `role="status"` message.

## Minor

- Some text is below 4.5:1 contrast: `gray-400` fine print and captions, and `signal` green text in the beta pill. See the design system's colour notes. (Backlog item "Corriger les contrastes insuffisants et l'année du pied de page", no issue yet.)
- The footer still says "© 2025". (Same backlog item.)
- The landing page demo and testimonials use **real company names** (McKinsey, CIH Bank, Deloitte, BMCE Capital, Attijariwafa, OCP Group) with invented quotes attributed to people at those firms. Flagged on 2026-10-27; no issue yet, for the PO to triage. Sprint 1 fixtures use only invented companies.
