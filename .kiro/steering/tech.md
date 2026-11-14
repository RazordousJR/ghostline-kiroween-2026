---
inclusion: always
---
# Technical conventions

- React 19, TypeScript, Vinext, Cloudflare Worker and D1. Keep the Sites Vite integration and hosting manifest.
- API: app/api/radio/route.ts. Browser media lifecycle: app/use-radio.ts. UI: app/page.tsx and app/globals.css.
- Migration-owned tables must never be created in request handlers. Append migrations via npm run db:generate; never rewrite applied migration history.
- Authentication uses separate random member IDs and session secrets. A channel code grants room entry; never expose member secrets or log SDP/ICE payloads.
- Disable microphone tracks synchronously on release, lost focus, hidden document, network failure and leave. Release must still win if a floor request is in flight.
- Only enable the mic after server arbitration grants the floor. Never implement floor arbitration using a non-atomic read-then-write sequence.
- Do not commit credentials, .env files, .wrangler state, node_modules, built outputs or recordings.
- Validation: npx tsc --noEmit, npm run build, node scripts/test-radio.mjs against a local running Worker with migrated D1.
- Use generated SQL and metadata under drizzle/ in publication. No fake test results or Kiro usage evidence.
