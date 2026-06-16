# SHARKS Clinic — Web Application

A clinic management frontend consisting of a public-facing marketing/booking website and an admin management dashboard. Built with plain HTML, CSS, and JavaScript (no frameworks, no build step required).

## Project structure

```
.
├── index.html, about.html, services.html,
│   appointment.html, feedback.html   ← public website pages
├── admin/                            ← admin dashboard (login, patients, doctors,
│                                        appointments, billing)
├── assets/
│   ├── js/                           ← shared data layer (storage.js) + toast.js
│   └── css/                          ← shared toast/modal styling
├── components/                       ← shared header/footer + loader script
├── scripts/                          ← public site page-specific scripts
├── styles/                           ← public site page-specific styles
└── images/
```

See `DOCUMENTATION.md` for a full explanation of every script, function, and how data flows through the app.

## Running locally

This is a static site — no build tools or server-side code are required. Because the pages use `fetch()` to load the shared header/footer, you do need to serve the files over `http://` rather than opening them directly as `file://`, or the fetch requests will be blocked by the browser.

The simplest way:

```bash
# From the project root
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser for the public site, and `http://localhost:8080/admin/` for the admin dashboard.

## Admin login (demo credentials)

```
Username: admin
Password: sharks123
```

This is a simulated, client-side-only login for demonstration purposes. See the "Security & production-readiness notes" section in `DOCUMENTATION.md` before using this with real patient data.

## Resetting demo data

All data (patients, doctors, appointments, invoices) lives in your browser's `localStorage`. To reset everything back to the original seed data, open your browser's developer console on any page of the site and run:

```js
localStorage.removeItem("sharksClinicDB");
```

Then refresh the page.
