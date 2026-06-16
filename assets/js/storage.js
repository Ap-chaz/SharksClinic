/* ============================================================
   SHARKS Clinic — Shared Data Layer (storage.js)
   ------------------------------------------------------------
   Single source of truth for all clinic data, persisted to
   localStorage under one key ("sharksClinicDB"). Used by both
   the public website (appointment/feedback forms) and the
   admin dashboard (patients, doctors, appointments, billing).

   This file must be loaded BEFORE any script that calls
   SharksDB.* functions (main.js, admin/script.js, etc.)
   ============================================================ */

const SharksDB = (() => {
  const STORAGE_KEY = "sharksClinicDB";

  /* ---------- Default / seed data ---------------------------------- */
  const defaultData = () => ({
    patients: [
      { id: "P-1001", name: "John Doe", phone: "0712 345 678", email: "john.doe@example.com", age: 32, gender: "Male", lastVisit: "2026-06-12", status: "Active" },
      { id: "P-1002", name: "Mary Wanjiku", phone: "0722 456 789", email: "mary.w@example.com", age: 28, gender: "Female", lastVisit: "2026-06-11", status: "Active" },
      { id: "P-1003", name: "Peter Mwangi", phone: "0733 567 890", email: "peter.m@example.com", age: 45, gender: "Male", lastVisit: "2026-06-10", status: "Active" },
      { id: "P-1004", name: "Grace Akinyi", phone: "0744 678 901", email: "grace.a@example.com", age: 34, gender: "Female", lastVisit: "2026-06-09", status: "New" },
      { id: "P-1005", name: "James Ochieng", phone: "0755 789 012", email: "james.o@example.com", age: 50, gender: "Male", lastVisit: "2026-06-08", status: "Critical" }
    ],

    doctors: [
      { id: "D-001", name: "Dr. Kimani", specialty: "General Medicine", phone: "0700 111 222", email: "kimani@sharksclinic.com", status: "On Duty" },
      { id: "D-002", name: "Dr. Mercy", specialty: "Paediatrics", phone: "0700 222 333", email: "mercy@sharksclinic.com", status: "On Duty" },
      { id: "D-003", name: "Dr. Otieno", specialty: "Surgery", phone: "0700 333 444", email: "otieno@sharksclinic.com", status: "On Call" },
      { id: "D-004", name: "Dr. Waweru", specialty: "Obstetrics", phone: "0700 444 555", email: "waweru@sharksclinic.com", status: "On Duty" }
    ],

    appointments: [
      { id: "A-2001", patientName: "John Doe", phone: "0712 345 678", email: "", doctor: "Dr. Kimani", department: "General Consultation", date: "2026-06-12", time: "09:00 AM", reason: "Routine check-up", status: "Confirmed", source: "seed" },
      { id: "A-2002", patientName: "Mary Wanjiku", phone: "0722 456 789", email: "", doctor: "Dr. Mercy", department: "Paediatrics", date: "2026-06-12", time: "09:30 AM", reason: "Follow-up", status: "Confirmed", source: "seed" },
      { id: "A-2003", patientName: "Peter Mwangi", phone: "0733 567 890", email: "", doctor: "Dr. Kimani", department: "General Consultation", date: "2026-06-12", time: "10:00 AM", reason: "Follow-up visit", status: "Pending", source: "seed" },
      { id: "A-2004", patientName: "Grace Akinyi", phone: "0744 678 901", email: "", doctor: "Dr. Mercy", department: "General Consultation", date: "2026-06-12", time: "10:30 AM", reason: "Consultation", status: "Confirmed", source: "seed" },
      { id: "A-2005", patientName: "James Ochieng", phone: "0755 789 012", email: "", doctor: "Dr. Kimani", department: "General Consultation", date: "2026-06-12", time: "11:00 AM", reason: "Check-up", status: "Pending", source: "seed" },
      { id: "A-2006", patientName: "Faith Njeri", phone: "0766 890 123", email: "", doctor: "Dr. Otieno", department: "Surgery", date: "2026-06-12", time: "11:30 AM", reason: "Follow-up", status: "Completed", source: "seed" }
    ],

    invoices: [
      { id: "INV-3001", patientName: "John Doe", service: "Consultation", amount: 1500, status: "Paid", date: "2026-06-12" },
      { id: "INV-3002", patientName: "Mary Wanjiku", service: "Lab Tests", amount: 3200, status: "Paid", date: "2026-06-11" },
      { id: "INV-3003", patientName: "Peter Mwangi", service: "Pharmacy", amount: 850, status: "Pending", date: "2026-06-10" },
      { id: "INV-3004", patientName: "Grace Akinyi", service: "Consultation + Lab", amount: 4500, status: "Pending", date: "2026-06-09" },
      { id: "INV-3005", patientName: "James Ochieng", service: "Surgery Deposit", amount: 9000, status: "Overdue", date: "2026-06-05" }
    ],

    feedback: [],

    meta: {
      nextPatientId: 1006,
      nextDoctorId: 5,
      nextAppointmentId: 2007,
      nextInvoiceId: 3006
    },

    settings: {
      darkMode: false
    },

    auth: {
      loggedIn: false,
      user: { name: "Dr. Kimani", role: "Administrator" }
    }
  });

  /* ---------- Core load / save -------------------------------------- */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const fresh = defaultData();
        save(fresh);
        return fresh;
      }
      const parsed = JSON.parse(raw);
      // Merge with defaults so new fields added in future updates exist
      return { ...defaultData(), ...parsed };
    } catch (err) {
      console.error("SharksDB: failed to load data, resetting.", err);
      const fresh = defaultData();
      save(fresh);
      return fresh;
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error("SharksDB: failed to save data.", err);
      return false;
    }
  }

  function reset() {
    const fresh = defaultData();
    save(fresh);
    return fresh;
  }

  /* ---------- Generic collection helpers ----------------------------- */
  function getAll(collection) {
    const db = load();
    return db[collection] || [];
  }

  function getById(collection, id) {
    return getAll(collection).find((item) => item.id === id) || null;
  }

  function add(collection, item) {
    const db = load();
    db[collection] = db[collection] || [];
    db[collection].push(item);
    save(db);
    return item;
  }

  function update(collection, id, changes) {
    const db = load();
    const list = db[collection] || [];
    const idx = list.findIndex((item) => item.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...changes };
    save(db);
    return list[idx];
  }

  function remove(collection, id) {
    const db = load();
    const list = db[collection] || [];
    const idx = list.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    save(db);
    return true;
  }

  /* ---------- ID generators ------------------------------------------ */
  function nextId(type) {
    const db = load();
    const meta = db.meta;
    let id;
    switch (type) {
      case "patient":
        id = `P-${meta.nextPatientId}`;
        meta.nextPatientId += 1;
        break;
      case "doctor":
        id = `D-${String(meta.nextDoctorId).padStart(3, "0")}`;
        meta.nextDoctorId += 1;
        break;
      case "appointment":
        id = `A-${meta.nextAppointmentId}`;
        meta.nextAppointmentId += 1;
        break;
      case "invoice":
        id = `INV-${meta.nextInvoiceId}`;
        meta.nextInvoiceId += 1;
        break;
      default:
        id = `ID-${Date.now()}`;
    }
    save(db);
    return id;
  }

  /* ---------- Settings / auth ----------------------------------------- */
  function getSettings() {
    return load().settings;
  }

  function updateSettings(changes) {
    const db = load();
    db.settings = { ...db.settings, ...changes };
    save(db);
    return db.settings;
  }

  function getAuth() {
    return load().auth;
  }

  function setAuth(changes) {
    const db = load();
    db.auth = { ...db.auth, ...changes };
    save(db);
    return db.auth;
  }

  /* ---------- Public API ---------------------------------------------- */
  return {
    load,
    save,
    reset,
    getAll,
    getById,
    add,
    update,
    remove,
    nextId,
    getSettings,
    updateSettings,
    getAuth,
    setAuth
  };
})();
