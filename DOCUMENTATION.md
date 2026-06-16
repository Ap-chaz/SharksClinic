# SHARKS Clinic — JavaScript Implementation & Architecture Report

This document explains every JavaScript file added or rewritten in this project, why it exists, how data flows through the system, and how each feature works. It's written to double as a learning reference, not just a changelog.

---

## 1. Big picture: how the project is organized now

```
Sharks-Clinic-code/
├── index.html, about.html, services.html,
│   appointment.html, feedback.html        ← public website pages
├── admin/
│   ├── index.html                         ← admin dashboard (single page, multiple "views")
│   ├── script.js                          ← all admin logic
│   └── styles.css                         ← admin styling
├── assets/
│   ├── js/
│   │   ├── storage.js                     ← shared data layer (the "database")
│   │   └── toast.js                       ← shared notification system
│   └── css/
│       └── shared.css                     ← shared toast + modal styling
├── components/
│   ├── header.html, footer.html           ← reusable HTML fragments
│   └── components.js                      ← loads header/footer, mobile menu, active nav link
├── scripts/
│   ├── main.js                            ← homepage hero slideshow
│   ├── appointment.js                     ← public appointment form logic
│   ├── feedback.js                        ← public feedback form logic
│   └── services.js                        ← services page live search
└── styles/                                ← existing per-page CSS (untouched structurally)
```

**The key idea:** the public website and the admin dashboard are two different front ends for the *same* data. Neither has a real backend/server — instead, both read and write to the browser's `localStorage` through one shared module, `storage.js`. When a patient books an appointment on the public site, that booking appears immediately in the admin dashboard's Appointments table and statistics, because they're both reading from the same storage key.

---

## 2. The shared data layer: `assets/js/storage.js`

### Why it exists
Every other script needs a single, consistent way to read and write clinic data (patients, doctors, appointments, invoices) without each file inventing its own storage format. `storage.js` is that single source of truth — it's the closest thing this project has to a "database," implemented entirely in the browser using `localStorage`.

### How it works
It exposes one global object, `SharksDB`, with a small set of methods. Internally, everything is stored as one big JSON object under a single `localStorage` key (`"sharksClinicDB"`), shaped like this:

```js
{
  patients: [ {id, name, phone, email, age, gender, lastVisit, status}, ... ],
  doctors: [ {id, name, specialty, phone, email, status}, ... ],
  appointments: [ {id, patientName, phone, doctor, department, date, time, status, ...}, ... ],
  invoices: [ {id, patientName, service, amount, date, status}, ... ],
  feedback: [],
  meta: { nextPatientId, nextDoctorId, nextAppointmentId, nextInvoiceId },
  settings: { darkMode },
  auth: { loggedIn, user }
}
```

### Key functions

- **`load()`** — reads the JSON from `localStorage`. If nothing exists yet (first visit), it generates realistic seed data (5 sample patients, 4 doctors, 6 appointments, 5 invoices) and saves it. This means the dashboard never opens to an empty, useless screen.
- **`save(data)`** — writes the whole object back to `localStorage` as a JSON string.
- **`getAll(collection)`** — returns an array, e.g. `SharksDB.getAll('patients')`.
- **`getById(collection, id)`** — finds one record by its ID.
- **`add(collection, item)`** — pushes a new record and saves.
- **`update(collection, id, changes)`** — merges `changes` into the existing record (so you only need to pass the fields that changed).
- **`remove(collection, id)`** — deletes a record by ID.
- **`nextId(type)`** — generates the next sequential ID for a given type (e.g. `P-1006`, `D-005`, `A-2007`, `INV-3006`), so every new record gets a unique, human-readable ID without collisions.
- **`getAuth()` / `setAuth(changes)`** — tracks whether the admin is logged in.
- **`getSettings()` / `updateSettings(changes)`** — currently just stores the dark mode preference, but is built to hold more settings later.

### Why this design
Centralizing storage in one file means every feature (patients, doctors, appointments, billing) follows the exact same pattern: call `getAll`, `add`, `update`, or `remove` with a collection name. If you ever swap `localStorage` for a real backend API, you'd only need to rewrite the inside of these functions — every other file that calls `SharksDB.add(...)` wouldn't need to change at all. This is called a **data access layer**, and it's standard practice for keeping storage logic separate from UI logic.

---

## 3. The shared notification system: `assets/js/toast.js`

### Why it exists
Forms and admin actions need to tell the user "it worked" or "something's wrong" without using disruptive `alert()` popups. A toast is a small message that slides in, stays a few seconds, and disappears — used by almost every modern web app.

### How it works
`SharksToast.show(message, type, duration)` is the only function you call from anywhere in the app:

```js
SharksToast.show("Appointment booked!", "success");
SharksToast.show("Please fix the highlighted fields.", "error");
```

Internally:
1. It checks if a `<div id="toastContainer">` already exists on the page; if not, it creates one and appends it to `<body>`.
2. It builds a small `<div class="toast toast-success">` (or `-error`, `-warning`, `-info`) with an icon, the message text, and a close button.
3. It adds a CSS class to animate it sliding in (`toast-show`).
4. After `duration` milliseconds (default 4 seconds), it removes itself. The user can also click the × to dismiss early.

### Why this design
Because it's a self-contained module with one public function, *any* script — the appointment form, the feedback form, or any admin CRUD action — can call `SharksToast.show(...)` without needing to know how toasts are built or styled. This is the same "one clear entry point" pattern used in `storage.js`.

---

## 4. Public website scripts

### 4.1 `components/components.js` — shared header/footer + navigation

**Why it exists:** the original site already loaded `header.html` and `footer.html` into every page via `fetch()`, but the mobile hamburger menu had a bug (relied on an inline `addEventListener` that only worked if elements existed at exactly the right time), and there was no "active page" highlighting in the nav bar.

**What it does now:**
- `loadComponent(id, file)` fetches the HTML fragment and injects it into the page. If the fetch fails, it logs an error instead of silently breaking.
- `initMobileMenu()` wires the hamburger button: clicking (or pressing Enter/Space, for keyboard users) toggles the `.active` class on the nav menu, and updates `aria-expanded` so screen readers know whether the menu is open. Tapping any link inside the mobile menu automatically closes it — a small detail that matters a lot on phones.
- `highlightActiveNavLink()` looks at the current page's filename (e.g. `about.html`) and adds an `active-link` CSS class to the matching nav link, so users always know which page they're on.

### 4.2 `scripts/main.js` — homepage hero slideshow

Unchanged in logic, just confirmed clean: it finds all `.slide` elements and rotates the `.active` class between them every 4 seconds. It safely does nothing if there are no slides on the page (so it doesn't error out on other pages that happen to load it).

### 4.3 `scripts/appointment.js` — appointment booking form

**Why it exists:** the original appointment form had no validation and no way to actually save a booking anywhere — submitting it did nothing.

**How it works:**
1. Listens for the form's `submit` event and immediately calls `e.preventDefault()` so the page doesn't reload.
2. Collects all field values into a `data` object.
3. Runs `validate(data)`, which checks: name isn't empty; phone matches a simple pattern (digits, spaces, +, - between 7–15 characters); email (if provided) looks like an email; department is selected; date is filled in *and* isn't in the past; time is selected; reason isn't empty.
4. If there are errors, `showErrors()` adds a `has-error` class to each invalid field's wrapper `<div data-field="...">`, which CSS uses to show a red border and the field's `.field-error` message. It also focuses the first invalid field, which helps both sighted and screen-reader users find the problem immediately.
5. If everything's valid, `saveAppointment(data)` calls `SharksDB.nextId('appointment')` to get a new ID like `A-2007`, then `SharksDB.add('appointments', {...})` to store it with `status: "Pending"` and `source: "website"` (so the admin panel can tell it came from a real patient, not from admin-side seed data).
6. A success toast appears, the form resets, and any leftover error states are cleared.

### 4.4 `scripts/feedback.js` — feedback form

Follows the exact same pattern as the appointment form: validate → show inline errors or save → toast → reset. The feedback form additionally validates a star rating and a "would you recommend us" radio button group (read via `form.querySelector('input[name="recommend"]:checked')`, since radio buttons don't expose their value the same way text inputs do). Submitted feedback is saved into the `feedback` collection in `SharksDB` (currently not displayed anywhere in the admin panel, since that wasn't part of the original page set — see "Assumptions" below).

### 4.5 `scripts/services.js` — live service search

**Why it exists:** the services page had a search box with no functionality.

**How it works:** on every keystroke in the search input, it loops through all `.service-card` elements, checks whether the card's visible text (or a `data-keywords` attribute, if present, for broader matching) contains the typed text, and toggles a `hidden-card` CSS class accordingly. If zero cards match, it shows a "no results" message; otherwise it hides that message. This is a simple, instant client-side filter — no server round-trip needed since all services are already in the page.

---

## 5. Admin dashboard: `admin/script.js`

This is the largest file, so it's organized into 12 numbered sections (visible as comments in the file itself). Here's what each does and why.

### 5.1 Authentication (login / logout)

**Why it exists:** an admin dashboard with real patient data shouldn't be open to anyone who finds the URL. Since there's no real backend in this project, this is a *simulated* login — it proves the UI pattern works, but it is **not secure** (see the Security Notes section below).

**How it works:**
- On page load, `initAuth()` checks `SharksDB.getAuth().loggedIn`. If true, it shows the dashboard (`#appShell`) and hides the login screen. If false, it shows the login screen and hides the dashboard.
- Submitting the login form checks the entered username/password against hardcoded demo credentials (`admin` / `sharks123`). On success, it sets `loggedIn: true` in `SharksDB`, shows a welcome toast, and reveals the dashboard. On failure, it shows inline field errors and an error toast.
- Clicking the logout button (in the sidebar footer) sets `loggedIn: false` and shows the login screen again.

### 5.2 Sidebar navigation & view switching

**Why it exists:** the dashboard now has five "pages" (Dashboard, Patients, Doctors, Appointments, Billing), but it's still a single HTML file — there's no real page navigation/reloading. Instead, all five views exist in the HTML at once, and JavaScript shows one and hides the rest.

**How it works:**
- Every view is a `<div class="page-view" data-page="patients">...</div>` (etc.). Only the one with the `.active` class is visible (`.page-view { display: none } .page-view.active { display: block }` in CSS).
- Sidebar links have a `data-target="patients"` attribute. Clicking one calls `setPage(this)`, which calls `showView('patients')`, which removes `.active` from every view and adds it to the matching one.
- `showView()` also updates the topbar's page title/breadcrumb text, syncs the sidebar's "active" highlighting, and — importantly — calls the matching module's `.render()` function (e.g. `Patients.render()`) so the table is always showing fresh data when you switch to it.
- Sidebar items *without* a `data-target` (there are many — this project has ~40 nav sub-items but only 4 fully built CRUD sections, see "Assumptions") show a polite "this section is part of a future update" toast instead of silently doing nothing.

### 5.3 Dark mode

**Why it exists:** explicitly requested, and a genuinely useful accessibility/comfort feature for night-shift clinic staff.

**How it works:** clicking the moon/sun icon in the topbar toggles a `dark` class on `<body>`. All the dark-mode colors are defined as CSS variable overrides (`body.dark { --bg: #0f172a; ... }`), so every component that already uses `var(--bg)`, `var(--text)`, etc. automatically re-colors itself — no need to write separate dark-mode rules for every single element. The preference is saved via `SharksDB.updateSettings({darkMode: true})` so it persists across page reloads.

### 5.4 Mini calendar

**Why it exists:** this existed before, but was hardcoded to "June 2025" with non-functional prev/next buttons and a fixed list of "appointment days." It's now wired to real data.

**How it works:** `buildCalendar()` calculates the correct number of days in the displayed month and which weekday it starts on, using real JavaScript `Date` math (no more hardcoded `firstDay = 0`). `getApptDaysForMonth()` looks at all real appointments in `SharksDB` and marks any day that has at least one appointment with a `.has-appt` dot. Clicking the prev/next arrows changes `calViewMonth`/`calViewYear` and rebuilds the grid.

### 5.5 Dashboard statistics

**Why it exists:** the original dashboard showed fixed numbers like "1,250 patients" that never changed no matter what you did. Now every number is calculated live from `SharksDB`.

**How it works:** `refreshDashboardStats()` runs every time you return to the Dashboard view (and right after any add/edit/delete anywhere in the app). It:
- Counts total patients.
- Counts today's appointments (compared against a fixed reference "today" date, since this is a static frontend with no real clock-driven backend — see Assumptions).
- Counts doctors whose status is "On Duty" vs. "On Call."
- Sums today's paid invoices for "Revenue Today."
- Counts and sums all non-"Paid" invoices for "Pending Bills," and updates the orange alert banner at the top of the dashboard with the same live number.

### 5.6 Generic table helper (search, sort, filter, pagination)

**Why it exists:** Patients, Doctors, Appointments, and Invoices all need the exact same behaviors — type to search, click a column header to sort, pick a dropdown to filter, click page numbers to paginate. Rather than writing that logic four times, it's written once here and reused.

**How it works:**
- `createTableController()` returns a small state object: `{ page, pageSize, sortKey, sortDir, searchTerm, filterValue }`. Each of the four modules (Patients, Doctors, etc.) keeps its own controller.
- `sortItems(items, controller)` sorts an array by whatever field name is in `controller.sortKey`, ascending or descending. It automatically does numeric comparison for number fields (like age or amount) and case-insensitive text comparison for everything else.
- `paginate(items, controller)` slices the full (already filtered + sorted) list down to just the current page's worth of rows, and tells you how many total pages there are.
- `renderPagination(container, controller, totalPages, onChange)` builds the page-number buttons (with Prev/Next arrows), and wires each button's click to update `controller.page` and re-run the render function.
- `bindSortableHeaders(tableSelector, controller, onChange)` adds a click listener to every `<th class="sortable">`, so clicking a column header sorts by that column (and clicking the same header again flips the direction — ascending then descending).

### 5.7–5.10 Patients, Doctors, Appointments, Invoices modules

These four modules are intentionally near-identical in shape, since they're all doing CRUD (Create, Read, Update, Delete) on a list of records. Each one is wrapped in its own self-contained function (an "IIFE" — immediately-invoked function expression) so its internal variables (like its table controller) don't leak into the global scope and clash with the other modules.

Each module has the same five-part shape:

1. **`getFiltered()`** — pulls all records from `SharksDB`, applies the current search term and dropdown filter, then sorts them.
2. **`render()`** — runs `getFiltered()` + `paginate()`, builds an HTML table row for each visible record (with a colored initials avatar, a status badge, and Edit/Delete icon buttons), and injects it into the table's `<tbody>`. If there are zero matching records, it shows an "empty state" message instead of an empty table. It also re-renders the pagination controls and refreshes any related dashboard numbers.
3. **`openForm(id)`** — opens the Add/Edit modal. If `id` is provided, it pre-fills every field with that record's existing data (Edit mode); if not, it resets the form to blank (Add mode).
4. **`handleSubmit(e)`** — prevents the default form submission, validates every field, shows inline errors if anything's wrong, and otherwise either calls `SharksDB.update(...)` (editing) or `SharksDB.add(...)` with a freshly generated ID (adding). Either way, it closes the modal, re-renders the table, and shows a success toast.
5. **`confirmDelete(id)`** — instead of deleting immediately, it opens a shared confirmation modal ("Are you sure...?") and only calls `SharksDB.remove(...)` if the user clicks the red "Delete" button. This prevents accidental data loss from a misclick.

A few module-specific details worth calling out:

- **Doctors module**: after saving or deleting a doctor, it calls `Appointments.refreshDoctorOptions()` so the "select a doctor" dropdown in the Appointments form always reflects the current doctor list — no stale options.
- **Appointments module**: stores times in 12-hour format (`"09:00 AM"`) for clean display in tables, but the `<input type="time">` field in the edit form requires 24-hour format, so two small converter functions (`convertTo12Hour` / `convertTo24Hour`) translate between the two whenever the form opens or saves.
- **Invoices module**: also maintains three running totals (Total Billed, Paid, Outstanding) shown as stat cards above the table, recalculated on every render via `updateBillingTotals()`.

### 5.11 Modal helpers

**Why it exists:** five different modals (Patient, Doctor, Appointment, Invoice, Delete-confirmation) all need the same open/close behavior — rather than duplicating that logic five times, it's centralized.

**How it works:** `openModal(id)` adds a `modal-open` class (which CSS uses to fade/scale the modal into view) and auto-focuses the first input field. `closeModal(id)` removes that class. `initModals()` wires up: every element with `data-close-modal="someModalId"` (Cancel buttons and the × icon), clicking the dark overlay background outside the modal box, and pressing the Escape key — all three close whichever modal is currently open.

The delete-confirmation modal is slightly different: since it's reused by all four CRUD modules for "are you sure?" prompts, it stores whatever delete action should run in a single `confirmCallback` variable, set by `showConfirmModal(message, onConfirm)` right before the modal opens. When the user clicks the red "Delete" button, it runs whatever `confirmCallback` currently holds, then clears it.

### 5.12 Init

`document.addEventListener('DOMContentLoaded', () => {...})` is the entry point that starts everything once the page's HTML has finished loading: it checks login state, applies the saved dark mode preference, builds the calendar, wires up all modals, initializes all four CRUD modules, and does an initial `refreshAll()` to populate the dashboard with real numbers.

---

## 6. Form validation & display helper functions (shared utilities)

A handful of small functions are used across every form and table in the admin panel:

- **`applyFormErrors(form, errors)` / `clearFormErrors(form)`** — the same error-display pattern used in the public site's `appointment.js`, reused here so every modal form behaves consistently.
- **`escapeHtml(str)`** — converts characters like `<`, `>`, and `&` into their safe HTML-entity equivalents before inserting any user-typed text into the page with `innerHTML`. This matters because without it, a patient named e.g. `<script>` (even accidentally, via a copy-paste mistake) could break the page layout or, in a worse case, allow injected code to run. This is a basic but important defense called **output encoding**.
- **`formatDate(dateStr)`** — converts a raw `"2026-06-15"` value into the friendlier `"15 Jun 2026"` for display.
- **`initials(name)` / `avatarClass(name)`** — generate the two-letter initials and a deterministic background color for each person's avatar circle, so the same name always gets the same color (calculated from the character codes of the name, not random).
- **`statusBadgeClass`, `doctorStatusBadgeClass`, `apptStatusBadgeClass`, `invoiceStatusBadgeClass`** — small lookup tables that map a status string (like `"Critical"` or `"Overdue"`) to the matching CSS class for colored badges.

---

## 7. How data flows through the system (concrete example)

To make the architecture concrete, here's exactly what happens when a real patient books an appointment on the public website, and how the admin sees it:

1. Patient fills out `appointment.html` and clicks "Book Appointment."
2. `scripts/appointment.js` validates the form, then calls `SharksDB.add('appointments', {...})` with `status: "Pending"` and a freshly generated ID like `A-2007`.
3. That call writes the updated `appointments` array into `localStorage` under the key `sharksClinicDB`.
4. The admin (on the same browser/device) opens `admin/index.html` and clicks "Appointments" in the sidebar.
5. `showView('appointments')` runs, which calls `Appointments.render()`.
6. `Appointments.render()` calls `SharksDB.getAll('appointments')`, which reads the same `localStorage` key — so the new booking is right there, marked "Pending," ready for the admin to confirm or reassign a doctor.
7. The dashboard's "Today's Appointments" stat and the mini calendar's appointment-dot also update automatically next time they're rendered, since they all read from the same source.

**Important caveat:** because this uses `localStorage`, this only works *within the same browser on the same device*. A booking made on a patient's phone will not automatically appear on the admin's desktop computer — `localStorage` doesn't sync across devices. This is explained further in Assumptions below.

---

## 8. Assumptions made

Since this is a frontend-only project with no real backend, several deliberate simplifications were made. Being upfront about these matters for anyone building on top of this:

1. **`localStorage` is not a real database.** It's scoped to one browser on one device. A real clinic system needs a server and a real database (e.g. Node.js + PostgreSQL/MongoDB) so that patient bookings, doctor schedules, and billing are visible from any device, by any authorized staff member, at the same time.
2. **Login is not secure.** The username/password check happens entirely in JavaScript that anyone can read by viewing the page source — there is no real password hashing, no server-side session, and no protection against someone just editing `localStorage` directly to set `loggedIn: true`. This implementation exists to demonstrate the *UI pattern* of a login gate, not to protect real data. Before this touches real patient information, it needs a real authentication backend.
3. **"Today's date" for stats and the calendar is a fixed reference point**, not `new Date()` read live from the browser clock. This was a deliberate choice: the seed data's appointment dates are fixed (e.g. "2026-06-12"), so if the dashboard used the browser's *actual* current date, the seed appointments would eventually all appear to be "in the past" and the stat cards would show zeroes for "today," which would look broken to anyone testing the demo weeks or months from now. In a real system connected to a real backend, this should be replaced with the live current date.
4. **The "Recent Patients," "Recent Appointments," "Doctors On Duty," lab test, and pharmacy stock cards on the dashboard** — only Recent Patients and Recent Appointments were wired to live data, since those map directly to the Patients/Appointments collections already built. The Doctors On Duty list, lab test queue, and pharmacy stock levels remain illustrative static content, since lab and pharmacy inventory management weren't part of the requested CRUD modules (Patients, Doctors, Appointments, Billing) and would each need their own data model.
5. **The sidebar now covers nine working sections**: Dashboard, Patients, Appointments, Doctors, Laboratory, Prescriptions, Billing, Reports, Staff Management, and Settings. Pharmacy/inventory management was intentionally left out of this build, since stock-level tracking has different data needs (units, reorder thresholds, supplier info) than the rest of the system and wasn't requested. Every visible nav item, card link, and quick-action button leads to a real, working view — there is no remaining placeholder navigation.
6. **Reports is a read-only aggregation view**, not its own data collection — it computes live breakdowns (appointments by doctor, appointment status, invoice status, patient status) from the same Patients/Doctors/Appointments/Invoices data already in `SharksDB`, so it always reflects the current state of the system without needing separate CRUD operations.
7. **Staff Management stores user records (name, email, role, status) but does not yet enforce permissions** — there's still only one simulated login (`admin` / `sharks123`) regardless of how many staff accounts exist. Building real role-based access (e.g. a Receptionist who can't see Billing) would require gating each view/action by the logged-in user's role, which is a larger architectural change than adding the CRUD module itself.
8. **The feedback form saves to a `feedback` collection in `SharksDB`,** but no admin view was built to display submitted feedback, since a "Feedback" admin page wasn't part of the original page set or this request's explicit scope. The data is captured and ready to display whenever that view is added.

---

## 9. Security & production-readiness notes

This implementation is a strong, fully-functional **frontend prototype** — appropriate for demos, learning, and as a foundation to build a real backend underneath. Before any real patient data touches this system, these gaps need to be closed:

- Replace `localStorage` with a real backend (API + database) so data persists centrally and survives clearing browser data.
- Replace the simulated login with real authentication (hashed passwords, server-side sessions or tokens, HTTPS-only).
- Add server-side validation — client-side validation (everything in this report) is a UX nicety, not a security boundary, since it can be bypassed by anyone who disables JavaScript or calls an API directly.
- Add role-based access control if different staff (doctors, receptionists, billing clerks) should see different things.
- Audit-log sensitive actions (who edited/deleted a patient record and when) for healthcare compliance purposes.

---

## 10. Quick reference: which file does what

| File | Purpose |
|---|---|
| `assets/js/storage.js` | Shared data layer — all reads/writes to patient, doctor, appointment, and invoice data |
| `assets/js/toast.js` | Shared success/error/info notification popups |
| `assets/css/shared.css` | Styling for toasts, modals, and form error states (used by both public site and admin) |
| `components/components.js` | Loads shared header/footer, mobile menu, active nav link highlighting |
| `scripts/main.js` | Homepage hero image slideshow |
| `scripts/appointment.js` | Public appointment booking form: validation + save |
| `scripts/feedback.js` | Public feedback form: validation + save |
| `scripts/services.js` | Live search/filter on the services page |
| `admin/script.js` | All admin dashboard logic: login, navigation, dark mode, calendar, stats, and full CRUD for patients, doctors, appointments, and billing |
| `admin/styles.css` | All admin dashboard styling, including the new login screen, modals, tables, and dark mode theme |
