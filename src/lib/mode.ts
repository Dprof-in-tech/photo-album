// Storage mode — chosen at BUILD time via the PUBLIC_STORAGE_MODE env var and
// inlined by Astro/Vite, so each Pages project is the same source built with a
// different flag:
//
//   PUBLIC_STORAGE_MODE=cloud  → R2-backed store, cross-device sync, server PDF
//                                (the private "my album" build; behind Access)
//   PUBLIC_STORAGE_MODE=local  → IndexedDB/localStorage, nothing leaves the
//                                device (the public browser-only build)
//
// Unset defaults to CLOUD so existing `pnpm dev` / `pnpm run deploy` behaviour
// is unchanged; only the public build opts into local by setting the flag.
export const CLOUD = import.meta.env.PUBLIC_STORAGE_MODE !== 'local';
