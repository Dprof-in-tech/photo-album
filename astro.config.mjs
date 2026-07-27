import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

// Pages stay static (prerendered, served from the CDN); only the /api/* routes
// opt into on-demand rendering (`export const prerender = false`) and run on the
// Worker. `platformProxy` gives `astro dev` a real, local R2 binding via
// Miniflare — so uploads persist to a local bucket with no cloud credentials.
export default defineConfig({
  integrations: [react()],
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  vite: {
    resolve: {
      // React 19's default `react-dom/server` (browser build) uses MessageChannel,
      // which the Cloudflare Workers runtime doesn't expose at module init — the
      // deploy fails with "MessageChannel is not defined". The `.edge` build uses
      // Web Streams instead. Alias only in the production (Worker) build; dev is
      // unchanged. See https://github.com/withastro/astro/issues/12824
      alias: import.meta.env.PROD ? { 'react-dom/server': 'react-dom/server.edge' } : {},
    },
  },
});
