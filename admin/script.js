/* ============================================================
   SHARKS Clinic Management System — Admin Dashboard
   script.js
   ------------------------------------------------------------
   Sections in this file:
     1. Authentication (login / logout)
     2. Sidebar navigation & view switching
     3. Dark mode
     4. Mini calendar
     5. Dashboard statistics
     6. Generic table helper (search, sort, filter, pagination)
     7. Patients module (CRUD)
     8. Doctors module (CRUD)
     9. Appointments module (CRUD)
    10. Billing / Invoices module (CRUD)
    11. Modal helpers
    12. Init
   ============================================================ */

/* ============================================================
   1. AUTHENTICATION
   ============================================================ */

const DEMO_CREDENTIALS = { username: "admin", password: "sharks123" };

function initAuth() {
  const loginScreen = document.getElementById("loginScreen");
  const appShell = document.getElementById("appShell");
  const loginForm = document.getElementById("loginForm");
  const logoutBtn = document.getElementById("logoutBtn");

  const auth = SharksDB.getAuth();

  if (auth.loggedIn) {
    showApp();
  } else {
    showLogin();
  }

  function showApp() {
    loginScreen.hidden = true;
    appShell.hidden = false;
  }

  function showLogin() {
    loginScreen.hidden = false;
    appShell.hidden = true;
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = loginForm.username.value.trim();
    const password = loginForm.password.value;
    const errors = {};

    if (!username) errors.username = "Please enter your username.";
    if (!password) errors.password = "Please enter your password.";

    clearFormErrors(loginForm);

    if (Object.keys(errors).length > 0) {
      applyFormErrors(loginForm, errors);
      return;
    }

    if (username === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password) {
      SharksDB.setAuth({ loggedIn: true });
      SharksToast.show("Welcome back, Dr. Kimani!", "success");
      loginForm.reset();
      showApp();
      refreshAll();
    } else {
      applyFormErrors(loginForm, {
        username: "Invalid username or password.",
        password: "Invalid username or password."
      });
      SharksToast.show("Invalid credentials. Try admin / sharks123.", "error");
    }
  });

  logoutBtn.addEventListener("click", () => {
    SharksDB.setAuth({ loggedIn: false });
    SharksToast.show("You have been logged out.", "info");
    showLogin();
  });
}

/* ============================================================
   2. SIDEBAR NAVIGATION & VIEW SWITCHING
   ============================================================ */

function toggleSidebar() {
  const s = document.getElementById('sidebar');
  const o = document.getElementById('sidebarOverlay');
  s.classList.toggle('open');
  o.classList.toggle('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

function toggleNav(el) {
  const sub = el.nextElementSibling;
  const wasOpen = el.classList.contains('open');
  document.querySelectorAll('.nav-parent.open').forEach(p => {
    p.classList.remove('open');
    p.setAttribute('aria-expanded', 'false');
    p.nextElementSibling.classList.remove('open');
  });
  if (!wasOpen) {
    el.classList.add('open');
    el.setAttribute('aria-expanded', 'true');
    sub.classList.add('open');
  }
}

// Page titles/breadcrumbs shown in the topbar for each view
const PAGE_META = {
  dashboard: { title: "Dashboard", breadcrumb: "Dashboard" },
  patients: { title: "Patients", breadcrumb: "Patients" },
  doctors: { title: "Doctors", breadcrumb: "Doctors" },
  appointments: { title: "Appointments", breadcrumb: "Appointments" },
  billing: { title: "Billing", breadcrumb: "Billing" }
};

/**
 * Switches the visible page-view and updates the active nav item.
 * Called from sidebar nav items (data-target) and the "View Bills"
 * alert link. If the clicked element has no data-target (e.g. a
 * nav item that doesn't map to a built view), only the active
 * state is updated and a "coming soon" toast is shown.
 */
function setPage(el) {
  const target = el.getAttribute('data-target');

  // Update active state on sidebar nav items only
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    n.removeAttribute('aria-current');
  });

  if (el.classList.contains('nav-item')) {
    el.classList.add('active');
    el.setAttribute('aria-current', 'page');
  }

  if (!target) {
    SharksToast.show("This section is part of a future update.", "info", 2500);
    closeSidebarOnMobile();
    return;
  }

  showView(target);
  closeSidebarOnMobile();
}

function showView(target) {
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.toggle('active', view.dataset.page === target);
  });

  const meta = PAGE_META[target];
  if (meta) {
    const titleEl = document.querySelector('.page-title');
    const breadcrumbEl = document.querySelector('.page-breadcrumb');
    if (titleEl) titleEl.textContent = meta.title;
    if (breadcrumbEl) breadcrumbEl.textContent = meta.breadcrumb;
  }

  // Also sync the matching sidebar nav item's active state
  document.querySelectorAll(`.nav-item[data-target="${target}"]`).forEach((n, idx) => {
    if (idx === 0) {
      document.querySelectorAll('.nav-item').forEach(other => {
        other.classList.remove('active');
        other.removeAttribute('aria-current');
      });
      n.classList.add('active');
      n.setAttribute('aria-current', 'page');
    }
  });

  // Refresh data for the view being shown
  if (target === 'dashboard') refreshDashboardStats();
  if (target === 'patients') Patients.render();
  if (target === 'doctors') Doctors.render();
  if (target === 'appointments') Appointments.render();
  if (target === 'billing') Invoices.render();
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 1024) closeSidebar();
}

// Allow keyboard activation (Enter / Space) for div-based nav controls
document.querySelectorAll('[role="button"]').forEach(el => {
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    }
  });
});

/* ============================================================
   3. DARK MODE
   ============================================================ */

function initDarkMode() {
  const toggle = document.getElementById('darkModeToggle');
  if (!toggle) return;

  const settings = SharksDB.getSettings();
  applyDarkMode(settings.darkMode);

  toggle.addEventListener('click', () => {
    const current = SharksDB.getSettings().darkMode;
    const next = !current;
    SharksDB.updateSettings({ darkMode: next });
    applyDarkMode(next);
  });
}

function applyDarkMode(enabled) {
  const toggle = document.getElementById('darkModeToggle');
  document.body.classList.toggle('dark', enabled);

  if (toggle) {
    toggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    const icon = toggle.querySelector('i');
    if (icon) {
      icon.classList.toggle('ti-moon', !enabled);
      icon.classList.toggle('ti-sun', enabled);
    }
  }
}

/* ============================================================
   4. MINI CALENDAR
   ============================================================ */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
let calViewYear = 2026;
let calViewMonth = 5; // 0-indexed: June
const todayDate = { year: 2026, month: 5, day: 15 };

function getApptDaysForMonth(year, month) {
  const appointments = SharksDB.getAll('appointments');
  const days = new Set();

  appointments.forEach(appt => {
    if (!appt.date) return;
    const d = new Date(appt.date + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      days.add(d.getDate());
    }
  });

  return days;
}

function buildCalendar() {
  const grid = document.getElementById('calGrid');
  const monthLabel = document.getElementById('calMonth');
  if (!grid || !monthLabel) return;

  monthLabel.textContent = `${MONTH_NAMES[calViewMonth]} ${calViewYear}`;

  const apptDays = getApptDaysForMonth(calViewYear, calViewMonth);
  const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
  const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calViewYear, calViewMonth, 0).getDate();

  let html = '<div class="cal-day-name">Su</div><div class="cal-day-name">Mo</div><div class="cal-day-name">Tu</div><div class="cal-day-name">We</div><div class="cal-day-name">Th</div><div class="cal-day-name">Fr</div><div class="cal-day-name">Sa</div>';

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day other">${daysInPrevMonth - firstDay + i + 1}</div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    let cls = 'cal-day';
    const isToday = calViewYear === todayDate.year && calViewMonth === todayDate.month && d === todayDate.day;
    if (isToday) cls += ' today';
    if (apptDays.has(d)) cls += ' has-appt';
    html += `<div class="${cls}" tabindex="0" role="button" aria-label="${MONTH_NAMES[calViewMonth]} ${d}, ${calViewYear}${isToday ? ' (today)' : ''}${apptDays.has(d) ? ' — has appointment' : ''}">${d}</div>`;
  }

  const remaining = (firstDay + daysInMonth) % 7;
  if (remaining > 0) {
    for (let i = 1; i <= 7 - remaining; i++) {
      html += `<div class="cal-day other">${i}</div>`;
    }
  }

  grid.innerHTML = html;
}

function initCalendar() {
  buildCalendar();

  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');

  if (calPrev) {
    calPrev.addEventListener('click', () => {
      calViewMonth--;
      if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
      buildCalendar();
    });
  }

  if (calNext) {
    calNext.addEventListener('click', () => {
      calViewMonth++;
      if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
      buildCalendar();
    });
  }
}

/* ============================================================
   5. DASHBOARD STATISTICS
   ============================================================ */

function refreshDashboardStats() {
  const patients = SharksDB.getAll('patients');
  const doctors = SharksDB.getAll('doctors');
  const appointments = SharksDB.getAll('appointments');
  const invoices = SharksDB.getAll('invoices');

  // Total patients
  setStatValue('statTotalPatients', patients.length.toLocaleString());

  // Today's appointments (using the fixed "today" used by the calendar)
  const todayStr = `${todayDate.year}-${String(todayDate.month + 1).padStart(2, '0')}-${String(todayDate.day).padStart(2, '0')}`;
  const todaysAppointments = appointments.filter(a => a.date === todayStr);
  setStatValue('statTodayAppointments', String(todaysAppointments.length));

  // Doctors on duty
  const onDuty = doctors.filter(d => d.status === 'On Duty').length;
  const onCall = doctors.filter(d => d.status === 'On Call').length;
  setStatValue('statDoctorsOnDuty', String(onDuty));
  setStatDelta('statDoctorsOnCall', `${onCall} on call`);

  // Revenue today (paid invoices dated today)
  const revenueToday = invoices
    .filter(inv => inv.date === todayStr && inv.status === 'Paid')
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  setStatValue('statRevenueToday', formatKES(revenueToday, true));

  // Pending bills
  const pendingInvoices = invoices.filter(inv => inv.status !== 'Paid');
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  setStatValue('statPendingBills', String(pendingInvoices.length));
  setStatDelta('statPendingAmount', `${formatKES(pendingAmount)} due`);

  // Update the alert bar with the live pending total
  const alertAmount = document.getElementById('alertOutstandingAmount');
  const alertCount = document.getElementById('alertOutstandingCount');
  if (alertAmount) alertAmount.textContent = formatKES(pendingAmount);
  if (alertCount) alertCount.textContent = String(pendingInvoices.length);
}

function setStatValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setStatDelta(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatKES(amount, short = false) {
  if (short && amount >= 1000) {
    return `KES ${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  }
  return `KES ${Number(amount).toLocaleString()}`;
}

/* ============================================================
   6. GENERIC TABLE HELPER
   ------------------------------------------------------------
   Provides shared search/sort/filter/pagination state machinery
   reused by the Patients, Doctors, Appointments and Invoices
   modules below.
   ============================================================ */

function createTableController(options) {
  return {
    page: 1,
    pageSize: options.pageSize || 5,
    sortKey: options.defaultSort || null,
    sortDir: 'asc',
    searchTerm: '',
    filterValue: ''
  };
}

function paginate(items, controller) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / controller.pageSize));
  if (controller.page > totalPages) controller.page = totalPages;
  if (controller.page < 1) controller.page = 1;

  const start = (controller.page - 1) * controller.pageSize;
  const pageItems = items.slice(start, start + controller.pageSize);

  return { pageItems, totalPages, total };
}

function renderPagination(container, controller, totalPages, onChange) {
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  html += `<button type="button" data-page="prev" ${controller.page === 1 ? 'disabled' : ''} aria-label="Previous page"><i class="ti ti-chevron-left" aria-hidden="true"></i></button>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" data-page="${i}" class="${i === controller.page ? 'active' : ''}" aria-label="Page ${i}" ${i === controller.page ? 'aria-current="page"' : ''}>${i}</button>`;
  }

  html += `<button type="button" data-page="next" ${controller.page === totalPages ? 'disabled' : ''} aria-label="Next page"><i class="ti ti-chevron-right" aria-hidden="true"></i></button>`;

  container.innerHTML = html;

  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.page;
      if (val === 'prev') controller.page = Math.max(1, controller.page - 1);
      else if (val === 'next') controller.page = Math.min(totalPages, controller.page + 1);
      else controller.page = Number(val);
      onChange();
    });
  });
}

function bindSortableHeaders(tableSelector, controller, onChange) {
  const table = document.querySelector(tableSelector);
  if (!table) return;

  table.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;

      if (controller.sortKey === key) {
        controller.sortDir = controller.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        controller.sortKey = key;
        controller.sortDir = 'asc';
      }

      table.querySelectorAll('th.sortable').forEach(other => {
        other.classList.remove('sort-asc', 'sort-desc');
      });
      th.classList.add(controller.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');

      controller.page = 1;
      onChange();
    });
  });
}

function sortItems(items, controller) {
  if (!controller.sortKey) return items;

  const key = controller.sortKey;
  const dir = controller.sortDir === 'asc' ? 1 : -1;

  return [...items].sort((a, b) => {
    let valA = a[key];
    let valB = b[key];

    // Numeric comparison for numeric-looking fields
    if (typeof valA === 'number' || typeof valB === 'number') {
      return ((valA || 0) - (valB || 0)) * dir;
    }

    valA = String(valA || '').toLowerCase();
    valB = String(valB || '').toLowerCase();

    if (valA < valB) return -1 * dir;
    if (valA > valB) return 1 * dir;
    return 0;
  });
}

/* ============================================================
   7. PATIENTS MODULE
   ============================================================ */

const Patients = (() => {
  const controller = createTableController({ pageSize: 5, defaultSort: 'id' });

  function getFiltered() {
    let items = SharksDB.getAll('patients');

    if (controller.searchTerm) {
      const term = controller.searchTerm.toLowerCase();
      items = items.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.phone.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term)
      );
    }

    if (controller.filterValue) {
      items = items.filter(p => p.status === controller.filterValue);
    }

    return sortItems(items, controller);
  }

  function render() {
    const tbody = document.getElementById('patientsTableBody');
    const emptyState = document.getElementById('patientsEmptyState');
    const paginationEl = document.getElementById('patientsPagination');
    if (!tbody) return;

    const filtered = getFiltered();
    const { pageItems, totalPages } = paginate(filtered, controller);

    if (pageItems.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
    } else {
      if (emptyState) emptyState.hidden = true;

      tbody.innerHTML = pageItems.map(p => `
        <tr>
          <td class="text-muted-cell">${p.id}</td>
          <td>
            <div class="patient-cell">
              <span class="patient-avatar ${avatarClass(p.name)}">${initials(p.name)}</span>
              ${escapeHtml(p.name)}
            </div>
          </td>
          <td>${escapeHtml(p.phone)}</td>
          <td>${p.age}</td>
          <td>${escapeHtml(p.gender)}</td>
          <td>${formatDate(p.lastVisit)}</td>
          <td><span class="badge ${statusBadgeClass(p.status)}">${escapeHtml(p.status)}</span></td>
          <td>
            <div class="row-actions">
              <button type="button" class="btn-icon" data-action="edit" data-id="${p.id}" aria-label="Edit ${escapeHtml(p.name)}">
                <i class="ti ti-edit" aria-hidden="true"></i>
              </button>
              <button type="button" class="btn-icon danger" data-action="delete" data-id="${p.id}" aria-label="Delete ${escapeHtml(p.name)}">
                <i class="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => openForm(btn.dataset.id));
      });
      tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
      });
    }

    renderPagination(paginationEl, controller, totalPages, render);
    updateNavBadge('patients', SharksDB.getAll('patients').length);
  }

  function openForm(id) {
    const form = document.getElementById('patientForm');
    const title = document.getElementById('patientModalTitle');
    clearFormErrors(form);

    if (id) {
      const patient = SharksDB.getById('patients', id);
      if (!patient) return;
      title.textContent = 'Edit Patient';
      form.id.value = patient.id;
      form.name.value = patient.name;
      form.phone.value = patient.phone;
      form.age.value = patient.age;
      form.email.value = patient.email || '';
      form.gender.value = patient.gender;
      form.lastVisit.value = patient.lastVisit;
      form.status.value = patient.status;
    } else {
      title.textContent = 'Add Patient';
      form.reset();
      form.id.value = '';
      form.lastVisit.value = new Date().toISOString().slice(0, 10);
    }

    openModal('patientModalOverlay');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;

    const data = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      age: Number(form.age.value),
      email: form.email.value.trim(),
      gender: form.gender.value,
      lastVisit: form.lastVisit.value,
      status: form.status.value
    };

    const errors = {};
    if (!data.name) errors.name = 'Please enter the patient\'s name.';
    if (!data.phone || !/^[+0-9\s-]{7,15}$/.test(data.phone)) errors.phone = 'Please enter a valid phone number.';
    if (!data.age || data.age < 0 || data.age > 120) errors.age = 'Please enter a valid age.';
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Please enter a valid email address.';
    if (!data.gender) errors.gender = 'Please select a gender.';
    if (!data.lastVisit) errors.lastVisit = 'Please select a date.';
    if (!data.status) errors.status = 'Please select a status.';

    clearFormErrors(form);
    if (Object.keys(errors).length > 0) {
      applyFormErrors(form, errors);
      return;
    }

    const id = form.id.value;

    if (id) {
      SharksDB.update('patients', id, data);
      SharksToast.show('Patient updated successfully.', 'success');
    } else {
      const newId = SharksDB.nextId('patient');
      SharksDB.add('patients', { id: newId, ...data });
      SharksToast.show('Patient added successfully.', 'success');
    }

    closeModal('patientModalOverlay');
    render();
    refreshDashboardStats();
  }

  function confirmDelete(id) {
    const patient = SharksDB.getById('patients', id);
    if (!patient) return;

    showConfirmModal(`Delete patient "${patient.name}"? This action cannot be undone.`, () => {
      SharksDB.remove('patients', id);
      SharksToast.show('Patient deleted.', 'success');
      render();
      refreshDashboardStats();
    });
  }

  function init() {
    document.getElementById('addPatientBtn').addEventListener('click', () => openForm(null));
    document.getElementById('patientForm').addEventListener('submit', handleSubmit);

    document.getElementById('patientSearch').addEventListener('input', (e) => {
      controller.searchTerm = e.target.value.trim();
      controller.page = 1;
      render();
    });

    document.getElementById('patientStatusFilter').addEventListener('change', (e) => {
      controller.filterValue = e.target.value;
      controller.page = 1;
      render();
    });

    bindSortableHeaders('[aria-label="Patients"]', controller, render);
  }

  return { render, init, openForm };
})();

/* ============================================================
   8. DOCTORS MODULE
   ============================================================ */

const Doctors = (() => {
  const controller = createTableController({ pageSize: 5, defaultSort: 'id' });

  function getFiltered() {
    let items = SharksDB.getAll('doctors');

    if (controller.searchTerm) {
      const term = controller.searchTerm.toLowerCase();
      items = items.filter(d =>
        d.name.toLowerCase().includes(term) ||
        d.specialty.toLowerCase().includes(term)
      );
    }

    return sortItems(items, controller);
  }

  function render() {
    const tbody = document.getElementById('doctorsTableBody');
    const emptyState = document.getElementById('doctorsEmptyState');
    const paginationEl = document.getElementById('doctorsPagination');
    if (!tbody) return;

    const filtered = getFiltered();
    const { pageItems, totalPages } = paginate(filtered, controller);

    if (pageItems.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
    } else {
      if (emptyState) emptyState.hidden = true;

      tbody.innerHTML = pageItems.map(d => `
        <tr>
          <td class="text-muted-cell">${d.id}</td>
          <td>
            <div class="patient-cell">
              <span class="patient-avatar ${avatarClass(d.name)}">${initials(d.name)}</span>
              ${escapeHtml(d.name)}
            </div>
          </td>
          <td>${escapeHtml(d.specialty)}</td>
          <td>${escapeHtml(d.phone)}</td>
          <td>${escapeHtml(d.email)}</td>
          <td><span class="badge ${doctorStatusBadgeClass(d.status)}">${escapeHtml(d.status)}</span></td>
          <td>
            <div class="row-actions">
              <button type="button" class="btn-icon" data-action="edit" data-id="${d.id}" aria-label="Edit ${escapeHtml(d.name)}">
                <i class="ti ti-edit" aria-hidden="true"></i>
              </button>
              <button type="button" class="btn-icon danger" data-action="delete" data-id="${d.id}" aria-label="Delete ${escapeHtml(d.name)}">
                <i class="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => openForm(btn.dataset.id));
      });
      tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
      });
    }

    renderPagination(paginationEl, controller, totalPages, render);

    const onDuty = SharksDB.getAll('doctors').filter(d => d.status === 'On Duty').length;
    updateNavBadge('doctors', null);
    setStatValue('statDoctorsOnDuty', String(onDuty));
  }

  function openForm(id) {
    const form = document.getElementById('doctorForm');
    const title = document.getElementById('doctorModalTitle');
    clearFormErrors(form);

    if (id) {
      const doctor = SharksDB.getById('doctors', id);
      if (!doctor) return;
      title.textContent = 'Edit Doctor';
      form.id.value = doctor.id;
      form.name.value = doctor.name;
      form.specialty.value = doctor.specialty;
      form.phone.value = doctor.phone;
      form.email.value = doctor.email;
      form.status.value = doctor.status;
    } else {
      title.textContent = 'Add Doctor';
      form.reset();
      form.id.value = '';
    }

    openModal('doctorModalOverlay');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;

    const data = {
      name: form.name.value.trim(),
      specialty: form.specialty.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      status: form.status.value
    };

    const errors = {};
    if (!data.name) errors.name = 'Please enter the doctor\'s name.';
    if (!data.specialty) errors.specialty = 'Please enter a specialty.';
    if (!data.phone || !/^[+0-9\s-]{7,15}$/.test(data.phone)) errors.phone = 'Please enter a valid phone number.';
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Please enter a valid email address.';
    if (!data.status) errors.status = 'Please select a status.';

    clearFormErrors(form);
    if (Object.keys(errors).length > 0) {
      applyFormErrors(form, errors);
      return;
    }

    const id = form.id.value;

    if (id) {
      SharksDB.update('doctors', id, data);
      SharksToast.show('Doctor updated successfully.', 'success');
    } else {
      const newId = SharksDB.nextId('doctor');
      SharksDB.add('doctors', { id: newId, ...data });
      SharksToast.show('Doctor added successfully.', 'success');
    }

    closeModal('doctorModalOverlay');
    render();
    refreshDashboardStats();
    Appointments.refreshDoctorOptions();
  }

  function confirmDelete(id) {
    const doctor = SharksDB.getById('doctors', id);
    if (!doctor) return;

    showConfirmModal(`Delete ${doctor.name} from the directory? This action cannot be undone.`, () => {
      SharksDB.remove('doctors', id);
      SharksToast.show('Doctor removed.', 'success');
      render();
      refreshDashboardStats();
      Appointments.refreshDoctorOptions();
    });
  }

  function init() {
    document.getElementById('addDoctorBtn').addEventListener('click', () => openForm(null));
    document.getElementById('doctorForm').addEventListener('submit', handleSubmit);

    document.getElementById('doctorSearch').addEventListener('input', (e) => {
      controller.searchTerm = e.target.value.trim();
      controller.page = 1;
      render();
    });

    bindSortableHeaders('[aria-label="Doctors"]', controller, render);
  }

  return { render, init, openForm };
})();

/* ============================================================
   9. APPOINTMENTS MODULE
   ============================================================ */

const Appointments = (() => {
  const controller = createTableController({ pageSize: 5, defaultSort: 'date' });

  function getFiltered() {
    let items = SharksDB.getAll('appointments');

    if (controller.searchTerm) {
      const term = controller.searchTerm.toLowerCase();
      items = items.filter(a =>
        a.patientName.toLowerCase().includes(term) ||
        a.doctor.toLowerCase().includes(term)
      );
    }

    if (controller.filterValue) {
      items = items.filter(a => a.status === controller.filterValue);
    }

    return sortItems(items, controller);
  }

  function render() {
    const tbody = document.getElementById('appointmentsTableBody');
    const emptyState = document.getElementById('appointmentsEmptyState');
    const paginationEl = document.getElementById('appointmentsPagination');
    if (!tbody) return;

    const filtered = getFiltered();
    const { pageItems, totalPages } = paginate(filtered, controller);

    if (pageItems.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
    } else {
      if (emptyState) emptyState.hidden = true;

      tbody.innerHTML = pageItems.map(a => `
        <tr>
          <td class="text-muted-cell">${a.id}</td>
          <td>
            <div class="patient-cell">
              <span class="patient-avatar ${avatarClass(a.patientName)}">${initials(a.patientName)}</span>
              ${escapeHtml(a.patientName)}
            </div>
          </td>
          <td>${escapeHtml(a.doctor)}</td>
          <td>${escapeHtml(a.department)}</td>
          <td>${formatDate(a.date)}</td>
          <td>${escapeHtml(a.time)}</td>
          <td><span class="badge ${apptStatusBadgeClass(a.status)}">${escapeHtml(a.status)}</span></td>
          <td>
            <div class="row-actions">
              <button type="button" class="btn-icon" data-action="edit" data-id="${a.id}" aria-label="Edit appointment for ${escapeHtml(a.patientName)}">
                <i class="ti ti-edit" aria-hidden="true"></i>
              </button>
              <button type="button" class="btn-icon danger" data-action="delete" data-id="${a.id}" aria-label="Delete appointment for ${escapeHtml(a.patientName)}">
                <i class="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => openForm(btn.dataset.id));
      });
      tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
      });
    }

    renderPagination(paginationEl, controller, totalPages, render);
    updateNavBadge('appointments', SharksDB.getAll('appointments').length);
    buildCalendar();
  }

  function refreshDoctorOptions() {
    const select = document.getElementById('apptDoctor');
    if (!select) return;

    const doctors = SharksDB.getAll('doctors');
    const currentValue = select.value;

    select.innerHTML = '<option value="">Select Doctor</option>' +
      doctors.map(d => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)} — ${escapeHtml(d.specialty)}</option>`).join('') +
      '<option value="Unassigned">Unassigned</option>';

    if (currentValue) select.value = currentValue;
  }

  function openForm(id) {
    const form = document.getElementById('appointmentForm');
    const title = document.getElementById('appointmentModalTitle');
    clearFormErrors(form);
    refreshDoctorOptions();

    if (id) {
      const appt = SharksDB.getById('appointments', id);
      if (!appt) return;
      title.textContent = 'Edit Appointment';
      form.id.value = appt.id;
      form.patientName.value = appt.patientName;
      form.doctor.value = appt.doctor;
      form.department.value = appt.department;
      form.date.value = appt.date;
      form.time.value = convertTo24Hour(appt.time);
      form.status.value = appt.status;
      form.reason.value = appt.reason || '';
    } else {
      title.textContent = 'Book Appointment';
      form.reset();
      form.id.value = '';
      form.date.value = new Date().toISOString().slice(0, 10);
    }

    openModal('appointmentModalOverlay');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;

    const data = {
      patientName: form.patientName.value.trim(),
      doctor: form.doctor.value,
      department: form.department.value.trim(),
      date: form.date.value,
      time: convertTo12Hour(form.time.value),
      status: form.status.value,
      reason: form.reason.value.trim()
    };

    const errors = {};
    if (!data.patientName) errors.patientName = 'Please enter the patient\'s name.';
    if (!data.doctor) errors.doctor = 'Please select a doctor.';
    if (!data.department) errors.department = 'Please enter a department.';
    if (!data.date) errors.date = 'Please select a date.';
    if (!form.time.value) errors.time = 'Please select a time.';
    if (!data.status) errors.status = 'Please select a status.';

    clearFormErrors(form);
    if (Object.keys(errors).length > 0) {
      applyFormErrors(form, errors);
      return;
    }

    const id = form.id.value;

    if (id) {
      const existing = SharksDB.getById('appointments', id);
      SharksDB.update('appointments', id, { ...data, phone: existing.phone, email: existing.email, source: existing.source });
      SharksToast.show('Appointment updated successfully.', 'success');
    } else {
      const newId = SharksDB.nextId('appointment');
      SharksDB.add('appointments', { id: newId, ...data, phone: '', email: '', source: 'admin' });
      SharksToast.show('Appointment booked successfully.', 'success');
    }

    closeModal('appointmentModalOverlay');
    render();
    refreshDashboardStats();
  }

  function confirmDelete(id) {
    const appt = SharksDB.getById('appointments', id);
    if (!appt) return;

    showConfirmModal(`Delete the appointment for "${appt.patientName}"? This action cannot be undone.`, () => {
      SharksDB.remove('appointments', id);
      SharksToast.show('Appointment deleted.', 'success');
      render();
      refreshDashboardStats();
    });
  }

  function init() {
    document.getElementById('addAppointmentBtn').addEventListener('click', () => openForm(null));
    document.getElementById('appointmentForm').addEventListener('submit', handleSubmit);

    document.getElementById('appointmentSearch').addEventListener('input', (e) => {
      controller.searchTerm = e.target.value.trim();
      controller.page = 1;
      render();
    });

    document.getElementById('appointmentStatusFilter').addEventListener('change', (e) => {
      controller.filterValue = e.target.value;
      controller.page = 1;
      render();
    });

    bindSortableHeaders('[aria-label="Appointments"]', controller, render);
  }

  return { render, init, openForm, refreshDoctorOptions };
})();

/* ============================================================
   10. BILLING / INVOICES MODULE
   ============================================================ */

const Invoices = (() => {
  const controller = createTableController({ pageSize: 5, defaultSort: 'date' });

  function getFiltered() {
    let items = SharksDB.getAll('invoices');

    if (controller.searchTerm) {
      const term = controller.searchTerm.toLowerCase();
      items = items.filter(inv =>
        inv.patientName.toLowerCase().includes(term) ||
        inv.id.toLowerCase().includes(term)
      );
    }

    if (controller.filterValue) {
      items = items.filter(inv => inv.status === controller.filterValue);
    }

    return sortItems(items, controller);
  }

  function render() {
    const tbody = document.getElementById('invoicesTableBody');
    const emptyState = document.getElementById('invoicesEmptyState');
    const paginationEl = document.getElementById('invoicesPagination');
    if (!tbody) return;

    const filtered = getFiltered();
    const { pageItems, totalPages } = paginate(filtered, controller);

    if (pageItems.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
    } else {
      if (emptyState) emptyState.hidden = true;

      tbody.innerHTML = pageItems.map(inv => `
        <tr>
          <td class="text-muted-cell">${inv.id}</td>
          <td>
            <div class="patient-cell">
              <span class="patient-avatar ${avatarClass(inv.patientName)}">${initials(inv.patientName)}</span>
              ${escapeHtml(inv.patientName)}
            </div>
          </td>
          <td>${escapeHtml(inv.service)}</td>
          <td>${formatKES(inv.amount)}</td>
          <td>${formatDate(inv.date)}</td>
          <td><span class="badge ${invoiceStatusBadgeClass(inv.status)}">${escapeHtml(inv.status)}</span></td>
          <td>
            <div class="row-actions">
              <button type="button" class="btn-icon" data-action="edit" data-id="${inv.id}" aria-label="Edit invoice ${inv.id}">
                <i class="ti ti-edit" aria-hidden="true"></i>
              </button>
              <button type="button" class="btn-icon danger" data-action="delete" data-id="${inv.id}" aria-label="Delete invoice ${inv.id}">
                <i class="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => openForm(btn.dataset.id));
      });
      tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
      });
    }

    renderPagination(paginationEl, controller, totalPages, render);
    updateBillingTotals();
    updateNavBadge('billing', null);
  }

  function updateBillingTotals() {
    const invoices = SharksDB.getAll('invoices');

    const total = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const paid = invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const outstanding = invoices.filter(inv => inv.status !== 'Paid').reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    setStatValue('billingTotalAmount', formatKES(total));
    setStatValue('billingPaidAmount', formatKES(paid));
    setStatValue('billingOutstandingAmount', formatKES(outstanding));
  }

  function openForm(id) {
    const form = document.getElementById('invoiceForm');
    const title = document.getElementById('invoiceModalTitle');
    clearFormErrors(form);

    if (id) {
      const invoice = SharksDB.getById('invoices', id);
      if (!invoice) return;
      title.textContent = 'Edit Invoice';
      form.id.value = invoice.id;
      form.patientName.value = invoice.patientName;
      form.service.value = invoice.service;
      form.amount.value = invoice.amount;
      form.date.value = invoice.date;
      form.status.value = invoice.status;
    } else {
      title.textContent = 'New Invoice';
      form.reset();
      form.id.value = '';
      form.date.value = new Date().toISOString().slice(0, 10);
    }

    openModal('invoiceModalOverlay');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;

    const data = {
      patientName: form.patientName.value.trim(),
      service: form.service.value.trim(),
      amount: Number(form.amount.value),
      date: form.date.value,
      status: form.status.value
    };

    const errors = {};
    if (!data.patientName) errors.patientName = 'Please enter the patient\'s name.';
    if (!data.service) errors.service = 'Please describe the service.';
    if (!data.amount || data.amount <= 0) errors.amount = 'Please enter a valid amount.';
    if (!data.date) errors.date = 'Please select a date.';
    if (!data.status) errors.status = 'Please select a status.';

    clearFormErrors(form);
    if (Object.keys(errors).length > 0) {
      applyFormErrors(form, errors);
      return;
    }

    const id = form.id.value;

    if (id) {
      SharksDB.update('invoices', id, data);
      SharksToast.show('Invoice updated successfully.', 'success');
    } else {
      const newId = SharksDB.nextId('invoice');
      SharksDB.add('invoices', { id: newId, ...data });
      SharksToast.show('Invoice created successfully.', 'success');
    }

    closeModal('invoiceModalOverlay');
    render();
    refreshDashboardStats();
  }

  function confirmDelete(id) {
    const invoice = SharksDB.getById('invoices', id);
    if (!invoice) return;

    showConfirmModal(`Delete invoice "${invoice.id}" for ${invoice.patientName}? This action cannot be undone.`, () => {
      SharksDB.remove('invoices', id);
      SharksToast.show('Invoice deleted.', 'success');
      render();
      refreshDashboardStats();
    });
  }

  function init() {
    document.getElementById('addInvoiceBtn').addEventListener('click', () => openForm(null));
    document.getElementById('invoiceForm').addEventListener('submit', handleSubmit);

    document.getElementById('invoiceSearch').addEventListener('input', (e) => {
      controller.searchTerm = e.target.value.trim();
      controller.page = 1;
      render();
    });

    document.getElementById('invoiceStatusFilter').addEventListener('change', (e) => {
      controller.filterValue = e.target.value;
      controller.page = 1;
      render();
    });

    bindSortableHeaders('[aria-label="Invoices"]', controller, render);
  }

  return { render, init, openForm };
})();

/* ============================================================
   11. MODAL HELPERS
   ============================================================ */

function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add('modal-open');

  const firstInput = overlay.querySelector('input, select, textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 50);
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('modal-open');
}

function initModals() {
  // Close buttons / cancel buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  // Click outside modal to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Escape key closes the topmost open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.modal-open').forEach(overlay => {
        closeModal(overlay.id);
      });
    }
  });
}

let confirmCallback = null;

function showConfirmModal(message, onConfirm) {
  const messageEl = document.getElementById('confirmModalMessage');
  if (messageEl) messageEl.textContent = message;
  confirmCallback = onConfirm;
  openModal('confirmModalOverlay');
}

function initConfirmModal() {
  document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (typeof confirmCallback === 'function') confirmCallback();
    confirmCallback = null;
    closeModal('confirmModalOverlay');
  });
}

/* ============================================================
   FORM VALIDATION HELPERS (shared by all modals)
   ============================================================ */

function applyFormErrors(form, errors) {
  Object.keys(errors).forEach(fieldName => {
    const group = form.querySelector(`[data-field="${fieldName}"]`);
    if (!group) return;
    group.classList.add('has-error');
    const errorEl = group.querySelector('.field-error');
    if (errorEl) errorEl.textContent = errors[fieldName];
  });

  const firstField = Object.keys(errors)[0];
  if (firstField) {
    const input = form.querySelector(`[name="${firstField}"]`);
    if (input) input.focus();
  }
}

function clearFormErrors(form) {
  form.querySelectorAll('.form-group.has-error').forEach(group => {
    group.classList.remove('has-error');
  });
}

/* ============================================================
   DISPLAY HELPERS
   ============================================================ */

const AVATAR_COLORS = ['bg-blue', 'bg-green', 'bg-amber', 'bg-purple', 'bg-teal', 'bg-red', 'bg-navy'];

function avatarClass(name) {
  if (!name) return 'bg-blue';
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[d.getMonth()].slice(0, 3);
  return `${day} ${month} ${d.getFullYear()}`;
}

function convertTo24Hour(time12h) {
  if (!time12h) return '';
  const match = time12h.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
  if (!match) return '';
  let [, hours, minutes, period] = match;
  hours = parseInt(hours, 10);
  if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function convertTo12Hour(time24h) {
  if (!time24h) return '';
  let [hours, minutes] = time24h.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function statusBadgeClass(status) {
  const map = { Active: 'active', New: 'new', Critical: 'critical' };
  return map[status] || 'active';
}

function doctorStatusBadgeClass(status) {
  const map = { 'On Duty': 'active', 'On Call': 'pending', 'Off Duty': 'cancelled' };
  return map[status] || 'active';
}

function apptStatusBadgeClass(status) {
  const map = { Confirmed: 'confirmed', Pending: 'pending', Completed: 'completed', Cancelled: 'cancelled' };
  return map[status] || 'pending';
}

function invoiceStatusBadgeClass(status) {
  const map = { Paid: 'paid', Pending: 'pending', Overdue: 'overdue' };
  return map[status] || 'pending';
}

function updateNavBadge(section, count) {
  // Patients badge shows live total patient count
  if (section === 'patients' && count !== null) {
    const badge = document.querySelector('.nav-item.nav-parent .nav-badge.green');
    if (badge) badge.textContent = count.toLocaleString();
  }

  // Appointments badge shows live total appointment count
  if (section === 'appointments' && count !== null) {
    const parents = document.querySelectorAll('.nav-item.nav-parent');
    parents.forEach(p => {
      const label = p.querySelector('span');
      if (label && label.textContent.trim() === 'Appointments') {
        const badge = p.querySelector('.nav-badge');
        if (badge) badge.textContent = String(count);
      }
    });
  }

  // Billing badge shows count of non-paid invoices
  if (section === 'billing') {
    const pending = SharksDB.getAll('invoices').filter(inv => inv.status !== 'Paid').length;
    const parents = document.querySelectorAll('.nav-item.nav-parent');
    parents.forEach(p => {
      const label = p.querySelector('span');
      if (label && label.textContent.trim() === 'Billing') {
        const badge = p.querySelector('.nav-badge');
        if (badge) badge.textContent = String(pending);
      }
    });
  }
}

/* ============================================================
   DASHBOARD "RECENT" PREVIEW TABLES
   ============================================================ */

function renderRecentTables() {
  renderRecentAppointments();
  renderRecentPatients();
}

function renderRecentAppointments() {
  const tbody = document.getElementById('recentAppointmentsBody');
  if (!tbody) return;

  const appointments = sortItems(SharksDB.getAll('appointments'), { sortKey: 'date', sortDir: 'desc' }).slice(0, 6);

  if (appointments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No appointments yet.</td></tr>';
    return;
  }

  tbody.innerHTML = appointments.map((a, idx) => `
    <tr>
      <td class="text-muted-cell">${idx + 1}</td>
      <td>
        <div class="patient-cell">
          <span class="patient-avatar ${avatarClass(a.patientName)}">${initials(a.patientName)}</span>
          ${escapeHtml(a.patientName)}
        </div>
      </td>
      <td>${escapeHtml(a.doctor)}</td>
      <td>${formatDate(a.date)}</td>
      <td>${escapeHtml(a.time)}</td>
      <td>${escapeHtml(a.department)}</td>
      <td><span class="badge ${apptStatusBadgeClass(a.status)}">${escapeHtml(a.status)}</span></td>
    </tr>
  `).join('');
}

function renderRecentPatients() {
  const tbody = document.getElementById('recentPatientsBody');
  if (!tbody) return;

  const patients = sortItems(SharksDB.getAll('patients'), { sortKey: 'lastVisit', sortDir: 'desc' }).slice(0, 5);

  if (patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No patients yet.</td></tr>';
    return;
  }

  tbody.innerHTML = patients.map((p, idx) => `
    <tr>
      <td class="text-muted-cell">${idx + 1}</td>
      <td>
        <div class="patient-cell">
          <span class="patient-avatar ${avatarClass(p.name)}">${initials(p.name)}</span>
          ${escapeHtml(p.name)}
        </div>
      </td>
      <td>${escapeHtml(p.phone)}</td>
      <td>${p.age}</td>
      <td>${formatDate(p.lastVisit)}</td>
      <td><span class="badge ${statusBadgeClass(p.status)}">${escapeHtml(p.status)}</span></td>
    </tr>
  `).join('');
}

/* ============================================================
   CARD ACTIONS WITHOUT A BUILT VIEW & QUICK ACTIONS
   ============================================================ */

function initCardActionsAndQuickActions() {
  // Card-action links that have no data-target show a "coming soon" toast
  document.querySelectorAll('.card-action').forEach(el => {
    if (el.hasAttribute('data-target')) return;
    el.addEventListener('click', () => {
      SharksToast.show('This section is part of a future update.', 'info', 2500);
    });
  });

  // Quick action shortcuts
  const qaMap = {
    'add-patient': () => { showView('patients'); Patients.openForm(null); },
    'book-appointment': () => { showView('appointments'); Appointments.openForm(null); },
    'new-invoice': () => { showView('billing'); Invoices.openForm(null); }
  };

  document.querySelectorAll('.qa-btn').forEach(btn => {
    const action = btn.dataset.qa;
    if (action && qaMap[action]) {
      btn.addEventListener('click', qaMap[action]);
    } else if (!action) {
      btn.addEventListener('click', () => {
        SharksToast.show('This action is part of a future update.', 'info', 2500);
      });
    }
  });
}

/* ============================================================
   12. INIT
   ============================================================ */

function refreshAll() {
  refreshDashboardStats();
  renderRecentTables();
  Appointments.refreshDoctorOptions();
  updateNavBadge('patients', SharksDB.getAll('patients').length);
  updateNavBadge('appointments', SharksDB.getAll('appointments').length);
  updateNavBadge('billing', null);
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initDarkMode();
  initCalendar();
  initModals();
  initConfirmModal();
  initCardActionsAndQuickActions();

  Patients.init();
  Doctors.init();
  Appointments.init();
  Invoices.init();

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
      this.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });

  refreshAll();
});
