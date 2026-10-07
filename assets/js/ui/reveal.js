/**
 * Scroll-triggered reveals and nav highlighting.
 *
 * IntersectionObserver rather than scroll handlers: the browser does the
 * intersection maths off the main thread, so this adds no per-scroll cost.
 */

/** Fade elements marked `data-reveal` in as they enter the viewport. */
export function initReveal() {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  // Without IntersectionObserver, show everything rather than hiding content.
  if (!('IntersectionObserver' in window)) {
    targets.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = entry.target.dataset.revealDelay || 0;
        entry.target.style.setProperty('--reveal-delay', `${delay}ms`);
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // reveal once; re-animating on scroll-up is noise
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  targets.forEach((element) => observer.observe(element));
}

/** Mark the nav link whose section currently dominates the viewport. */
export function initNavHighlight() {
  const links = [...document.querySelectorAll('.nav__links a')];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          link.classList.toggle(
            'is-active',
            link.getAttribute('href') === `#${entry.target.id}`
          );
        });
      });
    },
    { threshold: 0.3, rootMargin: '-20% 0px -55% 0px' }
  );

  sections.forEach((section) => observer.observe(section));
}

/**
 * Count a number up when it scrolls into view.
 *
 * @param {HTMLElement} element Target element.
 * @param {number} value Final value.
 * @param {object} [options]
 * @param {string} [options.suffix] Text appended to the number.
 * @param {number} [options.decimals] Decimal places to show.
 * @param {boolean} [options.animate] When false, write the value immediately.
 */
export function countUp(element, value, { suffix = '', decimals = 0, animate = true } = {}) {
  const render = (n) => {
    element.textContent = `${n.toFixed(decimals)}${suffix}`;
  };

  if (!animate || !('IntersectionObserver' in window)) {
    render(value);
    return;
  }

  render(0);
  const duration = 1500;

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();

      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / duration, 1);
        // Ease-out cubic: fast start, settled finish — reads as "landing on"
        // the number rather than creeping toward it.
        render(value * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    { threshold: 0.5 }
  );

  observer.observe(element);
}
