# 0003. Beta signups in Upstash Redis: one key per address, written with SET NX over REST

- **Status:** Accepted (effective when the founder merges the #11 PR, #41)
- **Date:** 2026-11-15
- **Deciders:** tech lead, founder
- **Stories:** #11 (and #12, which describes this storage to visitors)

## Context

`POST /api/subscribe` writes to `subscribers.json`, which fails on Vercel's read-only filesystem, so no signup has ever been saved in production. The founder connected an Upstash for Redis database to the Vercel project (Preview and Production) on 2026-11-15. Vercel injects `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL` and `REDIS_URL`.

This is the first personal data NetGraph keeps in production. #11 adds constraints that shape the storage:

- **No enumeration (AC 2, founder decision 1):** an address that is already signed up gets a response byte-identical to a new signup, no duplicate is saved and the original signup stays unchanged.
- **Concurrency (AC 5):** two different signups sent at the same time are both kept.
- **No logs (AC 6):** no email, name, company or role in the Vercel logs.
- **Deletion:** a subscriber can ask to be deleted (#12); the founder must be able to do it.

Choices made here are hard to reverse: the key format and the record shape are the data we will migrate later (to Postgres, with accounts, #13), and the client library decides how we connect from serverless functions.

## Decision

1. **Client: `@upstash/redis`** (MIT, one small dependency), over HTTPS/REST. One module only imports it: `lib/redis.js`, which builds the client from `KV_REST_API_URL` and `KV_REST_API_TOKEN` explicitly (not `Redis.fromEnv()`), with `enableTelemetry: false`. `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL` and `REDIS_URL` are not used.
2. **One key per address:** `signup:<email>` in production, `<VERCEL_ENV>:signup:<email>` elsewhere (`preview:signup:…`, `local:signup:…`), where `<email>` is the address after `validateSignup` (trimmed, lowercased). Preview test signups are therefore never mixed with real ones and can be purged by prefix, even when Preview and Production share one database.
3. **Value:** a JSON object `{ v: 1, email, name, company, role, date, source }` (`date` ISO 8601 UTC, `source: 'landing'`). Nothing else: no IP address, no user agent, no counter.
4. **Write with `SET key value NX`**, one atomic command. `OK` means a new signup; `null` means the address exists and nothing was written. The route answers both with the same status, headers and body (`200 {"success":true}`), and never logs which case happened. One command in both cases also keeps the response time the same.
5. **No total and no read path.** The API returns no count and has no `GET`. The founder reads signups in the Upstash console (Data Browser, or `SCAN 0 MATCH signup:* COUNT 100` in its CLI) and deletes one with `DEL signup:<email>`. These steps are written in the wiki (Data and privacy).
6. **No expiry for now.** The retention period is a founder decision (#12). When it is set, it becomes either an `EX` on the `SET` or a documented manual purge, decided in #12 or a follow-up.
7. **Errors are logged as one fixed line with a category from a closed list:** `subscribe: save failed <config|upstash|network|unknown>`. Never the error object or its message: `@upstash/redis` errors can quote the command, which holds the email and the record.
8. **Local and tests run without credentials.** `lib/memoryRedis.js` implements the subset of the client the app uses (`set` with `{ nx: true }`, `get`, `del`) with the same return values. Tests inject it. Locally, `SIGNUP_STORE=memory` makes the route use it; the switch is ignored when `VERCEL` is set, so a deployment can never fall back to memory and lose signups silently.

## Consequences

**Good**
- No connection to manage: each request is one HTTPS call, which suits short-lived serverless functions, and the same client works on the Edge runtime if we ever need it.
- Enumeration-safe and race-safe by construction: the duplicate check and the write are one command.
- Developers and QA never need the real credentials; secrets stay in Vercel.
- The records are self-describing (`v: 1`), so a later migration to Postgres is a scan and a copy.

**Bad / accepted**
- A REST call is slower than a warm TCP connection (a few tens of milliseconds). Irrelevant at signup volume.
- The client retries a failed request **2** times (default backoff, about 0.2 s) and gives up after **3 s** per request (`signal: () => AbortSignal.timeout(3000)`, function form only: with a plain `AbortSignal`, `@upstash/redis` 1.41.0 swallows the abort instead of throwing). An outage answers `500` (`network`) within a few seconds instead of waiting for the function's maximum duration. `SET … NX` is safe to retry: a write that landed makes the retry return `null`, and the answer is the same `200`.
- The email is in the key, readable by anyone with access to the Upstash console. Only the founder has it. Hashing the key would hide it there, but the email is in the value anyway, and deleting by address would need a hash computed by hand.
- No server-side count is available to the site. That matches founder decision 2 (no number shown).
- The data lives with a third-party processor (Upstash). Its region and encryption at rest must be confirmed by the founder and given to the legal reviewer (#11, #12). If the database is outside the region the reviewer wants, it should be recreated **before** the first real signup, when it costs nothing.

## Alternatives considered

1. **`redis` (node-redis) or `ioredis` over `REDIS_URL` (TCP/TLS).** A connection per cold start, pooling and reconnect logic in serverless functions, and a heavier client. Rejected: no benefit at our volume.
2. **`@vercel/kv`.** A wrapper over `@upstash/redis` that Vercel has deprecated in favour of the Upstash integration. Rejected.
3. **`GET` then `SET`.** Two commands with a race between them (two identical signups could both write), and different timings for new and existing addresses. Rejected.
4. **A list or hash with all signups (`RPUSH`, `HSET signups <email> …`).** A list cannot check duplicates atomically; one hash grows without bound and makes deleting or expiring one person harder. Rejected for one key per address.
5. **Postgres now.** Relational data does not exist yet; it arrives with accounts (#13). Rejected for this story.
