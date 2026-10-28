import { t } from './i18n.js';
// Close-up view for clue pictures, so small markings (like the milk tag on the thermometer) can be read.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Wraps a clue picture in a button that opens the close-up.
export const zoomable = (art, title) =>
  `<button type="button" class="zoomable" data-title="${esc(title)}" aria-label="${esc(t('zoom.in', { title }))}">${art}<span class="zoomHint" aria-hidden="true">${esc(t('zoom.tap'))}</span></button>`;

let opener = null;
function close(view) { view.remove(); document.removeEventListener('keydown', view._esc, true); if (opener && opener.isConnected) opener.focus({ preventScroll: true }); opener = null; }

function open(btn) {
  const art = btn.querySelector('svg'); if (!art) return;
  opener = btn;
  const view = document.createElement('div');
  view.className = 'zoomView'; view.setAttribute('role', 'dialog'); view.setAttribute('aria-modal', 'true'); view.setAttribute('aria-label', t('zoom.close', { title: btn.dataset.title }));
  view.innerHTML = `<div class="zoomIn"><div class="zoomTop"><h2>${esc(btn.dataset.title)}</h2><button type="button" class="btn alt" id="zoomClose">${esc(t('close'))}</button></div><div class="zoomArt">${art.outerHTML}</div></div>`;
  view._esc = e => {
    if (e.key === 'Escape') { e.stopImmediatePropagation(); close(view); }
    else if (e.key === 'Tab') { e.preventDefault(); view.querySelector('#zoomClose').focus(); } // the close button is the only control
    else if (e.key.toLowerCase() === 'h' || e.key === ' ' || e.key === 'Enter') { if (!e.target.closest('#zoomClose')) e.stopImmediatePropagation(); }
  };
  document.addEventListener('keydown', view._esc, true);
  view.addEventListener('click', e => { if (e.target === view || e.target.closest('#zoomClose') || e.target.closest('.zoomArt')) close(view); });
  document.body.appendChild(view);
  view.querySelector('#zoomClose').focus({ preventScroll: true });
}

// One listener for the whole page, so clue pictures drawn later work too.
if (typeof document !== 'undefined') document.addEventListener('click', e => { const b = e.target.closest('.zoomable'); if (b) open(b); });
