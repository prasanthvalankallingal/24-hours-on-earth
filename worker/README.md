# Ask-the-data language router (Cloudflare Worker)

A ~100-line Worker that turns a plain-language question into a **structured
query** `{ metric, direction, country? }` for the site's deterministic engine
(`app-web/src/lib/ask.ts`). It never returns figures — the numbers are always
computed in the browser from the local datasets, so the site's *"every figure
is sourced, none invented"* guarantee holds by construction.

## Why a Worker at all?

The site is a static GitHub Pages export, so it can't run server code and can't
safely hold an API key. The Worker is the one small piece that runs server-side:
it keeps the key as a secret and makes the model call on the visitor's behalf.

## Deploy

```bash
cd worker
npx wrangler login                      # one-time
npx wrangler secret put OPENAI_API_KEY  # paste key at the prompt — never commit it
npx wrangler deploy                     # prints the live https://…workers.dev URL
```

## Wire it into the site

Build the site with the Worker URL exposed to the client:

```bash
cd ../app-web
NEXT_PUBLIC_ROUTER_URL="https://ask-the-data-router.<subdomain>.workers.dev" npm run build
```

If `NEXT_PUBLIC_ROUTER_URL` is unset (or the Worker is unreachable), the site
silently falls back to the local deterministic parser — the Ask box always
works, online or off.

## Cost & limits

One question ≈ a few hundred tokens on `gpt-4o-mini` — fractions of a cent.
Cloudflare's free tier (100k requests/day) is far beyond a demo's needs.
