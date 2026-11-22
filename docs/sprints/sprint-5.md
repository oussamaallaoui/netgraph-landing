# Sprint 5

> **Approved on 2026-11-22** by the founder: scope and goal as proposed in [`sprint-4.md`](sprint-4.md#sprint-5--proposition), plus the « bientôt ouvertes » notice on day 1. Milestone: [Sprint 5](https://github.com/oussamaallaoui/netgraph-landing/milestone/5), due 2026-12-06.

- **Dates:** 2026-11-22 → 2026-12-06
- **Team:** dev-frontend, dev-backend, qa-engineer (+ tech lead review, PO)

## Objectif

« Ne lire sur la page d'accueil que des affirmations vraies — aucun faux avis, aucune vraie entreprise, aucune promesse non tenue — et retrouver une entreprise même si je tape son nom en minuscules. »

Following Sprint 4 improvement 1, #11 and #12 are not in the goal. They are in the milestone as « en attente du fondateur ». If the 4 steps and plan B are done during the sprint, they join the goal and are merged: #12 first, then #11.

## Stories (in order)

| Rank | Issue | Story | Size | Owner | Why this rank |
| --- | --- | --- | --- | --- | --- |
| 1 | [#47](https://github.com/oussamaallaoui/netgraph-landing/issues/47) | Savoir que les inscriptions à la beta ne sont pas encore ouvertes | XS | frontend | Day 1 (founder decision 3). Every visitor who fills in the form today gets an error. No data is collected until #11 ships. Must not conflict with PR #41; #41 restores the form ([checklist on #11](https://github.com/oussamaallaoui/netgraph-landing/issues/11#issuecomment-7077850032)). |
| 2 | [#48](https://github.com/oussamaallaoui/netgraph-landing/issues/48) | Lire sur la page d'accueil des promesses tenues | XS | frontend | Untrue promises on the page (founder decision 2). Same section as #47: same PR, or right after it. |
| 3 | [#34](https://github.com/oussamaallaoui/netgraph-landing/issues/34) | Voir un exemple fictif sur la page d'accueil, sans vraies entreprises ni faux témoignages | S | frontend | Invented quotes attributed to people at real firms: the most serious untrue claim left. The fictional names are now on the issue. |
| 4 | [#49](https://github.com/oussamaallaoui/netgraph-landing/issues/49) | Retrouver l'entreprise quand je tape son nom en minuscules | S | backend | The core feature misses lowercase names. The unknown is over-matching on ordinary words, so dev-backend starts it on day 1, in parallel with ranks 1–3, to learn that early. |
| 5 | [#50](https://github.com/oussamaallaoui/netgraph-landing/issues/50) | Ne pas expliquer un contact par la forme juridique saisie avant le nom de l'entreprise *(bug)* | XS | backend | Noise in the ranking, not a false statement (founder decision 4: create it). After #49, same area of the code. |
| 6 | [#51](https://github.com/oussamaallaoui/netgraph-landing/issues/51) | Retirer la police « Cal Sans » jamais chargée *(task)* | XS | frontend | Tech debt, invisible to users. With any frontend PR of the sprint. |
| — | [#11](https://github.com/oussamaallaoui/netgraph-landing/issues/11) + [#12](https://github.com/oussamaallaoui/netgraph-landing/issues/12) | S'inscrire à la beta depuis le site en production · Comprendre comment mes données d'inscription sont utilisées | M + S (built) | — | **En attente du fondateur** (the 4 steps in `sprint-4.md`). Outside the goal. |
| — | [#36](https://github.com/oussamaallaoui/netgraph-landing/issues/36) | Vérifications du fondateur | task | founder | Dates unchanged until the founder says which checks get a new date and which are waived ([question on #36](https://github.com/oussamaallaoui/netgraph-landing/issues/36#issuecomment-7077849872)). |

**Capacity check:** XS + XS + S + S + XS + XS, on two parallel tracks (frontend: #47, #48, #34, #51; backend: #49, #50). *Assumption: Sprint 4 shipped XS + S + S/M + a bug in one week, so this fits in the two weeks, with room for the end of #11/#12 if they are unblocked.*

## Décisions du fondateur (2026-11-22)

1. **Scope and goal** approved as proposed. Milestone « Sprint 5 », due 2026-12-06.
2. **Landing promises:** « Accès en 7 jours », « Invitation dans les 7 jours », « Les 100 premiers inscrits ont accès gratuitement pendant 3 mois… » and « Données 100% privées » are not true. They are removed or reworded to what NetGraph does (#48, exact texts on the issue).
3. **The failing form** is replaced now by a « inscriptions bientôt ouvertes » notice (#47), in scope on day 1. No data is collected until #11 ships. PR #41 restores the form when it merges.
4. **« SARL » before the company name:** the bug is created (#50).
5. **#36:** « mixed », without details. Dates unchanged; the PO asked on #36 which checks get a new date and which are waived.

## Working rules for this sprint (from the Sprint 4 retro)

1. The goal names only what the team can finish alone. A story waiting on an outside step stays « en attente du fondateur ».
2. One browser agent at a time, in its own tab and on its own port, never the founder's `localhost:3000`. If the pane refuses `localhost`, the agent stops and reports.
3. An interrupted agent is restarted fresh from the « où j'en suis » comment on its issue. Agents edit GitHub with `gh api -X PATCH`.

## Risks

- **#47 and PR #41 touch the same section.** If #47's PR edits the lines #41 deletes, #41 gets a conflict. The need is on #47; the tech lead decides how.
- **The copy says « Ils restent sur votre appareil » and « Essai sans inscription ».** Both are true today for `/essayer` (ADR 0001). They become false if contacts ever go to a server (#13 and later); the copy must change then.
- **#49 can over-match** ordinary lowercase words after « chez ». Criterion 3 guards against it; the tech lead sizes it before work starts.
- **The fictional names in #34** were not checked against any company register. *Assumption: coined names are unlikely to belong to a real firm.*
- **Signup in production slips again.** It depends only on the founder's 4 steps.
- **#9 is still in production without real-device checks** (B6, Q7), since 2026-11-08.

## Questions ouvertes pour le fondateur

1. **#36:** for each open check, a new date (before 2026-12-06) or a waiver, on the issue.
2. **Is the beta free?** All « gratuit » mentions are removed by default (#47, #48, #41). If you confirm the beta is free, « gratuite » can come back.
3. **Fictional names (#34):** veto any name on the issue before dev-frontend starts it.
4. **The 4 steps for #11/#12** (mailbox, EU database, `[RESPONSABLE]`, legal review): any date?
