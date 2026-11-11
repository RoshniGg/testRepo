// Injected into every page the test browser opens (saved scripts and the Script Author's browser).
// A headless browser has no mouse pointer on screen: this draws one that follows the real mouse events, a ripple
// where a click lands, and a frame around the field being typed into, so the live view, screenshots, traces and
// videos show what the test does. It never takes part in the page: pointer-events none, outside the page's
// layout (fixed position, top layer), and it only listens (passive, capture) to events the page gets anyway.
(() => {
  if (window.__raCursor) return;
  window.__raCursor = true;
  const Z = '2147483647';
  let cursor, focusBox, last = null;

  function make(tag, css) {
    const el = document.createElement(tag);
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('data-ra-overlay', '');
    Object.assign(el.style, { position: 'fixed', pointerEvents: 'none', zIndex: Z, margin: '0', padding: '0' }, css);
    return el;
  }

  function ensure() {
    const root = document.documentElement;
    if (!root) return false;
    if (!cursor || !cursor.isConnected) {
      cursor = make('div', {
        left: '0', top: '0', width: '22px', height: '22px', transform: 'translate(-100px,-100px)',
        transition: 'transform 140ms ease-out', display: 'block',
      });
      cursor.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M2 1 L2 17 L6.5 13 L9.5 20 L12.5 18.8 L9.6 12 L15.5 12 Z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      root.appendChild(cursor);
      if (last) move(last.x, last.y);
    }
    if (!focusBox || !focusBox.isConnected) {
      focusBox = make('div', {
        border: '2px solid #e8590c', borderRadius: '4px', boxShadow: '0 0 0 3px rgba(232,89,12,0.25)',
        display: 'none', transition: 'all 120ms ease-out',
      });
      root.appendChild(focusBox);
    }
    return true;
  }

  function move(x, y) {
    last = { x, y };
    if (ensure()) cursor.style.transform = `translate(${x - 2}px, ${y - 1}px)`;
  }

  function ripple(x, y) {
    if (!ensure()) return;
    const r = make('div', {
      left: `${x - 18}px`, top: `${y - 18}px`, width: '36px', height: '36px', borderRadius: '50%',
      border: '3px solid #e8590c', background: 'rgba(232,89,12,0.25)', transform: 'scale(0.3)', opacity: '1',
      transition: 'transform 450ms ease-out, opacity 450ms ease-out',
    });
    document.documentElement.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'scale(1.4)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 600);
  }

  function frame(el) {
    if (!ensure()) return;
    if (!el || !el.getBoundingClientRect || el === document.body) { focusBox.style.display = 'none'; return; }
    const b = el.getBoundingClientRect();
    Object.assign(focusBox.style, {
      display: 'block', left: `${b.left - 3}px`, top: `${b.top - 3}px`, width: `${b.width + 2}px`, height: `${b.height + 2}px`,
    });
  }

  const opts = { capture: true, passive: true };
  window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY), opts);
  window.addEventListener('mousedown', (e) => {
    // On a click the pointer jumps to the spot at once (no glide), so screenshots taken right after show it there.
    if (ensure()) { cursor.style.transition = 'none'; move(e.clientX, e.clientY); void cursor.offsetWidth; cursor.style.transition = 'transform 140ms ease-out'; }
    ripple(e.clientX, e.clientY);
  }, opts);
  let typingIn = null;
  window.addEventListener('focusin', (e) => {
    const t = e.target;
    typingIn = t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) ? t : null;
    frame(typingIn);
  }, opts);
  window.addEventListener('focusout', () => { typingIn = null; frame(null); }, opts);
  window.addEventListener('scroll', () => { if (typingIn) frame(typingIn); }, opts);
  document.addEventListener('DOMContentLoaded', ensure);
})();
