// Browser-Durchlauf Klassenrunde „Waage“: Beamer + 4 Handys.
// Geprüft: Einstellungen (nur Klassenrunde), Schieberegler und +/−, genaue und ungenaue Mahlzeiten, Punkte am Beamer,
// Lösung erst nach der Runde, „Runde beenden“, Endstand ohne Finale, verdeckte Werte, automatische Abgabe bei Zeitende.
// Start:  node tests/e2e-waage.mjs      (startet den lokalen Server selbst; Bildschirmfotos in tests/ergebnisse/)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEBENSMITTEL } from '../public/js/inhalte.js';
import { waageWerte, waageAbweichung, waagePunkte, PUNKTE } from '../public/js/regeln.js';

const PW = process.env.PLAYWRIGHT || 'playwright';
const pw = await import(PW);
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tests', 'ergebnisse');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8793, BASE = process.argv[2] || `http://127.0.0.1:${PORT}`;
let srv = null;
if (!process.argv[2]) {
  srv = spawn(process.execPath, [path.join(ROOT, 'server', 'local.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
  await new Promise(r => srv.stdout.once('data', r));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const audioZaehler = () => {
  window.__audio = 0;
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return;
  const Z = function (...a) { window.__audio++; return new A(...a); };
  Z.prototype = A.prototype;
  window.AudioContext = window.webkitAudioContext = Z;
};
const log = (...a) => console.log(new Date().toISOString().slice(14, 23), ...a);
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png') });
const idx = id => LEBENSMITTEL.findIndex(l => l.id === id);
const errors = [];
const browser = await chromium.launch();
let ok = false;

// ---------------------------------------------------------------- „Spielen“ wie SuS
async function rundeOffen(p, r) {
  await p.waitForFunction(r => {
    const t = document.querySelector('#sRunde');
    return t && t.textContent.startsWith('Runde ' + r + ' ') && document.querySelector('.wregel input:not([disabled])');
  }, r, { timeout: 40000 });
}
// Zielwerte und Lebensmittel vom Handy-Bildschirm lesen
async function info(p) {
  const i = await p.evaluate(() => ({
    ziel: [...document.querySelectorAll('.waagespiel .wziel .wz b')].map(b => Number(b.textContent.replace(/[^0-9]/g, ''))),
    lm: [...document.querySelectorAll('.wregel .lm')].map(e => e.dataset.lm),
    max: [...document.querySelectorAll('.wregel input')].map(x => Number(x.max)),
    schritt: [...document.querySelectorAll('.wregel input')].map(x => Number(x.step)),
    werte: document.querySelectorAll('.wregel .wwerte').length,
  }));
  const [kcal, fett, kh, eiweiss] = i.ziel;
  return { ...i, ziel: { kcal, fett, kh, eiweiss }, lm: i.lm.map(idx) };
}
// Beste Grammzahlen auf dem Raster (rechnet wie jemand, der alle Werte kennt)
function loesung(w) {
  let best = null, bd = Infinity;
  const rec = (k, g) => {
    if (k === w.lm.length) { const d = waageAbweichung(w.ziel, waageWerte(w.lm, g)); if (d < bd) { bd = d; best = g.slice(); } return; }
    for (let x = 0; x <= w.max[k]; x += w.schritt[k]) { g.push(x); rec(k + 1, g); g.pop(); }
  };
  rec(0, []);
  return best;
}
// Schieberegler wie mit dem Finger ziehen
async function regler(p, k, g) {
  await p.evaluate(([k, g]) => {
    const i = document.querySelectorAll('.wregel input')[k];
    i.value = String(g); i.dispatchEvent(new Event('input', { bubbles: true }));
  }, [k, g]);
}
// Mit + und − antippen
async function tippen(p, k, schritte) {
  const sel = `.wregel[data-k="${k}"] .wbtn[data-d="${schritte > 0 ? 1 : -1}"]`;
  for (let s = 0; s < Math.abs(schritte); s++) await p.click(sel);
}
const gramm = p => p.$$eval('.wregel .wg', els => els.map(e => Number(e.textContent.replace(/[^0-9]/g, ''))));
const fertig = p => p.click('#btnAb');
// Punkte, die der Beamer in der Auflösung zeigt: { Name: Punkte }
async function beamerPunkte(T, timeout = 20000) {
  await T.waitForSelector('.wauflgrid .wpunkte .wp', { timeout });
  return T.$$eval('.wpunkte .wp:not(.mehr)', els => Object.fromEntries(els.map(e => [e.lastChild.textContent.trim(), Number(e.querySelector('b').textContent)])));
}

try {
  const T = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  T.on('pageerror', e => errors.push('Beamer: ' + e.message));
  T.on('dialog', d => d.accept());
  await T.goto(BASE + '/lehrer');
  await T.waitForSelector('#qr');
  const code = (await T.textContent('#codeChip')).replace('Code ', '').trim();
  const names = [['Lena', 'K'], ['Tom', 'B'], ['Aylin', 'S'], ['Max', 'M']];
  const phones = [];
  for (const [first, ini] of names) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await ctx.addInitScript(audioZaehler);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(first + ': ' + e.message));
    await p.goto(`${BASE}/mitspielen?c=${code}`);
    await p.fill('#fFirst', first); await p.fill('#fInit', ini);
    await p.click('button[type=submit]');
    await p.waitForSelector('.waitdots');
    phones.push({ p, ctx, name: first });
  }
  const [lena, tom, aylin, max] = phones;
  await T.waitForFunction(() => document.querySelectorAll('.name').length === 4);

  // ---------------- Einstellungen: Waage, 3 Lebensmittel, offen, 5 Runden
  await T.click('.seg[aria-label="Spielart"] button:has-text("Waage")');
  await T.click('.seg[aria-label="Lebensmittel pro Mahlzeit"] button:has-text("3")');
  await T.click('.seg[aria-label="Schwierigkeit"] button:has-text("Einfach")');
  await T.click('.seg[aria-label="Zeitlimit"] button:has-text("Mit Zeitlimit")');
  await T.click('.seg[aria-label="Runden der Klassenrunde"] button:has-text("5 Runden")');
  await T.waitForFunction(() => document.querySelector('#btnStart').disabled);
  if (await T.$('.seg[aria-label="Nährwert"]')) throw new Error('Waage braucht keine Nährwert-Auswahl');
  await T.keyboard.press('Enter'); // Qualifying geht mit Waage nicht
  await T.waitForSelector('#toast:not([hidden])');
  if (!(await T.textContent('#toast')).includes('nur als Klassenrunde')) throw new Error('Hinweis „nur als Klassenrunde“ fehlt');
  await lena.p.waitForFunction(() => document.body.textContent.includes('Waage:'));
  await shot(T, '80-beamer-lobby-waage');
  await shot(lena.p, '81-handy-lobby-waage');
  log('Einstellungen Waage ✓ (Qualifying gesperrt)');

  await T.keyboard.press('k');
  await T.waitForSelector('.intro');
  await shot(T, '82-beamer-waage-intro');

  // ---------------- Runde 1: genau, mit +/− fast genau, zu viel, zu wenig
  await rundeOffen(lena.p, 1);
  const w = await info(lena.p);
  if (w.lm.length !== 3 || w.werte !== 3) throw new Error('3 Lebensmittel mit sichtbaren Werten erwartet');
  await T.waitForSelector('.waagebuehne .wziel.gross');
  const beamerZiel = await T.$$eval('.waagebuehne .wziel.gross .wz b', els => els.map(b => Number(b.textContent.replace(/[^0-9]/g, ''))));
  if (beamerZiel.join() !== Object.values(w.ziel).join()) throw new Error('Beamer und Handy zeigen andere Zielwerte');
  const L = loesung(w);
  log('Runde 1:', w.lm.map(i => LEBENSMITTEL[i].name).join(' + '), '| Ziel', JSON.stringify(w.ziel), '| Lösung', L.join('/'), 'g');
  await shot(T, '83-beamer-waage-runde');
  // Lena: genau (Schieberegler)
  for (let k = 0; k < 3; k++) await regler(lena.p, k, L[k]);
  await shot(lena.p, '84-handy-waage-regler');
  if ((await gramm(lena.p)).join() !== L.join()) throw new Error('Grammzahl wird nicht angezeigt');
  await fertig(lena.p);
  await lena.p.waitForSelector('.rueck.warten');
  if ((await lena.p.$$('.wregel input:not([disabled]), .wregel .wbtn:not([disabled])')).length) throw new Error('Nach der Abgabe müssen die Regler gesperrt sein');
  await shot(lena.p, '84b-handy-waage-abgegeben');
  // Tom: mit + und − tippen, beim ersten Lebensmittel zwei Schritte daneben
  await rundeOffen(tom.p, 1);
  const tomG = L.map((g, k) => k === 0 ? Math.min(w.max[0], g + 2 * w.schritt[0]) : g);
  for (let k = 0; k < 3; k++) await tippen(tom.p, k, tomG[k] / w.schritt[k]);
  await tippen(tom.p, 1, 1); await tippen(tom.p, 1, -1); // einmal zu viel, wieder zurück
  if ((await gramm(tom.p)).join() !== tomG.join()) throw new Error('+/− stimmt nicht: ' + (await gramm(tom.p)).join() + ' statt ' + tomG.join());
  await fertig(tom.p);
  // Aylin: von allem etwa die Hälfte mehr; Max: nur die Hälfte
  await rundeOffen(aylin.p, 1);
  const auf = (g, k, f) => Math.min(w.max[k], Math.round(g * f / w.schritt[k]) * w.schritt[k]);
  for (let k = 0; k < 3; k++) await regler(aylin.p, k, auf(L[k], k, 1.5));
  await fertig(aylin.p);
  await rundeOffen(max.p, 1);
  for (let k = 0; k < 3; k++) await regler(max.p, k, auf(L[k], k, 0.5) || w.schritt[k]);
  await shot(max.p, '85-handy-waage-max');
  await fertig(max.p);
  const P1 = await beamerPunkte(T);
  log('Runde 1 Punkte am Beamer:', JSON.stringify(P1));
  const erwartet = g => waagePunkte(waageAbweichung(w.ziel, waageWerte(w.lm, g)));
  if (P1['Lena K.'] !== PUNKTE.waageMax) throw new Error('Lena hat genau getroffen: ' + P1['Lena K.']);
  if (!(P1['Tom B.'] <= PUNKTE.waageMax && P1['Tom B.'] >= P1['Aylin S.'] && P1['Aylin S.'] < PUNKTE.waageMax)) throw new Error('Punkte-Reihenfolge stimmt nicht');
  if (Math.abs(P1['Aylin S.'] - erwartet(w.lm.map((_, k) => auf(L[k], k, 1.5)))) > 1) throw new Error('Aylins Punkte passen nicht zur Rechnung');
  const lsg = await T.$$eval('.wtzeile b.loesung', els => els.map(e => Number(e.textContent.replace(/[^0-9]/g, ''))));
  const exakt = waageWerte(w.lm, lsg);
  if (waagePunkte(waageAbweichung(w.ziel, exakt)) !== PUNKTE.waageMax) throw new Error('Gezeigte Lösung trifft das Ziel nicht');
  await T.waitForSelector('.wtzeile .wwerte'); // Werte je 100 g in der Auflösung
  await sleep(400);
  await shot(T, '86-beamer-waage-aufloesung');
  await lena.p.waitForSelector('.wvergleich');
  await shot(lena.p, '87-handy-waage-ergebnis-lena');
  await aylin.p.waitForSelector('.wvergleich');
  await shot(aylin.p, '88-handy-waage-ergebnis-aylin');
  const aylinText = await aylin.p.textContent('#spiel');
  if (!/Deine Mahlzeit trifft die Zielwerte zu \d+ %/.test(aylinText)) throw new Error('Genauigkeit fehlt auf dem Handy');
  log('Runde 1: genau 10, +/− fast genau, Lösung und Punkte am Beamer ✓');

  // ---------------- Runde 2: einer gibt nicht ab → Lehrkraft beendet die Runde
  await rundeOffen(lena.p, 2);
  const w2 = await info(lena.p);
  if (w2.lm.join() === w.lm.join()) throw new Error('Runde 2 sollte andere Lebensmittel haben');
  const L2 = loesung(w2);
  for (const ph of [lena, tom, aylin]) {
    await rundeOffen(ph.p, 2);
    for (let k = 0; k < 3; k++) await regler(ph.p, k, L2[k]);
    await fertig(ph.p);
  }
  await rundeOffen(max.p, 2);
  await regler(max.p, 0, w2.schritt[0] * 3); // stellt etwas ein, gibt aber nicht ab
  await T.waitForFunction(() => document.querySelector('#kZaehler b') && document.querySelector('#kZaehler b').textContent === '3');
  await T.click('#kStop');
  const P2 = await beamerPunkte(T);
  if (P2['Max M.'] !== undefined || P2['Lena K.'] !== PUNKTE.waageMax) throw new Error('Runde 2 Punkte: ' + JSON.stringify(P2));
  await max.p.waitForFunction(() => document.body.textContent.includes('nichts abgegeben'));
  log('Runde 2: Runde beenden, ohne Abgabe keine Punkte ✓');

  // ---------------- Klassenrunde beenden: Endstand, kein Finale
  await T.click('#kEnde');
  await T.waitForSelector('.podium .winner', { timeout: 30000 });
  if (await T.$('#btnZumFinale')) throw new Error('Nach der Waage gibt es kein Finale');
  await T.keyboard.press('Enter');
  await sleep(600);
  if (!(await T.$('.podium .winner'))) throw new Error('Enter darf nach der Waage nicht zum Finale führen');
  const stand = await T.$$eval('.kliste li', els => els.map(e => e.querySelector('.nm').textContent + ' ' + e.querySelector('b').textContent));
  log('Endstand:', stand.join(' | '));
  if (!stand[0].startsWith('Lena K.')) throw new Error('Lena sollte vorn liegen');
  await shot(T, '89-beamer-waage-endstand');
  await lena.p.waitForFunction(() => document.body.textContent.includes('Klassenrunde vorbei'));

  // ---------------- Neue Klassenrunde: 1 Lebensmittel, verdeckt, Zeit läuft ab
  await T.keyboard.press('Escape');
  await T.waitForSelector('#btnKlasse');
  await T.click('.seg[aria-label="Lebensmittel pro Mahlzeit"] button:has-text("1")');
  await T.click('.seg[aria-label="Schwierigkeit"] button:has-text("Schwer")');
  await sleep(300);
  await T.keyboard.press('k');
  await rundeOffen(tom.p, 1);
  const w3 = await info(tom.p);
  if (w3.lm.length !== 1 || w3.werte !== 0) throw new Error('1 Lebensmittel mit verdeckten Werten erwartet');
  if (await T.$('.waagebuehne .wwerte')) throw new Error('Beamer darf verdeckte Werte nicht zeigen');
  await shot(T, '90-beamer-waage-verdeckt');
  await shot(tom.p, '91-handy-waage-verdeckt');
  const L3 = loesung(w3);
  await regler(lena.p, 0, L3[0]); await fertig(lena.p);
  await regler(tom.p, 0, L3[0]);                       // Tom stellt richtig ein, vergisst aber „Fertig“
  // Aylin und Max tun nichts → bei Zeitende wird abgegeben, was eingestellt ist (0 g)
  log('Warte auf das Zeitende (1 Minute) …');
  const P3 = await beamerPunkte(T, 90000);
  log('Zeit um, Punkte:', JSON.stringify(P3));
  if (P3['Tom B.'] !== PUNKTE.waageMax) throw new Error('Toms eingestellte Grammzahl hätte automatisch zählen müssen');
  if (P3['Aylin S.'] !== 0 || P3['Max M.'] !== 0) throw new Error('Leerer Teller = 0 Punkte');
  await tom.p.waitForFunction(() => document.body.textContent.includes('Die Zeit war um'));
  await shot(tom.p, '92-handy-waage-zeit-um');
  log('Verdeckt, 1 Lebensmittel, automatische Abgabe bei Zeitende ✓');
  await T.click('#kEnde');
  await T.waitForSelector('.podium .winner', { timeout: 30000 });

  // ---------------- Handys stumm
  for (const ph of phones) {
    const n = await ph.p.evaluate(() => window.__audio);
    if (n) throw new Error(ph.name + ': Handy hat Ton erzeugt');
  }
  log('Handys stumm ✓');
  if (errors.length) throw new Error('Fehler im Browser:\n' + errors.join('\n'));
  ok = true;
  log('ALLES OK');
} catch (e) {
  console.error(e);
  if (errors.length) console.error(errors.join('\n'));
} finally {
  await browser.close();
  if (srv) srv.kill();
  process.exit(ok ? 0 : 1);
}
