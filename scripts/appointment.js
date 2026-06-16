/* ============================================================
   SHARKS Clinic — Appointment Booking (appointment.js)
   ------------------------------------------------------------
   Handles the public "Book an Appointment" form:
     - Client-side validation (required fields, email format,
       phone format, future-date check)
     - Inline error messages per field
     - Saves a confirmed booking into the shared SharksDB
       ("appointments" collection) with status "Pending"
     - Shows a success/error toast and resets the form

   Depends on:
     assets/js/storage.js  (SharksDB)
     assets/js/toast.js    (SharksToast)
   ============================================================ */

(function () {
  const form = document.getElementById("appointmentForm");
  if (!form) return;

  const PHONE_REGEX = /^[+0-9\s-]{7,15}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener("submit", handleSubmit);

  function handleSubmit(e) {
    e.preventDefault();

    const data = {
      fullName: form.fullName.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      department: form.department.value,
      date: form.date.value,
      time: form.time.value,
      reason: form.reason.value.trim()
    };

    const errors = validate(data);
    showErrors(errors);

    if (Object.keys(errors).length > 0) {
      SharksToast.show("Please fix the highlighted fields and try again.", "error");
      return;
    }

    saveAppointment(data);

    SharksToast.show(
      `Thank you, ${data.fullName.split(" ")[0]}! Your appointment request has been received. We'll contact you to confirm.`,
      "success",
      6000
    );

    form.reset();
    clearAllErrors();
  }

  function validate(data) {
    const errors = {};

    if (!data.fullName) {
      errors.fullName = "Please enter your full name.";
    }

    if (!data.phone) {
      errors.phone = "Please enter your phone number.";
    } else if (!PHONE_REGEX.test(data.phone)) {
      errors.phone = "Please enter a valid phone number.";
    }

    if (data.email && !EMAIL_REGEX.test(data.email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!data.department) {
      errors.department = "Please select a department.";
    }

    if (!data.date) {
      errors.date = "Please choose a preferred date.";
    } else {
      const chosen = new Date(data.date + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (chosen < today) {
        errors.date = "Please choose a date that is today or in the future.";
      }
    }

    if (!data.time) {
      errors.time = "Please select a preferred time.";
    }

    if (!data.reason) {
      errors.reason = "Please briefly describe your reason for visiting.";
    }

    return errors;
  }

  function showErrors(errors) {
    clearAllErrors();

    Object.keys(errors).forEach((fieldName) => {
      const group = form.querySelector(`[data-field="${fieldName}"]`);
      if (!group) return;

      group.classList.add("has-error");

      const errorEl = group.querySelector(".field-error");
      if (errorEl) errorEl.textContent = errors[fieldName];
    });

    // Focus the first invalid field for accessibility
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      const input = form.querySelector(`[name="${firstErrorField}"]`);
      if (input) input.focus();
    }
  }

  function clearAllErrors() {
    form.querySelectorAll(".form-group.has-error").forEach((group) => {
      group.classList.remove("has-error");
    });
  }

  function saveAppointment(data) {
    const id = SharksDB.nextId("appointment");

    SharksDB.add("appointments", {
      id,
      patientName: data.fullName,
      phone: data.phone,
      email: data.email,
      doctor: "Unassigned",
      department: data.department,
      date: data.date,
      time: data.time,
      reason: data.reason,
      status: "Pending",
      source: "website"
    });
  }
})();
