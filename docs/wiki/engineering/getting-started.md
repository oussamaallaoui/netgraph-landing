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

There's no test runner yet; the tech lead will add one with the first stories.

## Environment variables

None are needed today. When storage is added, the variables are set in Vercel and pulled locally into `.env.local` (git-ignored). Never commit them.
