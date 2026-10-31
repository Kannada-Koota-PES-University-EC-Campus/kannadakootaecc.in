import { processSendEmail } from '../../src/features/contact/services/sendEmail';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestPost(context: any) {
  try {
    const data = await context.request.json();
    const env = context.env || {};
    const result = await processSendEmail(data, {
      apiKey: env.RESEND_API_KEY,
      recipient: env.CONTACT_EMAIL_RECIPIENT || 'it.team.kannadakootaecc@gmail.com',
      fromAddress: env.RESEND_FROM || 'onboarding@resend.dev',
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send email' }),
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
