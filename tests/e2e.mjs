// Browser-Durchlauf: Beamer + 5 Handys durch beide Spielarten (Qualifying und Finale), dazu die Übungsseite.
// Start:  node tests/e2e.mjs      (startet den lokalen Server selbst; Bildschirmfotos in tests/ergebnisse/)
// Die Handys „spielen“ wie SuS: Sie lesen die Karten vom Bildschirm und tippen richtig oder absichtlich falsch.
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
const PORT = 8790, BASE = process.argv[2] || `http://127.0.0.1:${PORT}`;
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
  const tctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const T = await tctx.newPage();
  T.on('pageerror', e => errors.push('Beamer: ' + e.message));
  T.on('dialog', d => d.accept());
  await T.goto(BASE + '/lehrer');
  await T.waitForSelector('#qr');
  const code = (await T.textContent('#codeChip')).replace('Code ', '').trim();
  log('Code', code);

  const names = [['Lena', 'K'], ['Tom', 'B'], ['Aylin', 'S'], ['Max', 'M'], ['Sara', 'P']];
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
    phones.push({ p, name: first });
  }
  const [lena, tom, aylin, max, sara] = phones;
  await T.waitForFunction(() => document.querySelectorAll('.name').length === 5);
  await shot(T, '01-beamer-lobby');
  await shot(lena.p, '02-handy-warten');

  // ================================================================ REIHE
  await T.click('.seg[aria-label="Spielart"] button:has-text("Reihe")');
  await T.click('.seg[aria-label="Nährwert"] button:has-text("Fett")');
  await T.click('.seg[aria-label="Dauer des Qualifyings"] button:has-text("2 Minuten")');
  await T.click('.seg[aria-label="Größe des Finales"] button:has-text("4 Personen")');
  await sleep(300);
  if (!(await lena.p.textContent('.card')).includes('Fett')) throw new Error('Handy kennt die Spielart nicht');
  await T.keyboard.press('Enter');
  log('Qualifying Reihe (Fett) gestartet');
  // Plan je Handy: je Versuch so viele richtig, dann ein Fehler. Danach tippt das Handy nichts mehr.
  const planReihe = new Map([[lena, [3, 1]], [tom, [5]], [aylin, [2, 2]], [max, [1]], [sara, [0, 4]]]);
  let erstes = true;
  await Promise.all(phones.map(async ph => {
    for (const ziel of planReihe.get(ph)) {
      for (let k = 0; k < ziel; k++) {
        const z = await reiheZug(ph.p, true);
        if (erstes && ph === lena) { erstes = false; await shot(ph.p, '03-handy-reihe-einordnen'); }
        if (k === 0 && ph === tom) log('Tom ordnet', z.neu, 'ein');
      }
      if (ph === lena && ziel === 3) {
        // Lücke antippen und Bild zeigen, bevor es abgegeben wird
        await ph.p.waitForSelector('.einordnen #btnEin');
        await ph.p.click('.einordnen .luecke[data-g="0"]');
        await shot(ph.p, '04-handy-reihe-luecke-gewaehlt');
      }
      await reiheZug(ph.p, false);
      await ph.p.waitForSelector('.aufl');
      if (ph === lena && ziel === 3) await shot(ph.p, '05-handy-reihe-fehler');
      await neuerVersuch(ph.p);
    }
  }));
  await sleep(800);
  await shot(T, '06-beamer-quali-reihe');
  let rang = await T.$$eval('.rk .nm', els => els.map(e => e.textContent));
  log('Rangliste', rang.join(', '));
  if (rang.slice(0, 5).join(',') !== 'Tom B.,Sara P.,Lena K.,Aylin S.,Max M.') throw new Error('Rangliste Reihe falsch');
  // Vorzeitig beenden: zweimal Enter
  await T.keyboard.press('Enter'); await sleep(300); await T.keyboard.press('Enter');
  await T.waitForSelector('#slots select');
  await sleep(500);
  await shot(T, '07-beamer-finale-auswahl');
  await shot(tom.p, '08-handy-im-finale');
  const gewaehlt = await T.$$eval('#slots select', els => els.map(e => e.selectedOptions[0].textContent));
  log('Finalisten', gewaehlt.join(' | '));

  // ---------------- Finale Reihe (K.-o.)
  await T.keyboard.press('Enter');
  const fin = [tom, sara, lena, aylin];
  // Runde 1: alle falsch → alle bleiben
  await Promise.all(fin.map(ph => reiheZug(ph.p, false)));
  await T.waitForSelector('.aufltitel');
  const t1 = await T.textContent('.aufltitel');
  log('Runde 1:', t1);
  if (!t1.includes('alle bleiben')) throw new Error('Runde 1: alle sollten bleiben');
  await shot(T, '10-beamer-reihe-aufloesung-alle-falsch');
  await shot(lena.p, '11-handy-reihe-zwischenstand');
  // Pause während der Auflösung (Leertaste), dann weiter
  await T.keyboard.press(' ');
  await lena.p.waitForFunction(() => document.body.textContent.includes('Pause'), null, { timeout: 5000 });
  await sleep(10000);
  if (await lena.p.$('.einordnen')) throw new Error('Pause: Runde hat trotzdem begonnen');
  await T.keyboard.press(' ');
  log('Pause und Weiter ✓');
  // Runde 2: Tom und Sara richtig, Lena und Aylin falsch
  await tom.p.waitForSelector('.einordnen #btnEin', { timeout: 15000 });
  await sleep(500);
  await shot(T, '09-beamer-reihe-runde');
  await Promise.all([reiheZug(tom.p, true), reiheZug(sara.p, true), reiheZug(lena.p, false), reiheZug(aylin.p, false)]);
  await T.waitForFunction(() => (document.querySelector('.aufltitel') || {}).textContent?.startsWith('Raus'), null, { timeout: 10000 });
  log('Runde 2:', await T.textContent('.aufltitel'));
  await shot(T, '12-beamer-reihe-aufloesung-raus');
  await aylin.p.waitForSelector('.placebox');
  await shot(aylin.p, '13-handy-ausgeschieden');
  // Runde 3: Tom richtig, Sara falsch → Tom gewinnt
  await Promise.all([reiheZug(tom.p, true), reiheZug(sara.p, false)]);
  await T.waitForSelector('.winner', { timeout: 20000 });
  await sleep(600);
  await shot(T, '14-beamer-reihe-sieg');
  await shot(tom.p, '15-handy-sieg');
  const places = await T.$$eval('.places li', els => els.map(e => e.textContent.trim()));
  log('Plätze', places.join(' | '));
  if (!places[0].startsWith('1. Tom') || !places[1].startsWith('2. Sara')) throw new Error('Plätze Reihe falsch');
  // Revanche startet, dann abbrechen und neues Spiel
  await T.keyboard.press('Enter');
  await T.waitForSelector('#btnAbort');
  await tom.p.waitForSelector('.einordnen', { timeout: 15000 });
  await T.click('#btnAbort');
  await T.waitForSelector('#slots select');
  await T.keyboard.press('Escape');
  await T.waitForSelector('#qr');
  log('Revanche, Abbruch und Neues Spiel ✓');

  // ================================================================ BEDARF
  await T.click('.seg[aria-label="Spielart"] button:has-text("Bedarf")');
  await T.click('.seg[aria-label="Nährwert"] button:has-text("Gemischt")');
  await T.click('.seg[aria-label="Größe des Finales"] button:has-text("3 Personen")');
  await T.click('.seg[aria-label="Bedarfskarten zum Sieg"] button:has-text("3 Karten")');
  await T.click('.seg[aria-label="Zeitlimit"] button:has-text("Ohne Zeitlimit")');
  await sleep(300);
  await shot(T, '20-beamer-lobby-bedarf');
  await T.keyboard.press('Enter');
  log('Qualifying Bedarf (gemischt, 2 Minuten) gestartet');
  const planBedarf = new Map([[lena, [2]], [tom, [1, 0]], [aylin, [3]], [max, [0]], [sara, [0, 0]]]);
  let gezeigt = false;
  await Promise.all(phones.map(async ph => {
    for (const ziel of planBedarf.get(ph)) {
      for (let k = 0; k < ziel; k++) {
        if (ph === aylin && !gezeigt) {
          await bedarfZug(ph.p, 'best', false);
          await shot(ph.p, '21-handy-bedarf-auswahl');
          await ph.p.click('#btnAb');
          gezeigt = true;
        } else await bedarfZug(ph.p, 'best');
        await ph.p.waitForSelector('.auswertung');
        if (ph === aylin && k === 0) await shot(ph.p, '22-handy-bedarf-geschafft');
        if (!(await ph.p.textContent('.auswertung h2')).match(/Geschafft|Volltreffer/)) throw new Error(ph.name + ': beste Kombination nicht geschafft');
        await neuerVersuch(ph.p);
      }
      const z = await bedarfZug(ph.p, 'viel');
      await ph.p.waitForSelector('.auswertung');
      if (ph === lena) await shot(ph.p, '23-handy-bedarf-' + (z.e.drueber ? 'zu-viel' : 'zu-wenig'));
      await neuerVersuch(ph.p);
    }
  }));
  await sleep(800);
  await shot(T, '24-beamer-quali-bedarf');
  rang = await T.$$eval('.rk .nm', els => els.map(e => e.textContent));
  log('Rangliste', rang.join(', '));
  if (rang.slice(0, 3).join(',') !== 'Aylin S.,Lena K.,Tom B.') throw new Error('Rangliste Bedarf falsch');
  // Diesmal läuft die Zeit ab (2 Minuten)
  log('Warte, bis die 2 Minuten um sind …');
  await lena.p.waitForFunction(() => document.body.textContent.includes('Zeit um!'), null, { timeout: 150000 });
  await T.waitForFunction(() => (document.querySelector('#qTimer') || {}).textContent === 'Endstand', null, { timeout: 15000 });
  await lena.p.waitForSelector('.placebox', { timeout: 10000 });
  await shot(lena.p, '25-handy-zeit-um');
  await shot(T, '26-beamer-quali-endstand');
  log('Zeit abgelaufen, Endstand ✓');
  await T.keyboard.press('Enter');
  await T.waitForSelector('#slots select');
  await sleep(500);
  await T.keyboard.press('Enter');

  // ---------------- Finale Bedarf (Karten sammeln, ohne Zeitlimit)
  const fb = [aylin, lena, tom];
  const stand = () => T.$$eval('.fcard .kartenzahl b', els => els.map(e => Number(e.textContent)));
  // Runde 1: Aylin beste, Lena und Tom zu viel
  await aylin.p.waitForSelector('.auswahl', { timeout: 20000 });
  await sleep(500);
  await shot(T, '27-beamer-bedarf-runde');
  await Promise.all([bedarfZug(aylin.p, 'best'), bedarfZug(lena.p, 'viel'), bedarfZug(tom.p, 'viel')]);
  await T.waitForSelector('.abgaben');
  await sleep(500);
  await shot(T, '28-beamer-bedarf-aufloesung');
  await shot(aylin.p, '29-handy-bedarf-karte-gewonnen');
  let s = await stand();
  log('Stand nach Runde 1:', s.join(' '));
  if (s.join() !== '1,0,0') throw new Error('Stand Runde 1 falsch');
  // Runde 2: Aylin und Lena beste (Gleichstand → beide), Tom gibt nicht ab → Lehrkraft beendet die Runde
  await aylin.p.waitForSelector('.auswahl', { timeout: 30000 });
  await Promise.all([bedarfZug(aylin.p, 'best'), bedarfZug(lena.p, 'best')]);
  await sleep(500);
  await shot(T, '30-beamer-bedarf-wartet');
  await T.click('#btnStop');
  await T.waitForFunction(() => document.querySelectorAll('.abgabe-spalte.sieg').length === 2, null, { timeout: 10000 });
  s = await stand();
  log('Stand nach Runde 2:', s.join(' '));
  if (s.join() !== '2,1,0') throw new Error('Stand Runde 2 falsch');
  // Runde 3: Aylin beste → 3 Karten → Sieg
  await aylin.p.waitForSelector('.auswahl', { timeout: 30000 });
  await Promise.all([bedarfZug(aylin.p, 'best'), bedarfZug(lena.p, 'viel'), bedarfZug(tom.p, 'viel')]);
  await T.waitForSelector('.winner', { timeout: 20000 });
  await sleep(600);
  await shot(T, '31-beamer-bedarf-sieg');
  await shot(lena.p, '32-handy-bedarf-platz2');
  await shot(max.p, '33-handy-zuschauer');
  const places2 = await T.$$eval('.places li', els => els.map(e => e.textContent.trim()));
  log('Plätze', places2.join(' | '));
  if (!places2[0].startsWith('1. Aylin') || !places2[1].startsWith('2. Lena')) throw new Error('Plätze Bedarf falsch');

  // ================================================================ Übungsseite
  const uctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await uctx.addInitScript(audioZaehler);
  const U = await uctx.newPage();
  U.on('pageerror', e => errors.push('Üben: ' + e.message));
  await U.goto(BASE + '/');
  await shot(U, '40-ueben-menue');
  await U.click('.seg[data-name="nw"] button[data-v="eiweiss"]');
  await U.click('.seg[data-name="stufe"] button[data-v="verdeckt"]');
  await U.click('#btnGo');
  for (let k = 0; k < 3; k++) await reiheZug(U, true);
  await shot(U, '41-ueben-reihe-schwer');
  await reiheZug(U, false);
  await U.waitForSelector('.aufl');
  await shot(U, '42-ueben-reihe-aufloesung');
  await U.click('#btnEnde');
  if (!(await U.textContent('#panel')).includes('3 Karten richtig')) throw new Error('Rekord nicht gespeichert');
  await U.click('.seg[data-name="art"] button[data-v="bedarf"]');
  await U.click('#btnGo');
  await bedarfZug(U, 'viel');
  await U.waitForSelector('.auswertung');
  await shot(U, '43-ueben-bedarf-auswertung');
  await U.click('#btnEnde');
  await U.click('#btnLex');
  await shot(U, '44-ueben-alle-karten');

  for (const ph of phones) if (await ph.p.evaluate(() => window.__audio)) throw new Error(ph.name + ': Handy hat Ton gestartet');
  if (await U.evaluate(() => window.__audio)) throw new Error('Übungsseite hat Ton gestartet');
  log('Handys und Übungsseite stumm ✓');
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
