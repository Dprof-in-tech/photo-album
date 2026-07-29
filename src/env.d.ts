/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

// Public (client-visible) build-time env, inlined by Astro/Vite.
interface ImportMetaEnv {
  // 'local' → browser-only build (IndexedDB); anything else (incl. unset) → cloud.
  readonly PUBLIC_STORAGE_MODE?: 'cloud' | 'local';
  readonly PUBLIC_SYNC_URL?: string;
  readonly PUBLIC_SYNC_TOKEN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}

// Bindings declared in wrangler.toml.
interface Env {
  PHOTOS: R2Bucket;
  // Service binding to the standalone pdf-renderer Worker (which holds the
  // Browser Rendering binding). Absent under local `astro dev`.
  PDF_RENDERER?: Fetcher;
}
