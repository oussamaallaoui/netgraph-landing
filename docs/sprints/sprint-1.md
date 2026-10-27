# Sprint 1

> **Approved by the founder on 2026-10-27.** Runs 2026-10-27 → 2026-11-02. Milestone: [Sprint 1](https://github.com/oussamaallaoui/netgraph-landing/milestone/1). Committed stories #5–#9 (#9 is stretch); backlog stories #10–#13 have no milestone.

- **Length:** one week
- **Team:** dev-frontend, dev-backend, qa-engineer (+ tech lead review, PO)

## Sprint goal

A professional can import their LinkedIn connections, write what they need, see who in their own network can help and why (and who can introduce them at a target company), then send a drafted message themselves, with their contacts never leaving their device.

## Décisions du fondateur (2026-10-27)

- **Plan approuvé** : le plan local-first (stories #5 à #8, plus #9 en stretch) et le backlog A–D (#10 à #13).
- **Public sur la production** : la fonctionnalité est livrée publiquement sur https://netgraph-landing.vercel.app, pas sur une page non référencée. Conséquence : chaque merge sur `master` est immédiatement visible par tous, donc chaque story doit être présentable seule au moment du merge.

**Encore attendu du fondateur :**
1. 5 à 10 demandes de référence réelles (anonymisées, sans vrais noms) pour régler le matching et construire la liste de référence de QA.
2. Un vrai export LinkedIn (`Connections.csv`), à vérifier **en local uniquement** par le tech lead, et **jamais commité**. QA utilise uniquement le jeu de données fictif.
3. Une relecture juridique (lecture local-first de la loi 09-08 / RGPD et mention de confidentialité) **avant toute promotion large** du produit.

## Why this plan

- **The core promise, end to end, in one week.** Request → people who can help, with a reason → drafted message the user sends. That is what the founder can demo and what a tester can judge.
- **Local-first.** Contacts are read, matched and stored only in the user's browser. Nothing about contacts is sent to or stored on our server. That way:
  - we don't need accounts, a database or the storage fix first (the previous stories stay in the backlog below);
  - we greatly reduce our legal exposure for non-users' data (law 09-08 / GDPR). *Assumption, not legal advice: a lawyer should confirm that processing only on the user's device keeps NetGraph out of most obligations.*
- **One source first: the LinkedIn export (Connections.csv).** Users can download it themselves today, without scraping. It has the fields that matter for a professional need (company, position). Phone contacts (vCard) mostly lack those fields but bring phone numbers for WhatsApp: that's a stretch story. A WhatsApp chat export is per conversation and its date format depends on the phone's language, so it goes to Sprint 2.
- **No AI service this sprint.** Matching and drafts work with rules and templates in the browser. Sending contact fields to a third-party AI is a privacy decision that needs consent and a privacy notice, so it's a Sprint 2 candidate with constraints (see below).
- **Honest scoring.** We have no interaction data yet. "Connected on" is not link strength, so we don't show a « force du lien » score this sprint.

### Who does what (for the tech lead to confirm)

- **dev-backend:** the parsing, matching and draft-generation logic, as pure functions that run in the browser, plus the test setup (no test runner exists yet). This logic is "imports, matching, agent logic" in `docs/TEAM.md`.
- **dev-frontend:** the import screen, the request screen, the results and the draft editor.
- **qa-engineer:** uses a shared sample dataset with obviously fake people and a list of reference requests with expected results, agreed with the PO on day 1.

### Tech lead breakdown (2026-10-27)

Confirmed: dev-backend owns `lib/` (parsing, matching, introducers, drafts, browser storage, test setup); dev-frontend owns `/essayer` and `components/essayer/`; qa-engineer owns the sample dataset sign-off, the reference requests and the network checks. Decisions: [ADR 0001](../adr/0001-local-first-contacts.md) (local-first, IndexedDB, « Effacer » path) and [Architecture](../wiki/engineering/architecture.md) (route `/essayer`, layout, Vitest 3.x, no runtime dependency). Tasks and contracts per story: [#5](https://github.com/oussamaallaoui/netgraph-landing/issues/5#issuecomment-6434378440), [#6](https://github.com/oussamaallaoui/netgraph-landing/issues/6#issuecomment-6434378844), [#7](https://github.com/oussamaallaoui/netgraph-landing/issues/7#issuecomment-6434379477), [#8](https://github.com/oussamaallaoui/netgraph-landing/issues/8#issuecomment-6434380132), [#9](https://github.com/oussamaallaoui/netgraph-landing/issues/9#issuecomment-6434380791).

| Day | dev-backend | dev-frontend | qa-engineer |
| --- | --- | --- | --- |
| Mon 27 | `chore/test-setup` PR (Vitest, fixtures, types) in the morning; then #5 CSV + LinkedIn parser | #5 `/essayer` shell, import screen on the sample data, landing link | #5/#6 test plans; sample dataset and reference requests agreed with the PO; network-check procedure |
| Tue 28 | #5 store + CSP header → lib PR; start #6 text, vocabulary, match | #5 preview, errors, « Effacer », persistence → #5 PR | Test #5 on the preview |
| Wed 29 | #6 tuning until the reference test passes + perf; #7 `companyKey`, introducers | #6 request form, results, empty state | Reference requests on the preview; **gate for #9** (#5–#8 all in review?) |
| Thu 30 | #8 drafts, `mailtoUrl`, LinkedIn URL; PO templates in | #7 section, #8 draft editor → #6, #7 PRs | Test #6, #7 |
| Fri 31 | Fixes; #9 only if the gate passed | #8 PR; fixes | Test #8; full demo script; `GET /api/subscribe` still empty on production |
| Sat–Sun | Buffer | Buffer | Buffer; PO writes demo notes |

Merge order for the founder: #5 and #6 the same day if possible (avoids a dead-end page on production), then #7, then #8.

## Committed stories (in order)

### 1. Importer mes relations LinkedIn sur mon appareil — #5 · M · `story` `frontend` `backend`

En tant que professionnel, je veux importer le fichier de mes relations LinkedIn afin que NetGraph puisse chercher dans mon réseau, sans que mes contacts quittent mon appareil.

**Critères d'acceptation**
- Étant donné la page d'import, quand je la consulte, alors je vois comment obtenir le fichier depuis LinkedIn (étapes courtes) et la mention claire « Vos contacts restent sur cet appareil : ils ne sont jamais envoyés à NetGraph ».
- Étant donné un fichier `Connections.csv` exporté de LinkedIn, quand je le dépose ou le sélectionne, alors je vois le nombre de relations importées et un aperçu (nom, poste, entreprise).
- Étant donné un fichier qui n'est pas un export LinkedIn valide, quand je l'importe, alors un message en français m'explique le problème et rien n'est importé.
- Étant donné un import réussi, quand QA observe les requêtes réseau du navigateur, alors aucune requête ne contient de donnée de contact.
- Étant donné un import réussi, quand je recharge la page sur le même appareil, alors je retrouve mes relations ; quand je clique sur « Effacer mes données de cet appareil », alors elles disparaissent complètement.
- Étant donné que je n'ai pas encore mon export, quand je clique sur « Essayer avec des contacts d'exemple », alors un jeu de contacts fictifs est chargé et signalé comme tel.

**Hors périmètre**
- Autres sources (vCard, Excel, WhatsApp), fusion des doublons, compte utilisateur, synchronisation entre appareils.

**Notes**
- LinkedIn's file starts with a few lines of notes before the header row, and email is often empty. The tech lead checks against a real export from the founder. The PO does not specify the format beyond that.
- Keep only what matching and drafts need: first name, last name, company, position, connected on, profile URL and email if present.
- Browser storage: the tech lead decides how, and whether to encrypt. The "encrypt at rest" team rule was written for our servers.
- Sample data: obviously fake names and companies, never real people.
- This deviates from the wiki ("accounts before any contact import"): **ADR required**, and the architecture and privacy pages must be updated.

### 2. Décrire mon besoin et voir qui peut m'aider — #6 · L · `story` `backend` `frontend`

En tant que professionnel, je veux écrire ce que je cherche et obtenir la liste des personnes de mon réseau qui peuvent m'aider, avec la raison, afin de savoir par qui commencer.

**Critères d'acceptation**
- Étant donné des relations importées, quand j'écris une demande (par exemple « Trouver ma prochaine mission de conseil en finance »), alors je vois au plus 10 personnes classées par pertinence, avec nom, poste et entreprise.
- Étant donné chaque personne proposée, quand je la consulte, alors une phrase « Pourquoi cette personne » cite ce qui correspond (par exemple « Directrice financière chez Atlas Conseil, secteur visé par votre demande »).
- Étant donné le jeu d'exemple et les demandes de référence définies avec QA, quand QA les lance, alors les personnes attendues figurent dans les 3 premiers résultats.
- Étant donné une demande sans correspondance, quand je la valide, alors un message m'aide à reformuler (exemples de demandes) au lieu d'une liste vide.
- Étant donné une demande, quand QA observe les requêtes réseau, alors ni la demande ni les contacts ne sont envoyés hors de l'appareil.
- Étant donné 5 000 relations importées, quand je valide une demande, alors les résultats s'affichent en moins de 2 secondes sur un ordinateur portable récent. *(Proposed target, not a measured figure.)*

**Hors périmètre**
- IA externe, contacts de 2e degré, force du lien, historique des demandes, plusieurs demandes ouvertes.

**Notes**
- This is the riskiest story, because ranking quality is the unknown: start it on day 1.
- The matching must understand the French and English job titles of the target sector (finance, conseil, banque, investissement): for example DAF / CFO / directeur financier, M&A, associé / partner. The PO provides the starter vocabulary; the tech lead decides the technique.
- Results must never show a person who isn't in the user's file.

### 3. Voir qui peut me présenter dans une entreprise — #7 · S · `story` `backend` `frontend`

En tant que professionnel, je veux savoir quels contacts travaillent dans l'entreprise que je vise afin de leur demander de me présenter à la bonne personne.

**Critères d'acceptation**
- Étant donné une demande qui cite une entreprise présente dans mes relations (par exemple « Rencontrer le DAF de Atlas Conseil »), quand je la valide, alors une section « Qui peut vous présenter chez Atlas Conseil » liste mes relations qui y travaillent.
- Étant donné chaque relation de cette section, quand je la consulte, alors une phrase explique le rôle, par exemple « Sara travaille chez Atlas Conseil : elle peut vous orienter vers la bonne personne ou vous présenter ».
- Étant donné des variantes d'un même nom d'entreprise (« Atlas Conseil », « ATLAS CONSEIL SA »), quand QA teste avec le jeu d'exemple, alors elles sont reconnues comme la même entreprise.
- Étant donné une entreprise absente de mes relations, quand je la cite, alors NetGraph l'indique clairement et n'invente personne.

**Hors périmètre**
- Désigner la personne cible inconnue à l'intérieur de l'entreprise, chemins via d'autres utilisateurs NetGraph (2e degré).

**Notes**
- Inferred only from the user's own file; consistent with the glossary's « introducteur » without any cross-user data.

### 4. Recevoir un message rédigé et l'envoyer moi-même — #8 · M · `story` `frontend` `backend`

En tant que professionnel, je veux un brouillon de message pour chaque personne proposée, que je peux modifier puis envoyer moi-même, afin de reprendre contact sans partir d'une page blanche.

**Critères d'acceptation**
- Étant donné une personne proposée (aide directe ou introduction), quand je clique sur « Préparer un message », alors un brouillon en français mentionne son prénom, ma demande et la raison du choix, avec un message différent pour une demande d'introduction.
- Étant donné le brouillon, quand je choisis le ton « Vous » ou « Tu », alors le texte s'adapte ; quand je le modifie, alors mes changements sont conservés jusqu'à l'envoi.
- Étant donné le brouillon, quand je clique sur « Copier », alors le texte est copié ; si la relation a un profil LinkedIn, « Ouvrir le profil LinkedIn » l'ouvre dans un nouvel onglet ; si elle a un email, « Envoyer par email » ouvre ma messagerie avec le texte pré-rempli.
- Étant donné n'importe quelle action sur le brouillon, quand QA vérifie, alors aucun message n'est jamais envoyé sans que j'appuie moi-même sur « Envoyer » dans mon application.
- Étant donné l'écran du brouillon, quand je le consulte, alors la mention « NetGraph n'envoie rien à votre place » est visible.

**Hors périmètre**
- Envoi automatique (jamais), rédaction par IA, WhatsApp (story 5), relances, suivi des réponses.

**Notes**
- Templates written by the PO, in French, following the design system's voice.
- LinkedIn has no official way to pre-fill a message, so the flow is copy + open the profile.
- The `mailto:` link carries the text to the user's own mail app. The tech lead confirms that the "no personal data in URLs" rule targets our URLs and analytics, not hand-offs to the user's own apps.

### 5. (Stretch) Importer les contacts de mon téléphone et écrire sur WhatsApp — #9 · M · `story` `backend` `frontend` `stretch`

Only if stories 1–4 are in review by mid-sprint; otherwise it goes first in Sprint 2.

En tant que professionnel au Maroc, je veux importer les contacts de mon téléphone afin de pouvoir envoyer le brouillon sur WhatsApp, où se passent la plupart de mes échanges.

**Critères d'acceptation**
- Étant donné un fichier `.vcf` exporté de mon téléphone (Android ou iPhone), quand je l'importe, alors je vois le nombre de contacts importés, avec la même mention « restent sur cet appareil ».
- Étant donné un contact présent à la fois dans LinkedIn et dans le téléphone sous le même nom, quand j'importe les deux, alors il n'apparaît qu'une fois, avec son poste et son numéro.
- Étant donné un brouillon pour une relation qui a un numéro, quand je clique sur « Ouvrir dans WhatsApp », alors WhatsApp s'ouvre avec le message pré-rempli et je l'envoie moi-même.
- Étant donné des numéros marocains écrits localement (06…, 07…), quand QA teste, alors le lien WhatsApp utilise le bon format international.

**Hors périmètre**
- Export de discussions WhatsApp, rythme d'échange, fusion avancée des doublons.

**Notes**
- Name-based merge is approximate; the tech lead decides the rule and the PO accepts some misses this sprint.

## Security issue on the beta signup (status this sprint)

- **Still dormant.** On Vercel, `POST /api/subscribe` fails when it writes `subscribers.json` (read-only filesystem). Nothing is saved, and the `console.log` with the email is never reached because it runs after the save. `GET /api/subscribe` returns an empty list, since `subscribers.json` is gitignored and absent from the deployment.
- **This sprint doesn't touch signup storage or `/api/subscribe`**, and no new server route receives contacts. So the issue stays dormant. QA will check that `GET /api/subscribe` on production still returns an empty list at the end of the sprint.
- **Rule: the security fix (backlog story A) must ship with or before any storage fix (backlog story B).** Never merge B alone.
- Side note: on a developer's machine the file is writable, so local runs do log emails locally. That's another reason to use only fake test emails.

## Sprint 2 candidates

- Importer les contacts de mon téléphone et écrire sur WhatsApp (if story 5 slips)
- Estimer mon rythme d'échange à partir d'un export de discussion WhatsApp
- Améliorer la recherche et les brouillons avec l'IA, avec mon accord (see constraints below)
- Importer un fichier Excel ou CSV quelconque
- Sauvegarder mes demandes et suivre mes prises de contact
- Backlog stories A–D below (secure + working beta signup, privacy notice, accounts)

**Constraints for any AI-based matching or drafting (for the tech lead to design within):**
- Explicit opt-in before each use, or a clear setting that can be switched off.
- Send only the minimum: the request plus position and company, with first name only if needed for the draft. Never send emails, phone numbers, profile URLs or the full list.
- No logging of requests or contact fields on our server.
- Check the provider's data-retention and training terms.
- Update the privacy page.
- The founder creates the API account and accepts its cost.

## Created on GitHub (2026-10-27)

- **Labels:** `story`, `task`, `frontend`, `backend`, `qa`, `blocked`, `stretch` (`bug` already existed)
- **Milestone:** [Sprint 1](https://github.com/oussamaallaoui/netgraph-landing/milestone/1), due 2026-11-02
- **Issues:** Sprint 1 #5, #6, #7, #8, #9 (stretch); backlog #10, #11 (blocked), #12, #13

## What we need from the founder

1. **A real LinkedIn export (`Connections.csv`) of your own**, for the tech lead to check the format locally. It must **never be committed**, and QA uses the fake sample data. A real `.vcf` from an Android phone and from an iPhone if story 5 starts.
2. ~~Approve the local-first approach~~ **Resolved 2026-10-27: plan approved.** The ADR itself is still to be written by the tech lead and reviewed by the founder.
3. ~~Where the feature lives~~ **Resolved 2026-10-27: public on production.**
4. **5–10 real requests** your target users would write, to tune matching and build the QA reference list (anonymised, no real names).

## Open questions

1. ~~Public or unlisted for this sprint?~~ **Resolved 2026-10-27: public on production.**
2. Should the landing page CTA change from "Rejoindre la beta" to "Essayer maintenant" while signups are still broken? *Assumption: keep the signup section, add a secondary "Essayer" link.*
3. Can the browser remember contacts between visits? (Assumption: yes, with a clear "Effacer" button.) Or would you rather forget them when the tab closes?
4. Do you want the AI candidate in Sprint 2, knowing it means sending some contact fields to a third party with consent?
5. Can a lawyer confirm the local-first reading of 09-08? Still pending; the founder asks for it before any broad promotion (see « Décisions du fondateur »).

## Risks

- **Ranking quality** is the core unknown. Keyword-style matching may feel weak on vague requests. Mitigation: reference requests from day 1, and a "reformuler" helper when results are poor.
- **The LinkedIn export may not be at hand.** The file can take from minutes to a day to arrive (*assumption, to check*), and email is usually missing. Mitigation: sample data and clear instructions.
- **Data leaving the device by accident**: error reporting, analytics or a server route added later. Mitigation: QA checks network requests on every story, and any new route needs tech lead review.
- **No test setup yet**: it eats day-1 capacity; budgeted in story 1.
- **Large files** (thousands of rows) could freeze the page. There is a performance criterion in story 2.
- **Doubtful legal reading** of local-first: still have the privacy note reviewed.
- **Security issue** becomes live if anyone touches signup storage: rule above.

## Demo

_To be written at the end of the sprint. Planned script: load sample data → "Trouver ma prochaine mission de conseil en finance" → top matches with reasons → "Rencontrer le DAF de Atlas Conseil" → introducers → edit a draft, copy, open the profile._

## Retro

_To be written at the end of the sprint._

---

## Backlog — later sprints

From the first draft of this plan. Kept as written; to re-prioritise in Sprint 2 planning.

### A. Protéger les données des inscrits à la beta — #10 · S · `story` `backend`

En tant qu'inscrit à la beta, je veux que mes coordonnées ne soient visibles par personne en dehors de l'équipe NetGraph afin de pouvoir faire confiance à la promesse « Données 100 % privées ».

**Critères d'acceptation**
- Étant donné un visiteur non authentifié, quand il appelle `GET /api/subscribe` sur la preview, alors il ne reçoit aucune adresse email, aucun nom, aucune entreprise ni aucun rôle (réponse 404/405 ou 401).
- Étant donné une inscription réussie, quand QA consulte les logs Vercel de la preview, alors aucune adresse email ni aucune autre donnée de l'inscrit n'y apparaît.
- Étant donné une erreur lors de l'inscription, quand elle est journalisée, alors le log ne contient aucune donnée personnelle de l'inscrit.
- Étant donné le formulaire de la page d'accueil, quand un visiteur s'inscrit, alors le parcours fonctionne comme avant (aucune régression visible).

**Hors périmètre**
- Interface d'administration pour consulter les inscrits (si l'équipe en a besoin, story séparée).

**Notes**
- Must ship **before or in the same release as** story B. Known issue in `docs/wiki/engineering/known-issues.md`.
- If the founder needs to read the list, the tech lead decides how (protected route, Upstash console…).

### B. S'inscrire à la beta depuis le site en production — #11 · M · `story` `backend` `frontend` `blocked`

En tant que professionnel intéressé, je veux m'inscrire à la beta depuis https://netgraph-landing.vercel.app afin d'être recontacté en priorité pour l'accès.

**Critères d'acceptation**
- Étant donné un email valide et le formulaire rempli, quand le visiteur valide, alors il voit « Vous êtes sur la liste ! » et l'inscription est conservée (toujours présente après un nouveau déploiement).
- Étant donné un email déjà inscrit, quelle que soit la casse ou des espaces autour, quand le visiteur valide, alors il voit « Cet email est déjà inscrit. On vous recontacte bientôt. » et aucun doublon n'est créé.
- Étant donné un email invalide, quand le visiteur valide, alors un message d'erreur en français s'affiche et rien n'est enregistré.
- Étant donné une panne du stockage, quand le visiteur valide, alors il voit un message d'erreur en français avec la possibilité de réessayer, sans perte de ce qu'il a saisi.
- Étant donné deux inscriptions envoyées en même temps, quand elles aboutissent, alors les deux sont conservées.

**Hors périmètre**
- Email de confirmation, double opt-in, anti-spam avancé.
- Migration d'anciennes inscriptions (aucune n'a pu être enregistrée en production).

**Notes**
- **Blocked until the founder creates the Upstash for Redis database in Vercel and connects it** to the project (production and preview environments).
- Store only email, name, company, role, date, source. Use fake test data (`test+qa1@netgraph.test`).
- The success screen shows the signup total ("Vous faites partie des N premiers"): decide whether to keep it.

### C. Comprendre comment mes données d'inscription sont utilisées — #12 · S · `story` `frontend`

En tant que visiteur, je veux savoir, avant de m'inscrire, quelles données sont collectées et pourquoi, afin de donner mon accord en connaissance de cause.

**Critères d'acceptation**
- Étant donné l'étape des coordonnées du formulaire, quand le visiteur la consulte, alors un court texte indique les données collectées, leur finalité (contact pour la beta) et comment demander leur suppression.
- Étant donné ce texte, quand le visiteur clique sur le lien « En savoir plus », alors une page de confidentialité en français s'ouvre et elle est accessible au clavier.
- Étant donné la page de confidentialité, quand elle s'affiche, alors elle donne un contact pour exercer ses droits (accès, rectification, suppression).
- Étant donné le nouveau texte, quand QA le vérifie, alors son contraste est ≥ 4,5:1 et il suit le design system (vouvoiement).

**Hors périmètre**
- Validation juridique et déclaration CNDP (action du fondateur).
- Bannière cookies (aucun traceur aujourd'hui, à confirmer par le tech lead).

**Notes**
- The founder provides or approves the privacy text and the contact address. The PO can draft it; it is not legal advice. The page should also describe the local-first import once it ships.

### D. Créer un compte NetGraph et me connecter — #13 · L · `story` `backend` `frontend`

En tant que testeur de la beta, je veux créer un compte et me connecter afin d'accéder à mon espace NetGraph.

**Critères d'acceptation**
- Étant donné un visiteur sans compte, quand il crée un compte avec son email, alors il arrive sur un espace « Mon réseau » (vide) qui affiche son email.
- Étant donné un compte existant, quand l'utilisateur se reconnecte depuis un autre navigateur, alors il retrouve son espace.
- Étant donné un utilisateur connecté, quand il clique sur « Se déconnecter », alors il revient à la page d'accueil et l'espace n'est plus accessible sans reconnexion.
- Étant donné un visiteur non connecté, quand il ouvre directement l'URL de l'espace, alors il est redirigé vers la connexion.
- Étant donné un email déjà utilisé ou des identifiants incorrects, quand l'utilisateur valide, alors un message clair en français s'affiche, sans révéler si un compte existe pour cet email.

**Hors périmètre**
- Suppression de compte, connexion via Google/LinkedIn, profil détaillé, réservation de l'accès aux seuls inscrits à la beta.

**Notes**
- The tech lead picks the sign-in method and writes an ADR. If it needs an external service, the founder creates that account.
- No passwords or emails in logs; account data is personal data (law 09-08).
- Needed before anything is stored server-side (sync across devices, second-degree paths).

### Other later items

- Supprimer mon compte et tous mes contacts importés (once anything is stored server-side)
- Recevoir un email de confirmation après l'inscription à la beta, avec anti-spam du formulaire
- Corriger les contrastes insuffisants et l'année du pied de page
