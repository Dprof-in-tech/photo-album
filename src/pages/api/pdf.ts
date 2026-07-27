import type { APIRoute } from 'astro';

export const prerender = false;

// Server-side print-ready PDF. Pages Functions can't hold a Browser Rendering
// binding, so we delegate to the standalone `pdf-renderer` Worker via a service
// binding (PDF_RENDERER). It renders /print (all 22 spreads at 16×8in) to PDF.
//
// The binding is absent under local `astro dev`, so this returns 501 and the
// "Print-ready PDF" button falls back to the /print page (browser Save-as-PDF).
export const GET: APIRoute = async ({ request, locals }) => {
  const renderer = locals.runtime.env.PDF_RENDERER;
  if (!renderer) {
    return new Response(
      "PDF generation runs on the deployed pdf-renderer Worker (service binding). " +
        "In local dev, open /print and use your browser's Save as PDF — identical output.",
      { status: 501 }
    );
  }

  const printUrl = new URL('/print', new URL(request.url).origin).href;
  try {
    // Host in the URL is ignored — the service binding routes to the Worker.
    const resp = await renderer.fetch(`https://pdf-renderer/?url=${encodeURIComponent(printUrl)}`);
    if (!resp.ok) throw new Error(`renderer ${resp.status}`);
    return new Response(resp.body, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="3-idiots-and-the-stooges.pdf"',
        'cache-control': 'no-store',
      },
    });
  } catch {
    // Renderer unreachable/errored — fall back to the browser-print path.
    return new Response(
      "Couldn't reach the PDF renderer. Open /print and use your browser's Save as PDF.",
      { status: 501 }
    );
  }
};
