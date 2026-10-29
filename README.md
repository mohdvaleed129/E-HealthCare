# CareStem — E-Healthcare Appointment Platform

A patient/doctor/admin appointment booking platform rebuilt on a proper
layered architecture (routes → controllers → models), with real
authentication, RBAC, and a single source of truth for appointments.

## Requirements
- Node.js 18+
- MongoDB running locally or a connection string to a hosted instance

## Setup

```bash
npm install
cp .env.example .env
# edit .env: set JWT_SECRET / SESSION_SECRET / COOKIE_SECRET to random
# strings, set ADMIN_PASSWORD, and MONGO_URI if not using local default
npm run dev      # nodemon, auto-restart
# or
npm start        # plain node
```

The app runs at `http://localhost:3000` by default (`PORT` in `.env`).

## First-time admin access
Admin isn't a database record — it's a single bootstrap credential from
`.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). Log in at `/login` with role
"Admin" using those values. Change `ADMIN_PASSWORD` before deploying.

## Project structure
```
server.js                 Entry point — connects DB, starts HTTP server
src/
  app.js                  Express app: middleware, view engine, routes
  config/
    env.js                Centralized environment variable loading
    db.js                 MongoDB connection
  models/
    User.js                Patient accounts
    Doctor.js               Doctor accounts + approval status
    Appointment.js          Single source of truth for bookings
  middleware/
    auth.js                JWT cookie parsing, requireAuth, requireRole
    upload.js               Multer config: mime/size validated, random filenames
    errorHandler.js         Centralized 404 / error responses (no leaked internals)
  controllers/              One file per feature area (auth, doctor, patient, admin, appointment)
  routes/index.js           All routes, wired with auth/role middleware
  services/
    notificationService.js  Twilio wrapper — degrades gracefully if unset
templates/                 Handlebars views
  partials/                 head, navbar, footer, alert (shared across pages)
public/
  css/main.css              Design system (tokens, components, responsive rules)
  js/app.js                 Nav toggle, flash dismiss, confirm dialogs, live search
  pictures/                 Uploaded doctor profile photos
```

## Roles & flows
- **Patient**: sign up → search doctors → book appointment → view/cancel
  in `/appointments`.
- **Doctor**: apply at `/doctor/signup` → status is `pending` until an
  admin approves → log in → `/doctor/dashboard` to manage availability,
  queue number, and today's appointments.
- **Admin**: log in with the bootstrap credential → `/admin` for stats →
  `/admin/doctors` to approve/reject/suspend → `/admin/patients` to
  suspend accounts → `/admin/appointments` to search/filter all bookings.

## What changed from the original project (summary)
See the full audit and change list in the chat response this was
delivered with. In short: real bcrypt password hashing, one JWT-based
auth system (the old mixed JWT+session+in-memory-map setup is gone),
a dedicated `Appointment` collection instead of duplicated arrays on
both `User` and `Doctor`, a doctor approval workflow, booking
validation (no double-booking, no past dates, capacity limits,
working-hours/day checks), secrets moved to `.env`, restricted file
uploads, rate-limited auth routes, Helmet security headers, and a
redesigned responsive UI.

## Known limitations / next steps
- **Not verified against a live MongoDB in this environment** — no
  `mongod` was available in the sandbox this was built in. Backend
  logic, routing, and templates were checked (syntax, template
  compilation, and route smoke tests against a DB-less server that
  correctly falls back to the error page instead of crashing), but you
  should run through the signup → doctor approval → booking flow
  yourself against a real database before treating this as
  production-ready.
- No automated test suite (unit/integration tests) — worth adding
  before this handles real patient data.
- No pagination yet on `/admin/appointments` (capped at 200 results) —
  add pagination if appointment volume grows.
- Content-Security-Policy is disabled in `helmet()` — turn it on and
  tune it once you finalize any external asset domains (fonts, CDNs).
- Rescheduling isn't implemented (cancel + rebook works today).
- SMS requires Twilio credentials in `.env`; without them, bookings
  still succeed and just skip the SMS step (by design).
