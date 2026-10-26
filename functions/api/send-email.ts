import { processSendEmail } from '../../src/features/contact/services/sendEmail';

export async function onRequestPost(context: any) {
  try {
    const data = await context.request.json();
    const env = context.env || {};
    const result = await processSendEmail(data, {
      apiKey: env.RESEND_API_KEY,
      recipient: env.CONTACT_EMAIL_RECIPIENT,
      fromAddress: env.RESEND_FROM,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send email' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
