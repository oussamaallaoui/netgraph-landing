# Known issues

As of 2026-10-25. Each item should have a GitHub issue once the backlog exists.

## Blocking

### The beta signup form fails in production

`app/api/subscribe/route.js` saves signups to `subscribers.json`. Vercel's filesystem is read-only, so on https://netgraph-landing.vercel.app every submission returns an error ("Une erreur s'est produite. Réessayez.").

**Fix:** store signups in Upstash Redis. The founder creates the database in Vercel (Storage → Upstash for Redis) and connects it to the project; then the route is changed to use it.

## Security and privacy

### The subscriber list is public

`GET /api/subscribe` returns every subscriber's email, name, company and role to anyone. On Vercel the list is empty today only because nothing can be saved. It would leak as soon as storage works.

**Fix:** remove the `GET` handler, or protect it with a secret and move it to an admin-only route. **Do this before or together with the storage fix.**

### Emails are written to the logs

The route logs every new subscriber's email (`console.log`). On Vercel, logs are kept and visible in the dashboard.

**Fix:** log only a count or nothing.

## Minor

- Some text is below 4.5:1 contrast: `gray-400` fine print and captions, and `signal` green text in the beta pill. See the design system's colour notes.
- The footer still says "© 2025".
