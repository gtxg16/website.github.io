// Lets :active styles show on iOS taps.
document.addEventListener('touchstart', () => {}, { passive: true });

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------------
// Phone menu: the three-bar button opens the section links.
// ------------------------------------------------------------------
const menuBtn = document.querySelector('[data-menu-btn]');
const nav = document.getElementById('site-nav');
if (menuBtn && nav) {
  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  };
  const isOpen = () => menuBtn.getAttribute('aria-expanded') === 'true';

  menuBtn.addEventListener('click', () => setOpen(!isOpen()));

  // Picking a section closes the menu; the link still jumps.
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });

  // Tap or click anywhere else closes it.
  document.addEventListener('click', (e) => {
    if (isOpen() && !nav.contains(e.target) && !menuBtn.contains(e.target)) setOpen(false);
  });

  // Escape closes it and hands focus back to the button.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); menuBtn.focus(); }
  });

  // Tabbing out of the menu closes it.
  nav.addEventListener('focusout', (e) => {
    if (isOpen() && !nav.contains(e.relatedTarget) && e.relatedTarget !== menuBtn) setOpen(false);
  });

  // Growing past phone width brings the inline links back.
  window.matchMedia('(min-width: 760px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
}

// ------------------------------------------------------------------
// Section entrances: each block rises once as its section comes into view.
// Content is fully visible without this script.
// ------------------------------------------------------------------
if ('IntersectionObserver' in window && !reduceMotion) {
  document.documentElement.classList.add('js');

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });

  for (const col of document.querySelectorAll('.section .col')) {
    [...col.children].forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = `${Math.min(i, 4) * 70}ms`;
      io.observe(el);
    });
  }

  // Spec rows and model tags cascade after their panel.
  for (const sheet of document.querySelectorAll('.sheet, .model')) {
    sheet.querySelectorAll('.specs > div, .tag').forEach((el, i) => el.style.setProperty('--i', i));
  }
}

// ------------------------------------------------------------------
// Boot picker: choose a machine, pick a drive, watch it boot.
// ------------------------------------------------------------------
const picker = document.querySelector('[data-picker]');
if (picker) {
  const seg = picker.querySelector('[data-seg]');
  const machines = [...picker.querySelectorAll('[data-machine]')];
  const shelves = [...picker.querySelectorAll('[data-drives]')];
  const progress = picker.querySelector('[data-progress]');
  const status = picker.querySelector('[data-status]');
  const BOOT_MS = reduceMotion ? 0 : 1400;
  const words = { 2: 'Two', 3: 'Three' };

  let timer = null;
  let booting = null;

  seg.hidden = false;
  progress.hidden = false;

  const idleText = (shelf) => {
    const n = shelf.querySelectorAll('.drive').length;
    return `${words[n] || n} drives. Pick one to boot.`;
  };

  const reset = () => {
    clearTimeout(timer);
    if (booting) booting.classList.remove('is-booting');
    booting = null;
    progress.classList.remove('is-booting', 'is-done');
    for (const d of picker.querySelectorAll('.drive')) d.setAttribute('aria-pressed', 'false');
  };

  status.textContent = idleText(shelves[0]);

  for (const button of machines) {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      reset();
      for (const b of machines) b.setAttribute('aria-pressed', String(b === button));
      for (const shelf of shelves) {
        const on = shelf.dataset.drives === button.dataset.machine;
        shelf.hidden = !on;
        if (on) {
          shelf.classList.remove('is-switching');
          void shelf.offsetWidth; // restart the entrance
          shelf.classList.add('is-switching');
          status.textContent = idleText(shelf);
        }
      }
    });
  }

  for (const drive of picker.querySelectorAll('.drive')) {
    drive.addEventListener('click', () => {
      const os = drive.dataset.os;
      reset();
      drive.setAttribute('aria-pressed', 'true');
      drive.classList.add('is-booting');
      booting = drive;

      void progress.offsetWidth; // let the bar start from empty
      progress.classList.add('is-booting');
      status.textContent = `Booting ${os}…`;

      timer = setTimeout(() => {
        drive.classList.remove('is-booting');
        booting = null;
        progress.classList.remove('is-booting');
        progress.classList.add('is-done');
        status.textContent = `Booted into ${os}.` + ('hack' in drive.dataset ? ' On a PC.' : '');
      }, BOOT_MS);
    });
  }
}

// ------------------------------------------------------------------
// Replay a sentence at roughly 30 tokens a second.
// ------------------------------------------------------------------
const speed = document.querySelector('[data-speed]');
if (speed) {
  const TOKENS_PER_SECOND = 30;
  const textEl = speed.querySelector('[data-speed-text]');
  const ghostEl = speed.querySelector('[data-speed-ghost]');
  const button = speed.querySelector('[data-speed-play]');
  const meta = speed.querySelector('[data-speed-meta]');
  const fullText = textEl.textContent.trim();

  // Rough tokenizer: words with their leading space, long words split into ~4-character pieces.
  const tokens = [];
  for (const word of fullText.match(/\s*\S+/g)) {
    const lead = word.match(/^\s*/)[0];
    const body = word.slice(lead.length);
    if (body.length <= 6) { tokens.push(word); continue; }
    for (let i = 0; i < body.length; i += 4) tokens.push((i === 0 ? lead : '') + body.slice(i, i + 4));
  }

  // The ghost copy holds the box at full height so nothing below it jumps.
  ghostEl.textContent = fullText;
  button.hidden = false;
  meta.hidden = false;

  let timer = null;

  button.addEventListener('click', () => {
    clearInterval(timer);
    let i = 0;
    const start = performance.now();
    textEl.textContent = '';
    textEl.classList.add('is-streaming');

    timer = setInterval(() => {
      textEl.textContent += tokens[i++];
      const seconds = (performance.now() - start) / 1000;
      meta.textContent = `${i} tokens in ${seconds.toFixed(1)} s, simulated in your browser.`;
      if (i >= tokens.length) {
        clearInterval(timer);
        textEl.classList.remove('is-streaming');
      }
    }, 1000 / TOKENS_PER_SECOND);
  });
}
