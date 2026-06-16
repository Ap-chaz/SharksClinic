/* ============================================================
   SHARKS Clinic — Homepage Hero Slideshow (main.js)
   ------------------------------------------------------------
   Cycles through the background images in the homepage hero
   section. Pauses automatically while the visitor is hovering
   over the hero (so they can read/click without the image
   changing under them) and resumes when they move away.
   ============================================================ */

(function () {
  const hero = document.querySelector(".hero");
  const slides = document.querySelectorAll(".hero .slide");

  if (slides.length === 0) return;

  const INTERVAL_MS = 4000;
  let current = 0;
  let timer = null;

  function nextSlide() {
    slides[current].classList.remove("active");
    current = (current + 1) % slides.length;
    slides[current].classList.add("active");
  }

  function start() {
    if (slides.length < 2 || timer) return;
    timer = setInterval(nextSlide, INTERVAL_MS);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  start();

  if (hero) {
    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", start);
  }
})();
