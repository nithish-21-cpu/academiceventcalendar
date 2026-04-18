const config = require('./config');

function isMailConfigured() {
  return Boolean(config.emailjsServiceId && config.emailjsTemplateId && config.emailjsPublicKey);
}

function formatEventDate(event) {
  if (!event?.date) {
    return 'Date not available';
  }

  const start = new Date(`${event.date}T00:00:00`);
  const startLabel = start.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (!event.end || event.end === event.date) {
    return startLabel;
  }

  const end = new Date(`${event.end}T00:00:00`);
  const endLabel = end.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `${startLabel} to ${endLabel}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendMail({ to, subject, text, html }) {
  if (!isMailConfigured()) {
    return {
      sent: false,
      skipped: true,
      reason: 'emailjs_not_configured',
    };
  }

  if (!to || (Array.isArray(to) && !to.length)) {
    return {
      sent: false,
      skipped: true,
      reason: 'no_recipients',
    };
  }

  const recipientEmail = Array.isArray(to) ? to.join(', ') : to;

  console.log(`\n--- [EmailJS Debug] ---`);
  console.log(`isMailConfigured check passed.`);
  console.log(`Preparing to send email to recipients: ${recipientEmail}`);
  console.log(`Subject: "${subject}"`);

  const payload = {
    service_id: config.emailjsServiceId,
    template_id: config.emailjsTemplateId,
    user_id: config.emailjsPublicKey,
    accessToken: config.emailjsPrivateKey,
    template_params: {
      to_email: recipientEmail,
      subject: subject,
      message: text,
      html_message: html
    }
  };

  try {
    console.log(`[EmailJS] Sending POST request to https://api.emailjs.com/api/v1.0/email/send...`);
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`[EmailJS] ✅ Success! Received 200 OK.`);
      console.log(`-----------------------\n`);
      return {
        sent: true,
        skipped: false,
        reason: null,
      };
    } else {
      const errText = await response.text();
      console.error(`[EmailJS] ❌ Failed! HTTP Status: ${response.status} ${response.statusText}`);
      console.error(`[EmailJS] Response from server: ${errText}`);
      console.log(`-----------------------\n`);
      return {
        sent: false,
        skipped: true,
        reason: `EmailJS error: ${errText}`
      };
    }
  } catch (error) {
    console.error('[EmailJS] ❌ Network/Fetch Error:', error.message);
    console.log(`-----------------------\n`);
    return {
      sent: false,
      skipped: true,
      reason: error.message
    };
  }
}

function buildEventEmail({ heading, intro, event, footer }) {
  const title = escapeHtml(event.title);
  const dateLabel = escapeHtml(formatEventDate(event));
  const category = escapeHtml(event.cat || 'General');
  const desc = escapeHtml(event.desc || 'No additional description provided.');
  const appUrl = escapeHtml(config.appBaseUrl);

  return {
    text: `${heading}

${intro}

Title: ${event.title}
Date: ${formatEventDate(event)}
Category: ${event.cat || 'General'}
Description: ${event.desc || 'No additional description provided.'}

Open calendar: ${config.appBaseUrl}

${footer}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0B1D3A;max-width:640px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">${escapeHtml(heading)}</h2>
        <p style="margin:0 0 16px">${escapeHtml(intro)}</p>
        <div style="background:#F5F6FA;border:1px solid #E8ECF4;border-radius:12px;padding:16px">
          <p style="margin:0 0 8px"><strong>Title:</strong> ${title}</p>
          <p style="margin:0 0 8px"><strong>Date:</strong> ${dateLabel}</p>
          <p style="margin:0 0 8px"><strong>Category:</strong> ${category}</p>
          <p style="margin:0"><strong>Description:</strong> ${desc}</p>
        </div>
        <p style="margin:16px 0 0">
          <a href="${appUrl}" style="display:inline-block;background:#0B1D3A;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px">Open Academic Calendar</a>
        </p>
        <p style="margin:16px 0 0;color:#4A5878">${escapeHtml(footer)}</p>
      </div>
    `,
  };
}

module.exports = {
  isMailConfigured,
  sendMail,
  buildEventEmail,
  formatEventDate,
};
