# Deployment

## Vercel

- **Project:** `netgraph-landing` on the founder's Vercel account (Hobby plan), linked to `oussamaallaoui/netgraph-landing` on GitHub.
- **Production:** https://netgraph-landing.vercel.app
- **Production branch:** `master`. **Every push or merge to `master` deploys to production.**
- **Previews:** every other branch and every PR gets its own preview URL, posted on the PR. QA tests there.

Only `netgraph-landing.vercel.app` is public. The `…-oussamaallaoui.vercel.app` addresses are behind Vercel's login (deployment protection), so don't share them.

## Rules

- Only the founder merges to `master` and changes Vercel settings.
- Run `npm run build` locally before opening a PR; a failed build blocks the preview.
- The runtime filesystem is **read-only**. Anything that must persist goes in a managed store.
- Secrets live in Vercel's environment variables, per environment (Production, Preview, Development).

## Rolling back

In the Vercel dashboard, open the project's **Deployments**, pick the last good deployment and choose **Promote to Production**. Then fix forward with a new PR.
