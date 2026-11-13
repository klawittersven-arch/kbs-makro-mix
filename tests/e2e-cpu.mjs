// Browser-Durchlauf Computergegner: Beamer + 1 Handy, Finale gegen die CPU (Reihe und Bedarf).
// Start:  node tests/e2e-cpu.mjs      (startet den lokalen Server selbst; Bildschirmfotos in tests/ergebnisse/)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEBENSMITTEL, BEDARFSKARTEN } from '../public/js/inhalte.js';
import { NW, besteKombi, bewerte, zehntel } from '../public/js/regeln.js';

const PW = process.env.PLAYWRIGHT || 'playwright';
const pw = await import(PW);
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tests', 'ergebnisse');
fs.mkdirSync(OUT, { recursive: true });
// Mit Adresse (z. B. node tests/e2e.mjs http://127.0.0.1:8787 bei laufendem „npx wrangler dev“) wird kein eigener Server gestartet
const PORT = 8794, BASE = process.argv[2] || `http://127.0.0.1:${PORT}`;
let srv = null;
if (!process.argv[2]) {
  srv = spawn(process.execPath, [path.join(ROOT, 'server', 'local.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
  await new Promise(r => srv.stdout.once('data', r));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
// Zählt, ob eine Seite eine Tonausgabe (AudioContext) startet – Handys müssen stumm bleiben
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
const nwVonName = name => Object.keys(NW).find(k => NW[k].name === name);
const errors = [];
const browser = await chromium.launch();
let ok = false;

// ---------------------------------------------------------------- „Spielen“ wie SuS
// Reihe: neue Karte und Reihe vom Bildschirm lesen, richtige Lücke ausrechnen, richtig oder falsch tippen
async function reiheZug(p, richtig) {
  await p.waitForSelector('.einordnen #btnEin', { timeout: 30000 });
  const info = await p.evaluate(() => ({
    neu: document.querySelector('.neukarte .lmgross b').textContent,
    reihe: [...document.querySelectorAll('.einordnen .reihe > .lm')].map(e => e.dataset.lm),
    nw: (document.querySelector('#sText').textContent.match(/Ordne nach: (.*)$/) || [])[1],
  }));
  const nw = nwVonName(info.nw);
  if (!nw) throw new Error('Nährwert nicht erkannt: ' + info.nw);
  const neu = LEBENSMITTEL.find(l => l.name === info.neu);
  const korrekt = info.reihe.filter(id => LEBENSMITTEL[idx(id)][nw] < neu[nw]).length;
  const gap = richtig ? korrekt : (korrekt === 0 ? 1 : korrekt - 1);
  await p.click(`.einordnen .luecke[data-g="${gap}"]`);
  await p.click('#btnEin');
  // erst weiter, wenn die Abgabe angekommen ist (sonst liest die Schleife noch den alten Knopf)
  await p.waitForSelector('.einordnen #btnEin', { state: 'hidden', timeout: 10000 }).catch(() => {});
  return { neu: neu.name, gap, korrekt };
}
// Bedarf: Bedarfskarte und Hand vom Bildschirm lesen; 'best' = beste Kombination, 'viel' = zu viel / nicht geschafft
async function bedarfZug(p, wahl, mitKlick = true) {
  await p.waitForSelector('.auswahl #btnAb', { timeout: 30000 });
  const info = await p.evaluate(() => ({
    nw: [...document.querySelector('.bedarfspiel .bk').classList].find(c => c.startsWith('nw-')).slice(3),
    ziel: document.querySelector('.bedarfspiel .bkziel b').textContent,
    name: document.querySelector('.bedarfspiel .bktext b').textContent,
    hand: [...document.querySelectorAll('.hand .hk .lm')].map(e => e.dataset.lm),
  }));
  const hand = info.hand.map(idx);
  const ziel = Number(info.ziel.replace(',', '.'));
  const b = BEDARFSKARTEN.findIndex(x => info.name.startsWith(x.name) && x.ziel === ziel);
  if (b < 0) throw new Error('Bedarfskarte nicht erkannt: ' + info.name);
  let pick;
  if (wahl === 'best') pick = besteKombi(hand, info.nw, zehntel(ziel)).pick.map(i => hand.indexOf(i));
  else {
    const gross = hand.map((i, k) => k).sort((x, y) => LEBENSMITTEL[hand[y]][info.nw] - LEBENSMITTEL[hand[x]][info.nw]);
    const klein = gross.slice().reverse();
    pick = [gross.slice(0, 5), [klein[0]], gross.slice(0, 2)].find(pk => !bewerte(hand, pk, b).ok) || gross.slice(0, 5);
  }
  for (const k of pick) await p.click(`.hand .hk[data-k="${k}"]`);
  if (mitKlick) await p.click('#btnAb');
  return { b, pick, e: bewerte(hand, pick.slice().sort((x, y) => x - y), b) };
}
async function neuerVersuch(p) {
  await p.waitForSelector('#btnNeu:not([disabled])', { timeout: 10000 });
  await p.click('#btnNeu');
}

try {
  const T = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  T.on('pageerror', e => errors.push('Beamer: ' + e.message));
  T.on('dialog', d => d.accept());
  await T.goto(BASE + '/lehrer');
  await T.waitForSelector('#qr');
  const code = (await T.textContent('#codeChip')).replace('Code ', '').trim();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript(audioZaehler);
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push('Handy: ' + e.message));
  await p.goto(`${BASE}/mitspielen?c=${code}`);
  await p.fill('#fFirst', 'Lena'); await p.fill('#fInit', 'K');
  await p.click('button[type=submit]');
  await p.waitForSelector('.waitdots');

  // ---------------- Reihe: Qualifying allein, dann Finale gegen die CPU
  await T.click('.seg[aria-label="Spielart"] button:has-text("Reihe")');
  await T.click('.seg[aria-label="Nährwert"] button:has-text("Kalorien")');
  await sleep(300);
  await T.keyboard.press('Enter');
  await p.waitForSelector('.einordnen', { timeout: 15000 });
  await reiheZug(p, true);
  await T.keyboard.press('Enter'); await sleep(300); await T.keyboard.press('Enter');
  await T.waitForSelector('#slots select');
  await sleep(400);
  const vor = await T.$$eval('#slots select', els => els.map(e => e.selectedOptions[0].textContent));
  log('Vorauswahl:', vor.join(' | '));
  if (!vor[1].includes('CPU (mittel)')) throw new Error('CPU (mittel) sollte vorausgewählt sein');
  await shot(T, '70-beamer-finale-mit-cpu');
  // Gegner auf „leicht“ stellen
  await T.selectOption('#slots .slot:nth-child(2) select', 'cpu-leicht');
  await T.waitForFunction(() => document.querySelectorAll('#slots select')[1].value === 'cpu-leicht');
  await T.keyboard.press('Enter');
  // Runde 1: Lena wartet, bis die CPU abgegeben hat
  await p.waitForSelector('.einordnen #btnEin', { timeout: 20000 });
  await T.waitForFunction(() => [...document.querySelectorAll('.fcard')].some(c => c.textContent.includes('CPU') && c.textContent.includes('abgegeben')), null, { timeout: 15000 });
  await shot(T, '71-beamer-cpu-hat-abgegeben');
  log('CPU hat nach ihrer Bedenkzeit abgegeben ✓');
  let runden = 0;
  while (!(await T.$('.winner'))) {
    const offen = await p.waitForSelector('.einordnen #btnEin', { timeout: 30000 }).catch(() => null);
    if (await T.$('.winner')) break;
    if (!offen) break;
    await reiheZug(p, true);
    runden++;
    await T.waitForFunction(n => !!document.querySelector('.winner') || !!document.querySelector('.aufltitel'), runden, { timeout: 15000 });
  }
  await T.waitForSelector('.winner', { timeout: 30000 });
  await sleep(500);
  await shot(T, '72-beamer-sieg-gegen-cpu');
  const pl = await T.$$eval('.places li', els => els.map(e => e.textContent.trim()));
  log(`Reihe nach ${runden} Karten:`, pl.join(' | '));
  if (!pl[0].startsWith('1. Lena')) throw new Error('Lena legt immer richtig und sollte gewinnen');

  // ---------------- Bedarf: Finale gegen CPU (schwer)
  await T.keyboard.press('Escape');
  await T.waitForSelector('#qr');
  await T.click('.seg[aria-label="Spielart"] button:has-text("Bedarf")');
  await sleep(300);
  await T.keyboard.press('Enter');
  await p.waitForSelector('.auswahl', { timeout: 15000 });
  await T.keyboard.press('Enter'); await sleep(300); await T.keyboard.press('Enter');
  await T.waitForSelector('#slots select');
  await T.selectOption('#slots .slot:nth-child(2) select', 'cpu-schwer');
  await T.waitForFunction(() => document.querySelectorAll('#slots select')[1].value === 'cpu-schwer');
  await T.click('.seg[aria-label="Bedarfskarten zum Sieg"] button:has-text("3 Karten")');
  await sleep(300);
  await T.keyboard.press('Enter');
  let r = 0;
  while (!(await T.$('.winner')) && r < 12) {
    const offen = await p.waitForSelector('.auswahl #btnAb', { timeout: 40000 }).catch(() => null);
    if (!offen || await T.$('.winner')) break;
    await bedarfZug(p, 'best');
    r++;
    await T.waitForSelector('.abgaben, .winner', { timeout: 15000 });
    if (r === 1) { await sleep(400); await shot(T, '73-beamer-bedarf-gegen-cpu'); }
    const s = await T.$$eval('.fcard .kartenzahl b', els => els.map(e => e.textContent)).catch(() => []);
    log(`Bedarf Runde ${r}: Stand ${s.join(':')}`);
    await sleep(500);
  }
  await T.waitForSelector('.winner', { timeout: 30000 });
  await sleep(500);
  await shot(T, '74-beamer-bedarf-sieg-cpu');
  const pb = await T.$$eval('.places li', els => els.map(e => e.textContent.trim()));
  log('Bedarf:', pb.join(' | '));
  if (!pb[0].startsWith('1. Lena')) throw new Error('Lena wählt immer die beste Kombination und sollte gewinnen');

  if (await p.evaluate(() => window.__audio)) throw new Error('Handy hat Ton gestartet');
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
