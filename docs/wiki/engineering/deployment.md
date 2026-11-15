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

## Environment variables

| Variable | Set by | Used by | Notes |
| --- | --- | --- | --- |
| `KV_REST_API_URL` | Vercel's Upstash for Redis integration (Preview + Production) | `lib/redis.js` | REST endpoint of the signup database (#11) |
| `KV_REST_API_TOKEN` | same | `lib/redis.js` | read-write token; never logged, never in the repo |
| `VERCEL`, `VERCEL_ENV` | Vercel (system) | `lib/redis.js`, `lib/signups.js` | `VERCEL` disables `SIGNUP_STORE`; `VERCEL_ENV` picks the key prefix |
| `SIGNUP_STORE` | developers, locally only | `lib/redis.js` | `memory` = in-process store; ignored when `VERCEL` is set |

The integration also injects `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL` and `REDIS_URL`: **not used**. The client's telemetry is off (`enableTelemetry: false`). If `KV_REST_API_URL` or `KV_REST_API_TOKEN` is missing, signups fail with `500` and the log line `subscribe: save failed config`.

**Signup keys** ([ADR 0003](../../adr/0003-beta-signups-upstash-redis.md)): `signup:<email>` in Production, `preview:signup:<email>` on previews (`VERCEL_ENV=preview`), `development:signup:…` / `local:signup:…` elsewhere. Preview data can be purged by prefix even if Preview and Production share one database.

**Logs:** the signup route logs only `subscribe: save failed <config|upstash|network|unknown>` on a storage failure, nothing on success or on a `400`.

## Rolling back

In the Vercel dashboard, open the project's **Deployments**, pick the last good deployment and choose **Promote to Production**. Then fix forward with a new PR.
