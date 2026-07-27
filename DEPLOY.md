# Deploy — School Memories Album (Cloudflare Pages + PDF Worker)

The app deploys to **Cloudflare Pages** (`@astrojs/cloudflare` v12 → Pages Functions).
Server-side PDF runs in a tiny **standalone Worker** (`workers/pdf-renderer/`) because
Pages Functions can't hold a Browser Rendering binding; the Pages app calls it via a
**service binding**. Everything is on the **free** plan (Browser Rendering: 10 min/day).

You (not Claude) run these — they need your authenticated Cloudflare account. Tip: in
this session you can prefix a command with `!` to run it and share the output here.

## Prerequisites

- A Cloudflare account (free). Enable R2 once: **dash.cloudflare.com → R2 → Enable**.
- `pnpm install` already done (bundles `wrangler`).

## 1. Authenticate

```sh
pnpm exec wrangler login
```

## 2. Create the R2 bucket (once)

Name must match `wrangler.toml` (`school-memories-photos`):

```sh
pnpm exec wrangler r2 bucket create school-memories-photos
```

## 3. Deploy the PDF renderer Worker (once, and on changes)

Deploy this **before** the Pages app so the service binding resolves. It has the native
Browser Rendering binding and is not publicly routable (`workers_dev = false`).

```sh
pnpm run deploy:pdf        # = wrangler deploy -c workers/pdf-renderer/wrangler.toml
```

Its dry-run is already verified (bundles puppeteer, binds `BROWSER → Browser Run`). On
first deploy Cloudflare provisions Browser Rendering for the account (free tier).

## 3b. Deploy the realtime sync Worker (optional, for instant cross-device sync)

Hosts the WebSocket relay Durable Object. Without it, the app still syncs via a
faster poll — this just makes changes appear instantly on other devices.

```sh
pnpm run deploy:realtime    # = wrangler deploy -c workers/realtime/wrangler.toml
```

Note the deployed URL (e.g. `https://realtime.<your-subdomain>.workers.dev`), then set
it as `PUBLIC_SYNC_URL` (as a **wss://** URL) in `.env` **before building** — `PUBLIC_*`
vars are baked into the client at build time:

```sh
cp .env.example .env
# edit .env:  PUBLIC_SYNC_URL=wss://realtime.<your-subdomain>.workers.dev
```

(Optional: set a shared token — uncomment `SYNC_TOKEN` in
`workers/realtime/wrangler.toml`, redeploy the Worker, and set the same value as
`PUBLIC_SYNC_TOKEN` in `.env`.)

## 4. Create the Pages project (once)

```sh
pnpm exec wrangler pages project create school-memories-album --production-branch main
```

## 5. Deploy the app

```sh
pnpm run deploy            # = astro build && wrangler pages deploy
```

`wrangler pages deploy` reads `name` + `pages_build_output_dir` from `wrangler.toml` and
applies the **R2 binding** and the **`PDF_RENDERER` service binding** automatically.
You'll get a `https://<...>.pages.dev` URL.

## 6. Verify in production

On the `*.pages.dev` URL:

- `/` (Photo Drop) and `/album` load; upload a photo → appears in both; `GET /api/photos`
  lists it; reload → photo + edited captions persist (from R2).
- `/print` renders all 22 spreads with your photos.
- **Print-ready PDF** downloads a real PDF (served by the pdf-renderer Worker).

## Redeploys

- App only: `pnpm run deploy`
- PDF renderer only: `pnpm run deploy:pdf`
- Realtime Worker only: `pnpm run deploy:realtime`
- Changing `PUBLIC_SYNC_URL` requires an app rebuild+deploy (`pnpm run deploy`) since
  it's baked in at build time.

## Notes

- **Bindings:** R2 (`PHOTOS`) + service binding (`PDF_RENDERER`) come from the Pages
  `wrangler.toml`; the Browser Rendering (`BROWSER`) binding lives in the PDF Worker's
  own `workers/pdf-renderer/wrangler.toml`. Nothing needs the dashboard.
- **Node compat:** both configs set `compatibility_flags = ["nodejs_compat"]` (required
  by `@cloudflare/puppeteer`).
- **Local dev:** no service binding exists, so `/api/pdf` returns 501 and the button
  falls back to `/print` (browser Save-as-PDF, identical output).
- **Rollback / history:** `pnpm exec wrangler pages deployment list`, or the dashboard.
- **Realtime:** with the realtime Worker deployed + `PUBLIC_SYNC_URL` set, changes push
  over a WebSocket instantly; the poll drops to a 30s backstop. Without it, the app uses
  a ~4s poll. Local dev: `wrangler dev -c workers/realtime/wrangler.toml --port 8787` and
  `PUBLIC_SYNC_URL=ws://localhost:8787` in `.env`.
