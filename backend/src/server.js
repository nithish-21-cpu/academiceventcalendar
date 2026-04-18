const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const config = require('./config');
const { readDb, writeDb, ensureDbFile } = require('./db');
const { createToken, authenticate, requireAdmin, validatePassword } = require('./auth');
const { isMailConfigured, sendMail, buildEventEmail } = require('./mailer');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const app = express();

app.use(cors());
app.use(express.json());

function uniqueUserEmails(users) {
  return [...new Set(
    users
      .map((user) => String(user.email || '').trim().toLowerCase())
      .filter(Boolean)
  )];
}

async function notifyUsersAboutEvent({ db, event, action, actorName }) {
  const recipients = uniqueUserEmails(db.users);
  const subjectMap = {
    created: `New academic event: ${event.title}`,
    updated: `Academic event updated: ${event.title}`,
    deleted: `Academic event cancelled: ${event.title}`,
    reminder: `Reminder: ${event.title}`,
  };
  const introMap = {
    created: `${actorName} added a new event to the academic calendar.`,
    updated: `${actorName} updated an academic calendar event.`,
    deleted: `${actorName} removed an academic calendar event.`,
    reminder: `This is your scheduled reminder for an upcoming academic event.`,
  };
  const footerMap = {
    created: 'This notification was sent via EmailJS.',
    updated: 'Please review the latest details in the academic calendar.',
    deleted: 'Please remove this event from your personal plans if needed.',
    reminder: 'You are receiving this because reminders are enabled for the event.',
  };

  const mail = buildEventEmail({
    heading: subjectMap[action] || 'Academic calendar update',
    intro: introMap[action] || 'There is an update in the academic calendar.',
    event,
    footer: footerMap[action] || 'Academic calendar notification.',
  });

  return sendMail({
    to: recipients,
    subject: subjectMap[action] || 'Academic calendar update',
    text: mail.text,
    html: mail.html,
  });
}

function reminderKey(eventId, userEmail, reminderDate) {
  return `${eventId}:${userEmail}:${reminderDate}`;
}

function getReminderDateLabel(eventDate) {
  const start = new Date(`${eventDate}T00:00:00`);
  return start.toISOString().slice(0, 10);
}

async function runReminderDispatch() {
  const db = await readDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = uniqueUserEmails(db.users);
  const candidates = db.events.filter((event) => {
    if (!event.rem || !event.date) {
      return false;
    }

    const eventDate = new Date(`${event.date}T00:00:00`);
    const diffDays = Math.round((eventDate - today) / 86400000);
    return diffDays === 0 || diffDays === 1;
  });

  const summary = {
    configured: isMailConfigured(),
    scanned: candidates.length,
    delivered: 0,
    skipped: 0,
    errors: [],
  };

  if (!summary.configured) {
    summary.skipped = candidates.length * users.length;
    return summary;
  }

  for (const event of candidates) {
    for (const email of users) {
      const key = reminderKey(event.id, email, getReminderDateLabel(event.date));
      if (db.notifications.some((item) => item.key === key)) {
        summary.skipped += 1;
        continue;
      }

      try {
        const mail = buildEventEmail({
          heading: `Reminder: ${event.title}`,
          intro: 'This event is scheduled for today or tomorrow.',
          event,
          footer: 'This reminder was delivered via EmailJS.',
        });

        const result = await sendMail({
          to: email,
          subject: `Reminder: ${event.title}`,
          text: mail.text,
          html: mail.html,
        });

        if (result.sent) {
          db.notifications.push({
            key,
            type: 'reminder',
            eventId: event.id,
            email,
            sentAt: new Date().toISOString(),
          });
          summary.delivered += 1;
        } else {
          summary.skipped += 1;
        }
      } catch (error) {
        summary.errors.push(`Failed for ${email} on ${event.title}: ${error.message}`);
      }
    }
  }

  if (summary.delivered > 0) {
    await writeDb(db);
  }

  return summary;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, at: new Date().toISOString() });
});

app.get('/api/categories', async (_req, res) => {
  const db = await readDb();
  res.json(db.categories);
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'name, email, password and role are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  if (!['admin', 'student'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin or student.' });
  }

  const db = await readDb();
  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = db.users.some((u) => u.email.toLowerCase() === normalizedEmail);

  if (exists) {
    return res.status(409).json({ message: 'Email already exists.' });
  }

  const user = {
    id: `u${Date.now()}`,
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 10),
    role,
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  await writeDb(db);

  sendMail({
    to: user.email,
    subject: 'Welcome to AcadCal',
    text: `Hello ${user.name},\n\nYour account has been created successfully.\n\nRole: ${user.role}\nOpen calendar: ${config.appBaseUrl}\n\nThis notification was sent via EmailJS.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0B1D3A;max-width:640px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">Welcome to AcadCal</h2>
        <p style="margin:0 0 12px">Hello ${user.name},</p>
        <p style="margin:0 0 12px">Your account has been created successfully.</p>
        <p style="margin:0 0 12px"><strong>Role:</strong> ${user.role}</p>
        <p style="margin:0"><a href="${config.appBaseUrl}" style="display:inline-block;background:#0B1D3A;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px">Open Academic Calendar</a></p>
      </div>
    `,
  }).catch((error) => {
    console.error('Welcome email failed:', error.message);
  });

  const token = createToken(user);
  return res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required.' });
  }

  const db = await readDb();
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user || !(await validatePassword(user, password))) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = createToken(user);
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  return res.json({ user: req.user });
});

app.get('/api/notifications/status', authenticate, async (_req, res) => {
  const db = await readDb();
  const reminderCount = db.notifications.filter((item) => item.type === 'reminder').length;

  res.json({
    configured: isMailConfigured(),
    from: config.gmailFrom || null,
    appBaseUrl: config.appBaseUrl,
    reminderCount,
  });
});

app.post('/api/notifications/reminders/run', authenticate, requireAdmin, async (_req, res) => {
  const summary = await runReminderDispatch();
  res.json(summary);
});

app.post('/api/notifications/custom', authenticate, requireAdmin, async (req, res) => {
  const { subject, message } = req.body || {};
  if (!subject || !message) {
    return res.status(400).json({ message: 'Subject and message are required.' });
  }

  const db = await readDb();
  const recipients = uniqueUserEmails(db.users);

  try {
    const result = await sendMail({
      to: recipients,
      subject: String(subject).trim(),
      text: String(message),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0B1D3A;max-width:640px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px">${escapeHtml(subject)}</h2>
          <p style="white-space:pre-wrap;margin:0 0 16px">${escapeHtml(message)}</p>
          <p style="margin:16px 0 0;color:#4A5878">This notification was sent by an administrator via the AcadCal portal.</p>
        </div>
      `
    });

    res.json({
      configured: isMailConfigured(),
      sent: result.sent,
      skipped: result.skipped,
      reason: result.reason,
      recipientCount: recipients.length
    });
  } catch (error) {
    console.error('Custom notification failed:', error.message);
    res.status(500).json({ message: error.message || 'Failed to send notification.' });
  }
});

app.get('/api/events', authenticate, async (req, res) => {
  const db = await readDb();
  const q = String(req.query.q || '').trim().toLowerCase();
  const cat = String(req.query.cat || 'all').trim();
  const month = String(req.query.month || 'all').trim();

  let events = [...db.events];

  if (cat !== 'all') {
    events = events.filter((e) => e.cat === cat);
  }

  if (month !== 'all') {
    events = events.filter((e) => String(e.date).startsWith(month));
  }

  if (q) {
    events = events.filter((e) =>
      String(e.title).toLowerCase().includes(q) ||
      String(e.desc || '').toLowerCase().includes(q)
    );
  }

  events.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  res.json(events);
});

app.post('/api/events', authenticate, requireAdmin, async (req, res) => {
  const { title, date, end = '', cat, desc = '', rem = false } = req.body || {};

  if (!title || !date || !cat) {
    return res.status(400).json({ message: 'title, date and cat are required.' });
  }

  const db = await readDb();
  const event = {
    id: `e${Date.now()}`,
    title: String(title).trim(),
    date,
    end,
    cat,
    desc: String(desc).trim(),
    rem: Boolean(rem),
  };

  db.events.push(event);
  await writeDb(db);
  notifyUsersAboutEvent({
    db,
    event,
    action: 'created',
    actorName: req.user.name,
  }).catch((error) => {
    console.error('Create event notification failed:', error.message);
  });
  res.status(201).json(event);
});

app.put('/api/events/:id', authenticate, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { title, date, end = '', cat, desc = '', rem = false } = req.body || {};

  if (!title || !date || !cat) {
    return res.status(400).json({ message: 'title, date and cat are required.' });
  }

  const db = await readDb();
  const idx = db.events.findIndex((e) => e.id === id);

  if (idx < 0) {
    return res.status(404).json({ message: 'Event not found.' });
  }

  const updated = {
    ...db.events[idx],
    title: String(title).trim(),
    date,
    end,
    cat,
    desc: String(desc).trim(),
    rem: Boolean(rem),
  };

  db.events[idx] = updated;
  await writeDb(db);
  notifyUsersAboutEvent({
    db,
    event: updated,
    action: 'updated',
    actorName: req.user.name,
  }).catch((error) => {
    console.error('Update event notification failed:', error.message);
  });
  res.json(updated);
});

app.delete('/api/events/:id', authenticate, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const db = await readDb();
  const deletedEvent = db.events.find((e) => e.id === id);
  const before = db.events.length;
  db.events = db.events.filter((e) => e.id !== id);

  if (db.events.length === before) {
    return res.status(404).json({ message: 'Event not found.' });
  }

  await writeDb(db);
  notifyUsersAboutEvent({
    db,
    event: deletedEvent,
    action: 'deleted',
    actorName: req.user.name,
  }).catch((error) => {
    console.error('Delete event notification failed:', error.message);
  });
  return res.status(204).send();
});

app.use(express.static(path.join(__dirname, '..', '..')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'academic-calendar-app.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error.' });
});

ensureDbFile().then(() => {
  app.listen(config.port, () => {
    console.log(`Academic backend running at http://localhost:${config.port}`);
  });

  runReminderDispatch().catch((error) => {
    console.error('Initial reminder dispatch failed:', error.message);
  });

  setInterval(() => {
    runReminderDispatch().catch((error) => {
      console.error('Reminder dispatch failed:', error.message);
    });
  }, 15 * 60 * 1000);
});
