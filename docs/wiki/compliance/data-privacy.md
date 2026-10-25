# Data and privacy

> This page records the team's rules. It isn't legal advice; have a lawyer check it before launch.

NetGraph handles personal data of two kinds of people: **users** (who signed up and consented) and **their contacts** (who never signed up). The second group needs the most care.

## Laws that apply

- **Morocco: law 09-08** on the protection of personal data, supervised by the **CNDP** (Commission nationale de contrôle de la protection des données à caractère personnel). Processing personal data generally requires a declaration or authorisation from the CNDP before launch.
- **EU: GDPR**, for users or contacts in the European Union.

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

The landing page collects email, name, company and role, with a promise of "Données 100% privées". Until the issues in [Known issues](../engineering/known-issues.md) are fixed, that promise isn't fully kept: the subscriber list is exposed by `GET /api/subscribe` and emails are logged.
