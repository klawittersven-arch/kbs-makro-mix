// Tests der Raum-Logik ohne Server:  node --test tests/room.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomLogic, werteReihe, werteBedarf, plaetzeBedarf, cleanName, cleanCfg } from '../src/room.js';
import { LEBENSMITTEL, BEDARFSKARTEN } from '../public/js/inhalte.js';
import { richtigeLuecke, besteKombi, zielZehntel, GNADE, PAUSE, VORLAUF_START, SCHLUSS_GNADE, REIHE_LAENGE } from '../public/js/regeln.js';

function makeRoom() {
  let t = 1_000_000, saved = null;
  const conns = [];
  const logic = new RoomLogic({
    load: async () => saved, save: async s => { saved = structuredClone(s); }, wipe: async () => { saved = null; },
    conns: () => conns, setMeta: (c, m) => { c.meta = m; }, now: () => t,
  });
  const conn = () => { const c = { meta: {}, ws: {}, inbox: [], send(o) { this.inbox.push(o); }, sendRaw(s) { this.inbox.push(JSON.parse(s)); }, close() {} }; conns.push(c); return c; };
  const last = (c, type) => [...c.inbox].reverse().find(m => m.t === type);
  return { logic, conn, conns, last, tick: ms => { t += ms; }, now: () => t, msg: (c, o) => logic.message(c, JSON.stringify(o)) };
}
async function klasse(n = 3, cfg = {}) {
  const R = makeRoom();
  const T = R.conn();
  await R.logic.open(T, { code: 'ABCDE', role: 'teacher', key: 'k'.repeat(20) });
  const P = [];
  for (let i = 0; i < n; i++) {
    const c = R.conn(); c.pid = 'spieler' + i + 'xx';
    await R.logic.open(c, { code: 'ABCDE', role: 'player', pid: c.pid });
    await R.msg(c, { t: 'join', first: ['Lena', 'Tom', 'Aylin', 'Max'][i], initial: 'k' });
    P.push(c);
  }
  await R.msg(T, { t: 'cfg', cfg });
  return { R, T, P };
}
const room = (R, T) => R.last(T, 'room');

test('Namen werden geprüft und vereinheitlicht', () => {
  assert.equal(cleanName('lena', 'k'), 'Lena K.');
  assert.equal(cleanName('', 'k'), null);
  assert.equal(cleanName('Lena', ''), null);
  assert.equal(cleanName('<b>', 'k'), null);
});

test('Einstellungen: unbekannte Werte fallen auf Vorgaben zurück', () => {
  const c = cleanCfg({ art: 'quatsch', nw: 'fett', qmin: 7, sieg: 5 });
  assert.equal(c.art, 'reihe'); assert.equal(c.nw, 'fett'); assert.equal(c.qmin, 3); assert.equal(c.sieg, 5);
  assert.equal(cleanCfg({}, { art: 'bedarf' }).art, 'bedarf', 'alte Einstellung bleibt');
});

test('Anmeldung: Namen am Beamer, doppelte Namen werden nummeriert, Raum ohne Lehrkraft gibt es nicht', async () => {
  const { R, T, P } = await klasse(2);
  const c = R.conn(); c.pid = 'zweitelena1';
  await R.logic.open(c, { code: 'ABCDE', role: 'player', pid: c.pid });
  await R.msg(c, { t: 'join', first: 'Lena', initial: 'K' });
  assert.deepEqual(room(R, T).players.map(p => p.name), ['Lena K.', 'Tom K.', 'Lena K. 2']);
  const R2 = makeRoom(); const x = R2.conn();
  await R2.logic.open(x, { code: 'ZZZZZ', role: 'player', pid: 'abcdefgh1' });
  assert.equal(R2.last(x, 'error').why, 'no-room');
  assert.ok(P[0].inbox.some(m => m.t === 'you' && m.me && m.me.name === 'Lena K.'));
});

test('Qualifying: bester Versuch zählt, Rangliste, Ende nach Ablauf der Zeit', async () => {
  const { R, T, P } = await klasse(3, { art: 'bedarf', qmin: 2 });
  await R.msg(T, { t: 'quali-start', cfg: { art: 'bedarf', qmin: 2 } });
  const Q = room(R, T).quali;
  assert.equal(Q.art, 'bedarf');
  assert.equal(Q.endAt - Q.startAt, 2 * 60000);
  const you = R.last(P[0], 'you');
  assert.equal(you.quali.seed, Q.seed, 'Handys kennen den Startwert');
  R.tick(VORLAUF_START + 1000);
  // Lena: Versuch 1 Serie 2 (Ø 90 %), Versuch 2 Serie 1 → bleibt 2
  await R.msg(P[0], { t: 'q', nr: Q.nr, v: 1, lvl: 1, acc: 900, ms: 20000 });
  await R.msg(P[0], { t: 'q', nr: Q.nr, v: 1, lvl: 2, acc: 900, ms: 40000 });
  await R.msg(P[0], { t: 'q-fehler', nr: Q.nr, v: 1 });
  await R.msg(P[0], { t: 'q', nr: Q.nr, v: 2, lvl: 1, acc: 990, ms: 9000 });
  // Tom: Serie 2, aber näher dran (Ø 95 %) → vor Lena
  await R.msg(P[1], { t: 'q', nr: Q.nr, v: 1, lvl: 2, acc: 950, ms: 60000 });
  // Aylin: Serie 1
  await R.msg(P[2], { t: 'q', nr: Q.nr, v: 1, lvl: 1, acc: 1000, ms: 5000 });
  // Unsinn wird ignoriert
  await R.msg(P[2], { t: 'q', nr: Q.nr + 5, v: 1, lvl: 9, acc: 1000, ms: 5000 });
  let r = room(R, T);
  const name = pid => r.players.find(p => p.pid === pid);
  assert.deepEqual([P[1], P[0], P[2]].map(c => name(c.pid).rank), [1, 2, 3]);
  assert.equal(name(P[0].pid).q.lvl, 2);
  assert.equal(name(P[0].pid).q.fehler, 1);
  // Zu früh „Schluss“ melden geht nicht
  await R.msg(T, { t: 'quali-schluss', nr: Q.nr });
  assert.equal(room(R, T).quali.open, true);
  R.tick(2 * 60000);
  await R.msg(T, { t: 'quali-schluss', nr: Q.nr });
  assert.equal(room(R, T).quali.open, false);
  // Danach zählt nichts mehr
  R.tick(SCHLUSS_GNADE + 10);
  await R.msg(P[2], { t: 'q', nr: Q.nr, v: 2, lvl: 5, acc: 1000, ms: 5000 });
  r = room(R, T);
  assert.equal(name(P[2].pid).q.lvl, 1);
  await R.msg(T, { t: 'quali-end' });
  assert.equal(room(R, T).phase, 'final-setup');
  assert.deepEqual(room(R, T).final.p, [P[1].pid, P[0].pid, P[2].pid], 'Beste sind vorausgewählt');
  assert.equal(R.last(P[1], 'you').final.chosen, true);
});

// Hilfe: richtige bzw. falsche Lücke für die aktuelle Karte im Finale „Reihe“
function luecken(f) {
  const richtig = richtigeLuecke(f.reihe, f.neu, f.nw);
  return { richtig, falsch: richtig === 0 ? 1 : richtig - 1 };
}

test('Finale Reihe: K.-o., alle falsch → alle bleiben, Sieg, Revanche', async () => {
  const { R, T, P } = await klasse(3, { art: 'reihe', nw: 'eiweiss', stufe: 'verdeckt' });
  await R.msg(T, { t: 'quali-start' });
  await R.msg(T, { t: 'quali-end' });
  await R.msg(T, { t: 'final-start', p: P.map(c => c.pid) });
  let f = room(R, T).final;
  assert.equal(f.art, 'reihe'); assert.equal(f.nw, 'eiweiss'); assert.equal(f.reihe.length, 1);
  assert.equal(f.total, REIHE_LAENGE);
  // Handy des Finalisten kennt die Abgaben der anderen nicht
  assert.equal(R.last(P[0], 'you').final.st, undefined);
  // Zu früh abgeben geht nicht
  let L = luecken(f);
  await R.msg(P[0], { t: 'f-reihe', nr: f.nr, r: 1, gap: L.richtig, ms: 100 });
  assert.equal(room(R, T).final.abgegeben[0], false);
  R.tick(VORLAUF_START + 10);
  // Runde 1: alle falsch → niemand fliegt
  for (const c of P) await R.msg(c, { t: 'f-reihe', nr: f.nr, r: 1, gap: L.falsch, ms: 4000 });
  f = room(R, T).final;
  assert.equal(f.round, 2); assert.equal(f.last.keiner, true);
  assert.deepEqual(f.alive, [true, true, true]);
  assert.equal(f.reihe.length, 2, 'die Karte liegt jetzt richtig in der Reihe');
  assert.ok(f.startAt >= R.now() + PAUSE.reihe - 10);
  // Runde 2: Lena falsch (weit weg), Tom richtig, Aylin falsch (knapp) → Platz 3 Lena, Platz 2 Aylin? Nein: knapp = Platz 2
  R.tick(PAUSE.reihe + 10);
  L = luecken(f);
  const weit = L.richtig === 0 ? 2 : 0;
  await R.msg(P[0], { t: 'f-reihe', nr: f.nr, r: 2, gap: Math.abs(L.richtig - weit) >= Math.abs(L.richtig - L.falsch) ? weit : L.falsch, ms: 3000 });
  await R.msg(P[1], { t: 'f-reihe', nr: f.nr, r: 2, gap: L.richtig, ms: 9000 });
  await R.msg(P[2], { t: 'f-reihe', nr: f.nr, r: 2, gap: L.falsch, ms: 8000 });
  f = room(R, T).final;
  assert.equal(f.state, 'done');
  assert.equal(room(R, T).phase, 'podium');
  assert.equal(f.places[1], 1, 'Tom gewinnt');
  assert.deepEqual(f.places.slice().sort(), [1, 2, 3]);
  const you = R.last(P[1], 'you');
  assert.equal(you.final.me.place, 1);
  // Revanche mit denselben Finalisten
  await R.msg(T, { t: 'revanche' });
  f = room(R, T).final;
  assert.equal(f.state, 'run'); assert.equal(f.revanche, 1); assert.equal(f.round, 1);
});

test('Finale Reihe: Zeit abgelaufen, Runde beenden, Pause und Weiter', async () => {
  const { R, T, P } = await klasse(3, { art: 'reihe', nw: 'kcal' });
  await R.msg(T, { t: 'quali-start' });
  await R.msg(T, { t: 'quali-end' });
  await R.msg(T, { t: 'final-start', p: P.map(c => c.pid) });
  let f = room(R, T).final;
  R.tick(VORLAUF_START + 10);
  let L = luecken(f);
  await R.msg(P[0], { t: 'f-reihe', nr: f.nr, r: 1, gap: L.richtig, ms: 2000 });
  await R.msg(P[1], { t: 'f-reihe', nr: f.nr, r: 1, gap: L.richtig, ms: 2000 });
  // Aylin antwortet nicht. Vor Ablauf der Zeit + Gnade passiert nichts
  R.tick(f.deadline - R.now() + 100);
  await R.msg(T, { t: 'tick', nr: f.nr, r: 1 });
  assert.equal(room(R, T).final.round, 1);
  R.tick(GNADE);
  await R.msg(T, { t: 'tick', nr: f.nr, r: 1 });
  f = room(R, T).final;
  assert.equal(f.round, 2);
  assert.deepEqual(f.alive, [true, true, false]);
  assert.equal(f.st[2].why, 'zeit');
  // Pause während der Auflösung: nächste Runde startet nicht von selbst
  await R.msg(T, { t: 'halt', nr: f.nr });
  f = room(R, T).final;
  assert.equal(f.paused, true); assert.equal(f.startAt, 0);
  R.tick(60000);
  L = luecken(f);
  await R.msg(P[0], { t: 'f-reihe', nr: f.nr, r: 2, gap: L.richtig, ms: 2000 });
  assert.equal(room(R, T).final.abgegeben[0], false, 'in der Pause kann niemand abgeben');
  await R.msg(T, { t: 'weiter', nr: f.nr });
  f = room(R, T).final;
  assert.equal(f.paused, false); assert.ok(f.startAt > R.now());
  R.tick(f.startAt - R.now() + 10);
  // Tom tippt nicht weiter → Lehrkraft beendet die Runde
  await R.msg(P[0], { t: 'f-reihe', nr: f.nr, r: 2, gap: L.richtig, ms: 2000 });
  await R.msg(T, { t: 'runde-stopp', nr: f.nr, r: 2 });
  f = room(R, T).final;
  assert.equal(f.state, 'done');
  assert.deepEqual(f.places, [1, 2, 3]);
  // „Pause nach dieser Runde“ während einer laufenden Runde
  await R.msg(T, { t: 'revanche' });
  f = room(R, T).final;
  R.tick(VORLAUF_START + 10);
  await R.msg(T, { t: 'halt', nr: f.nr });
  assert.equal(room(R, T).final.haltNext, true);
  L = luecken(f);
  for (const c of P) await R.msg(c, { t: 'f-reihe', nr: f.nr, r: 1, gap: L.richtig, ms: 1000 });
  f = room(R, T).final;
  assert.equal(f.round, 2); assert.equal(f.paused, true);
});

test('Finale Reihe: Alle Karten eingeordnet → weniger Bedenkzeit gewinnt', async () => {
  const { R, T, P } = await klasse(2, { art: 'reihe', nw: 'fett', zeit: 'aus' });
  await R.msg(T, { t: 'quali-start' });
  await R.msg(T, { t: 'quali-end' });
  await R.msg(T, { t: 'final-start', p: P.map(c => c.pid) });
  let f = room(R, T).final;
  assert.equal(f.deadline, 0);
  for (let r = 1; r <= REIHE_LAENGE; r++) {
    R.tick(f.startAt - R.now() + 10);
    const L = luecken(f);
    await R.msg(P[0], { t: 'f-reihe', nr: f.nr, r, gap: L.richtig, ms: 3000 });
    await R.msg(P[1], { t: 'f-reihe', nr: f.nr, r, gap: L.richtig, ms: 2000 });
    f = room(R, T).final;
  }
  assert.equal(f.state, 'done');
  assert.equal(f.last.alleKarten, true);
  assert.deepEqual(f.places, [2, 1]);
  assert.equal(f.reihe.length, REIHE_LAENGE + 1);
});

test('werteReihe: Reihenfolge der Ausgeschiedenen', () => {
  const st = [
    { alive: true, res: 'fail', dist: 2, ms: 1000 },
    { alive: true, res: 'ok', dist: 0, ms: 5000 },
    { alive: true, res: 'fail', dist: 1, ms: 9000 },
    { alive: true, res: 'ok', dist: 0, ms: 1000 },
  ];
  const r = werteReihe(st);
  assert.deepEqual(r.out, [2, 0]);
  assert.equal(st[2].place, 3); assert.equal(st[0].place, 4);
  assert.equal(r.done, false);
});

// Hilfe: Auswahl aus der Hand mit genau dieser Summe (beste Kombination) bzw. „zu viel“
function auswahl(f, art) {
  const b = BEDARFSKARTEN[f.b], zielZ = zielZehntel(b);
  if (art === 'best') {
    const best = besteKombi(f.hand, b.wert, zielZ);
    return best.pick.map(i => f.hand.indexOf(i));
  }
  if (art === 'klein') { // eine einzelne Karte, die passt, möglichst klein
    const ok = f.hand.map((i, k) => k).filter(k => Math.round(LEBENSMITTEL[f.hand[k]][b.wert] * 10) <= zielZ);
    ok.sort((x, y) => LEBENSMITTEL[f.hand[x]][b.wert] - LEBENSMITTEL[f.hand[y]][b.wert]);
    return [ok[0]];
  }
  // zu viel: die 5 größten Werte
  const k = f.hand.map((i, j) => j).sort((x, y) => LEBENSMITTEL[f.hand[y]][b.wert] - LEBENSMITTEL[f.hand[x]][b.wert]).slice(0, 5);
  return k;
}

test('Finale Bedarf: Karten sammeln, Gleichstand, Stechen, Sieg', async () => {
  const { R, T, P } = await klasse(3, { art: 'bedarf', nw: 'mix', sieg: 3 });
  await R.msg(T, { t: 'quali-start' });
  await R.msg(T, { t: 'quali-end' });
  await R.msg(T, { t: 'final-start', p: P.map(c => c.pid) });
  let f = room(R, T).final;
  assert.equal(f.art, 'bedarf'); assert.equal(f.hand.length, 10); assert.equal(f.sieg, 3);
  const spiele = async (wahl) => {
    R.tick(f.startAt - R.now() + 10);
    for (const [i, c] of P.entries()) await R.msg(c, { t: 'f-bedarf', nr: f.nr, r: f.round, pick: auswahl(f, wahl[i]), ms: 10000 });
    f = room(R, T).final;
  };
  // Runde 1: Lena beste Kombination, Tom zu viel, Aylin klein → Lena bekommt die Karte
  await spiele(['best', 'viel', 'klein']);
  assert.deepEqual(f.last.gewinner, [0]);
  assert.deepEqual(f.karten, [1, 0, 0]);
  assert.equal(f.last.abgaben[1].drueber, true);
  assert.ok(f.last.beste.pick.length >= 1);
  assert.equal(f.round, 2);
  // Runde 2: Lena und Tom gleich (beide beste) → beide bekommen die Karte
  await spiele(['best', 'best', 'viel']);
  assert.deepEqual(f.karten, [2, 1, 0]);
  // Runde 3: Lena erreicht 3 → Sieg
  await spiele(['best', 'viel', 'viel']);
  assert.equal(f.state, 'done');
  assert.deepEqual(f.places, [1, 2, 3]);
  assert.equal(R.last(P[0], 'you').final.me.place, 1);
});

test('Finale Bedarf: Gleichstand bei der Siegzahl → weiterspielen', () => {
  const st = [{ karten: 2, pick: [1], sum: 50, drueber: false }, { karten: 2, pick: [2], sum: 50, drueber: false }, { karten: 0, pick: [], sum: 0 }];
  let r = werteBedarf(st, 100, 3);
  assert.deepEqual(r.gewinner, [0, 1]);
  assert.equal(r.done, false, 'beide haben 3 → Stechen');
  st[0].sum = 60; st[1].drueber = true;
  r = werteBedarf(st, 100, 3);
  assert.equal(r.done, true);
  plaetzeBedarf(st);
  assert.deepEqual(st.map(x => x.place), [1, 2, 3]);
});

test('Finale Bedarf: Ohne Abgabe zählt nichts, Lehrkraft kann die Runde beenden', async () => {
  const { R, T, P } = await klasse(2, { art: 'bedarf', nw: 'kcal', zeit: 'aus' });
  await R.msg(T, { t: 'quali-start' });
  await R.msg(T, { t: 'quali-end' });
  await R.msg(T, { t: 'final-start', p: P.map(c => c.pid) });
  let f = room(R, T).final;
  R.tick(f.startAt - R.now() + 10);
  // ungültige Auswahl (6 Karten) wird ignoriert
  await R.msg(P[0], { t: 'f-bedarf', nr: f.nr, r: 1, pick: [0, 1, 2, 3, 4, 5], ms: 10 });
  assert.equal(room(R, T).final.abgegeben[0], false);
  await R.msg(P[0], { t: 'f-bedarf', nr: f.nr, r: 1, pick: auswahl(f, 'klein'), ms: 10 });
  R.tick(10 * 60000);
  await R.msg(T, { t: 'tick', nr: f.nr, r: 1 });
  assert.equal(room(R, T).final.round, 1, 'ohne Zeitlimit läuft nichts ab');
  await R.msg(T, { t: 'runde-stopp', nr: f.nr, r: 1 });
  f = room(R, T).final;
  assert.equal(f.round, 2);
  assert.deepEqual(f.last.gewinner, [0]);
  assert.equal(f.last.abgaben[1].why, 'stopp');
});

test('Finale nur mit verbundenen Handys, Finalisten können nicht entfernt werden, Neues Spiel', async () => {
  const { R, T, P } = await klasse(3);
  await R.msg(T, { t: 'quali-start' });
  await R.msg(T, { t: 'quali-end' });
  // Aylin geht offline
  R.conns.splice(R.conns.indexOf(P[2]), 1);
  await R.msg(T, { t: 'final-start', p: P.map(c => c.pid) });
  assert.equal(R.last(T, 'error').why, 'final-offline');
  await R.msg(T, { t: 'final-start', p: [P[0].pid] });
  assert.equal(R.last(T, 'error').why, 'final-players');
  await R.msg(T, { t: 'final-start', p: [P[0].pid, P[1].pid] });
  assert.equal(room(R, T).phase, 'final');
  await R.msg(T, { t: 'kick', pid: P[0].pid });
  assert.equal(R.last(T, 'error').why, 'kick-finalist');
  await R.msg(T, { t: 'kick', pid: P[2].pid });
  assert.equal(room(R, T).players.length, 2);
  await R.msg(T, { t: 'to-lobby' });
  const r = room(R, T);
  assert.equal(r.phase, 'lobby'); assert.equal(r.final, null);
  assert.equal(r.players.length, 2, 'alle bleiben angemeldet');
});
