/* ============================================================
   SHARKS Clinic — Services Search (services.js)
   ------------------------------------------------------------
   Provides live, client-side filtering of the services grid as
   the visitor types into the search box. Matches against each
   card's title, description, and a data-keywords attribute.

   Shows a "no results" message when nothing matches.
   ============================================================ */

(function () {
  const searchInput = document.getElementById("serviceSearch");
  const grid = document.getElementById("servicesGrid");
  const noResults = document.getElementById("noServiceResults");

  if (!searchInput || !grid) return;

  const cards = Array.from(grid.querySelectorAll(".service-card"));

  searchInput.addEventListener("input", filterServices);

  function filterServices() {
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const keywords = card.getAttribute("data-keywords") || "";
      const matches = query === "" || keywords.includes(query);

      card.classList.toggle("hidden-card", !matches);
      if (matches) visibleCount += 1;
    });

    if (noResults) {
      noResults.hidden = visibleCount > 0;
    }
  }
})();
