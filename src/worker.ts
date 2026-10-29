import { processSendEmail } from './features/contact/services/sendEmail';
import { findEvent } from './features/events/data/events';

/* Cloudflare's streaming HTML rewriter (a Workers global) */
interface RewrittenElement {
  setAttribute(name: string, value: string): void;
  setInnerContent(content: string): void;
  remove(): void;
  append(content: string, options: { html: boolean }): void;
}
declare class HTMLRewriter {
  on(selector: string, handlers: { element(el: RewrittenElement): void }): HTMLRewriter;
  transform(response: Response): Response;
}

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * /events/<slug>: other spellings and old ids redirect to the one true address, and the page
 * gets its own title, description and picture, so a link shared on WhatsApp or Instagram
 * shows a proper preview card for that event.
 */
async function eventPage(request: Request, env: Env, key: string): Promise<Response | null> {
  const event = findEvent(key);
  if (!event) return null;
  const url = new URL(request.url);
  if (event.slug !== key) return Response.redirect(`${url.origin}/events/${event.slug}`, 301);
  // the app's page (asking for /index.html would only get a redirect to /)
  const shell = await env.ASSETS.fetch(new Request(`${url.origin}/`, { headers: request.headers }));
  const title = `${event.en} · Kannada Koota EC PES`;
  const desc = event.story[0] ?? event.en;
  // a 1200x630 JPG made for share cards (some apps do not show WebP previews)
  const image = `${url.origin}/media/events/${event.slug}/og.jpg`;
  const tags = [
    ['og:title', title], ['og:description', desc], ['og:type', 'article'], ['og:url', `${url.origin}/events/${event.slug}`], ['og:image', image],
  ].map(([p, c]) => `<meta property="${p}" content="${escapeAttr(c)}" />`).join('')
    + `<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:image" content="${escapeAttr(image)}" />`;
  return new HTMLRewriter()
    .on('title', { element: (el) => el.setInnerContent(title) })
    .on('meta[name="description"]', { element: (el) => el.setAttribute('content', desc) })
    .on('meta[property^="og:"]', { element: (el) => el.remove() })
    .on('meta[name^="twitter:image"], meta[name="twitter:card"]', { element: (el) => el.remove() })
    .on('head', { element: (el) => el.append(tags, { html: true }) })
    .transform(new Response(shell.body, { status: shell.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } }));
}

export interface Env {
  ASSETS: {
    fetch: (request: Request | string) => Promise<Response>;
  };
  RESEND_API_KEY?: string;
  CONTACT_EMAIL_RECIPIENT?: string;
  RESEND_FROM?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/send-email') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      try {
        const body = await request.json();
        const result = await processSendEmail(body as any, {
          apiKey: env.RESEND_API_KEY,
          recipient: env.CONTACT_EMAIL_RECIPIENT,
          fromAddress: env.RESEND_FROM,
        });

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || 'Failed to send email' }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    const eventMatch = url.pathname.match(/^\/events\/([^/]+)\/?$/);
    if (eventMatch && request.method === 'GET') {
      const page = await eventPage(request, env, eventMatch[1]);
      if (page) return page;
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status === 404) {
      const spaUrl = new URL(request.url);
      spaUrl.pathname = '/index.html';
      return await env.ASSETS.fetch(new Request(spaUrl.toString(), request));
    }
    return response;
  },
};
