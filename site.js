const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const desktop = matchMedia('(min-width: 75em)');
const menu = document.querySelector('.menu-toggle');
const nav = document.getElementById('navigasi');

function setMenu(open) {
  menu.setAttribute('aria-expanded', String(open));
  nav.hidden = !desktop.matches && !open;
}

function syncMenu() {
  const focusWasInMenu = nav.contains(document.activeElement);
  const focusWasOnToggle = document.activeElement === menu;
  menu.hidden = desktop.matches;
  document.documentElement.classList.toggle('has-menu', !desktop.matches);
  setMenu(false);
  if (!desktop.matches && focusWasInMenu) menu.focus();
  if (desktop.matches && focusWasOnToggle) nav.querySelector('a').focus();
}

menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
desktop.addEventListener('change', syncMenu);
syncMenu();

document.querySelector('.site-header').addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menu.focus();
  }
});

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  const target = document.getElementById(link.hash.slice(1));
  if (!target) return;
  setMenu(false);
  target.focus({ preventScroll: true });
});

function markCurrentLocation() {
  const marker = 24;
  const links = [...nav.querySelectorAll('a')];
  const current = links.map((link) => ({
    link,
    top: document.getElementById(link.hash.slice(1)).getBoundingClientRect().top,
  })).filter(({ top }) => top <= marker).sort((a, b) => b.top - a.top)[0]?.link;
  for (const link of links) {
    if (link === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

let scrollFrame = 0;
function scheduleLocationUpdate() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    markCurrentLocation();
  });
}
addEventListener('scroll', scheduleLocationUpdate, { passive: true });
addEventListener('resize', scheduleLocationUpdate);
markCurrentLocation();

function installReferenceReveals(root = document) {
  const elements = [...root.querySelectorAll('[data-reveal]')];
  let active = true;
  const animations = new Map();

  function play(element, type, duration, delay, fromOpacity) {
    const transform = type === 'media' ? 'translateX(16px)' : 'translateY(12px)';
    const animation = element.animate(
      [{ opacity: fromOpacity, transform }, { opacity: 1, transform: 'none' }],
      { duration, delay, easing: ease, fill: 'backwards' }
    );
    animations.set(element, animation);
    animation.onfinish = () => animations.delete(element);
  }

  const observer = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries) => {
        if (!active || reduced.matches) return;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target.matches('[data-reveal]')
            ? entry.target
            : entry.target.querySelector('[data-reveal]');
          observer.unobserve(entry.target);
          element.dataset.revealPlayed = 'true';
          const rect = entry.boundingClientRect;
          if (reduced.matches || document.hidden || rect.bottom <= 0) continue;
          const type = element.dataset.reveal;
          const isHero = element.hasAttribute('data-hero');
          const aboveFold = rect.top < innerHeight;
          const delay = type === 'rise' && !aboveFold
            ? Math.min(240, [...element.parentElement.children].indexOf(element) * 80)
            : 0;
          play(element, type, type === 'media' ? 660 : 600, delay, aboveFold || isHero ? 1 : 0);
        }
      }, { threshold: 0, rootMargin: '0px 0px 96px 0px' })
    : null;

  function finish() {
    active = false;
    observer?.disconnect();
    for (const element of elements) element.dataset.revealPlayed = 'true';
    for (const animation of animations.values()) animation.cancel();
    animations.clear();
  }

  function onPreferenceChange() {
    if (reduced.matches) {
      finish();
    }
  }

  if (!reduced.matches && !document.hidden && Element.prototype.animate) {
    if (!scrollY && !location.hash && performance.getEntriesByType('navigation')[0]?.type !== 'back_forward') {
      const hero = [...root.querySelectorAll('[data-hero]')];
      hero.forEach((element, index) => {
        if (element.getBoundingClientRect().top >= innerHeight) return;
        const type = element.dataset.hero;
        element.dataset.revealPlayed = 'true';
        play(element, type, type === 'media' ? 660 : 600, type === 'media' ? 0 : Math.min(index * 80, 160), 1);
      });
    }
    for (const element of elements) {
      if (element.dataset.revealPlayed === 'true') continue;
      if (!observer || element.getBoundingClientRect().top < innerHeight) {
        element.dataset.revealPlayed = 'true';
      } else {
        observer.observe(element);
      }
    }
  }
  reduced.addEventListener('change', onPreferenceChange);
  return () => {
    finish();
    reduced.removeEventListener('change', onPreferenceChange);
  };
}

let stopReveals;
let revealFrame;
addEventListener('pageshow', () => {
  // Read the viewport after the browser restores its scroll position.
  revealFrame = requestAnimationFrame(() => {
    stopReveals = installReferenceReveals();
  });
}, { once: true });
addEventListener('pagehide', () => {
  cancelAnimationFrame(revealFrame);
  stopReveals?.();
}, { once: true });
