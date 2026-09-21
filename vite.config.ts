import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    /*
     * The demo may be given on a bank guest network or none at all (PRD §4), so nothing may
     * be fetched from anywhere. Inlining keeps the asset count at zero.
     *
     * **Fonts are the exception**, and deliberately so. Inlining them base64s ~150 KB of
     * already-compressed woff2 into the render-blocking stylesheet — it grew from 21 KB to
     * 349 KB — which works directly against the under-two-seconds bar in PRD §13, and it
     * defeats `unicode-range`, since an inlined Arabic face is present whether or not any
     * Arabic is on the page. They are emitted as files beside the bundle instead: still
     * same-origin, still nothing external, and fetched only when a glyph needs them.
     */
    assetsInlineLimit: (filePath: string) => (/\.woff2?$/.test(filePath) ? false : undefined),
  },
});
