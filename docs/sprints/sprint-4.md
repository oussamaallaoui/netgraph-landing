# Sprint 4

> **Approved by the founder on 2026-11-15** (« approve Sprint 4 as proposed »). Following improvement 3 of the Sprint 3 retro, the sprint starts on the day of approval. Milestone: [Sprint 4](https://github.com/oussamaallaoui/netgraph-landing/milestone/4), due 2026-11-29.

- **Dates:** 2026-11-15 → 2026-11-29 (two weeks)
- **Team:** dev-frontend, dev-backend, qa-engineer (+ tech lead review, PO)

## Objectif

« M'inscrire à la beta depuis le site en production en sachant quelles données je confie, sans que personne puisse savoir que je suis inscrit — et la page d'accueil ne promet que ce que NetGraph fait. »

The goal holds because Upstash is connected (decision 8). One condition remains: #11 is merged only after the founder confirms that the legal review has started (decision 9). If that confirmation has not arrived by the close, #11 stays open as a finished PR. The goal then counts as **partly met**, and we say so in the demo notes.

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

## Démo

*To be written at the close.*

## Rétro

*To be written at the close.*
