# Getting started

## Requirements

- **Node 20** (Next 14 needs at least 18.17). The repo pins it in `.nvmrc`.
- npm (comes with Node).
- Git and, for PRs, the GitHub CLI (`gh`).

If `node -v` shows an older version, install Node 20 with nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
```

Shells that don't read `~/.bashrc` (scripts, some tools) still see the system Node. Load nvm first: `source ~/.nvm/nvm.sh`.

## Run locally

```bash
git clone https://github.com/oussamaallaoui/netgraph-landing.git
cd netgraph-landing
nvm use
npm install
npm run dev
```

The site runs on http://localhost:3000.

Locally, the signup form saves to `subscribers.json` at the project root. The file is git-ignored because it holds personal data. Never commit it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build (run it before opening a PR) |
| `npm start` | Serve the production build |
| `npm test` | Unit tests (Vitest), once the Sprint 1 test-setup PR is merged |

The test runner (Vitest 3.x) is added on Sprint 1 day 1 by dev-backend in a `chore/test-setup` PR. Until it's merged, `npm test` doesn't exist on `master`.

## Trying the contact import locally

`/essayer` (Sprint 1) runs entirely in your browser. Use **« Essayer avec des contacts d'exemple »** or `lib/fixtures/Connections.sample.csv`. If you test with your own LinkedIn export, keep it outside the repository (for example in `~/Downloads`) and never commit it.

## Environment variables

None are needed today. When storage is added, the variables are set in Vercel and pulled locally into `.env.local` (git-ignored). Never commit them.
