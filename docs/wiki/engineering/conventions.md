# Conventions

## Branches

- Never commit directly to `master`; it deploys production.
- One branch per story or fix: `feat/<issue>-<slug>`, `fix/<issue>-<slug>`, `docs/<slug>`, `chore/<slug>`.
- Delete the branch after its PR is merged.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`. The first line says what changed; the body says why.

## Pull requests

- One PR per story, linked with `Closes #N`.
- Body: **What**, **Why**, **Comment vérifier** (how to check), and notes for the reviewer (env vars, risks).
- Reviewed by the tech lead, tested by QA on the preview URL, merged by the founder.

## Code

- Pages and API routes in `app/`; shared components in `components/`; server-side logic in `lib/`.
- Validate every input at API boundaries and return JSON errors with the right status codes.
- Never log personal data (emails, names, phone numbers, contact lists).
- Use the Tailwind tokens; no new colours without updating the [design system](../design/design-system.md).
- Accessibility: labels on every field, visible focus, text contrast ≥ 4.5:1, works at 375px, respects `prefers-reduced-motion`.
- UI copy in French with formal *vous*.

## Tests

- Tests sit next to the code as `*.test.js`.
- Pure functions (parsing, scoring, path-finding) get unit tests; every API route gets at least a success and an error test.
- The full checklist is the definition of done in [`docs/TEAM.md`](../../TEAM.md).
