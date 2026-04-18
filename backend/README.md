# Academic Calendar Backend (JavaScript)

## Stack
- Node.js
- Express
- JWT authentication
- bcrypt password hashing
- JSON file persistence

## Run
1. Install dependencies from the workspace root:
   npm install
2. Create a `.env` file from `.env.example`.
3. Start server:
   npm start

Server starts at `http://localhost:3000` by default.

## Gmail notifications
The backend can send all calendar notifications through Gmail using SMTP.

Add these values to `.env`:
- `APP_BASE_URL`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `GMAIL_FROM`

What gets emailed:
- Welcome email after registration
- Event created notifications
- Event updated notifications
- Event deleted notifications
- Reminder emails for reminder-enabled events happening today or tomorrow

Admin tools:
- `GET /api/notifications/status`
- `POST /api/notifications/reminders/run`

For Gmail, use an App Password from the Google account that will send the messages.

## Demo credentials
- Admin: admin@srit.edu / admin123
- Student: student@srit.edu / student123

## API overview
- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token)
- `GET /api/categories`
- `GET /api/events` (Bearer token)
- `POST /api/events` (Admin only)
- `PUT /api/events/:id` (Admin only)
- `DELETE /api/events/:id` (Admin only)

## Data file
Runtime data is stored in:
- `backend/src/data/db.json`

The file is auto-created on first run with seed users, categories, and events.
