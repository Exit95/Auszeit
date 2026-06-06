// Scroll-Animationen — Malatelier Auszeit
// Atelier-Editorial-Stil: ruhig, handwerklich, nie technoid
// Timing: 0.6–0.9s ease-out, Stagger 100ms, max Scale 2–3%

(function () {
  // prefers-reduced-motion: Animationen sofort abschalten
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const OBSERVER_OPTIONS = {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px',
  };

  // Bereits sichtbare Elemente beim Seitenladen nicht animieren
  function isAboveViewport(el) {
    return el.getBoundingClientRect().top < 0;
  }

  // Einzel-Elemente mit data-animate beobachten
  // Kinder von Stagger-Containern werden hier übersprungen — der Stagger-Observer kümmert sich
  function observeElements() {
    const elements = document.querySelectorAll('[data-animate]');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseInt(el.dataset.animateDelay || '0', 10);
          setTimeout(() => {
            el.classList.add('is-visible');
          }, delay);
          observer.unobserve(el);
        }
      });
    }, OBSERVER_OPTIONS);

    elements.forEach((el) => {
      // Kinder eines Stagger-Containers überspringen
      if (el.parentElement && el.parentElement.hasAttribute('data-animate-stagger')) return;

      // Elemente die beim Laden schon über dem Viewport sind — sofort sichtbar
      if (isAboveViewport(el)) {
        el.classList.add('is-visible');
        return;
      }
      observer.observe(el);
    });
  }

  // Container mit data-animate-stagger → Kinder automatisch staffeln
  function observeStaggerContainers() {
    const containers = document.querySelectorAll('[data-animate-stagger]');
    if (!containers.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const container = entry.target;
          const staggerMs = parseInt(container.dataset.animateStagger || '100', 10);
          const children = Array.from(container.children);

          children.forEach((child, i) => {
            const baseDelay = parseInt(child.dataset.animateDelay || '0', 10);
            setTimeout(() => {
              child.classList.add('is-visible');
            }, i * staggerMs + baseDelay);
          });

          observer.unobserve(container);
        }
      });
    }, OBSERVER_OPTIONS);

    containers.forEach((container) => {
      if (isAboveViewport(container)) {
        Array.from(container.children).forEach((child) => {
          child.classList.add('is-visible');
        });
        return;
      }
      observer.observe(container);
    });
  }

  // Legacy: .animate-on-scroll (bestehende Klasse, rückwärts kompatibel)
  function observeLegacy() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, OBSERVER_OPTIONS);

    elements.forEach((el) => {
      if (isAboveViewport(el)) {
        el.classList.add('is-visible');
        return;
      }
      observer.observe(el);
    });
  }

  function init() {
    // Bei reduced-motion alle Elemente sofort sichtbar schalten
    if (prefersReduced) {
      document
        .querySelectorAll('[data-animate], .animate-on-scroll, [data-animate-stagger] > *')
        .forEach((el) => el.classList.add('is-visible'));
      return;
    }

    observeElements();
    observeStaggerContainers();
    observeLegacy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
