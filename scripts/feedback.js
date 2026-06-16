/* ============================================================
   SHARKS Clinic — Feedback Form (feedback.js)
   ------------------------------------------------------------
   Handles the public "Patient Feedback" form:
     - Validates rating, recommendation choice, and message
     - Name/email are optional but validated if provided
     - Saves feedback into SharksDB ("feedback" collection)
     - Shows a success/error toast and resets the form

   Depends on:
     assets/js/storage.js  (SharksDB)
     assets/js/toast.js    (SharksToast)
   ============================================================ */

(function () {
  const form = document.getElementById("feedbackForm");
  if (!form) return;

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener("submit", handleSubmit);

  function handleSubmit(e) {
    e.preventDefault();

    const recommendInput = form.querySelector('input[name="recommend"]:checked');

    const data = {
      fullName: form.fullName.value.trim(),
      email: form.email.value.trim(),
      rating: form.rating.value,
      recommend: recommendInput ? recommendInput.value : "",
      message: form.message.value.trim()
    };

    const errors = validate(data);
    showErrors(errors);

    if (Object.keys(errors).length > 0) {
      SharksToast.show("Please complete the highlighted fields.", "error");
      return;
    }

    saveFeedback(data);

    SharksToast.show("Thank you for your feedback! We appreciate you taking the time.", "success", 5000);

    form.reset();
    clearAllErrors();
  }

  function validate(data) {
    const errors = {};

    if (data.email && !EMAIL_REGEX.test(data.email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!data.rating) {
      errors.rating = "Please select a rating.";
    }

    if (!data.recommend) {
      errors.recommend = "Please let us know if you'd recommend us.";
    }

    if (!data.message) {
      errors.message = "Please share a few words about your experience.";
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
  }

  function clearAllErrors() {
    form.querySelectorAll(".form-group.has-error").forEach((group) => {
      group.classList.remove("has-error");
    });
  }

  function saveFeedback(data) {
    const db = SharksDB.load();
    db.feedback = db.feedback || [];
    db.feedback.push({
      id: `FB-${Date.now()}`,
      fullName: data.fullName || "Anonymous",
      email: data.email,
      rating: Number(data.rating),
      recommend: data.recommend,
      message: data.message,
      date: new Date().toISOString().slice(0, 10)
    });
    SharksDB.save(db);
  }
})();
