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
  if (!window.gsap || !window.ScrollTrigger || reduced.matches) return () => {};
  gsap.registerPlugin(ScrollTrigger);
  const owned = [];
  const triggers = [];
  const clean = () => {
    triggers.forEach((trigger) => trigger.kill());
    owned.forEach((animation) => animation.progress(1).kill());
    reduced.removeEventListener('change', onPreference);
  };
  const onPreference = () => { if (reduced.matches) clean(); };
  reduced.addEventListener('change', onPreference);
  if (!scrollY && !location.hash && !document.hidden) {
    const items = [...root.querySelectorAll('[data-hero]')].filter((el) => el.getBoundingClientRect().top < innerHeight);
    const timeline = gsap.timeline({ defaults: { duration: 0.65, ease: 'power3.out' } });
    items.forEach((el, index) => timeline.fromTo(el, { y: 12 }, { y: 0, clearProps: 'transform' }, Math.min(index * 0.08, 0.24)));
    owned.push(timeline);
  }
  root.querySelectorAll('[data-reveal]').forEach((element) => {
    if (element.hasAttribute('data-hero') || element.getBoundingClientRect().top < innerHeight || document.hidden) return;
    const trigger = ScrollTrigger.create({
      trigger: element,
      start: 'top bottom+=96',
      once: true,
      onEnter: () => {
        if (reduced.matches || document.hidden || element.getBoundingClientRect().bottom <= 0) return;
        const horizontal = element.dataset.reveal === 'media' || element.dataset.reveal === 'slide';
        const anim = gsap.fromTo(element, horizontal ? { x: element.dataset.reveal === 'media' ? 16 : -12 } : { y: 12 },
          { x: 0, y: 0, duration: 0.6, ease: 'power3.out', clearProps: 'transform' });
        owned.push(anim);
      }
    });
    triggers.push(trigger);
  });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  return clean;
}

let stopReveals;
let revealFrame;
addEventListener('pageshow', () => {
  revealFrame = requestAnimationFrame(() => { stopReveals = installReferenceReveals(); });
}, { once: true });
addEventListener('pagehide', () => {
  cancelAnimationFrame(revealFrame);
  stopReveals?.();
}, { once: true });
