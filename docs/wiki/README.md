# NetGraph wiki

Everything the team needs to know about NetGraph, kept next to the code. Pages are plain Markdown and change through pull requests, like code.

> **This repository is public.** Never put secrets, personal data, real contact lists or private business figures in the wiki.

## Product

- [Vision](product/vision.md): what NetGraph does, for whom, and why
- [Glossary](product/glossary.md): the words we use (demande, chemin, 1er/2e degré, force du lien…)
- [Roadmap](product/roadmap.md): now, next, later

## Engineering

- [Getting started](engineering/getting-started.md): run the project locally
- [Architecture](engineering/architecture.md): how it's built today, and where it's going
- [Deployment](engineering/deployment.md): Vercel, production and previews
- [Conventions](engineering/conventions.md): branches, commits, PRs, code layout, tests
- [Known issues](engineering/known-issues.md): what's broken or risky right now
- Architecture decisions: [`docs/adr/`](../adr/), starting with [0001 Local-first contacts](../adr/0001-local-first-contacts.md)

## Design

- [Design system](design/design-system.md): tokens, components, voice

## Compliance

- [Data and privacy](compliance/data-privacy.md): personal data, consent, platform rules

## Team

- [Team and sprint workflow](../TEAM.md): roles, sprint loop, definition of done
- Sprint notes: [`docs/sprints/`](../sprints/), current: [Sprint 1](../sprints/sprint-1.md)

## Editing the wiki

- Add or change pages in the same PR as the code they describe.
- One topic per page, linked from this index.
- Write in English for the team; quote UI copy in French as it appears in the product.
- Date anything that will go stale ("as of 2026-10-25").
