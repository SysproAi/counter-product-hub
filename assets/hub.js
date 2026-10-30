// Shared helpers for the Counter Product Hub
async function loadProducts() {
  const r = await fetch('data/products.json', { cache: 'no-cache' });
  return r.json();
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function strip(s) { return String(s ?? '').replace(/<[^>]*>/g, ''); }

// Search: every word must match somewhere; code/name matches rank highest.
function score(p, terms) {
  if (!terms.length) return 1;
  const norm = s => strip(s).toLowerCase().replace(/[-\s]/g, '');
  const fields = [
    [p.code, 10], [p.name, 6], [p.brand, 4], [(p.keywords || []).join(' '), 4],
    [p.category, 3], [p.subtitle, 3], [p.tagline, 2],
    [(p.bestFor || []).join(' '), 1], [(p.features || []).join(' '), 1]
  ];
  let total = 0;
  for (const t of terms) {
    const tn = t.replace(/[-\s]/g, '');
    let best = 0;
    for (const [f, w] of fields) {
      const s = strip(f).toLowerCase();
      if (s.includes(t) || norm(f).includes(tn)) best = Math.max(best, w);
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}
function hi(text, terms) {
  let out = esc(strip(text));
  for (const t of terms) {
    if (t.length < 2) continue;
    out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
  }
  return out;
}

// Shown when a product has no photo yet
function noImage() {
  return `<svg class="noimg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-label="No photo yet"><rect x="8" y="14" width="48" height="36" rx="5"/><circle cx="24" cy="28" r="5"/><path d="m8 46 14-12 10 8 8-6 16 12"/></svg>`;
}
