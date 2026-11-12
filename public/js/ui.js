// Gemeinsame Anzeige-Bausteine für Handy und Übungsseite
const $ = s => document.querySelector(s);

export function spielfeldZeigen(on) {
  document.body.classList.toggle('spielt', !!on);
  $('#spielfeld').hidden = !on;
  $('#panel').hidden = !!on;
}

export function status(links, rechts, art) {
  $('#sRunde').innerHTML = links;
  const t = $('#sText');
  t.textContent = rechts;
  t.className = 'hinweis ' + (art || '');
}

// Zeitbalken nur zeigen, wenn es ein Zeitlimit gibt
export function zeitbalkenZeigen(on) { $('#sBarBox').hidden = !on; }
export function zeitbalken(rest, gesamt) {
  const box = $('#sBarBox'), bar = $('#sBar');
  if (rest == null) { bar.style.transform = 'scaleX(0)'; box.classList.remove('knapp'); return; }
  const f = Math.max(0, Math.min(1, rest / gesamt));
  bar.style.transform = `scaleX(${f})`;
  box.classList.toggle('knapp', rest < 10000);
}

export function countdown(num, text) {
  const el = $('#countdown');
  if (num == null) { el.hidden = true; return; }
  el.hidden = false;
  const b = $('#cdNum');
  if (b.textContent !== String(num)) { b.textContent = num; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; }
  $('#cdText').textContent = text || '';
}

let toastT = 0;
export function toast(t) {
  const el = $('#toast'); if (!el) return;
  el.textContent = t; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 4200);
}

// Bildschirm nicht ausgehen lassen, solange gespielt wird
let lock = null, lockWanted = false;
export async function wachHalten(on) {
  lockWanted = !!on;
  try {
    if (on && !lock && navigator.wakeLock) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!on && lock) { await lock.release(); lock = null; }
  } catch (e) { lock = null; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && lockWanted) wachHalten(true); });
