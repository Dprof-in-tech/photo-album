# School Memories Album — "3 Idiots & the Stooges"

A two-part keepsake product for documenting the last weeks of school, built from the
design handoff in [`School memories photo album.zip`](./School%20memories%20photo%20album.zip)
(the original HTML/screenshot references — the source of truth for all layouts, copy, and
exact values).

1. **The Album** (`/album`) — a print-ready 8×8in photo book, laid out as 16×8in
   two-page spreads (1536×768px @96dpi). Users fill photo slots and edit captions.
2. **Photo Drop** (`/`) — a mobile-first companion. Every album photo slot is a
   tappable box grouped by spread; a drop here lands in the matching album slot
   because both surfaces key on the **same slot ids** in a shared datastore.

## Stack

- **Astro + React islands** — each surface is a single `client:load` island (they're
  editors, so mostly client state). Pages are prerendered static; only `/api/*` runs
  on the Worker. Astro is the shell + build + deploy glue.
- **Cloudflare R2 shared store** (`src/lib/store.ts` + `src/pages/api/`) — photos live
  in an R2 bucket keyed by slot id, so an upload from a phone appears in the album on
  any device. The client store hydrates from `/api/photos`, uploads webp bytes, and
  keeps in sync two ways:
  - `BroadcastChannel` for instant same-browser cross-tab updates;
  - a **WebSocket relay** (`src/lib/sync.ts` → the `realtime` Worker's `SyncRoom`
    Durable Object) that pushes changes to other **devices** instantly;
  - a poll of `/api/photos`/`/api/text` as a backstop (30s when the WebSocket is on, ~4s
    when it isn't). Writes always go to R2 first (authoritative); the socket only carries
    change notifications. Disabled gracefully when `PUBLIC_SYNC_URL` is unset.

### R2 API

| Route | Method | Purpose |
|---|---|---|
| `/api/photos` | GET | Manifest `{ [id]: {x,y,scale,iv} }` — hydrate + poll target (no bytes) |
| `/api/photo/[id]` | GET | Stream webp bytes (immutable-cached; URL is versioned by `iv`) |
| `/api/photo/[id]` | PUT | Upload/replace bytes; crop via `x-crop-*` headers |
| `/api/photo/[id]` | DELETE | Remove |
| `/api/photo/[id]/crop` | PUT | Update crop only, preserving `iv` so the image doesn't reload |
| `/api/text` | GET/PUT | Editable copy, album settings (film look, etc.) & per-photo dates as one JSON blob (`text.json`); PUT merges one field |

`iv` (image version) changes only when the photo **bytes** change; reframing re-puts
the same bytes with new crop metadata but keeps `iv`, so `/api/photo/[id]?v=iv` stays
cache-stable. Writes are restricted to known slot ids (`src/lib/r2.ts`).

### Print-to-PDF

- **`/print`** — all 22 spreads at physical 16×8in, one per sheet (`@page {size:16in 8in;
  margin:0}` + `break-after:page`), zero margins, exact colors, no screen chrome; empty
  slots render as plain photo-wells. This is both a browser-printable page (Save as PDF)
  and the target the server renderer captures.
- **`GET /api/pdf`** — Pages Functions can't hold a Browser Rendering binding, so this
  delegates to a standalone **pdf-renderer Worker** (`workers/pdf-renderer/`) via a
  service binding (`PDF_RENDERER`). That Worker uses the native Browser Rendering binding
  + `@cloudflare/puppeteer` to load `/print`, wait for R2 images to hydrate, and return a
  `printBackground`, CSS-page-sized PDF. It's not publicly routable (`workers_dev=false`).
  Under local `astro dev` there's no service binding, so `/api/pdf` returns 501 and the
  **Print-ready PDF** button falls back to opening `/print` (browser Save-as-PDF).

## Run

```sh
pnpm install
pnpm dev      # http://localhost:4321 — real local R2 via Miniflare (no creds needed)
pnpm build    # builds static pages + the Worker into dist/
```

`astro dev` gets a working R2 binding locally through the adapter's `platformProxy`
(Miniflare); local objects persist under `.wrangler/`.

## Deploy (Cloudflare Pages)

Full step-by-step in **[DEPLOY.md](./DEPLOY.md)**. Short version (free plan; you run
these — they need your authenticated Cloudflare account):

```sh
pnpm exec wrangler login
pnpm exec wrangler r2 bucket create school-memories-photos          # once
pnpm run deploy:pdf                                                 # deploy the PDF Worker first
pnpm exec wrangler pages project create school-memories-album --production-branch main  # once
pnpm run deploy                                                     # astro build && wrangler pages deploy
```

`@astrojs/cloudflare` v12 targets **Cloudflare Pages**. The `PHOTOS` R2 binding and the
`PDF_RENDERER` service binding are applied from `wrangler.toml`; the Browser Rendering
binding lives in the separate PDF Worker (`workers/pdf-renderer/`). No dashboard steps.

## Features

- `ImageSlot` component: tap/drag-to-upload → **print-quality** webp encode → shared
  store; cover-fit render; double-click **reframe** (drag to pan, scroll to zoom,
  Esc/click-out commits); crop persists. Ported geometry from the prototype's
  `image-slot.js`. Encoding (`src/lib/image.ts`) caps the longest side at **4800px**
  (300dpi across a 16in full-bleed spread, 600dpi on a single page), webp q0.92, with
  EXIF-orientation correction and high-quality resampling. Resolution is **decoupled from
  the slot's on-screen size** — a photo dropped on a tiny Photo Drop tile is still stored
  full-res for print.
- `EditableText`: user-editable captions/quotes, persisted to the R2-backed text store
  (`src/lib/text.ts` + `/api/text`) so copy syncs cross-device and appears in the PDF;
  memoized so a parent re-render can't wipe an in-progress edit, and remote updates
  never clobber the field you're actively typing in. Screen-only affordance (hover/focus
  tint via `.editable-text`, plus a tip banner and faint tint on empty fields) makes the
  editable copy discoverable; the signature lines are editable too. Print/PDF renders it
  static (no `contentEditable`, no affordance).
- **All 22 album spreads** at exact print geometry, scaled to fit the viewport —
  cover wrap, intro, three full-bleeds, photo+journal spreads, quote pages, 2×2 grids,
  the cast (6 circle portraits), filmstrip, superlatives, places, field notes,
  last-firsts, wildcards, and the closing letter. 51 photo slots, 91 editable copy
  blocks, `showPageNumbers` folio toggle.
- Full **Photo Drop** app: sticky header, live progress meter (N of 51), all 22 spread
  sections from the canonical slot manifest, spanned/hero slots, footer.
- **3D flip book** (`/book`): a real bound-book preview (react-pageflip) with a center
  spine and realistic page-curl turns. Read-only; photos + copy pulled from R2. Each
  spread's two 8×8in halves become the left/right leaves (so full-bleed photos split at
  the fold exactly like print). Responsive: two-page open book on desktop, single-page
  portrait (one leaf at a time) below 720px for phones. The 22 spreads live in a shared
  data list (`src/components/spreads.tsx`) used by `/album`, `/print`, and `/book`.
- **Cloudflare R2 backend**: `/api/photo*` endpoints + R2-backed store; verified in
  dev (Miniflare) that uploads persist, hydrate on reload, sync cross-tab
  (BroadcastChannel) and cross-device (4s poll), and that reframing preserves the
  image cache.
- **Print-to-PDF**: `/print` layout + `/api/pdf` Browser Rendering endpoint + a
  Print-ready PDF button with graceful local-dev fallback. Print mode is threaded
  through a React `PrintContext` (Spread → 16×8in/page-break; ImageSlot → no chrome,
  empty = plain well) so the 22 layouts are reused, not duplicated.
- **Film looks** (`src/lib/looks.ts`): a global picker — Golden (warm disposable-camera),
  Faded matte, Black & white, Cool/cross-process — applied to every photo via a CSS
  filter + grain + vignette (+ an optional orange date stamp drawn from each photo's file
  date). Renders in the album, the flip book, and the PDF; the choice is a setting in the
  R2 text store, so it syncs across devices.
- **Confetti** (`src/components/Celebration.tsx`) fires once, tastefully, the moment the
  book fills to 51 / 51.

## Next steps

- [ ] Deploy the realtime Worker + set `PUBLIC_SYNC_URL`, then redeploy the app
      (see DEPLOY.md §3b) to turn on instant push sync in production.

## Layout

```
src/
  components/  ImageSlot, Spread, EditableText, AlbumApp, PhotoDropApp, FlipBook,
               Celebration, PrintContext, spreads.tsx (22 spreads as shared data)
  lib/         store (R2 photo store), text (R2 copy/settings store), sync (WebSocket),
               settings, looks, slots (manifest), image (encode), tokens, useProgress, r2
  layouts/     Base.astro
  pages/       index.astro (Photo Drop), album.astro (editor), print.astro (PDF source),
               book.astro (3D flip book), api/* (R2 + PDF + text endpoints)
  styles/      global.css (fonts, hover chrome, print rules)
workers/
  pdf-renderer/  Browser Rendering Worker — server-side PDF (service-bound to Pages)
  realtime/      Durable Object WebSocket relay — instant cross-device sync
School memories photo album.zip        original design references (source of truth)
```
