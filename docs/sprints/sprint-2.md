# Sprint 2

> **Closed on 2026-11-07, with the founder's approval.** Runs 2026-11-03 → 2026-11-09. Milestone: [Sprint 2](https://github.com/oussamaallaoui/netgraph-landing/milestone/2) (due date on GitHub: 2026-11-08). Committed stories: #7 and #8, both carried over from Sprint 1. #10 was meant to carry the second half of the goal, but it was never added to the milestone.

- **Length:** one week
- **Team:** dev-frontend, dev-backend, qa-engineer (+ tech lead review, PO)

## Objectif

« Voir qui peut m'aider, qui peut me présenter dans l'entreprise visée, et envoyer moi-même un message rédigé — et l'inscription beta n'expose plus aucune donnée. »

**Result: first half met (pending QA's verdict on #8 in production), second half not met.** The second half depended on #10, which the founder has not decided on yet.

## Bilan

| Story | Size | PR | Status | QA |
| --- | --- | --- | --- | --- |
| [#7 Voir qui peut me présenter dans une entreprise](https://github.com/oussamaallaoui/netgraph-landing/issues/7) | S | [#25](https://github.com/oussamaallaoui/netgraph-landing/pull/25) | **Livrée**, merged 2026-11-01 | **QA OK in production** ([verdict](https://github.com/oussamaallaoui/netgraph-landing/pull/25#issuecomment-6578218861)) |
| [#8 Recevoir un message rédigé et l'envoyer moi-même](https://github.com/oussamaallaoui/netgraph-landing/issues/8) | M | [#26](https://github.com/oussamaallaoui/netgraph-landing/pull/26) | **Livrée**, merged 2026-11-02 | **Partiel** (production, 2026-11-07): [QA partiel](https://github.com/oussamaallaoui/netgraph-landing/pull/26#issuecomment-6708873824) |
| [#10 Protéger les données des inscrits à la beta](https://github.com/oussamaallaoui/netgraph-landing/issues/10) | S | — | **Non engagée**: never in the milestone, founder decision pending | — |

### #7 — Voir qui peut me présenter dans une entreprise

- A request that names a company in the user's file shows « Qui peut vous présenter chez … » above the #6 results, with a neutral sentence per person. Variants of the name (« ATLAS CONSEIL SA », « Oasis Capital Démo SARL ») are grouped under the most frequent spelling. An absent company shows a clear notice and no one is invented.
- The acceptance criteria are the ones in « Précisions PO Sprint 2 » ([comment](https://github.com/oussamaallaoui/netgraph-landing/issues/7#issuecomment-6557578317)), which replaced the Sprint 1 issue body. « Préparer un message » on introducer cards moved to #8 ([PO comment](https://github.com/oussamaallaoui/netgraph-landing/issues/7#issuecomment-6557782141)).
- Tech lead: changes requested, then [approved](https://github.com/oussamaallaoui/netgraph-landing/pull/25#issuecomment-6557815056) (340 tests passing).
- QA in production: all 5 criteria pass, network checked (no request during searches), keyboard and 375 px checked, no new bug. #23 also affects introducer cards (same card component).
- **Accepted limit:** partial company names (« chez ATLAS » for « Atlas Conseil ») show neither a section nor the « absent » notice, so the screen never contradicts the #6 list. Opening the section on a partial name is a separate story (draft below, founder decision pending).

### #8 — Recevoir un message rédigé et l'envoyer moi-même

- « Préparer un message » on every #6 result card (help draft) and every #7 introducer card (introduction draft naming the company). The draft can be edited and the tone switched (« Vous » / « Tu »). The hand-offs are « Copier », « Ouvrir le profil LinkedIn » and « Ouvrir dans votre messagerie ». « NetGraph n'envoie rien à votre place. C'est vous qui envoyez le message. » is always visible. **No element in NetGraph is labelled « Envoyer ».**
- The landing page's demo card said « Envoyer sur WhatsApp → ». It now says « Ouvrir dans WhatsApp → » (fixed in PR #26).
- Tech lead: changes requested, then [approved](https://github.com/oussamaallaoui/netgraph-landing/pull/26#issuecomment-6578307401) (470 tests passing).
- QA: the [test plan](https://github.com/oussamaallaoui/netgraph-landing/issues/8#issuecomment-6578201536) was posted; the verdict in production is **partiel** ([QA partiel](https://github.com/oussamaallaoui/netgraph-landing/pull/26#issuecomment-6708873824)): every criterion passes in Chromium with no bug; still to check on the founder's own devices: real paste (Safari, Firefox, iOS, Android), the mail app opening, « Ouvrir le profil LinkedIn » in a new tab, and a real screen reader.
- Accepted limits (wiki known-issues, « Drafts (#8, Sprint 2) »): `mailto:` capped at 2,000 characters, drafts lost on reload (only the tone is kept), open editors close on a new search, clipboard needs https.

### Confirmation PO : « Objet » dans le cas « trop long »

**Confirmed.** The tech lead's decision on PR #26 stands: the « Objet » field stays visible whenever the contact has a valid email, including when the message is too long for « Ouvrir dans votre messagerie ». A field that disappears while the user types in it (losing focus and text) is worse than a field that is not used for that hand-off, and the user can still copy the subject. This replaces PO §5 on that point. The line in `docs/wiki/engineering/known-issues.md` that says « pending PO confirmation » should be updated in the next code PR.

### #10 — not met

#10 was planned as the second half of the goal but was never added to the milestone, because the founder has not decided on it. The issue is still dormant: on 2026-11-07, `GET /api/subscribe` in production returned an empty list (0 subscribers). The rule from Sprint 1 still holds: #10 ships with or before #11, never after.

## Démo

On https://netgraph-landing.vercel.app/essayer, with fake data only:

1. Click « Essayer avec des contacts d'exemple ». The 30 fictional contacts load and are labelled as examples.
2. Type « Trouver ma prochaine mission de conseil en finance » and confirm. Up to 10 people show, each with « Pourquoi cette personne ».
3. On Sara Démo's card, click « Préparer un message ». The draft names Sara, her position and the request. Show « NetGraph n'envoie rien à votre place », switch to « Tu », edit one sentence, then « Copier » and « Ouvrir le profil LinkedIn ».
4. Type « Rencontrer le DAF de Atlas Conseil ». The section « Qui peut vous présenter chez Atlas Conseil » lists Nadia Fictif, Sara Démo and Youssef Exemple; Youssef's file says « ATLAS CONSEIL SA » and he is still recognised.
5. On Youssef Exemple, click « Préparer un message ». The introduction draft (« mise en relation ») names Atlas Conseil. Copy it, then end with « Effacer mes données de cet appareil ».

## Rétro

### Facts

- 2 stories committed (#7 S, #8 M), 2 shipped to production. #10 was never in the milestone.
- **New branching:** one branch per story, both devs push to it, no stubs. That gave 2 PRs and 2 founder merges, instead of 6 code PRs in Sprint 1 (#15–#19, #24).
- Dev work started before Monday: on GitHub, PR #25 was merged on 2026-11-01 and PR #26 on 2026-11-02, both before the official start on 2026-11-03.
- Both PRs were merged by the founder **before QA's verdict**. QA then tested in production: #7 OK, #8 partiel (no bug; real-device checks left to the founder). The tech lead's second approval on #26 is timestamped 2 seconds after the merge.
- The founder interrupted the work twice (« stop »).
- The 4 bugs filed in Sprint 1 (#20–#23) are still open. None was planned in Sprint 2.
- Tests went from 323 (first review of #7) to 470 (approval of #8).

### What went well

- **The branching change worked:** fewer PRs, fewer merges, no stub code to remove, and #8 could add « Préparer un message » to the #7 cards in the same flow.
- **The PO's « Précisions Sprint 2 » comments** fixed the copy and criteria before code. Review and QA checked against one source, and decisions were recorded on the issues.
- **The tech lead's reviews caught real problems before production** (for example, false « absent » notices on #7).
- **QA used an oracle method**: each request was run against the library locally and compared with production. It also checked the network, the keyboard, 375 px and contrast on every criterion.
- **The non-negotiable « the user sends » is now visible everywhere**, including the landing page copy.

### What didn't go well

- **Merging before QA.** Production became the test environment. #7 turned out fine, but a failing #8 would now be public (Sprint 1 decision: everything ships publicly).
- **The goal promised something the milestone didn't contain.** Half of the goal depended on an undecided story, so it could not be met.
- **Sprint boundaries blurred.** Work started and merged before the sprint started, the Sprint 1 milestone is still open, and #9 still sits in it.
- **Two « stop » interruptions.** The team did not have a clear point at which to pause for the founder's go.
- **Bugs aged.** #20 is about the core privacy promise (« Vos contacts restent sur cet appareil ») being below the fold, and it has been open since 2026-10-31.

### 3 improvements for Sprint 3

1. **No merge without QA's verdict on the PR.** QA posts OK or KO on the PR. If the founder wants to merge earlier, they write that waiver on the PR. QA on production remains a second check, not the only one.
2. **The goal only names what is in the milestone.** On day 1, every story the goal depends on is in the milestone, or the goal is rewritten. Undecided stories go under « Décisions en attente » with a deadline.
3. **Fixed founder checkpoints.** There are three: scope approval on day 1 (no code before it), merge, and sprint close. Between them, the founder's « stop » becomes a comment on the issue, and the PO turns it into a scope change.

## Décisions en attente du fondateur

1. **#10 Protéger les données des inscrits à la beta.** Proposed as the first story of Sprint 3. It is small, and it unblocks #11 (signup in production).
2. **#22 Entreprise citée avec sa forme juridique.** Proposed behaviour: « SARL », « SA », « SAS », « Co »… belong to the company name and do not count as a free word. Should it go into Sprint 3?
3. **Story « nom partiel »** (draft below): create it as an issue, and decide whether it goes in Sprint 3 or the backlog.
4. **Merge policy:** do you agree to wait for QA's verdict before merging (improvement 1)?
5. **For #9:** a real `.vcf` exported from an Android phone and one from an iPhone, checked **locally only** by the tech lead and never committed.
6. **Still open from Sprint 1:** 5–10 real requests (anonymised), a real `Connections.csv` (local check only), and a legal review before any broad promotion.
7. ~~« Objet » visible in the « trop long » case~~ **Resolved:** PO confirmed (see Bilan), nothing to decide.

### Draft (not on GitHub): Retrouver l'entreprise quand je la cite par un nom court · S/M

En tant que professionnel, je veux que NetGraph reconnaisse l'entreprise que je vise quand je la cite par un nom court (par exemple « chez ATLAS » pour « Atlas Conseil »), afin de voir qui peut me présenter sans retrouver le nom exact du fichier.

**Critères d'acceptation**
- Étant donné les contacts d'exemple, quand je saisis « Rencontrer quelqu'un chez ATLAS », alors la section « Qui peut vous présenter chez Atlas Conseil » s'affiche avec les mêmes personnes que pour « chez Atlas Conseil ».
- Étant donné un nom court qui correspond à plusieurs entreprises de mon fichier, quand je le cite, alors chaque entreprise est nommée et aucune personne n'est présentée comme travaillant dans une entreprise qui n'est pas la sienne.
- Étant donné un mot générique (par exemple « chez Finance »), quand je le cite, alors aucune section ne s'ouvre, comme aujourd'hui.
- Étant donné un nom court absent de mon fichier, quand je le cite, alors l'avis « absent » ne contredit jamais la liste des personnes qui peuvent m'aider affichée dessous.
- Étant donné une demande avec un nom court, quand QA observe les requêtes réseau, alors ni la demande ni les contacts ne quittent l'appareil.

**Hors périmètre**
- Fautes de frappe et correspondance approximative, désigner la personne cible dans l'entreprise, contacts de 2e degré.

**Notes**
- Today these requests show nothing on purpose (PO decision of 2026-11-01, wiki known-issues). QA's cases with « chez ATLAS » and « chez Oasis » are the reference.

## Sprint 3 — proposition

**Dates (assumption):** 2026-11-10 → 2026-11-16.

**Candidate goal:** « Importer les contacts de mon téléphone et ouvrir mon brouillon dans WhatsApp pour l'envoyer moi-même — et l'inscription beta n'expose plus aucune donnée. »

The goal only holds if the founder puts #10 in the milestone on day 1. Otherwise, the part after the dash is dropped.

| # | Story | Size | Why this rank |
| --- | --- | --- | --- |
| 1 | #10 Protéger les données des inscrits à la beta | S | Unmet half of Sprint 2's goal. Small, and it unblocks #11. |
| 2 | #9 Importer les contacts de mon téléphone et ouvrir le brouillon dans WhatsApp | M | WhatsApp is where most exchanges happen in Morocco (assumption from the Sprint 1 plan, not measured). It has the most unknowns (vCard formats from Android and iPhone, number formats, merging with LinkedIn), so it starts on day 1. The title and body should drop « (Stretch) » and « envoyer le brouillon sur WhatsApp » in favour of « ouvrir … et l'envoyer moi-même ». |
| 3 | #20 La mention « Vos contacts restent sur cet appareil » doit être visible sans défiler | S | The core privacy promise must be seen. |
| 4 | #23 Lecteur d'écran : élision « d'Anas » | XS | Affects every card, both #6 and #7. |
| 5 | #21 Zones tactiles de 44 px sur /essayer en mobile | XS | Mobile is the main device for the WhatsApp story. |
| 6 | #22 Forme juridique dans l'entreprise citée *(if the founder decides)* — or the « nom partiel » draft *(stretch)* | S | Matching quality on the introduction path. |

Capacity check: S + M + S + XS + XS (+ S) is close to Sprint 2 (S + M) plus small bugs. *Assumption: the team can absorb the bugs because they are small.* If #9 slips, it is the only story in the sprint at risk.

### Risks

- **#9 depends on real `.vcf` files** we do not have yet; formats differ by phone and language.
- **Merging before QA** would put an untested WhatsApp hand-off in public production.
- **#10 stays undecided**, and the goal is half-missed for the second sprint in a row.
- **The signup issue is dormant, not fixed**: it becomes live as soon as someone touches signup storage (#11).
