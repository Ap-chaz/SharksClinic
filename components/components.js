/* ============================================================
   SHARKS Clinic — Shared Components Loader (components.js)
   ------------------------------------------------------------
   Loads the shared header and footer partials into every page,
   then wires up:
     - Mobile hamburger menu toggle
     - Active navigation link highlighting (based on current page)
     - Closing the mobile menu when a link is clicked

   Loaded on every public page via:
     <script src="components/components.js"></script>
   ============================================================ */

async function loadComponent(id, file) {
  const target = document.getElementById(id);
  if (!target) return;

  try {
    const response = await fetch(file);

    if (!response.ok) {
      console.error(`Could not load ${file} (status ${response.status})`);
      return;
    }

    const html = await response.text();
    target.innerHTML = html;

    if (id === "header") {
      initMobileMenu();
      highlightActiveNavLink();
    }
  } catch (err) {
    console.error(`Error loading component "${file}":`, err);
  }
}

/* ---------- Mobile hamburger menu ---------------------------------- */
function initMobileMenu() {
  const hamburger = document.getElementById("hamburger");
  const menu = document.getElementById("menu");

  if (!hamburger || !menu) return;

  hamburger.setAttribute("role", "button");
  hamburger.setAttribute("tabindex", "0");
  hamburger.setAttribute("aria-label", "Toggle navigation menu");
  hamburger.setAttribute("aria-expanded", "false");

  const toggleMenu = () => {
    const isOpen = menu.classList.toggle("active");
    hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  };

  hamburger.addEventListener("click", toggleMenu);

  hamburger.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleMenu();
    }
  });

  // Close the mobile menu after a nav link is tapped
  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- Active nav link highlighting ---------------------------- */
function highlightActiveNavLink() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const links = document.querySelectorAll("#menu a, .nav-btn");

  links.forEach((link) => {
    const linkPage = link.getAttribute("href");
    if (!linkPage) return;

    if (linkPage === currentPage) {
      link.classList.add("active-link");
      link.setAttribute("aria-current", "page");
    }
  });
}

loadComponent("header", "components/header.html");
loadComponent("footer", "components/footer.html");
