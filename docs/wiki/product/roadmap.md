# Roadmap

As of 2026-10-25. The Product Owner keeps this page in sync with the backlog (GitHub Issues and sprint milestones). It's a direction, not a commitment.

## Done

- Landing page live on Vercel: https://netgraph-landing.vercel.app (request → path → introduction demo, agent section, beta signup form)
- Design system: https://claude.ai/artifact/45uF2g3EoYxJvm2TaM48VB
- Sprint team set up: see [Team and sprint workflow](../../TEAM.md)

## Now

- **Working beta signup in production.** Signups need a managed store (Upstash Redis planned); the form fails on Vercel today. See [Known issues](../engineering/known-issues.md).
- **Secure the subscribe API:** remove the public subscriber list and the email logging.

## Next

- User accounts and sign-in
- Import contacts from a CSV or phone export, with duplicate merging
- Write a request and get a first ranked list of direct contacts

## Later

- Second-degree paths through opted-in users
- Link strength from interaction frequency
- Agent suggestions and drafted messages
- More sources (LinkedIn export, Instagram)
- Business model after the free beta
