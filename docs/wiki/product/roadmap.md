# Roadmap

As of 2026-10-27. The Product Owner keeps this page in sync with the backlog (GitHub Issues and sprint milestones). It's a direction, not a commitment.

## Done

- Landing page live on Vercel: https://netgraph-landing.vercel.app (request → path → introduction demo, agent section, beta signup form)
- Design system: https://claude.ai/artifact/45uF2g3EoYxJvm2TaM48VB
- Sprint team set up: see [Team and sprint workflow](../../TEAM.md)
- Project wiki in `docs/wiki/`

## Now: Sprint 1 (2026-10-27 → 2026-11-02)

Goal: import LinkedIn connections, write a need, see who can help and why (and who can introduce you at a company), send a drafted message yourself, with contacts never leaving the device. Public on production at `/essayer`. See [Sprint 1](../../sprints/sprint-1.md) and [ADR 0001](../../adr/0001-local-first-contacts.md).

- [#5](https://github.com/oussamaallaoui/netgraph-landing/issues/5) Importer mes relations LinkedIn sur mon appareil
- [#6](https://github.com/oussamaallaoui/netgraph-landing/issues/6) Décrire mon besoin et voir qui peut m'aider
- [#7](https://github.com/oussamaallaoui/netgraph-landing/issues/7) Voir qui peut me présenter dans une entreprise
- [#8](https://github.com/oussamaallaoui/netgraph-landing/issues/8) Recevoir un message rédigé et l'envoyer moi-même
- [#9](https://github.com/oussamaallaoui/netgraph-landing/issues/9) (Stretch) Importer les contacts de mon téléphone et écrire sur WhatsApp

## Next

- [#10](https://github.com/oussamaallaoui/netgraph-landing/issues/10) Secure the subscribe API: no public subscriber list, no emails in logs. **Must ship before or with #11.**
- [#11](https://github.com/oussamaallaoui/netgraph-landing/issues/11) Working beta signup in production (Upstash Redis; blocked until the founder creates the database). The form fails on Vercel today, see [Known issues](../engineering/known-issues.md).
- [#12](https://github.com/oussamaallaoui/netgraph-landing/issues/12) Privacy notice for the signup form (and the local-first import)
- [#13](https://github.com/oussamaallaoui/netgraph-landing/issues/13) User accounts and sign-in
- Phone contacts + WhatsApp, if #9 slips; WhatsApp chat export for the « rythme d'échange »; AI-assisted matching and drafts with opt-in (Sprint 2 candidates in the sprint plan)

## Later

- Contacts stored server-side (sync across devices), with encryption at rest and account deletion
- Second-degree paths through opted-in users
- Link strength from interaction frequency
- Agent suggestions of who to get back in touch with, and when
- More sources (Excel/CSV, Instagram)
- Business model after the free beta
