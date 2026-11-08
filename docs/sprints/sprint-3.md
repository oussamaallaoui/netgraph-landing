# Sprint 3

> **Closed on 2026-11-08, with the founder's approval.** Planned 2026-11-10 → 2026-11-16. Milestone: [Sprint 3](https://github.com/oussamaallaoui/netgraph-landing/milestone/3) (due date on GitHub: 2026-11-15). The founder approved the scope and launched the devs early, on 2026-11-07; all five stories were merged on 2026-11-08, before the planned start date. Committed stories: #10, #9, #20, #21, #23.

- **Length:** planned one week, done in two days
- **Team:** dev-frontend, dev-backend, qa-engineer (+ tech lead review, PO)

## Objectif

« Importer les contacts de mon téléphone et ouvrir mon brouillon dans WhatsApp pour l'envoyer moi-même — et l'inscription beta n'expose plus aucune donnée. »

**Result: met, with one open check.** Both halves are in production. The phone import and the WhatsApp hand-off pass every criterion that can be checked on a computer. Two checks were never done: real `.vcf` exports from the founder's phones (B6), and WhatsApp opening on a real phone (Q7). We do not know whether the founder has done them, so #9's QA verdict is still **partiel**.

## Bilan

| Story | Size | PR | Status | QA |
| --- | --- | --- | --- | --- |
| [#10 Protéger les données des inscrits à la beta](https://github.com/oussamaallaoui/netgraph-landing/issues/10) | S | [#28](https://github.com/oussamaallaoui/netgraph-landing/pull/28) | **Livrée**, merged 2026-11-08 | **QA OK** (local build of the PR head, commit `5ad2b75`). The verdict was not on the PR when it was merged (see Rétro). |
| [#9 Importer les contacts de mon téléphone et ouvrir le brouillon dans WhatsApp](https://github.com/oussamaallaoui/netgraph-landing/issues/9) | M | [#30](https://github.com/oussamaallaoui/netgraph-landing/pull/30) | **Livrée**, merged 2026-11-08 | **Partiel**: [QA verdict](https://github.com/oussamaallaoui/netgraph-landing/pull/30#issuecomment-6719942562), [#31 re-test](https://github.com/oussamaallaoui/netgraph-landing/pull/30#issuecomment-6722916662). No open bug. |
| [#20 La mention « Vos contacts restent sur cet appareil » visible sans défiler](https://github.com/oussamaallaoui/netgraph-landing/issues/20) | S | [#29](https://github.com/oussamaallaoui/netgraph-landing/pull/29) | **Livrée**, merged 2026-11-08 | **QA OK** (commit `762aae3`). The verdict was not on the PR when it was merged. |
| [#21 Zones tactiles de 44 px sur /essayer en mobile](https://github.com/oussamaallaoui/netgraph-landing/issues/21) | XS | [#29](https://github.com/oussamaallaoui/netgraph-landing/pull/29) | **Livrée**, merged 2026-11-08 | **QA OK** (same verdict as #20) |
| [#23 Lecteur d'écran : élision « d'Anas »](https://github.com/oussamaallaoui/netgraph-landing/issues/23) | XS | [#29](https://github.com/oussamaallaoui/netgraph-landing/pull/29) | **Livrée**, merged 2026-11-08 | **QA OK** (same verdict as #20) |
| [#31 Import .vcf : une lettre accentuée coupée par un repli devient « �� »](https://github.com/oussamaallaoui/netgraph-landing/issues/31) | bug | [#30](https://github.com/oussamaallaoui/netgraph-landing/pull/30) | **Corrigé** before the merge of #30 (the founder chose this) | Re-test OK |

### #10 — Protéger les données des inscrits à la beta

- `GET /api/subscribe` no longer exists. `GET`, `HEAD` and `?all=1` answer `405` with an empty body, and no subscriber list exists anywhere in the app. The server no longer writes a signup's email, name or any other field to its logs. The form shows the same screens and texts as before.
- Tech lead: [approved](https://github.com/oussamaallaoui/netgraph-landing/pull/28#issuecomment-6710906705) (498 tests).
- QA: **QA OK** at commit `5ad2b75`, on a local production build of the PR head, with fake data only. The QA engineer could not post the verdict on GitHub because the permission system blocked it. The text was saved outside the repo and had to be rewritten after the scratchpad was cleared. The founder merged before the verdict reached the PR.
- **Production, after the merge (read-only):** `GET`, `HEAD` and `?all=1` → `405`, empty body. No `POST` was sent.
- **Not checked:** AC 4, a signup on the Vercel preview followed by a search of the Vercel logs. QA has no Vercel access, so this is the founder's check. Its status is unknown.
- QA raised two points, both now in « Décisions en attente »: the visible change for `a@b` addresses, and « déjà inscrit » enumeration.

### #9 — Importer les contacts de mon téléphone et ouvrir le brouillon dans WhatsApp

- On `/essayer`, users can import a `.vcf` exported from Android or iPhone, alone or alongside their LinkedIn CSV. A person found in both appears once, with the LinkedIn position and the phone number. Counts are shown as « … importés, dont … rapprochés ». Phone numbers are never shown. Only the minimum fields are stored: no photo, note, address or birthday.
- The draft editor now has « Ouvrir dans WhatsApp (nouvel onglet) » with the line « WhatsApp s'ouvre avec votre message prérempli. Vérifiez le destinataire, puis envoyez-le vous-même. » Past 2,000 characters, the button is hidden and the user is asked to copy the message. **Nothing is sent by NetGraph. No element is labelled « Envoyer ».**
- Storage moved to one list per source, merged when read ([ADR 0002](../adr/0002-contacts-record-v2-per-source.md), accepted with the merge). Sprint 1 records are migrated. « Effacer » deletes both sources.
- Tech lead: changes requested once, because a perf test failed 1 run in 7. It was then approved [twice](https://github.com/oussamaallaoui/netgraph-landing/pull/30#issuecomment-6719856327), [the second time](https://github.com/oussamaallaoui/netgraph-landing/pull/30#issuecomment-6722902950) after the #31 fix. That makes 3 reviews, 693 tests.
- QA: **partiel**. 90 of 98 cases were run, and every desktop criterion passes. QA found bug #31 (a folded « é » became « �� »), and it was fixed in the same PR before the merge. The 8 cases not run need the founder: real Android and iPhone exports (B6), the real export menus and the iOS file picker, WhatsApp opening on Android, iPhone and desktop (AC 4), and a real screen reader (optional).
- **Status of B6 and of the device checks (Q7): unknown.** The real `.vcf` files were never sent to the tech lead, and no result has been posted on the PR. Until they are, the formats of real exports remain the main risk of this story.
- Accepted limits are listed in the wiki under known issues, « Phone import and WhatsApp (#9, Sprint 3) ». One limit still needs an explicit decision: a number shared by two people (see « Décisions en attente »).

### #20, #21, #23 — the three Sprint 1 bugs on /essayer

- **#20:** the box « Vos contacts restent sur cet appareil » now sits under the intro. It is fully visible without scrolling at 1280 × 800, 1280 × 720 and 375 × 812, and is read once, before the file field.
- **#21:** every control on `/essayer` is at least 44 px tall at 375 px, across 9 screen states, with no overlap and no horizontal scroll.
- **#23:** screen readers now hear « Voir le profil LinkedIn d'Anas Figurant (nouvel onglet) », and « de » before consonants, « Y » and « H ». This was checked on the names Chrome computes for #6 and #7 cards. A real screen reader was not used.
- Tech lead: [approved](https://github.com/oussamaallaoui/netgraph-landing/pull/29#issuecomment-6710916206) (505 tests). QA OK at `762aae3`. #20's AC 4 (the box still visible after #9) was replayed and passed in #9's QA.
- These bugs had been open since Sprint 1 (2026-10-31), and all are now closed.

## Démo

On https://netgraph-landing.vercel.app/essayer, with the repo's fictional files only (`lib/fixtures/`):

1. **Import the phone contacts.** Drop `phone-iphone.sample.vcf`. Four phone contacts load. Show that the box « Vos contacts restent sur cet appareil » is visible without scrolling, and that no phone number is shown anywhere.
2. **See the merged count.** Click « Importer un autre fichier » and drop `Connections.sample.csv`. The line reads « 30 relations LinkedIn importées, dont 3 rapprochées des contacts de votre téléphone. », and the heading says « 31 contacts importés »: Sara, Youssef and Karim are each counted once. « Nadia Fictif Bureau » stays a separate contact, because her phone name has an extra word. This is an accepted limit.
3. **State a need.** Type « Rencontrer le DAF de Atlas Conseil » and confirm. The section « Qui peut vous présenter chez Atlas Conseil » lists Sara Démo, Youssef Exemple and Nadia Fictif, with the #6 results below.
4. **Pick an introducer.** On Sara Démo's card, click « Préparer un message ». The introduction draft names Sara and Atlas Conseil. Switch the tone to « Tu » and edit one sentence.
5. **Hand off to WhatsApp.** Point at « Ouvrir dans WhatsApp » and read the line « Vérifiez le destinataire, puis envoyez-le vous-même. » together with « NetGraph n'envoie rien à votre place ». **Do not send anything:** the sample numbers are made up, but they could belong to real people. End with « Effacer mes données de cet appareil » and show that both sources are gone.

## Rétro

### Facts

- 5 stories committed (#10 S, #9 M, #20 S, #21 XS, #23 XS), 5 shipped to production in 3 PRs. 1 bug found by QA (#31) was fixed before the merge.
- The goal named only what was in the milestone, and it was met. QA's verdict on #9 is still partiel, pending the founder's checks.
- **Dates:** the founder approved the scope and launched the devs on 2026-11-07. Everything was merged on 2026-11-08, two days before the planned start (2026-11-10).
- **Merge vs QA:** QA tested PRs #28 and #29 **before** they were merged, and both were QA OK. But the verdicts could not be posted on GitHub because the permission system blocked them. The files were lost when the scratchpad was cleared and had to be rewritten. The founder merged both PRs before the verdicts were on them, and no waiver was written. #30 was merged **after** QA posted its verdict and its #31 re-test.
- Work was interrupted twice by the usage limit.
- The tech lead caught a flaky perf test (1 failure in 7 runs) and had it made stable without raising the budget.
- Tests went from 470 (end of Sprint 2) to 693.

### What went well

- **The whole goal shipped**, including the half of Sprint 2's goal that had been missed (#10).
- **The aged bugs were cleared.** #20, #21 and #23 had been open since Sprint 1, and all three are closed. #20 was about the core privacy promise.
- **QA ran before the merge on every PR,** and on #30 it caught a real bug (#31) that the founder chose to fix before merging. Nothing reached production untested.
- **Review caught noise before it became a habit:** the flaky test was fixed properly, and the duplicated merge work in the UI was removed.
- **PO decisions were made on the PR during the work** (copy for « contacts » vs « relations », the meta description), and QA checked them in both states.
- **The hard-to-reverse choice got an ADR** (0002), including the migration of Sprint 1 records.

### What didn't go well

- **The verdicts were not on the PRs.** For #28 and #29 the QA work was done, but the founder merged without seeing it on GitHub. The rule existed, and the tooling broke it.
- **Agents could not always post on GitHub.** The permission system sometimes blocked comments, and local files are not a reliable fallback (the scratchpad was cleared).
- **The founder's device checks are not tracked.** B6 (real `.vcf` files) has been requested since Sprint 2, and Q7 (WhatsApp on a real phone) has no owner or date. #9 is in production with a partiel verdict, and nobody knows whether these checks were done.
- **The sprint boundaries are blurred again.** The sprint was planned for 2026-11-10 → 2026-11-16 but was closed on 2026-11-08, and the planning calendar no longer matches the work.
- **Two usage-limit interruptions** stopped work in the middle of tasks, with no saved point to restart from.

### Did the 3 Sprint 2 improvements hold?

1. **No merge without QA's verdict on the PR: partly.** QA happened before every merge, which is the main point. #30 followed the rule fully. #28 and #29 did not: their verdicts were not on the PRs, and no waiver was written.
2. **The goal names only what is in the milestone: yes.** All 5 stories were in the milestone from day 1, and the goal was met.
3. **Fixed founder checkpoints: partly.** No code was written before the scope was approved, and there was no founder « stop ». But the sprint ran before its planned dates, and no checkpoint exists for the founder's own checks (Vercel logs, real devices).

### 3 improvements for Sprint 4

1. **The verdict is on the PR, or there is no merge.** If an agent cannot post, it stops and hands the verdict text to the founder, who pastes it on the PR. The verdict is never kept only in a scratch file. If the founder merges without a verdict, they write the waiver on the PR.
2. **The founder's checks are tracked like any other task.** Every check only the founder can do (Vercel logs, real devices, real export files, Upstash) becomes a checklist item on the issue, with a date. The PO reviews them at the close. A partiel verdict lists them, and the story stays open until they are done or explicitly waived.
3. **The sprint dates follow the work.** A sprint starts on the day the founder approves the scope, and that date goes into the milestone and the notes. Before each long task, agents write a short « where I am » comment on the issue, so a usage-limit interruption can restart from it.

## Décisions en attente du fondateur

1. **« Déjà inscrit » tells anyone whether an address signed up (fix before #11).** Today, an address already on the list gets « Cet email est déjà inscrit ». Once #11 stores signups, anyone can check whether a given person signed up. **PO proposal:** an existing address gets exactly the same screen as a new signup, and no duplicate is created. This changes #11's AC 2, so the issue needs editing (with your approval).
2. **The hard-coded « 47 ».** The landing page says « 47 professionnels déjà inscrits · Accès beta ouvert », and the form counter starts at 47. On 2026-11-07, production had 0 subscribers. Publishing a number we don't have breaks our own rule of not inventing metrics. **PO proposal:** remove the number now, and show a real count only once #11 stores signups, if you want one.
3. **#22 or « nom partiel »?** Both are size S and are about matching companies on the introduction path. **PO proposal:** #22 first, because it is a bug open since Sprint 1 and it gives a wrong explanation (« son nom contient « SARL » »). « Nom partiel » would follow, and it is still a draft (see Sprint 2 notes).
4. **Landing copy « Les doublons se fusionnent automatiquement ».** This is only partly true. A person is merged when the name matches or the number is the same, but « Sara » and « Sara Bureau » stay separate. The same card also lists Instagram and Excel, which are not importable yet. **PO proposal:** reword it to what ships today (draft story below).
5. **The `a@b` form case.** The form only checks for an « @ ». With #10, the server rejects addresses like `a@b`, and the visitor sees « Une erreur s'est produite. Réessayez. », which does not say the address is the problem. **PO proposal:** fold it into #11 (its AC 3 already asks for a French « email invalide » message).
6. **« d'Alaoui » with an empty first name.** #23's criterion said a name with no first name starts with « de ». The build gives « Voir le profil LinkedIn d'Alaoui Test », which is correct French. **PO recommendation:** accept it and treat the criterion as met.
7. **A number shared by two people counts as one contact** (a shared landline or a company switchboard). The second person is dropped and counted as « en double ». It is documented in known issues, but it was never accepted explicitly. **PO recommendation:** accept it for now, and look at it again once the real exports (B6) are available. The alternative is to remove duplicates only when both the number and the name match, which keeps more duplicates.
8. **Upstash for #11.** #11 is blocked until you create the Upstash for Redis database in Vercel and connect it to production and preview. Where the data is hosted should be part of the legal review (point 9). Whether that matters is an assumption to check with the reviewer, not a conclusion.
9. **Legal review** before #11 stores real signups, and before any broad promotion. Questions for the reviewer: what law 09-08 (CNDP) requires before collecting signups, what the GDPR requires for EU visitors, and what #12's privacy page must say.
10. **Still open from Sprint 3:** the Vercel log check for #10 (AC 4), the real `.vcf` exports for the tech lead (B6, local check only, never committed), and WhatsApp on your phones (11.2–11.6 in QA's #9 plan). Please post one line per check on PR #30 or #28, without real names or numbers.

## Sprint 4 — proposition

**Dates (to confirm):** starting on the day you approve the scope (see improvement 3).

**Candidate goal:** « M'inscrire à la beta depuis le site en production en sachant quelles données je confie, sans que personne puisse savoir que je suis inscrit — et la page d'accueil ne promet que ce que NetGraph fait. »

The goal only holds if the Upstash database exists on day 1 and the legal review has at least started. If not, #11 leaves the milestone, and the goal becomes « La page d'accueil ne promet que ce que NetGraph fait, et je sais quelles données d'inscription sont collectées ». #11 stays blocked.

| # | Story | Size | Why this rank |
| --- | --- | --- | --- |
| 1 | #11 S'inscrire à la beta depuis le site en production, **with** the « déjà inscrit » fix (decision 1) and the « email invalide » message (decision 5) | M | It has the most unknowns (Upstash, concurrent signups, a real deployment), and it is the first time we keep personal data in production. Rule from Sprint 1: #10 before #11, and #10 is done. |
| 2 | #12 Comprendre comment mes données d'inscription sont utilisées | S | Visitors must know what is collected before they sign up. It ships with or before #11, never after (*assumption until the legal review*). |
| 3 | Draft: Lire sur la page d'accueil des informations exactes (« 47 », « doublons », Instagram/Excel) | XS | A public claim that is not true. No dependency, so it can ship on day 1. |
| 4 | #22 Entreprise citée avec sa forme juridique | S | A wrong ranking and a wrong explanation on the introduction path. Open since Sprint 1. |
| 5 | Draft: Retrouver l'entreprise quand je la cite par un nom court *(stretch)* | S/M | Better matching, but not a fix. Only if the sprint has room. |
| — | #13 Créer un compte NetGraph et me connecter | L | **Later.** It needs the legal review, a decision on where contacts are stored (ADR 0001 is local-first), and more than one sprint. |

Capacity check: M + S + XS + S (+ S/M) is about the size of Sprint 3 (S + M + S + XS + XS). *Assumption: the pace of Sprint 3, which shipped in two days, will not repeat with a dependency on the founder (Upstash) and a legal review.*

### Draft (not on GitHub): Lire sur la page d'accueil des informations exactes · XS

En tant que visiteur, je veux que la page d'accueil ne décrive que ce que NetGraph fait vraiment, afin de décider de m'inscrire en connaissance de cause.

**Critères d'acceptation**
- Étant donné la page d'accueil, quand elle s'affiche, alors aucun nombre d'inscrits n'apparaît tant que ce nombre ne vient pas des inscriptions réellement enregistrées.
- Étant donné l'étape « Importez vos contacts », quand le visiteur la lit, alors elle ne cite que les sources importables aujourd'hui (LinkedIn et téléphone), et les autres sont annoncées comme « bientôt ».
- Étant donné la même étape, quand le visiteur la lit, alors elle ne promet pas que tous les doublons sont fusionnés : elle dit qu'une même personne est regroupée quand son nom ou son numéro correspond.
- Étant donné le formulaire d'inscription, quand l'inscription réussit, alors le message de succès ne cite pas de nombre inventé.
- Étant donné les nouveaux textes, quand QA les lit, alors ils vouvoient le visiteur et suivent le design system.

**Hors périmètre**
- Refonte de la page, nouvelles sections, compteur d'inscrits en temps réel.

**Notes**
- The exact wording is for the PO to give on the issue before any code. Whether to show a real count after #11 is decision 2.

### Risks

- **#11 depends on two outside inputs:** your Upstash database and the legal review. Without them, the goal is half-missed, as happened in Sprint 2.
- **We start keeping personal data in production.** A mistake is no longer dormant, as #10 was. Enumeration, logs and the success counter all need to be checked on the preview before the merge.
- **#9 is in production without real-device checks.** If real Android or iPhone exports break the import, users will be the first to find out. B6 is the cheapest way to learn this early.
- **The tooling can still block the QA verdict** (the permission system). Improvement 1 only holds if someone posts the verdict for the agent.
