# Known issues

As of 2026-11-07. Each item should have a GitHub issue; items without one are flagged for the PO to triage.

## Blocking

### The beta signup form fails in production — #11

`app/api/subscribe/route.js` saves signups to `subscribers.json`. Vercel's filesystem is read-only, so on https://netgraph-landing.vercel.app every submission returns an error ("Une erreur s'est produite. Réessayez."). Nothing is saved.

**Fix:** store signups in Upstash Redis (#11, labelled `blocked`). The founder creates the database in Vercel (Storage → Upstash for Redis) and connects it to the project; then the route is changed to use it. **Only after #10 is merged and checked in production**, and together with the « déjà inscrit » fix below.

#10 (Sprint 3) changed only validation and logging in `/api/subscribe`, not storage: after it, a production signup still ends on the error message, now as a clean `500 Erreur serveur` with the log line `subscribe: save failed EROFS`. That is expected, not a regression.

## Security and privacy

### « Déjà inscrit » tells anyone whether an address signed up (dormant until #11)

`POST /api/subscribe` answers `409 Déjà inscrit` for an address already on the list, and the form shows « Cet email est déjà inscrit ». Anyone can type an address and learn whether that person signed up (email enumeration). Dormant today: nothing can be saved in production. **Fix with or before #11:** answer an existing address exactly like a new signup. Out of scope of #10 (visitor-facing behaviour unchanged); the PO has asked the founder.

### Fixed in #10 (Sprint 3)

- **The subscriber list was public.** `GET /api/subscribe` returned every subscriber's email, name, company and role. The `GET` handler is removed: `GET` and `HEAD` now answer `405`, and there is no list in the app. Once #11 stores signups, the founder reads them in the Upstash console (Vercel → Storage → the database → Data Browser).
- **Emails were written to the logs.** The route no longer logs anything about a subscriber. A storage failure logs one fixed line with the error code only (`subscribe: save failed EROFS`), and a malformed body is rejected (`400`) without its parse error (which quoted part of the body) ever reaching the logs.

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

## Drafts (#8, Sprint 2)

Accepted limits of « Préparer un message » (`lib/drafts.js`, `components/essayer/DraftEditor.js`). NetGraph never sends anything: the user copies the text or opens their own app.

- **`mailto:` links are capped at 2,000 characters.** Above that, `mailtoUrl` returns `null`: « Ouvrir dans votre messagerie » is hidden and the line « Ce message est trop long pour être ouvert dans votre messagerie… » tells the user to use « Copier ». Mail clients have different limits; the cap plus « Copier » covers them.
- **« Objet » stays visible in the « trop long » case.** The field is shown whenever the contact has a valid email, not only when the link fits, so it never disappears (with the focus and the text) while the user types. Tech lead decision on PR #26, deviation from PO §5 confirmed by the PO.
- **The Clipboard API needs https or localhost** and a user gesture. « Copier » calls it straight from the click, falls back to a hidden textarea + `document.execCommand('copy')`, and if both fail shows « La copie n'a pas fonctionné… » and selects the message so the user can copy it by hand.
- **Open editors close on a new search.** The result cards remount and focus goes to the new results. The drafts themselves are kept: reopening shows the edited text; unedited drafts follow the new request.
- **Drafts are lost on reload** (or a new import). They live only in React state (ADR 0001); the editor says so. Only the tone is kept (`localStorage` `netgraph:tone`).

## Phone import and WhatsApp (#9, Sprint 3)

Accepted limits of the `.vcf` import and « Ouvrir dans WhatsApp » (`lib/vcard.js`, `lib/phone.js`, `lib/merge.js`, `whatsappUrl` in `lib/drafts.js`). The PO accepted them for this sprint (« Précisions PO Sprint 3 » §3 and §4 on #9); they are not bugs.

**Merging a phone contact with a LinkedIn relation.** The rule: same name words in any order, ignoring accents, case and hyphens, at least two words, and **exactly one** person on each side. So:

- **Spelling variants, transliterations and nicknames don't merge:** Mohamed / Mohammed, Youssef / Youssouf, « Yous ». A name in Arabic script on one side and Latin script on the other doesn't merge either.
- **Extra words in the phone name don't merge:** « Sara Atlas », « Dr Karim Essai », « Karim Fictiva Banque », « Karim (Fictiva) », emojis. The person appears twice.
- **One-word phone names never merge:** « Maman », « Karim ».
- **Two people with the same name on one side:** none of them is merged for that name.
- **Wrong merge (rare):** two different people with the same full name, one in each file, become one entry (LinkedIn position next to the phone number). The WhatsApp line asks the user to check the recipient before sending.
- **No merge by email or by phone number** (LinkedIn exports rarely contain numbers).

**Phone numbers.**

- **A French number saved locally is read as Moroccan.** `06 12 34 56 78` saved without `+33` becomes `+212 6 12 34 56 78`: Morocco is the default country. Numbers saved with `+33` or `0033` are correct. The WhatsApp line asks the user to check the recipient.
- Numbers that can't be read (too short, `08…`, 9 bare digits, extensions such as `p123` or `;ext=`) are dropped: the contact is imported without a number and without « Ouvrir dans WhatsApp ». The import says how many (« numéros non reconnus »).
- When a contact has several numbers, only one is kept: the one typed mobile (`CELL`, `MOBILE`, `IPHONE`), else the first Moroccan mobile (`+2126…`, `+2127…`), else the first readable one. The user can't choose another number in NetGraph.
- Two phone cards with the same number are one contact (the first is kept, the other counts as « en double »), even if the names differ (a shared office line, for example).

**WhatsApp hand-off.**

- **The `wa.me` link is capped at 2,000 characters** (`MAX_WHATSAPP_URL_LENGTH`). Above that, « Ouvrir dans WhatsApp » is hidden and the user is asked to use « Copier ». Accents and line breaks count several characters each once encoded. Platforms have different limits; 2,000 is conservative and may be raised after the real-device check.
- The link carries one number and the message to WhatsApp (Meta), as any WhatsApp message would ([ADR 0001](../../adr/0001-local-first-contacts.md) §4). Nothing is sent until the user presses send in WhatsApp.

**Storage (ADR 0002).**

- **A rollback deletes the contacts.** A build from before #9 treats the new v2 record as unknown and deletes it: the user sees the import screen and imports again. Nothing leaks.
- « Effacer mes données de cet appareil » deletes both sources at once. Removing only the phone contacts (or only LinkedIn) is not possible yet.
- **Real exports:** the parser is tested on fictional Android (vCard 2.1), iPhone (3.0) and vCard 4.0 files built from the spec. Until the tech lead has checked the founder's real exports (task B6 on #9), unusual formats from some phones may import fewer contacts than expected.

## Minor

- **A name, company or role over 100 characters** makes the signup fail with the generic « Une erreur s'est produite. Réessayez. » (`400 Requête invalide`, #10). The form has no `maxLength` on these fields; adding `maxLength={100}` is a frontend follow-up if the PO wants it.
- Some text is below 4.5:1 contrast: `gray-400` fine print and captions, and `signal` green text in the beta pill. See the design system's colour notes. (Backlog item "Corriger les contrastes insuffisants et l'année du pied de page", no issue yet.)
- The footer still says "© 2025". (Same backlog item.)
- The landing page demo and testimonials use **real company names** (McKinsey, CIH Bank, Deloitte, BMCE Capital, Attijariwafa, OCP Group) with invented quotes attributed to people at those firms. Flagged on 2026-10-27; no issue yet, for the PO to triage. Sprint 1 fixtures use only invented companies.
