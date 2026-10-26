import { processSendEmail } from './features/contact/services/sendEmail';

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

    const response = await env.ASSETS.fetch(request);
    if (response.status === 404) {
      const spaUrl = new URL(request.url);
      spaUrl.pathname = '/index.html';
      return await env.ASSETS.fetch(new Request(spaUrl.toString(), request));
    }
    return response;
  },
};
