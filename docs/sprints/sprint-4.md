# Sprint 4

> **Closed on 2026-11-22 at the founder's request** (« close sprint »), a week before the planned end. Approved and started on 2026-11-15, planned 2026-11-15 → 2026-11-29. Milestone: [Sprint 4](https://github.com/oussamaallaoui/netgraph-landing/milestone/4), due 2026-11-29. Shipped: #33, #22, #35 and the unplanned bug #44. Built but not merged, by founder decision: #11 and #12.

- **Dates:** 2026-11-15 → 2026-11-29 (two weeks)
- **Team:** dev-frontend, dev-backend, qa-engineer (+ tech lead review, PO)

## Objectif

« M'inscrire à la beta depuis le site en production en sachant quelles données je confie, sans que personne puisse savoir que je suis inscrit — et la page d'accueil ne promet que ce que NetGraph fait. »

The goal holds because Upstash is connected (decision 8). One condition remains: #11 is merged only after the founder confirms that the legal review has started (decision 9). If that confirmation has not arrived by the close, #11 stays open as a finished PR. The goal then counts as **partly met**, and we say so in the demo notes.

**Result (2026-11-22): partly met.** The landing page half is met: #33 and #22 shipped, plus #35 and #44. The signup half is not met: #11 and #12 are finished as draft PRs, and the legal review has not started. See « Bilan ».

## Stories (in order)

| Rank | Issue | Story | Size | Why this rank |
| --- | --- | --- | --- | --- |
| 1 | [#11](https://github.com/oussamaallaoui/netgraph-landing/issues/11) | S'inscrire à la beta depuis le site en production | M | Most unknowns: storage in a real deployment, concurrent signups, and the first personal data we keep in production. Now includes the « déjà inscrit » fix (decision 1) and the « email invalide » message (decision 5). Merge condition: legal review started (decision 9). |
| 2 | [#12](https://github.com/oussamaallaoui/netgraph-landing/issues/12) | Comprendre comment mes données d'inscription sont utilisées | S | Visitors must know what is collected before they sign up. Ships with or before #11, never after. |
| 3 | [#33](https://github.com/oussamaallaoui/netgraph-landing/issues/33) | Lire sur la page d'accueil des informations exactes | XS | Public claims that are not true (« 47 », « doublons », Instagram and Excel). No dependency, so it can ship on day 1. The issue gives the exact before/after texts. |
| 4 | [#22](https://github.com/oussamaallaoui/netgraph-landing/issues/22) | Entreprise citée avec sa forme juridique | S | A wrong ranking and a wrong explanation on the introduction path, open since Sprint 1. Before « nom partiel » (decision 3). Testable criteria were added in [a PO comment](https://github.com/oussamaallaoui/netgraph-landing/issues/22#issuecomment-6894878892). |
| 5 | [#35](https://github.com/oussamaallaoui/netgraph-landing/issues/35) | Retrouver l'entreprise quand je la cite par un nom court *(stretch)* | S/M | Better matching, but not a fix. Started only if ranks 1–4 are done or waiting on the founder. |
| — | [#36](https://github.com/oussamaallaoui/netgraph-landing/issues/36) | Vérifications du fondateur — Sprint 4 | task | Not a story. The founder's dated checks, tracked in the milestone (improvement 2). |

**Not in the sprint:**

- [#34](https://github.com/oussamaallaoui/netgraph-landing/issues/34) Voir un exemple fictif sur la page d'accueil, sans vraies entreprises ni faux témoignages (S). This covers the real company names in the demo, the invented testimonials and « © 2025 ». It was kept out of #33 so #33 stays XS. **PO recommendation:** take it next sprint, or add it now if you want. The testimonials are invented quotes attributed to people at real firms, which is the same problem as the « 47 », only worse.
- #13 Créer un compte NetGraph et me connecter (L): later. It needs the legal review and a decision on server-side storage of contacts (ADR 0001 is local-first).

**Capacity check:** M + S + XS + S (+ S/M) over two weeks. Sprint 3 shipped S + M + S + XS + XS in two days. *Assumption: this sprint will be slower, because #11's merge waits on the founder and the legal review, not on the team.*

## Décisions du fondateur (2026-11-15)

All nine Sprint 3 proposals were approved as written.

1. **« Déjà inscrit »:** an existing address gets exactly the same screen and the same server response as a new signup. No duplicate is saved, and the original signup stays unchanged. This is in #11 (AC 2).
2. **« 47 »:** the number is removed now (#33). No real count is shown for now.
3. **#22 before « nom partiel »** (#35, stretch).
4. **« Doublons »:** the claim is reworded to what ships (grouping by full name or number). Instagram and Excel are shown as « bientôt » (#33).
5. **`a@b`:** a French « email invalide » message: « Cette adresse email n'est pas valide. Vérifiez-la, puis réessayez. » This is in #11 (AC 3).
6. **« d'Alaoui » with an empty first name:** accepted. #23's criterion counts as met.
7. **A phone number shared by two people counts as one contact:** accepted until B6 (the real exports). It is reviewed after B6 (#36).
8. **Upstash:** done. The database is connected to the Vercel project for preview and production. `blocked` was removed from #11.
9. **Legal review:** status unknown. Rule: #11 is built, reviewed and QA'd, but the founder merges it only after confirming that the legal review has started. #12 ships with or before #11, never after.

## Vérifications du fondateur

These are tracked with dates in [#36](https://github.com/oussamaallaoui/netgraph-landing/issues/36), and #11's own checks are also on [#11](https://github.com/oussamaallaoui/netgraph-landing/issues/11). The PO reviews them at the close. A check that is not done is either moved to a new date or explicitly waived by the founder.

| Check | From | Due |
| --- | --- | --- |
| Upstash connected (preview + production) | #11 | **Done** 2026-11-15 |
| Vercel logs: a test signup does not appear (#10, AC 4) | Sprint 3 | 2026-11-18 |
| Real Android and iPhone `.vcf` exports, checked locally by the tech lead and never committed (B6) | Sprint 3, #9 | 2026-11-20 |
| WhatsApp hand-off on Android, iPhone and desktop (Q7, cases 11.2–11.6) | Sprint 3, #9 | 2026-11-20 |
| Review decision 7 (shared number) | Decision 7 | After B6 |
| Legal review has started, confirmed on #11 | Decision 9 | 2026-11-26, before #11's merge |
| Vercel logs on #11's preview: no signup data (#11, AC 6) | #11 | Before #11's merge |
| Vercel logs in production: no signup data | #11 | Day of #11's deployment |

## Working rules for this sprint (from the Sprint 3 retro)

1. **The verdict is on the PR, or there is no merge.** If an agent cannot post on GitHub, it stops and gives the verdict text to the founder to paste. If the founder merges without a verdict, they write the waiver on the PR.
2. **The founder's checks are tracked** (#36, and the checklist on #11).
3. **The dates follow the work.** Before each long task, agents write a short « where I am » comment on the issue, so that an interrupted task can restart from it.

## Risks

- **#11 may be finished but not merged.** It now depends only on the legal review starting, and that is outside the team's control. If it slips, the signup half of the goal is missed for the third sprint in a row.
- **We start keeping personal data in production.** Enumeration (AC 2), logs (AC 6) and the absence of a counter must be checked on the preview before the merge. Who checks the logs (the founder) is now a dated task.
- **#11 and #33 touch the same success screen.** Both issues give the same final texts, so whichever ships second keeps them. The tech lead orders the PRs.
- **#9 is still in production without real-device checks.** B6 and Q7 are now dated (2026-11-20). If real exports break the import, users will find out before we do.
- **The landing page still shows invented testimonials and real company names** until #34 is done. The PO recommends not promoting the site broadly before that and before the legal review. *(Assumption: their legal weight is for the reviewer to judge.)*
- **The tooling can still block an agent from posting its verdict** (the permission system). Working rule 1 covers this.

## Questions ouvertes pour le fondateur

1. Do you want #34 (fictional demo, no fake testimonials, « © 2026 ») in this sprint, or in the next one?
2. Are these promises true today: « Accès en 7 jours », « Invitation dans les 7 jours », « Les 100 premiers inscrits ont accès gratuitement pendant 3 mois, avec un onboarding personnalisé », « Données 100% privées »? If not, the PO writes a copy story.
3. For #12: does `contact@netgraph.app` exist and is it read? What retention period should apply to signups?

## Bilan

| Story | Size | PR | Status | Review and QA |
| --- | --- | --- | --- | --- |
| [#33 Lire sur la page d'accueil des informations exactes](https://github.com/oussamaallaoui/netgraph-landing/issues/33) | XS | [#39](https://github.com/oussamaallaoui/netgraph-landing/pull/39) | **Livrée**, merged 2026-11-15 | Tech lead [approve](https://github.com/oussamaallaoui/netgraph-landing/pull/39#issuecomment-6895228929). [QA OK](https://github.com/oussamaallaoui/netgraph-landing/pull/39#issuecomment-6895280082) at `79cdd64`, posted before the merge. |
| [#22 Entreprise citée avec sa forme juridique](https://github.com/oussamaallaoui/netgraph-landing/issues/22) | S | [#40](https://github.com/oussamaallaoui/netgraph-landing/pull/40) | **Livrée**, merged 2026-11-15 | Tech lead [approve](https://github.com/oussamaallaoui/netgraph-landing/pull/40#issuecomment-6895364811). [QA OK](https://github.com/oussamaallaoui/netgraph-landing/pull/40#issuecomment-6895497373) at `242cde4`, posted before the merge. |
| [#35 Retrouver l'entreprise quand je la cite par un nom court](https://github.com/oussamaallaoui/netgraph-landing/issues/35) *(stretch)* | S/M | [#42](https://github.com/oussamaallaoui/netgraph-landing/pull/42) | **Livrée**, merged 2026-11-21 | Tech lead: changes requested once on the lib half, then [approve](https://github.com/oussamaallaoui/netgraph-landing/pull/42#issuecomment-7061353110). [QA OK](https://github.com/oussamaallaoui/netgraph-landing/pull/42#issuecomment-7061439314) at `2b9a47c`, posted before the merge. |
| [#44 Servir la police Inter depuis notre domaine, sans Google Fonts](https://github.com/oussamaallaoui/netgraph-landing/issues/44) | bug, not planned | [#45](https://github.com/oussamaallaoui/netgraph-landing/pull/45) | **Corrigé**, merged 2026-11-22 | Tech lead [approve](https://github.com/oussamaallaoui/netgraph-landing/pull/45#issuecomment-7070767911). [QA OK](https://github.com/oussamaallaoui/netgraph-landing/pull/45#issuecomment-7070821378) at `5ca765d`, posted before the merge. |
| [#12 Comprendre comment mes données d'inscription sont utilisées](https://github.com/oussamaallaoui/netgraph-landing/issues/12) | S | [#43](https://github.com/oussamaallaoui/netgraph-landing/pull/43) (draft) | **Construite, pas mergée** (founder decision 4 below) | PO copy approved. Tech lead: [changes requested](https://github.com/oussamaallaoui/netgraph-landing/pull/43#issuecomment-7070657994) at `27e0b83` (the Google Fonts claim); fixed by #44 and `117ee70`. No new tech lead verdict on the PR yet. [QA OK for #12's scope](https://github.com/oussamaallaoui/netgraph-landing/pull/43#issuecomment-7070788610) at `117ee70`. Head is now `05a82c6`, with master merged in. |
| [#11 S'inscrire à la beta depuis le site en production](https://github.com/oussamaallaoui/netgraph-landing/issues/11) | M | [#41](https://github.com/oussamaallaoui/netgraph-landing/pull/41) (draft) | **Construite, pas mergée** (founder decision 4 below) | Tech lead [approve (code)](https://github.com/oussamaallaoui/netgraph-landing/pull/41#issuecomment-6941203129) at `8423ae4`. QA [plan A OK, verdict partiel](https://github.com/oussamaallaoui/netgraph-landing/pull/41#issuecomment-7061320334). Plan B (Vercel preview, real Redis) was not run. Head is now `4cfbbfd`. |
| [#36 Vérifications du fondateur — Sprint 4](https://github.com/oussamaallaoui/netgraph-landing/issues/36) | task | — | **Open**, 1 of 8 checks done | See « Vérifications du fondateur : état à la clôture » below. |

**Result: half met, again.** The landing page half is in production. The page no longer shows the « 47 » and only names the sources that can be imported today. A legal form after a company name is no longer counted as a word of the request. Short company names now work. Since 2026-11-22, no page loads anything from Google. The signup half is not met: #11 and #12 are built, reviewed and QA'd (plan A only for #11), but the founder decided on 2026-11-21 not to merge them this sprint, because the legal review has not started. This was the first risk in the plan.

**Production today:** the form on https://netgraph-landing.vercel.app still fails for every visitor. They see « Une erreur s'est produite. Réessayez. », and nothing is saved (`known-issues.md`, « The beta signup form fails in production — #11 »). This has been the case since launch. The page still invites visitors to sign up, and those visitors are lost.

### #33 — Lire sur la page d'accueil des informations exactes

- The badge reads « Accès beta ouvert », with no signup count. The sources are « Téléphone », « LinkedIn », « Instagram (bientôt) » and « Excel (bientôt) ». Step 01 reads « Téléphone et LinkedIn aujourd'hui, Instagram et Excel bientôt. Une même personne est regroupée quand son nom complet ou son numéro est identique. »
- Shipped on day 1, as planned. QA left two accessibility notes on the form (no labels on the fields, focus not managed). Those were moved into #11, which rewrites the form.

### #22 — Entreprise citée avec sa forme juridique

- « chez Oasis Capital Démo SARL » now ranks and explains people exactly as « chez Oasis Capital Démo ». The same holds for SARL, SA, SAS, Co, Ltd, Inc and « & Co ». The ambiguous « son nom contient » is gone: the sentence now reads « le nom de son entreprise contient « … » ».
- This bug had been open since Sprint 1, and it is now closed.
- **Still open:** a legal form typed **before** the name (« chez SARL Oasis… ») is still a free word for the #6 list (QA note on #40, PO comment on #35). It is a draft bug in the Sprint 5 proposal.

### #35 — Retrouver l'entreprise quand je la cite par un nom court

- « chez ATLAS » opens « Qui peut vous présenter chez Atlas Conseil », with the same people as the full name. When a short name matches several companies (« chez Exempla »), each company gets its own section, at most 3, with the intro line « Le nom que vous citez correspond à … entreprises de votre fichier. » and an overflow line. A generic word (« chez Finance ») still opens nothing. The « absent » notice never contradicts the list. Nothing leaves the device.
- **Limit found by QA:** a lowercase short name (« chez atlas », « chez oasis ») opens nothing. The name must start with an uppercase letter. This is documented in `known-issues.md`. QA expects it to surprise mobile users, which is an assumption to check. It is in the Sprint 5 proposal.
- Not tested: a real screen reader (none on the QA machine), and focus mode with several sections (no example button leads to it).

### #44 — Servir la police Inter depuis notre domaine

- The tech lead found this in the review of #43. Every page loaded Inter from `fonts.googleapis.com`, so Google received every visitor's IP address. Inter is now served from our own domain with `next/font`, with no new dependency. QA checked 0 requests to Google on `/` and `/essayer`, with the same rendering. This is in production since 2026-11-22.
- This was not planned. The founder decided it on 2026-11-22, and it was merged before #12 because the privacy page says the site loads nothing from another site.
- The tech lead noted one more thing: `tailwind.config.js` points `font-display` to « Cal Sans », a font that is never loaded and that no code uses. It is a cleanup task in the Sprint 5 proposal.

### #12 and #11 — built, not merged

- **#12 (PR #43):** a short notice above « Confirmer mon inscription » and a `/confidentialite` page in French. They follow the founder's decisions of 2026-11-21 and 2026-11-22: contact address, retention, EU region, company and role also used to choose whom to invite first, and a paragraph on Vercel's request logs. All the text is marked « à valider par la revue juridique ». `[RESPONSABLE]` is still a placeholder, on purpose, and nothing merges with it. QA compared all 40 text blocks to the approved copy. The page says the data is stored in Frankfurt, so it **must not merge before the database is moved**.
- **#11 (PR #41):** signups are stored in Upstash Redis. An address that is already signed up gets the same status and the same bytes as a new one, so nobody can tell whether an address signed up. `a@b` shows « Cette adresse email n'est pas valide. Vérifiez-la, puis réessayez. » The server logs only `subscribe: save failed <catégorie>`. The form has labels, managed focus and a `role="status"` region. QA plan A found one minor bug: an email longer than 254 characters was cut without a message. It was fixed in `60115bd`. QA must re-run B1 and A1–A3 on the new head.
- **Plan B was not run.** It covers real persistence across a deployment, concurrent signups, the `preview:` prefix, Vercel logs (AC 6) and response time. It needs a shareable preview link from the founder (the previews are protected) and the EU database, because running it on the iad1 database would test a setup we are about to remove.

## Démo

On https://netgraph-landing.vercel.app, with the repo's fictional data only. **Do not submit the signup form:** #11 is not merged, so it would fail.

1. **Accurate landing page.** On `/`, show the badge « Accès beta ouvert » with no number, the sources with « Instagram (bientôt) » and « Excel (bientôt) », and step 01 (« … regroupée quand son nom complet ou son numéro est identique »).
2. **Nothing from Google.** Open DevTools, go to Network, disable the cache and reload `/`, then `/essayer`. Filter on « google »: there are 0 requests. The font comes from `/_next/static/media/…woff2`.
3. **Legal form after the name.** On `/essayer`, click « Essayer avec des contacts d'exemple ». Type « Rencontrer quelqu'un chez Oasis Capital Démo SARL ». The order and the explanations are the same as without « SARL », and no explanation cites « SARL ».
4. **Short name.** Type « Rencontrer quelqu'un chez ATLAS »: « Qui peut vous présenter chez Atlas Conseil » appears with Nadia Fictif, Sara Démo and Youssef Exemple. Then type « … chez Exempla »: the line « Le nom que vous citez correspond à 2 entreprises de votre fichier. » appears, followed by one section for Assurances Exempla and one for Exempla Média. Open Lina's draft: it cites « Exempla Média ».
5. **The limits, said openly.** « chez Finance » opens nothing (expected). « chez atlas » in lowercase also opens nothing (a known limit, proposed for Sprint 5).
6. **Not demonstrable in production:** the signup and the privacy page. They can only be shown on a local build of PRs #41 and #43, with `test+…@netgraph.test` addresses.

## Rétro

### Facts

- 5 stories committed (#11 M, #12 S, #33 XS, #22 S, #35 S/M stretch), plus 1 unplanned bug (#44). 3 stories and the bug shipped to production in 4 PRs. 2 stories are built and held as drafts by founder decision. No bug was open at the close. QA found one minor bug on #41 (email cut at 254), and it was fixed on the branch.
- **Dates:** approved and started on 2026-11-15. #33 and #22 were merged that day, #35 on 2026-11-21 and #44 on 2026-11-22. The founder closed the sprint on 2026-11-22, a week before the planned end (2026-11-29), because the rest waits on the founder's own steps.
- **Tests:** 693 at the end of Sprint 3, 782 on `master` after #45. Branch #41 has 849 tests and branch #43 has 797.
- **Founder decisions during the sprint (2026-11-21/22):** listed below in « Décisions du fondateur (2026-11-21 → 2026-11-22) ».
- **Process incidents:**
  - On 2026-11-17, a QA batch typed into the founder's own `localhost:3000` tab. Nothing was submitted.
  - On 2026-11-22, two agents shared the browser pane and interfered with each other.
  - The browser pane sometimes refused `localhost`.
  - Agents resumed from an earlier session did not get the Superpowers skills. Fresh agents did.
  - A usage-limit interruption stopped two agents. They resumed fine from their « où j'en suis » comments.
  - `gh pr edit` fails because of the Projects (classic) deprecation, so PRs are edited with `gh api -X PATCH`. `gh issue list` also failed at the close (« illegal base64 data »), and `gh api` worked.

### What went well

- **Every merged PR had its verdicts on GitHub before the merge** (tech lead and QA). No waiver was needed.
- **Review protected users beyond the story.** The tech lead's review of #43 found that every visitor's IP address went to Google. It was fixed in production within a day (#44), before any privacy page claimed otherwise.
- **Day 1 delivered.** #33, the public claims that were not true, and #22, a Sprint 1 bug, were in production on the day the sprint was approved.
- **The stretch story shipped** (#35), and the PO's copy for `found_many` was given on the issue before any code was written.
- **The signup is ready.** The « déjà inscrit » enumeration, the « email invalide » message and the form accessibility are all built. What is left is outside the code.
- **The founder's decisions were written where the reviewer will look** (#11, #12, #43). The privacy page only states what is true, and anything unknown (the Vercel log retention) is said openly.

### What didn't go well

- **The signup half of the goal was missed again.** The plan made the goal depend on an outside step (the legal review), and that step did not start. The risk was written down, but the goal still counted on it.
- **The founder's checks were tracked but not done.** Of the 8 checks in #36, 1 is ticked (Upstash). The 2026-11-18 and 2026-11-20 checks (Vercel logs for #10, real `.vcf` exports, WhatsApp on real phones) passed their dates with no result. #9 has been in production with a partiel verdict since 2026-11-08.
- **Agents interfered in the browser** twice: once in the founder's own tab, once between two agents. Nothing was submitted, but a QA run against the wrong tab produces wrong evidence, and it could have sent data.
- **Tooling cost time:** resumed agents without the skills, `gh pr edit` failing, and the pane refusing `localhost`.
- **We learned late that the database is in the US.** The region (iad1, shared by preview and production, free plan) was only read on 2026-11-21, after #11 was built. Moving it is now a merge condition.

### Did the 3 Sprint 3 improvements hold?

1. **The verdict is on the PR, or there is no merge: yes.** For #39, #40, #42 and #45, both verdicts were on the PR before the merge: QA at 13:48 and merge at 14:03, QA at 14:01 and merge at 14:04, QA on 2026-11-21 at 10:44 and merge at 11:05, QA on 2026-11-21 at 23:21 and merge on 2026-11-22 at 09:03. The two draft PRs also have their verdicts on GitHub.
2. **The founder's checks are tracked: partly.** The tracking held: #36 exists, every check has a date, and this close reviews them. But the checks were not done, and nobody moved the dates or wrote a waiver when they passed. The legal review answer (« pas commencée ») was recorded on #11 and #12, not on #36.
3. **The dates follow the work: yes.** The sprint started on the day of approval. « Où j'en suis » comments were posted on #22, #11, #35 and #41, and agents restarted from them after the interruptions. The close comes a week early, and these notes say so.

### 3 improvements for Sprint 5

1. **The goal names only what the team can finish alone.** A story that waits on an outside step (legal review, a mailbox, a database, an account) goes in the milestone as « en attente du fondateur ». Its steps are listed with dates, but it is left out of the goal until the steps are done. If they are done during the sprint, the story joins the goal.
2. **One browser agent at a time, in its own tab.** Each agent opens its own tab on its own port and never uses the founder's tab (`localhost:3000`). While a browser agent is running, the others wait. If the pane refuses `localhost`, the agent stops and reports. It does not switch to another tab.
3. **An interrupted agent is restarted fresh, not resumed.** The new agent starts from the « où j'en suis » comment on the issue, so it gets the Superpowers skills. Agents edit GitHub with `gh api` (`-X PATCH` for PRs and issues), not `gh pr edit`.

## Décisions du fondateur (2026-11-21 → 2026-11-22)

Recorded on [#11](https://github.com/oussamaallaoui/netgraph-landing/issues/11#issuecomment-7069728500), [#12](https://github.com/oussamaallaoui/netgraph-landing/issues/12#issuecomment-7070714557), [#43](https://github.com/oussamaallaoui/netgraph-landing/pull/43#issuecomment-7070714785) and [#44](https://github.com/oussamaallaoui/netgraph-landing/issues/44).

1. **Contact for data requests:** `contact@netgraph.app`. The mailbox does not exist yet. The founder creates it before #12 is merged.
2. **Retention:** « jusqu'à la création d'un compte NetGraph, ou plus tôt sur demande ». There is no fixed period.
3. **Database region:** the Upstash database is recreated in the EU (fra1, Frankfurt) before the first real signup. Today it is in iad1 (Washington DC), on the free plan, shared by preview and production, with test data only.
4. **Legal review:** not started. #11 and #12 are built and tested, but **not merged this sprint**.
5. **`[RESPONSABLE]`:** the placeholder stays on `/confidentialite` until the founder gives the name of the controller. Nothing merges with it.
6. **Company and role** are also used to choose whom to invite first, in addition to recontacting the person.
7. **The API stays in Vercel's default region (iad1).** Only the database moves to the EU.
8. **Inter is self-hosted** (#44), merged before #12. Done.
9. **Vercel logs:** `/confidentialite` says that Vercel's request logs record each visitor's IP address and browser. The retention period is still to be confirmed.
10. **« SARL » before the company name** (PO question on [#35](https://github.com/oussamaallaoui/netgraph-landing/issues/35#issuecomment-6941141489)): **undecided.** The options are to create the draft bug, or to accept the limit.

## Vérifications du fondateur : état à la clôture

These are taken from [#36](https://github.com/oussamaallaoui/netgraph-landing/issues/36), which has no comments. Each open check needs a new date or a waiver written on #36.

| Check | Due | Status at the close | PO proposal |
| --- | --- | --- | --- |
| Upstash connected (preview + production) | 2026-11-15 | **Done**, but in iad1. It will be replaced by the EU database. | New line: EU database created and connected |
| Vercel logs: a test signup does not appear (#10, AC 4) | 2026-11-18 | Not done | Merge it with #11 B5 (same preview, same search) |
| Real Android and iPhone `.vcf` exports (B6) | 2026-11-20 | Not done | New date in Sprint 5, or a waiver |
| WhatsApp on Android, iPhone, desktop (Q7) | 2026-11-20 | Not done | New date in Sprint 5, or a waiver |
| Review decision 7 (shared number) | After B6 | Waiting on B6 | Unchanged |
| Legal review has started | 2026-11-26 | **Answered: not started** (on #11 and #12) | New date, set by the founder |
| Vercel logs on #11's preview (AC 6) | Before #11's merge | Not done (plan B not run) | Unchanged, after the EU database |
| Vercel logs in production | Day of #11's deployment | Not applicable yet | Unchanged |

## Décisions et actions en attente du fondateur

**Before #11 and #12 can be merged (the 4 steps):**

1. **Create the `contact@netgraph.app` mailbox**, and make sure someone reads it.
2. **Recreate the Upstash database in fra1 (Frankfurt)** and connect it to the Vercel project. Then confirm encryption at rest in the Upstash console. *Question:* should preview and production keep sharing one database (separated by the `preview:` prefix, ADR 0003), or should each get its own? The tech lead advises, and it should be decided before the new database is created.
3. **Give the name for `[RESPONSABLE]`**: your name, or the company's if it exists.
4. **Start the legal review**, and post one line on #11 when it has started. The reviewer should get: #12's text, the EU database, the API in iad1 (signups pass through the US before they are stored), Vercel's log retention for your plan, and the use of company and role to choose invitees.

**Then, for QA plan B:** a shareable link to #41's preview, and your checks B2–B5 in the Upstash console and the Vercel logs. After that, the tech lead re-reviews #43 and QA re-runs B1 and A1–A3 on #41's head.

**Decisions:**

5. **« SARL » before the name:** create the bug (draft below), or accept the limit?
6. **The landing page promises** (open since the Sprint 4 planning, question 2): are « Accès en 7 jours », « Invitation dans les 7 jours », « Les 100 premiers inscrits ont accès gratuitement pendant 3 mois, avec un onboarding personnalisé » and « Données 100% privées » true? The PO's view: « Données 100% privées » can no longer be said once signups are stored by Upstash and Vercel logs IP addresses. That is a fact about the copy, not a legal conclusion.
7. **The production form while #11 waits:** it fails for every visitor. Do you want to keep it as it is, or to say on the page that signups open soon (draft below)?
8. **#36:** a new date or a waiver for each open check (table above).

## Sprint 5 — proposition

**Dates (to confirm):** from the day you approve the scope, for one week. *Assumption: Sprint 4 shipped XS + S + S/M + a bug in one week, and this scope is the same size.*

**Candidate goal (following improvement 1, #11 and #12 are not in it):** « Ne lire sur la page d'accueil que des affirmations vraies — aucun faux avis, aucune vraie entreprise, aucune promesse non tenue — et retrouver une entreprise même si je tape son nom en minuscules. »

#11 and #12 are in the milestone as « en attente du fondateur ». If your 4 steps and plan B are done during the sprint, they join the goal and are merged: #12 first, then #11.

| Rank | Issue | Story | Size | Why this rank |
| --- | --- | --- | --- | --- |
| — | [#11](https://github.com/oussamaallaoui/netgraph-landing/issues/11) + [#12](https://github.com/oussamaallaoui/netgraph-landing/issues/12) | Carried over. S'inscrire à la beta depuis le site en production, and Comprendre comment mes données d'inscription sont utilisées | M + S (built). What is left: plan B, a re-review and the merge. | This has the most value: today every signup fails. It is outside the goal because it is blocked on your 4 steps, not on the team. |
| 1 | [#34](https://github.com/oussamaallaoui/netgraph-landing/issues/34) | Voir un exemple fictif sur la page d'accueil, sans vraies entreprises ni faux témoignages (and « © 2026 » in the footer) | S | Invented quotes attributed to people at real firms (McKinsey, CIH Bank, Deloitte…) are the most serious untrue claim left on the page. No dependency. The PO gives the fictional names on the issue before any code. |
| 2 | Draft | Lire sur la page d'accueil des promesses tenues (« Données 100% privées », « 7 jours » ×2, « 100 premiers… 3 mois ») | XS | Same problem as the « 47 ». It needs your answer to decision 6 first, so it is ranked after #34. It can ship in the same PR as #34. |
| 3 | Draft | Retrouver l'entreprise quand je tape son nom en minuscules (« chez atlas ») | S | This affects the core feature: anyone typing in lowercase gets nothing (*assumption: common on mobile, from the QA note on #42*). The unknown is over-matching on ordinary lowercase words, so it is ranked above the polish items to learn that early. The tech lead decides how. |
| 4 | Draft *(if decision 5 = bug)* | Ne pas expliquer un contact par la forme juridique saisie avant le nom de l'entreprise | XS | Noise in the ranking, not a false statement (PO comment on #35). The text is ready on #35. |
| 5 | Draft task | Retirer la police « Cal Sans » jamais chargée (`font-display`) | XS | Tech debt only, not visible to users (tech lead note on #45). Do it with any frontend PR. |
| — | Draft *(only if #11 is still blocked on day 3)* | Savoir que l'inscription à la beta n'est pas encore ouverte | XS | While #11 waits, visitors fill in a form that always fails. An honest message (for example « Les inscriptions ouvrent bientôt. ») is better than an error. The exact copy comes from the PO, with your agreement. Without the mailbox, no contact address can be given. |
| — | [#36](https://github.com/oussamaallaoui/netgraph-landing/issues/36) | Vérifications du fondateur, moved to Sprint 5 with new dates or waivers | task | Not a story. B6 and Q7 have been open since Sprint 2 and Sprint 3. |
| — | [#13](https://github.com/oussamaallaoui/netgraph-landing/issues/13) | Créer un compte NetGraph et me connecter | L | **Later.** It needs: the legal review (accounts are personal data), #11 live (retention is « jusqu'à la création d'un compte »), the tech lead's ADR on the sign-in method, any external service account that method needs (created by you), and a product decision on what an account stores, because ADR 0001 keeps contacts on the device. It must also be split into stories of a few days each before planning. |

**Capacity check:** S + XS + S + XS + XS for the goal, plus the end of #11/#12 if they are unblocked.

### Draft (not on GitHub): Lire sur la page d'accueil des promesses tenues · XS

En tant que visiteur, je veux que les promesses de la page d'accueil (délai, gratuité, confidentialité) soient vraies, afin de m'inscrire en sachant ce que j'obtiendrai.

**Critères d'acceptation**
- Étant donné la page d'accueil, quand elle s'affiche, alors aucun délai d'accès (« 7 jours ») n'apparaît, sauf si le fondateur a confirmé qu'il est tenu.
- Étant donné le bloc des 100 premiers inscrits, quand il s'affiche, alors il ne décrit que l'offre confirmée par le fondateur, ou il n'existe plus.
- Étant donné les garanties en bas de page, quand elles s'affichent, alors « Données 100% privées » est remplacé par une phrase vraie, validée par le PO, qui renvoie à `/confidentialite` une fois #12 en production.
- Étant donné les textes modifiés, quand QA les lit à 375 px et 1280 px, alors ils vouvoient le visiteur et suivent le design system.

**Hors périmètre**
- Une nouvelle offre commerciale, ou un compteur d'inscrits.

**Notes**
- The exact texts depend on decision 6. The PO gives them on the issue before any code.

### Draft (not on GitHub): Retrouver l'entreprise quand je tape son nom en minuscules · S

En tant que professionnel, je veux que NetGraph reconnaisse l'entreprise que je cite même si je l'écris en minuscules (« chez atlas »), afin de voir qui peut me présenter sans faire attention aux majuscules.

**Critères d'acceptation**
- Étant donné les contacts d'exemple, quand je saisis « Rencontrer quelqu'un chez atlas », alors le résultat est identique à celui de « chez ATLAS ».
- Étant donné « chez oasis », « chez exempla » et « chez démo », quand je les saisis, alors le résultat est identique à celui de la même demande avec une majuscule.
- Étant donné un mot courant en minuscules après « chez » (par exemple « chez finance », « chez moi »), quand je le saisis, alors aucune section ne s'ouvre.
- Étant donné une demande en minuscules, quand QA observe les requêtes réseau, alors ni la demande ni les contacts ne quittent l'appareil.

**Hors périmètre**
- Les fautes de frappe, les noms partiels à l'intérieur d'un mot (« chez atl »).

**Notes**
- QA note 1 on PR #42. `known-issues.md`, « the name must start with an uppercase letter ». The over-matching risk is for the tech lead to assess. If it is high, the PO narrows the criteria.

### Draft (not on GitHub): Savoir que l'inscription à la beta n'est pas encore ouverte · XS

En tant que visiteur, je veux savoir avant de remplir le formulaire que les inscriptions ne sont pas encore ouvertes, afin de ne pas perdre mon temps sur un formulaire qui échoue.

**Critères d'acceptation**
- Étant donné la page d'accueil en production, quand le visiteur arrive au formulaire, alors un texte lui indique que les inscriptions ouvrent bientôt, et aucun champ ne lui demande ses données.
- Étant donné ce texte, quand le visiteur le lit, alors il ne promet aucune date.
- Étant donné #11 mergée, quand le formulaire réel est en production, alors ce texte n'apparaît plus.
- Étant donné le nouveau texte, quand QA le lit à 375 px et 1280 px, alors il vouvoie le visiteur, suit le design system, et a un contraste ≥ 4,5:1.

**Hors périmètre**
- Une liste d'attente, ou toute collecte d'adresse en dehors de #11.

**Notes**
- Only if #11 is still blocked on day 3 of the sprint. It is thrown away when #11 ships.

The bug for « SARL » before the name is already written in full on [#35](https://github.com/oussamaallaoui/netgraph-landing/issues/35#issuecomment-6941141489).

### Risks

- **Signup in production slips for another sprint.** It depends only on your 4 steps now. Every week it slips, the landing page keeps sending visitors to a form that fails.
- **The privacy page and the API region.** The page says the data is stored in Frankfurt, which is true after the move. But the request goes through Vercel in iad1 (US) before it is stored. Whether that needs to be said or authorised is for the legal reviewer to judge. *Assumption, not a legal conclusion.*
- **Plan B could find a problem late.** Real persistence, concurrency and logs have only been checked in tests and locally. Plan B runs only after the EU database exists, so close to the merge.
- **The lowercase story can over-match.** Ordinary lowercase words after « chez » could open sections. Criterion 3 guards against this, and the tech lead sizes the risk before work starts.
- **#9 is still in production without real-device checks** (B6, Q7). This has been the case since 2026-11-08.
- **Browser incidents** can produce wrong QA evidence until improvement 2 is applied by every agent.
