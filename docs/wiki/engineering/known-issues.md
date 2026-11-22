# Known issues

As of 2026-11-15. Each item should have a GitHub issue; items without one are flagged for the PO to triage.

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

Accepted limits of « Qui peut vous présenter chez … » (`lib/introducers.js`). Detection uses rules and the user's own file only: no fuzzy matching; partial names are whole words only (#35).

- **Fixed in #35 (Sprint 4): partial company names.** After a cue, a short name whose significant words are all whole words of a company key, with at least one non-vocabulary word, opens that company's section: « chez ATLAS » = « chez Atlas Conseil », « chez Oasis » = « chez Oasis Capital Démo », also with a legal form before or after it (« chez SARL Oasis », « chez Atlas SA »). When several companies match (« chez Exempla »), each gets its own section (`found_many`, at most 3, the largest first). Only vocabulary words (« chez Finance ») still show nothing. A name sharing any word with a company of the file without matching one (« chez Atlas Zéroboîte », or « chez L'Oréal Démo » when the file has « … Démo » companies) shows nothing rather than the « absent » notice, which would contradict the #6 list citing that word. The same holds for a legal form typed with an absent name when a company of the file is spelled with it (« chez Zéroboîte SARL » with « Oasis Capital Démo SARL »), since `match()` reads that legal form as a free word. Limits: whole words only (« chez Atl » or « chez Atlasi » find nothing; no typos), since #49 a lowercase name works right after « chez » only, with no article or « l' » in between (« chez atlas » = « chez Atlas », but « chez le lab » or « quelqu'un de atlas » show nothing), and a lowercase name that is no company of the file never shows the « absent » notice (« chez coiffeur » shows nothing), and a word shared by many companies of a file opens up to 3 sections, the largest first (« Démo » in the fixtures; on a realistic file « chez Maroc » or « chez Africa »: « maroc », « africa », « groupe », « holding » are not vocabulary words). No frequency guard, by decision of the tech lead: AC 2 asks that each company be named.
- **Fixed in #50 (Sprint 5): a legal form typed before the company.** « chez SARL Oasis Capital Démo », « chez sarl oasis capital démo », « chez Groupe Oasis Capital Démo SARL »: like #22 for a form typed after it, the legal forms typed right before a known company (one- or two-word `LEGAL_SUFFIXES` entries, repeatedly, never « & » / « et ») belong to the mention (`findCompanyMentions`: `surface` and `tokens` include them, `key` unchanged), so the #6 list ranks and explains people exactly as without them and never quotes « SARL ». A form already taken by the previous company stays with it (« chez Atlas Conseil SA Fictiva Banque »: « SA » is Atlas's).
- **Fixed in #56 (Sprint 5): a legal form typed with a short company name.** « chez SARL Oasis », « chez Oasis SARL », « chez sarl Oasis », « chez Démo SARL »: a chain of legal forms (same rules as #22 after the name and #50 before it) attached to 1–6 free words that pass the #35 short-name rule (`shortNameKeys` in `lib/match.js`, shared with the introducer section) is now ignored by the #6 list, which ranks and explains people exactly as for « chez Oasis » and never quotes « SARL ». The name's own words stay free words, as before; the introducer section is unchanged. The words right next to the legal form decide, nearest first: « chez Zéroboîte Atlas SARL » drops « SARL » (« atlas » alone is a short name), « chez Atlas Zéroboîte SARL » does not. Still open: a legal form typed with a name absent from the file (« chez Zéroboîte SARL », or « chez Atlas Zéroboîte SARL » where no company holds both words) is still read as a free word: s30 is listed for « SARL », and the section shows nothing rather than the « absent » notice (see #35 above).
- **A one-word generic company can't be named.** A company called only « Conseil » (one vocabulary word) is never detected in a request, even after « chez », because `buildIndex` doesn't make it mentionable. The user sees nothing, not a false notice. Multi-word generic names (« Finance Conseil ») work after a cue.
- **A capitalised place after a role word reads as a company.** « DAF de Casablanca » shows « Aucune personne de votre réseau ne travaille chez Casablanca… ». Lowercase words (« DAF de la région », « responsable d'agence ») and « quelqu'un à Rabat » show nothing.
- **Fixed in #22 (Sprint 4): a legal form typed after the company.** « chez Oasis Capital Démo SARL », « chez Atlasia & Co »: the legal form (any `LEGAL_SUFFIXES` entry, plus « & Co » / « et Co ») now belongs to the company mention (`findCompanyMentions`), so the #6 list ranks and explains people exactly as without it, and a free word found in a company name reads « le nom de son entreprise contient « … » ». Accepted side effect: a legal-form word typed right after a company name, or since #50 right before it (« co », « group », « sa »…, also a possessive « chez sa Fictiva Banque »), is always read as part of the company, never as a word of the request. Since #56 the same holds next to a short company name: « co », « ag », « group(e) »… typed right before or after words that name a company of the file (« chez Oasis groupe de travail ») are read as a legal form and ignored by the #6 list (« sa » was already a stopword).
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
- Two phone cards with the same number are one contact (the first is kept, the other counts as « en double »), even if the names differ (a shared office line, for example). Accepted by the founder on 2026-11-15 until the real exports are checked (B6, tracked in #36), then reviewed.

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
- ~~The footer still says "© 2025".~~ Fixed in #34 (Sprint 5): the footer says « NetGraph © 2026 ».
- ~~The landing page demo and testimonials use **real company names** (McKinsey, CIH Bank, Deloitte, BMCE Capital, Attijariwafa, OCP Group) with invented quotes attributed to people at those firms.~~ Fixed in #34 (Sprint 5): the demo, the ranked results and the agent card use only invented companies (Quartzia Conseil, Banque Zélia, Audivia, Nordacap, Banque Tamsa, Phosfora, Fonds Iléa), each with « Exemple fictif — noms et entreprises inventés » under it, and the testimonials section is removed until real quotes are collected with written consent. The names were not checked against a company register.

## Beta signups closed until #11 (#47)

Since #47, the landing page no longer shows the signup form: the `#beta` card shows a notice instead (`components/BetaSignupNotice.js`, « Nous ne collectons aucune donnée pour l'instant. ») with a link to `/essayer`. No page calls `/api/subscribe` any more, so no visitor fills in a form that fails.

- `app/api/subscribe/route.js` is **unchanged**: it still fails in production (read-only filesystem, see « Blocking » above) and stores nothing, but nothing calls it.
- The old `SubscribeForm` function stays in `app/page.js`, unused, on purpose (so PRs #41 and #43 merge cleanly).
- **#11 (PR #41) restores the form:** it puts `<SubscribeForm />` back in the card, deletes `BetaSignupNotice` and its test, the `#47` import line and this section, and sets the hero badge, hero button and section title back to the signup wording (checklist on #11).
