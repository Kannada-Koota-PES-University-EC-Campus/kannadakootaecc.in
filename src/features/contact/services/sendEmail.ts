export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  recipient: string;
  sandboxFallback?: boolean;
  message?: string;
}

export async function processSendEmail(
  data: ContactFormData,
  envOverride?: { apiKey?: string; recipient?: string; fromAddress?: string }
): Promise<SendEmailResult> {
  const { name, email, subject, message } = data;

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    throw new Error('All fields (name, email, subject, message) are required.');
  }

  const apiKey = envOverride?.apiKey || process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY. Please configure it in your environment.');
  }

  const targetRecipient =
    envOverride?.recipient ||
    process.env.CONTACT_EMAIL_RECIPIENT ||
    'it.team.kannadakootaecc@gmail.com';

  const fromAddress =
    envOverride?.fromAddress ||
    process.env.RESEND_FROM ||
    'onboarding@resend.dev';

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2d9cd; border-radius: 8px; overflow: hidden; background: #ffffff;">
      <div style="background: #25201d; padding: 26px 28px; color: #f8f0e4; border-bottom: 4px solid #e1b967;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: #f8f0e4; letter-spacing: 0.02em;">
          ಕನ್ನಡ ಕೂಟ · PES Electronic City
        </h2>
        <p style="margin: 6px 0 0; font-size: 13px; color: #e1b967; font-weight: 500;">
          Say Hello / Contact Form Submission
        </p>
      </div>

      <div style="padding: 28px; color: #2c2724; line-height: 1.6;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f0ebe1;">
            <td style="padding: 10px 0; font-weight: 600; width: 110px; color: #706558;">From:</td>
            <td style="padding: 10px 0; font-weight: 500; color: #25201d;">
              ${escapeHtml(name)} &lt;<a href="mailto:${escapeHtml(email)}" style="color: #b38228; text-decoration: none;">${escapeHtml(email)}</a>&gt;
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f0ebe1;">
            <td style="padding: 10px 0; font-weight: 600; color: #706558;">Subject:</td>
            <td style="padding: 10px 0; font-weight: 500; color: #25201d;">${escapeHtml(subject)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: 600; color: #706558;">Received At:</td>
            <td style="padding: 10px 0; color: #5c5348;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
          </tr>
        </table>

        <div style="background: #fbf9f5; border-left: 4px solid #e1b967; padding: 18px 20px; border-radius: 4px; margin-top: 14px;">
          <h3 style="margin: 0 0 10px; font-size: 12px; font-weight: 700; color: #8c7d6b; text-transform: uppercase; letter-spacing: 0.08em;">
            Message
          </h3>
          <p style="white-space: pre-wrap; margin: 0; font-size: 14px; color: #1c1815; line-height: 1.7;">${escapeHtml(message)}</p>
        </div>
      </div>

      <div style="background: #f7f4ed; padding: 18px 28px; font-size: 12px; color: #786e63; border-top: 1px solid #e8e2d5; line-height: 1.5;">
        <p style="margin: 0;">This email was sent via the <strong>Say Hello / Contact Form</strong> on the Kannada Koota PES EC portal.</p>
        <p style="margin: 6px 0 0;">Reply directly to this email to respond to <strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}).</p>
      </div>
    </div>
  `;

  const payload: any = {
    from: `Kannada Koota Website <${fromAddress}>`,
    to: [targetRecipient],
    reply_to: email,
    subject: `[Say Hello] ${subject} - from ${name}`,
    html: htmlContent,
    text: `New message from ${name} (${email}):\n\nSubject: ${subject}\n\nMessage:\n${message}\n\nSubmitted at: ${new Date().toISOString()}\n`
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const resJson = await response.json();

  if (!response.ok) {
    // Check if it's the Resend free test sandbox restriction
    if (
      response.status === 403 &&
      resJson.message &&
      resJson.message.includes('only send testing emails to your own email address')
    ) {
      const match = resJson.message.match(/\(([^)]+)\)/);
      const fallbackEmail = match ? match[1] : 'vikasnnaik201@gmail.com';

      const sandboxBanner = `
        <div style="background: #fff8e6; color: #855b04; padding: 14px 18px; border: 1px solid #f6deb0; border-radius: 6px; margin-bottom: 20px; font-size: 13px; line-height: 1.5;">
          <strong>⚠️ Resend Test Sandbox Notification:</strong><br/>
          This contact form submission was intended for <strong>${escapeHtml(targetRecipient)}</strong>.<br/>
          Because a custom domain (e.g. <code>kannadakoota.in</code>) has not yet been verified on your Resend account, Resend delivered this to your verified account address (<strong>${escapeHtml(fallbackEmail)}</strong>).<br/>
          <em>To receive emails directly at ${escapeHtml(targetRecipient)}, verify your custom domain in the <a href="https://resend.com/domains" target="_blank" style="color:#855b04;text-decoration:underline;">Resend Dashboard</a>.</em>
        </div>
      `;

      payload.to = [fallbackEmail];
      payload.html = `${sandboxBanner}${htmlContent}`;
      payload.subject = `[Intended for ${targetRecipient}] ${payload.subject}`;

      const retryResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const retryJson = await retryResponse.json();
      if (!retryResponse.ok) {
        throw new Error(retryJson.message || 'Failed to send message via Resend');
      }

      return {
        success: true,
        id: retryJson.id,
        recipient: fallbackEmail,
        sandboxFallback: true,
        message: `Message received and delivered to ${fallbackEmail} (Resend sandbox mode).`
      };
    }

    throw new Error(resJson.message || 'Failed to send message via Resend');
  }

  return {
    success: true,
    id: resJson.id,
    recipient: targetRecipient,
    sandboxFallback: false,
    message: 'Message sent successfully.'
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
