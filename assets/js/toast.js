/* ============================================================
   SHARKS Clinic — Toast Notification System (toast.js)
   ------------------------------------------------------------
   Lightweight, dependency-free toast notifications used across
   the public website and the admin dashboard for success,
   error, warning and info messages.

   Usage:
     SharksToast.show("Appointment booked!", "success");
     SharksToast.show("Please fill all required fields.", "error");

   Requires the .toast-container / .toast styles defined in
   assets/css/shared.css. The container is created automatically
   if it doesn't exist on the page.
   ============================================================ */

const SharksToast = (() => {
  const ICONS = {
    success: "fa-circle-check",
    error: "fa-circle-exclamation",
    warning: "fa-triangle-exclamation",
    info: "fa-circle-info"
  };

  function ensureContainer() {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      container.setAttribute("role", "status");
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type = "info", duration = 4000) {
    const container = ensureContainer();

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icon = ICONS[type] || ICONS.info;
    toast.innerHTML = `
      <i class="fa-solid ${icon}" aria-hidden="true"></i>
      <span class="toast-message">${message}</span>
      <button type="button" class="toast-close" aria-label="Dismiss notification">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    `;

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => toast.classList.add("toast-show"));

    const removeToast = () => {
      toast.classList.remove("toast-show");
      toast.classList.add("toast-hide");
      setTimeout(() => toast.remove(), 250);
    };

    const timer = setTimeout(removeToast, duration);

    toast.querySelector(".toast-close").addEventListener("click", () => {
      clearTimeout(timer);
      removeToast();
    });

    return toast;
  }

  return { show };
})();
