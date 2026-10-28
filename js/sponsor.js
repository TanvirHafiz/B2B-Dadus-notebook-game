// The sponsor's small logo in the header corner, and the title-screen banner of the sponsor's three chocolate boxes. Quiet on purpose.
import { t } from './i18n.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const LOGO = 'assets/sponsor-logo.webp';
// A small, soft logo with no visible words. Screen readers still hear who it is.
export const sponsorHTML = () => `<div class="sponsor" role="img" aria-label="${esc(t('sponsor.label'))}"><img src="${LOGO}" width="64" height="64" alt="" decoding="async"></div>`;

// The title-screen banner. Each box starts dim and comes into colour when the chapter that makes it is finished.
// A chapter's entry in chapters/index.json names its box with "photo" (a file in assets/products/). Decorative, so it is hidden from screen readers.
export const heroHTML = (index, isDone) => {
  const boxes = index.filter(c => c.photo);
  return boxes.length ? `<div class="hero" aria-hidden="true">${boxes.map(c => `<img class="${isDone(c.id) ? 'done' : ''}" src="assets/products/${c.photo}.webp" width="480" height="853" alt="" decoding="async">`).join('')}</div>` : '';
};
