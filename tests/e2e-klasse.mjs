// Browser-Durchlauf Klassenrunde: Beamer + 6 Handys, Reihe (Mehrheit, Zweifeln, Pause, Handy weg) und Bedarf.
// Start:  node tests/e2e-klasse.mjs      (startet den lokalen Server selbst; Bildschirmfotos in tests/ergebnisse/)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEBENSMITTEL, BEDARFSKARTEN } from '../public/js/inhalte.js';
import { NW, besteKombi, bewerte, zehntel, passtLuecke } from '../public/js/regeln.js';

const PW = process.env.PLAYWRIGHT || 'playwright';
const pw = await import(PW);
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tests', 'ergebnisse');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8791, BASE = process.argv[2] || `http://127.0.0.1:${PORT}`;
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

// Warten, bis auf dem Handy Runde r zum Mitmachen offen ist
async function rundeOffen(p, r, art) {
  await p.waitForFunction(([r, sel]) => {
    const t = document.querySelector('#sRunde');
    return t && t.textContent.startsWith('Runde ' + r + ' ') && document.querySelector(sel);
  }, [r, art === 'reihe' ? '.einordnen .luecke:not([disabled])' : '.auswahl .hk:not([disabled])'], { timeout: 40000 });
}
// Reihe: 'gut' = passende Lücke, 'schlecht' = falsche Lücke (bzw. eine bestimmte Lücke), 'zweifel'
async function reiheZug(p, r, was) {
  await rundeOffen(p, r, 'reihe');
  if (was === 'zweifel') { await p.click('#btnZweifel'); await p.click('#btnZweifel'); return; }
  const info = await p.evaluate(() => ({
    neu: document.querySelector('.neukarte .lmgross b').textContent,
    reihe: [...document.querySelectorAll('.einordnen .reihe > .lm')].map(e => e.dataset.lm).reverse(), // unten → oben
    nw: document.querySelector('.rueck.info b').textContent,
  }));
  const nw = Object.keys(NW).find(k => NW[k].name === info.nw);
  const reihe = info.reihe.map(idx), neu = LEBENSMITTEL.findIndex(l => l.name === info.neu);
  const gaps = [...Array(reihe.length + 1).keys()];
  const gut = gaps.filter(g => passtLuecke(reihe, neu, nw, g));
  const gap = typeof was === 'number' ? was : was === 'gut' ? gut[0] : gaps.find(g => !gut.includes(g));
  await p.click(`.einordnen .luecke[data-g="${gap}"]`);
  await p.click('#btnEin');
  return gap;
}
async function bedarfZug(p, r, wahl) {
  await rundeOffen(p, r, 'bedarf');
  const info = await p.evaluate(() => ({
    nw: [...document.querySelector('.bedarfspiel .bk').classList].find(c => c.startsWith('nw-')).slice(3),
    ziel: document.querySelector('.bedarfspiel .bkziel b').textContent,
    name: document.querySelector('.bedarfspiel .bktext b').textContent,
    hand: [...document.querySelectorAll('.hand .hk .lm')].map(e => e.dataset.lm),
  }));
  const hand = info.hand.map(idx), ziel = Number(info.ziel.replace(',', '.'));
  let pick;
  if (wahl === 'best') pick = besteKombi(hand, info.nw, zehntel(ziel)).pick.map(i => hand.indexOf(i));
  else pick = hand.map((i, k) => k).sort((x, y) => LEBENSMITTEL[hand[y]][info.nw] - LEBENSMITTEL[hand[x]][info.nw]).slice(0, 5);
  for (const k of pick) await p.click(`.hand .hk[data-k="${k}"]`);
  await p.click('#btnAb');
}

try {
  const T = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  T.on('pageerror', e => errors.push('Beamer: ' + e.message));
  T.on('dialog', d => d.accept());
  await T.goto(BASE + '/lehrer');
  await T.waitForSelector('#qr');
  const code = (await T.textContent('#codeChip')).replace('Code ', '').trim();
  const names = [['Lena', 'K'], ['Tom', 'B'], ['Aylin', 'S'], ['Max', 'M'], ['Sara', 'P'], ['Jonas', 'W']];
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
  const [lena, tom, aylin, max, sara, jonas] = phones;
  const alle = phones;
  await T.waitForFunction(() => document.querySelectorAll('.name').length === 6);
  await T.click('.seg[aria-label="Spielart"] button:has-text("Reihe")');
  await T.click('.seg[aria-label="Nährwert"] button:has-text("Kalorien")');
  await T.click('.seg[aria-label="Runden der Klassenrunde"] button:has-text("10 Runden")');
  await sleep(300);
  await shot(T, '50-beamer-lobby-klassenrunde');
  await T.keyboard.press('k');
  log('Klassenrunde Reihe (Kalorien, 10 Runden) gestartet');

  // Runde 1: nur eine Karte liegt → kein Zweifeln. 4 legen dieselbe falsche Lücke, 2 richtig → Mehrheit falsch
  await rundeOffen(lena.p, 1, 'reihe');
  if (await lena.p.$('#btnZweifel')) throw new Error('Runde 1: Zweifeln darf nicht gehen');
  await sleep(300);
  await shot(T, '51-beamer-klasse-runde');
  await shot(lena.p, '52-handy-klasse-einordnen');
  const falsch = await reiheZug(lena.p, 1, 'schlecht');
  await Promise.all([tom, aylin, max].map(ph => reiheZug(ph.p, 1, falsch)));
  await Promise.all([sara, jonas].map(ph => reiheZug(ph.p, 1, 'gut')));
  await T.waitForFunction(() => (document.querySelector('.aufltitel') || {}).textContent === 'Die Mehrheit hat entschieden', null, { timeout: 10000 });
  await sleep(300);
  await shot(T, '53-beamer-klasse-mehrheit');
  await shot(sara.p, '54-handy-klasse-zwischen');
  log('Runde 1: Mehrheit hat falsch gelegt ✓');

  // Runde 2: Sara zweifelt (zu Recht), die anderen legen
  await rundeOffen(sara.p, 2, 'reihe');
  await sara.p.click('#btnZweifel');
  await shot(sara.p, '55-handy-klasse-zweifel-sicher');
  await sara.p.click('#btnZweifel');
  await Promise.all([lena, tom, aylin, max, jonas].map(ph => reiheZug(ph.p, 2, 'gut')));
  await T.waitForFunction(() => (document.querySelector('.aufltitel') || {}).textContent.startsWith('Zu Recht gezweifelt'), null, { timeout: 10000 });
  await sleep(500);
  await shot(T, '56-beamer-klasse-aufgedeckt');
  await sara.p.waitForFunction(() => document.body.textContent.includes('Zu Recht gezweifelt'), null, { timeout: 5000 });
  await shot(sara.p, '57-handy-klasse-zweifel-richtig');
  let rang = await T.$$eval('#kRang li .nm', els => els.map(e => e.textContent));
  log('Runde 2: zu Recht gezweifelt ✓ – Rangliste:', rang.join(', '));
  if (rang[0] !== 'Sara P.') throw new Error('Sara sollte vorn liegen');

  // Runde 3: neue Reihe, alle richtig
  await Promise.all(alle.map(ph => reiheZug(ph.p, 3, 'gut')));
  // Runde 4: Max zweifelt zu Unrecht
  await Promise.all([reiheZug(max.p, 4, 'zweifel'), ...[lena, tom, aylin, sara, jonas].map(ph => reiheZug(ph.p, 4, 'gut'))]);
  await T.waitForFunction(() => (document.querySelector('.aufltitel') || {}).textContent.startsWith('Die Reihe war richtig'), null, { timeout: 10000 });
  log('Runde 4: zu Unrecht gezweifelt ✓');
  // Pause während der Auflösung, dann weiter
  await T.keyboard.press(' ');
  await lena.p.waitForFunction(() => document.body.textContent.includes('Pause'), null, { timeout: 5000 });
  await sleep(15000);
  if (await lena.p.$('.einordnen')) throw new Error('Pause: Runde hat trotzdem begonnen');
  await T.keyboard.press(' ');
  log('Pause und Weiter ✓');
  // Runde 5: Jonas schließt das Handy → die anderen geben ab, die Runde endet trotzdem sofort
  await rundeOffen(lena.p, 5, 'reihe');
  await jonas.p.close();
  await Promise.all([lena, tom, aylin, max, sara].map(ph => reiheZug(ph.p, 5, 'gut')));
  await T.waitForFunction(() => (document.querySelector('.aufltitel') || {}).textContent === 'Die Mehrheit hat entschieden', null, { timeout: 15000 });
  log('Runde 5: Handy weg hält nicht auf ✓');
  // Jonas kommt zurück (gleicher Browser → wird wiedererkannt)
  jonas.p = await jonas.ctx.newPage();
  jonas.p.on('pageerror', e => errors.push('Jonas: ' + e.message));
  await jonas.p.goto(`${BASE}/mitspielen?c=${code}`);
  // Runden 6–10
  for (let r = 6; r <= 10; r++) {
    await Promise.all(alle.map(ph => reiheZug(ph.p, r, 'gut')));
    log('Runde', r, '✓');
  }
  await T.waitForSelector('.kliste', { timeout: 30000 });
  await sleep(800);
  await shot(T, '58-beamer-klasse-endstand');
  await lena.p.waitForFunction(() => document.body.textContent.includes('Klassenrunde vorbei'), null, { timeout: 10000 });
  await shot(lena.p, '59-handy-klasse-ende');
  rang = await T.$$eval('.kliste .nm', els => els.map(e => e.textContent));
  const punkte = await T.$$eval('.kliste b', els => els.map(e => Number(e.textContent)));
  log('Endstand:', rang.map((n, i) => n + ' ' + punkte[i]).join(', '));
  if (rang.length !== 6) throw new Error('Endstand unvollständig');
  // Weiter zum Finale mit den Besten nach Punkten
  await T.keyboard.press('Enter');
  await T.waitForSelector('#slots select');
  const fin = await T.$$eval('#slots select', els => els.map(e => e.selectedOptions[0].textContent));
  log('Finalisten:', fin.join(' | '));
  if (!fin[0].includes(rang[0])) throw new Error('Finale: Platz 1 der Klassenrunde fehlt');
  await shot(T, '60-beamer-finale-nach-klassenrunde');
  await T.keyboard.press('Escape');
  await T.waitForSelector('#qr');

  // ================================================================ Bedarf
  await T.click('.seg[aria-label="Spielart"] button:has-text("Bedarf")');
  await T.click('.seg[aria-label="Nährwert"] button:has-text("Gemischt")');
  await sleep(300);
  await T.click('#btnKlasse');
  log('Klassenrunde Bedarf gestartet');
  await rundeOffen(lena.p, 1, 'bedarf');
  await sleep(300);
  await shot(T, '61-beamer-klasse-bedarf-runde');
  const plan = [['best', 'best'], ['best', 'viel'], ['viel', 'best'], ['viel', 'viel'], ['best', 'best'], ['best', 'viel']];
  for (let r = 1; r <= 2; r++) {
    await Promise.all(alle.map((ph, i) => bedarfZug(ph.p, r, plan[i][r - 1])));
    await T.waitForSelector('.verteilung', { timeout: 10000 });
    if (r === 1) {
      await sleep(400);
      await shot(T, '62-beamer-klasse-bedarf-aufloesung');
      await tom.p.waitForSelector('.auswertung', { timeout: 5000 });
      await shot(tom.p, '63-handy-klasse-bedarf-ergebnis');
    }
  }
  // Lehrkraft beendet vorzeitig
  await rundeOffen(lena.p, 3, 'bedarf');
  await T.click('#kEnde');
  await T.waitForSelector('.kliste', { timeout: 15000 });
  const rb = await T.$$eval('.kliste li', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  log('Endstand Bedarf:', rb.join(' | '));
  if (!/Lena|Sara/.test(rb[0])) throw new Error('Bedarf: Lena oder Sara sollte vorn liegen');
  await shot(T, '64-beamer-klasse-bedarf-endstand');

  for (const ph of phones) if (await ph.p.evaluate(() => window.__audio)) throw new Error(ph.name + ': Handy hat Ton gestartet');
  log('Handys stumm ✓');
  if (errors.length) throw new Error('JavaScript-Fehler:\n' + errors.join('\n'));
  ok = true;
  log('ALLES OK');
} catch (e) {
  console.error('FEHLER:', e.message);
  if (errors.length) console.error(errors.join('\n'));
} finally {
  await browser.close();
  if (srv) srv.kill();
  process.exit(ok ? 0 : 1);
}
