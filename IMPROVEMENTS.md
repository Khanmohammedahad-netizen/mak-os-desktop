# Improvements backlog

## Phase A

### maxDuration = 60 (Hobby tier)
All scraper routes use `export const maxDuration = 60`. Vercel Pro plan supports 300s.
If upgraded, change all six scraper routes to `maxDuration = 300` to allow the
orchestrator to fan out across all 5 sources for large target counts (200+).

### SUPABASE_SERVICE_ROLE_KEY missing
`supabase-server.ts` falls back to the anon key. This works because all engine
tables have open RLS policies. Before locking down RLS for production, add
`SUPABASE_SERVICE_ROLE_KEY` to Vercel env and run `vercel env pull .env.local`.

### Overpass token bucket is per-invocation only
The 1 req/sec throttle in `overpass.ts` only prevents burst within a single
serverless invocation. It does not coordinate across concurrent invocations.
For high-volume use, add a Redis-backed rate limiter or use Upstash Rate Limit.

### Companies House not yet wired into pipeline
`src/lib/enrichment/companies-house.ts` is implemented but not called from any
agent or route. Phase C's EnrichmentAgent should call `searchByName` for UK leads
and store results in `enriched_data`.

### Nominatim geocoding not cached
The orchestrator calls Nominatim on every `/api/scrapers/orchestrate` request.
Add a simple in-memory or Supabase-backed cache keyed by location string.
