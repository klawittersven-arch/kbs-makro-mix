// Lasttest: 30 simulierte Handys (WebSocket, ohne Browser) spielen gleichzeitig.
// Klassenrunde Reihe (10 Runden), Klassenrunde Bedarf (5 Runden), Klassenrunde Waage (3 Runden) und ein Qualifying.
// Unterwegs verlieren 3 Handys die Verbindung und kommen zurück, 2 Handys geben eine Runde lang nichts ab.
// Start:  node tests/last.mjs      (startet den lokalen Server selbst)
//         node tests/last.mjs http://127.0.0.1:8787   (gegen einen laufenden Server, z. B. „npx wrangler dev“)
import { spawn } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { besteKombi, zielZehntel, passtLuecke, REIHE_LAENGE, waageWerte, waageAbweichung } from '../public/js/regeln.js';
import { BEDARFSKARTEN } from '../public/js/inhalte.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8792, BASE = process.argv[2] || `http://127.0.0.1:${PORT}`;
const WS = BASE.replace(/^http/, 'ws');
let srv = null;
if (!process.argv[2]) {
  srv = spawn(process.execPath, [path.join(ROOT, 'server', 'local.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
  await new Promise(r => srv.stdout.once('data', r));
}
const N = 30;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(14, 23), ...a);
const zufall = (a, b) => a + Math.random() * (b - a);
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = [...crypto.randomBytes(5)].map(b => ALPHA[b % ALPHA.length]).join('');
const VORNAMEN = ['Lena', 'Tom', 'Aylin', 'Max', 'Sara', 'Jonas', 'Mia', 'Ben', 'Emma', 'Paul', 'Lea', 'Finn', 'Hanna', 'Elias', 'Lina', 'Noah', 'Ella', 'Leon', 'Clara', 'Luis', 'Nele', 'Jan', 'Ida', 'Emil', 'Zoe', 'Theo', 'Amira', 'Can', 'Selin', 'Milan'];
const stat = { msgs: 0, bytes: 0, maxBytes: 0, fehler: [] };

function verbinde(params, onMsg) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(`${WS}/ws/${code}?` + new URLSearchParams(params));
    ws.onopen = () => res(ws);
    ws.onerror = e => rej(new Error('WebSocket-Fehler'));
    ws.onmessage = ev => {
      stat.msgs++; stat.bytes += ev.data.length; stat.maxBytes = Math.max(stat.maxBytes, ev.data.length);
      if (ev.data === 'pong') return;
      onMsg(JSON.parse(ev.data));
    };
  });
}

// ---------------------------------------------------------------- Lehrkraft
let room = null;
const teacherKey = crypto.randomBytes(16).toString('hex');
const T = await verbinde({ role: 'teacher', key: teacherKey }, m => { if (m.t === 'room') room = m; });
const tsend = o => T.send(JSON.stringify(o));
async function warte(fn, ms = 60000, was = '') {
  const t0 = Date.now();
  while (!fn()) { if (Date.now() - t0 > ms) throw new Error('Zeitüberschreitung: ' + was); await sleep(50); }
}

// ---------------------------------------------------------------- 30 Handys
class Bot {
  constructor(i) { this.i = i; this.pid = crypto.randomBytes(8).toString('hex').replace(/[^a-z0-9]/g, 'a').slice(0, 16); this.name = VORNAMEN[i]; this.you = null; this.erledigt = new Set(); this.stumm = false; this.offset = 0; this.empfangen = new Map(); }
  async start() {
    this.ws = await verbinde({ role: 'player', pid: this.pid }, m => this.nachricht(m));
    this.ws.onclose = () => { this.ws = null; };
  }
  send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  now() { return Date.now() + this.offset; }
  nachricht(m) {
    if (typeof m.now === 'number') this.offset = m.now - Date.now();
    if (m.t !== 'you') return;
    this.you = m;
    const k = m.klasse;
    if (!k) return;
    if (k.last) { const key = k.nr + ':' + k.last.runde; if (!this.empfangen.has(key)) this.empfangen.set(key, Date.now()); }
    if (k.state !== 'run' || k.paused || !k.startAt) return;
    const key = k.nr + ':' + k.runde;
    if (this.erledigt.has(key) || (k.me && k.me.abgegeben)) { this.erledigt.add(key); return; }
    this.erledigt.add(key);
    const warteZeit = Math.max(0, k.startAt - this.now()) + zufall(300, 4000);
    setTimeout(() => this.antworte(k), warteZeit);
  }
  antworte(k) {
    if (this.stumm || !this.ws) return;
    const ms = Math.round(zufall(1000, 8000));
    if (k.art === 'reihe') {
      const n = k.reihe.length, gaps = [...Array(n + 1).keys()];
      const gut = gaps.filter(g => passtLuecke(k.reihe, k.neu, k.nw, g));
      const r = Math.random();
      if (n >= 2 && r < 0.05) this.send({ t: 'k-reihe', nr: k.nr, r: k.runde, zweifel: true, ms });
      else {
        const schlecht = gaps.filter(g => !gut.includes(g));
        const gap = r < 0.8 || !schlecht.length ? gut[0] : schlecht[Math.floor(Math.random() * schlecht.length)];
        this.send({ t: 'k-reihe', nr: k.nr, r: k.runde, gap, ms });
      }
    } else if (k.art === 'waage') {
      if (k.w.rezept !== undefined) stat.fehler.push('Lösung vorab sichtbar');
      // Ein Drittel rechnet genau (beste Grammzahlen auf dem Raster), die anderen stellen irgendetwas ein
      const g = Math.random() < 0.33 ? besteGramm(k.w) : k.w.max.map((m, j) => Math.round(Math.random() * m / k.w.schritt[j]) * k.w.schritt[j]);
      this.send({ t: 'k-waage', nr: k.nr, r: k.runde, g, ms });
    } else {
      const b = BEDARFSKARTEN[k.b];
      const best = besteKombi(k.hand, b.wert, zielZehntel(b)).pick.map(i => k.hand.indexOf(i));
      const pick = Math.random() < 0.6 ? best : [0, 1, 2, 3].filter(() => Math.random() < 0.6).concat([5]);
      this.send({ t: 'k-bedarf', nr: k.nr, r: k.runde, pick, ms });
    }
    letzteAntwort = Date.now();
  }
}
let letzteAntwort = 0;
function besteGramm(w) {
  let best = null, bd = Infinity;
  const rec = (j, g) => {
    if (j === w.lm.length) { const d = waageAbweichung(w.ziel, waageWerte(w.lm, g)); if (d < bd) { bd = d; best = g.slice(); } return; }
    for (let x = 0; x <= w.max[j]; x += w.schritt[j]) { g.push(x); rec(j + 1, g); g.pop(); }
  };
  rec(0, []);
  return best;
}
const bots = Array.from({ length: N }, (_, i) => new Bot(i));
await Promise.all(bots.map(b => b.start()));
for (const b of bots) b.send({ t: 'join', first: b.name, initial: 'T' });
await warte(() => room && room.players.length === N, 10000, 'Anmeldung');
log(`${N} Handys angemeldet`);

let ok = false;
try {
  // ================================================================ Klassenrunde Reihe
  tsend({ t: 'klasse-start', cfg: { art: 'reihe', nw: 'kcal', runden: 10, zeit: 'an' } });
  await warte(() => room.phase === 'klasse', 5000, 'Start Klassenrunde');
  const nr = room.klasse.nr;
  const latenz = [];
  for (let r = 1; r <= 10; r++) {
    await warte(() => room.klasse && (room.klasse.runde > r || room.klasse.state === 'ende') || (room.klasse.runde === r && room.klasse.startAt && Date.now() > room.klasse.startAt), 60000, 'Runde ' + r);
    if (r === 3) { for (const b of bots.slice(0, 3)) b.ws.close(); log('Runde 3: 3 Handys getrennt'); }
    if (r === 7) { for (const b of bots.slice(3, 5)) b.stumm = true; log('Runde 7: 2 Handys geben nichts ab'); }
    // Warten, bis die Runde ausgewertet ist (Runde 7: Lehrkraft beendet sie)
    if (r === 7) {
      await sleep(6000);
      tsend({ t: 'k-stopp', nr, r: 7 }); letzteAntwort = Date.now();
      for (const b of bots.slice(3, 5)) b.stumm = false;
    }
    await warte(() => room.klasse.last && room.klasse.last.runde >= r, 60000, 'Auswertung Runde ' + r);
    const t = Date.now() - letzteAntwort;
    await warte(() => bots.every(b => !b.ws || b.empfangen.has(nr + ':' + r)), 5000, 'Auswertung an alle Handys, Runde ' + r);
    const spaet = Math.max(...bots.filter(b => b.ws).map(b => b.empfangen.get(nr + ':' + r))) - letzteAntwort;
    latenz.push(spaet);
    const L = room.klasse.last;
    log(`Runde ${r}: ${L.anzahl} Abgaben, ${L.zweifler.length} Zweifel${L.aufgedeckt ? ', aufgedeckt (' + L.aufgedeckt + ')' : ''}, Auflösung bei allen nach ${spaet} ms`);
    if (r !== 3 && r !== 4 && r !== 7 && L.anzahl !== N) throw new Error(`Runde ${r}: ${L.anzahl} statt ${N} Abgaben`);
    if (r === 7 && L.anzahl !== N - 2) throw new Error(`Runde 7: ${L.anzahl} statt ${N - 2} Abgaben`);
    if (r === 4) { await Promise.all(bots.slice(0, 3).map(b => b.start())); log('Pause nach Runde 4: 3 Handys wieder verbunden'); }
  }
  await warte(() => room.klasse.state === 'ende', 30000, 'Ende Reihe');
  const rl = room.klasse.rangliste;
  if (rl.length !== N) throw new Error('Rangliste unvollständig');
  log(`Reihe beendet. Spitze: ${rl.slice(0, 3).map(x => x.name + ' ' + x.p).join(', ')} · Schluss: ${rl[N - 1].name} ${rl[N - 1].p}`);
  log(`Auflösung bei allen Handys: höchstens ${Math.max(...latenz)} ms nach der letzten Abgabe`);
  await warte(() => bots.every(b => b.you && b.you.klasse && b.you.klasse.state === 'ende'), 5000, 'Endstand auf allen Handys');

  // ================================================================ Klassenrunde Bedarf
  tsend({ t: 'klasse-start', cfg: { art: 'bedarf', nw: 'mix', runden: 10 } });
  await warte(() => room.klasse && room.klasse.state === 'run' && room.klasse.art === 'bedarf', 5000, 'Start Bedarf');
  for (let r = 1; r <= 5; r++) {
    await warte(() => room.klasse.last && room.klasse.last.runde >= r, 60000, 'Bedarf Runde ' + r);
    const L = room.klasse.last;
    log(`Bedarf Runde ${r}: ${L.anzahl} Abgaben · beste ${L.verteilung.beste}, ≥90 % ${L.verteilung.gut}, ≥80 % ${L.verteilung.ok}, zu viel ${L.verteilung.drueber}`);
    if (L.anzahl !== N) throw new Error(`Bedarf Runde ${r}: ${L.anzahl} statt ${N} Abgaben`);
  }
  tsend({ t: 'k-ende' });
  await warte(() => room.klasse.state === 'ende', 30000, 'Ende Bedarf');
  log('Bedarf beendet nach', room.klasse.gespielt, 'Runden');

  // ================================================================ Klassenrunde Waage
  tsend({ t: 'klasse-start', cfg: { art: 'waage', zutaten: 3, wrunden: 5, stufe: 'offen', zeit: 'an' } });
  await warte(() => room.klasse && room.klasse.state === 'run' && room.klasse.art === 'waage', 5000, 'Start Waage');
  const wnr = room.klasse.nr;
  for (let r = 1; r <= 3; r++) {
    await warte(() => room.klasse.last && room.klasse.last.runde >= r, 90000, 'Waage Runde ' + r);
    await warte(() => bots.every(b => !b.ws || b.empfangen.has(wnr + ':' + r)), 5000, 'Waage-Auflösung an alle Handys, Runde ' + r);
    const L = room.klasse.last;
    const zehner = L.verteilung[L.verteilung.length - 1];
    log(`Waage Runde ${r}: ${L.anzahl} Abgaben · ${zehner}× volle Punkte · Lösung ${L.w.rezept.join('/')} g · Klassenschnitt ${L.schnitt.join('/')} g`);
    if (L.anzahl !== N || L.liste.length !== N) throw new Error(`Waage Runde ${r}: ${L.anzahl} statt ${N} Abgaben`);
    if (!zehner) throw new Error('Wer genau rechnet, muss volle Punkte bekommen');
  }
  tsend({ t: 'k-ende' });
  await warte(() => room.klasse.state === 'ende', 30000, 'Ende Waage');
  if (stat.fehler.length) throw new Error(stat.fehler[0]);
  log('Waage beendet nach', room.klasse.gespielt, 'Runden');

  // ================================================================ Qualifying mit 30 Handys
  tsend({ t: 'to-lobby' });
  await warte(() => room.phase === 'lobby', 5000, 'Lobby');
  tsend({ t: 'quali-start', cfg: { art: 'reihe', qmin: 2 } });
  await warte(() => room.phase === 'quali', 5000, 'Quali');
  const Q = room.quali;
  await sleep(Math.max(0, Q.startAt - Date.now()) + 200);
  // Jedes Handy meldet ein paar Fortschritte (wie beim echten Spielen)
  await Promise.all(bots.map(async (b, i) => {
    for (let lvl = 1; lvl <= 1 + (i % 6); lvl++) { await sleep(zufall(50, 400)); b.send({ t: 'q', nr: Q.nr, v: 1, lvl, acc: 0, ms: lvl * 3000 + i }); }
    b.send({ t: 'q-fehler', nr: Q.nr, v: 1 });
  }));
  await sleep(1500);
  tsend({ t: 'quali-end' });
  await warte(() => room.phase === 'final-setup', 5000, 'Ende Quali');
  const best = room.players.filter(p => p.rank === 1)[0];
  if (!best || best.q.lvl !== 6) throw new Error('Quali-Rangliste falsch');
  log(`Qualifying mit ${N} Handys: Platz 1 ${best.name} (${best.q.lvl} Karten) ✓`);

  log(`Nachrichten an alle Geräte: ${stat.msgs}, zusammen ${(stat.bytes / 1024).toFixed(0)} KB, größte ${(stat.maxBytes / 1024).toFixed(1)} KB`);
  ok = true;
  log('LASTTEST OK');
} catch (e) {
  console.error('FEHLER:', e.message);
} finally {
  for (const b of bots) try { b.ws && b.ws.close(); } catch (e) {}
  try { T.close(); } catch (e) {}
  if (srv) srv.kill();
  setTimeout(() => process.exit(ok ? 0 : 1), 200);
}
