import puppeteer, { type BrowserWorker } from '@cloudflare/puppeteer';

interface Env {
  BROWSER: BrowserWorker;
}

// Renders the given URL to a PDF (one 16×8in sheet per album spread, driven by
// that page's own @page CSS). Reachable only via the main app's service binding.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const target = new URL(request.url).searchParams.get('url');
    if (!target) return new Response('missing url', { status: 400 });

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return new Response('bad url', { status: 400 });
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return new Response('bad protocol', { status: 400 });
    }

    const browser = await puppeteer.launch(env.BROWSER);
    try {
      const page = await browser.newPage();
      await page.goto(parsed.href, { waitUntil: 'networkidle0', timeout: 60_000 });
      // Wait for the album island to signal its photos/text have hydrated.
      await page
        .waitForFunction('window.__ALBUM_READY__ === true', { timeout: 15_000 })
        .catch(() => {});
      const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
      return new Response(pdf, {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="3-idiots-and-the-stooges.pdf"',
          'cache-control': 'no-store',
        },
      });
    } finally {
      await browser.close();
    }
  },
};
