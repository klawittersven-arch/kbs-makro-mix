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

// ================================================================ Klassenrunde
import { passtLuecke, reiheFehler, mehrheit, bedarfPunkte, PUNKTE, KLASSE_PAUSE } from '../public/js/regeln.js';

async function klassenrunde(n, cfg) {
  const { R, T, P } = await klasse(n, cfg);
  await R.msg(T, { t: 'klasse-start', cfg });
  return { R, T, P, k: () => room(R, T).klasse };
}
// passende und unpassende Lücke in der gelegten Reihe
function lk(k) {
  const n = k.reihe.length;
  const gut = [...Array(n + 1).keys()].filter(g => passtLuecke(k.reihe, k.neu, k.nw, g));
  const schlecht = [...Array(n + 1).keys()].filter(g => !gut.includes(g));
  return { gut: gut[0], schlecht: schlecht[0] };
}

test('Regeln der Klassenrunde: Fehler finden, Mehrheit, Bedarf-Punkte', () => {
  const idx = id => LEBENSMITTEL.findIndex(l => l.id === id);
  const reihe = [idx('apfel'), idx('butter'), idx('nudeln')]; // 52, 744, 157 kcal (von unten nach oben gelegt)
  assert.deepEqual(reiheFehler(reihe, 'kcal'), [1], 'Butter liegt unter den Nudeln');
  assert.deepEqual(reiheFehler([idx('apfel'), idx('nudeln')], 'kcal'), []);
  assert.ok(passtLuecke(reihe, idx('gurke'), 'kcal', 0));
  assert.ok(!passtLuecke(reihe, idx('gurke'), 'kcal', 1));
  assert.ok(passtLuecke(reihe, idx('olivenoel'), 'kcal', 3));
  assert.deepEqual(mehrheit([1, 2, 2, 0], 3), { gap: 2, stimmen: [1, 1, 2, 0] });
  assert.equal(mehrheit([1, 0], 3).gap, 0, 'Gleichstand: untere Lücke');
  assert.equal(mehrheit([], 3).gap, -1);
  assert.equal(bedarfPunkte(4890, 5000, 4890), PUNKTE.beste);
  assert.equal(bedarfPunkte(4600, 5000, 4890), PUNKTE.gut);
  assert.equal(bedarfPunkte(4100, 5000, 4890), PUNKTE.ok);
  assert.equal(bedarfPunkte(3000, 5000, 4890), 0);
  assert.equal(bedarfPunkte(5100, 5000, 4890), 0, 'zu viel');
});

test('Klassenrunde Reihe: Mehrheit legt falsch, Zweifel deckt auf, Punkte erst beim Aufdecken', async () => {
  const { R, T, P, k } = await klassenrunde(3, { art: 'reihe', nw: 'kcal', runden: 10 });
  let K = k();
  assert.equal(room(R, T).phase, 'klasse');
  assert.equal(K.reihe.length, 1);
  assert.ok(R.last(P[0], 'you').klasse.me, 'Handy kennt seinen Stand');
  R.tick(VORLAUF_START + 10);
  // Runde 1: Zweifeln geht bei nur einer Karte nicht
  await R.msg(P[0], { t: 'k-reihe', nr: K.nr, r: 1, zweifel: true, ms: 100 });
  assert.equal(R.last(T, 'kp'), undefined, 'abgelehnt');
  // Lena richtig, Tom und Aylin falsch → Mehrheit falsch
  let L = lk(K);
  await R.msg(P[0], { t: 'k-reihe', nr: K.nr, r: 1, gap: L.gut, ms: 2000 });
  assert.equal(R.last(T, 'kp').n, 1, 'Beamer bekommt nur eine kurze Fortschrittsmeldung');
  await R.msg(P[1], { t: 'k-reihe', nr: K.nr, r: 1, gap: L.schlecht, ms: 2000 });
  await R.msg(P[2], { t: 'k-reihe', nr: K.nr, r: 1, gap: L.schlecht, ms: 2000 });
  K = k();
  assert.equal(K.runde, 2);
  assert.equal(K.last.gap, L.schlecht);
  assert.equal(K.last.aufgedeckt, '');
  assert.equal(K.reihe.length, 2);
  assert.equal(reiheFehler(K.reihe, K.nw).length, 1, 'die Reihe hat jetzt einen Fehler');
  assert.ok(K.rangliste.every(x => x.p === 0), 'noch keine Punkte sichtbar');
  assert.ok(K.startAt >= R.now() + KLASSE_PAUSE.reihe - 10);
  // Runde 2: Tom zweifelt, die anderen legen → aufdecken
  R.tick(KLASSE_PAUSE.reihe + 10);
  L = lk(K);
  await R.msg(P[1], { t: 'k-reihe', nr: K.nr, r: 2, zweifel: true, ms: 1000 });
  await R.msg(P[0], { t: 'k-reihe', nr: K.nr, r: 2, gap: 0, ms: 1000 });
  await R.msg(P[2], { t: 'k-reihe', nr: K.nr, r: 2, gap: 0, ms: 1000 });
  K = k();
  assert.equal(K.last.aufgedeckt, 'zweifel');
  assert.equal(K.last.zweifelRecht, true);
  assert.deepEqual(K.last.zweifler, ['Tom K.']);
  assert.equal(K.reihe.length, 1, 'neue Reihe');
  assert.equal(K.reiheNr, 2);
  const p = name => K.rangliste.find(x => x.name === name);
  assert.equal(p('Tom K.').p, PUNKTE.zweifelRichtig);
  assert.ok(p('Lena K.').p >= PUNKTE.richtig, 'Lena hatte in Runde 1 richtig gelegt');
  assert.equal(R.last(P[1], 'you').klasse.me.zuletzt.plus, PUNKTE.zweifelRichtig);
  assert.ok(K.startAt >= R.now() + KLASSE_PAUSE.aufgedeckt - 10);
});

test('Klassenrunde Reihe: falscher Zweifel kostet Punkte (nie unter 0), Pause, Ende, weiter zum Finale', async () => {
  const { R, T, P, k } = await klassenrunde(3, { art: 'reihe', nw: 'fett', runden: 10, finalN: 2 });
  let K = k();
  R.tick(VORLAUF_START + 10);
  // Runde 1: alle richtig
  for (const c of P) await R.msg(c, { t: 'k-reihe', nr: K.nr, r: 1, gap: lk(K).gut, ms: 1000 });
  K = k(); R.tick(K.startAt - R.now() + 10);
  // Runde 2: Max zweifelt zu Unrecht
  await R.msg(P[2], { t: 'k-reihe', nr: K.nr, r: 2, zweifel: true, ms: 1000 });
  for (const c of P.slice(0, 2)) await R.msg(c, { t: 'k-reihe', nr: K.nr, r: 2, gap: lk(K).gut, ms: 1000 });
  K = k();
  assert.equal(K.last.zweifelRecht, false);
  const p = name => K.rangliste.find(x => x.name === name).p;
  assert.equal(p('Lena K.'), 2 * PUNKTE.richtig);
  assert.equal(p('Aylin K.'), Math.max(0, PUNKTE.richtig + PUNKTE.zweifelFalsch), 'nie unter 0');
  // Pause zwischen zwei Runden
  await R.msg(T, { t: 'k-halt', nr: K.nr });
  K = k();
  assert.equal(K.paused, true);
  R.tick(60000);
  const vorher = T.inbox.length;
  await R.msg(P[0], { t: 'k-reihe', nr: K.nr, r: 3, gap: 0, ms: 1 });
  assert.equal(T.inbox.length, vorher, 'in der Pause keine Abgabe');
  await R.msg(T, { t: 'k-weiter', nr: K.nr });
  K = k();
  R.tick(K.startAt - R.now() + 10);
  // Runde 3: nur Lena gibt ab, die Zeit läuft ab → ein Handy meldet das Ende
  await R.msg(P[0], { t: 'k-reihe', nr: K.nr, r: 3, gap: lk(K).gut, ms: 1000 });
  R.tick(K.deadline - R.now() + GNADE + 10);
  await R.msg(P[1], { t: 'k-tick', nr: K.nr, r: 3 });
  K = k();
  assert.equal(K.runde, 4);
  // Lehrkraft beendet vorzeitig → letzte Reihe wird aufgedeckt, Punkte gutgeschrieben
  await R.msg(T, { t: 'k-ende' });
  K = k();
  assert.equal(K.state, 'ende');
  assert.equal(K.last.aufgedeckt, 'schluss');
  assert.equal(K.gespielt, 3);
  assert.equal(K.rangliste[0].name, 'Lena K.');
  assert.equal(R.last(P[0], 'you').klasse.me.platz, 1);
  // Weiter zum Finale: die Besten nach Punkten
  await R.msg(T, { t: 'klasse-final' });
  const r = room(R, T);
  assert.equal(r.phase, 'final-setup');
  assert.equal(r.final.p.length, 2);
  assert.equal(r.final.p[0], P[0].pid);
  // Neues Spiel räumt die Klassenrunde ab
  await R.msg(T, { t: 'to-lobby' });
  assert.equal(room(R, T).klasse, null);
});

test('Klassenrunde: nicht verbundene Handys halten nicht auf, Ende nach der letzten Runde', async () => {
  const { R, T, P, k } = await klassenrunde(3, { art: 'reihe', nw: 'kh', runden: 10, zeit: 'aus' });
  let K = k();
  assert.equal(K.deadline, 0);
  R.tick(VORLAUF_START + 10);
  // Aylin geht offline, während die anderen schon abgegeben haben → Runde endet sofort
  await R.msg(P[0], { t: 'k-reihe', nr: K.nr, r: 1, gap: lk(K).gut, ms: 1000 });
  await R.msg(P[1], { t: 'k-reihe', nr: K.nr, r: 1, gap: lk(K).gut, ms: 1000 });
  assert.equal(k().runde, 1);
  R.conns.splice(R.conns.indexOf(P[2]), 1);
  await R.logic.close(P[2]);
  assert.equal(k().runde, 2);
  // Ohne Zeitlimit läuft nichts ab; die Lehrkraft beendet die Runde
  for (let r = 2; r <= 10; r++) {
    K = k(); R.tick(K.startAt - R.now() + 10);
    if (r === 5) { await R.msg(T, { t: 'k-tick', nr: K.nr, r }); assert.equal(k().runde, 5); await R.msg(T, { t: 'k-stopp', nr: K.nr, r }); continue; }
    for (const c of P.slice(0, 2)) await R.msg(c, { t: 'k-reihe', nr: K.nr, r, gap: lk(K).gut, ms: 500 });
  }
  K = k();
  assert.equal(K.state, 'ende');
  assert.equal(K.gespielt, 10);
  assert.ok(K.last.aufgedeckt, 'am Ende wird aufgedeckt');
  assert.ok(K.rangliste[0].p >= 8);
  // Noch eine Klassenrunde
  await R.msg(T, { t: 'klasse-start' });
  assert.equal(k().state, 'run');
  assert.equal(k().gespielt, 0);
});

test('Klassenrunde Bedarf: Punkte nach Nähe zum Zielwert, Verteilung, häufig gewählt', async () => {
  const { R, T, P, k } = await klassenrunde(4, { art: 'bedarf', nw: 'mix', runden: 10 });
  let K = k();
  assert.equal(K.hand.length, 10);
  R.tick(VORLAUF_START + 10);
  const f = { b: K.b, hand: K.hand };
  await R.msg(P[0], { t: 'k-bedarf', nr: K.nr, r: 1, pick: auswahl(f, 'best'), ms: 9000 });
  await R.msg(P[1], { t: 'k-bedarf', nr: K.nr, r: 1, pick: auswahl(f, 'viel'), ms: 9000 });
  await R.msg(P[2], { t: 'k-bedarf', nr: K.nr, r: 1, pick: [0, 1, 2, 3, 4, 5], ms: 9000 }); // ungültig
  assert.equal(R.last(T, 'kp').n, 2);
  await R.msg(P[2], { t: 'k-bedarf', nr: K.nr, r: 1, pick: auswahl(f, 'best'), ms: 8000 });
  await R.msg(P[3], { t: 'k-bedarf', nr: K.nr, r: 1, pick: auswahl(f, 'best'), ms: 7000 });
  K = k();
  assert.equal(K.runde, 2);
  assert.equal(K.last.verteilung.beste, 3);
  assert.equal(K.last.verteilung.drueber, 1);
  assert.equal(K.last.haeufig.reduce((a, b) => a + b, 0) > 0, true);
  const p = name => K.rangliste.find(x => x.name === name).p;
  assert.equal(p('Lena K.'), PUNKTE.beste);
  assert.equal(p('Tom K.'), 0);
  assert.equal(K.rangliste[0].name, 'Max K.', 'bei Gleichstand: weniger Bedenkzeit');
  assert.notEqual(K.b + ':' + K.hand.join(), f.b + ':' + f.hand.join(), 'neue Bedarfskarte');
  assert.deepEqual(R.last(P[1], 'you').klasse.me.zuletzt.drueber, true);
});

// ================================================================ Computergegner (CPU)
import { cpuLuecke, cpuAuswahl, istCpu, cpuName, rng as zufall, kette as kette2, richtigeLuecke as luecke2 } from '../public/js/regeln.js';

test('CPU: Kennung, Name und Stärke (schwer trifft öfter als leicht)', () => {
  assert.ok(istCpu('cpu-mittel') && istCpu('cpu-schwer-2') && !istCpu('cpuxyz12345') && !istCpu('cpu-super'));
  assert.equal(cpuName('cpu-mittel-2', ['abcdefgh1', 'cpu-mittel-2']), 'CPU (mittel)');
  assert.equal(cpuName('cpu-leicht-3', ['abcdefgh1', 'cpu-mittel-2', 'cpu-leicht-3']), 'CPU 2 (leicht)');
  const quote = stufe => {
    let ok = 0, n = 0;
    for (let s = 1; s <= 200; s++) {
      const k = kette2(s, 'kcal'), r = zufall(s);
      for (let i = 1; i < k.length; i++) { ok += cpuLuecke(k.slice(0, i), k[i], 'kcal', stufe, r) === luecke2(k.slice(0, i), k[i], 'kcal'); n++; }
    }
    return ok / n;
  };
  const l = quote('leicht'), m = quote('mittel'), s = quote('schwer');
  assert.ok(l < m && m < s, `leicht ${l} < mittel ${m} < schwer ${s}`);
  assert.ok(s > 0.85 && l < 0.7);
  const pick = cpuAuswahl([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 0, 'schwer', zufall(3));
  assert.ok(pick.length >= 1 && pick.length <= 5 && pick.every(k => k >= 0 && k < 10));
});

test('CPU im Finale Reihe: allein gegen den Computer, CPU antwortet sofort, wenn der Mensch abgegeben hat', async () => {
  const { R, T, P } = await klasse(1, { art: 'reihe', nw: 'kcal', zeit: 'an' });
  await R.msg(T, { t: 'quali-start' });
  await R.msg(T, { t: 'quali-end' });
  let r = room(R, T);
  assert.deepEqual(r.final.p, [P[0].pid, 'cpu-mittel-2'], 'nur eine Person → CPU (mittel) ist vorausgewählt');
  // Nur CPUs geht nicht
  await R.msg(T, { t: 'final-start', p: ['cpu-schwer', 'cpu-leicht'] });
  assert.equal(R.last(T, 'error').why, 'final-players');
  await R.msg(T, { t: 'final-start', p: [P[0].pid, 'cpu-schwer'] });
  let f = room(R, T).final;
  assert.deepEqual(f.names, ['Lena K.', 'CPU (schwer)']);
  assert.ok(f.cpuAt[1] > f.startAt && f.cpuAt[0] === 0);
  assert.equal(f.st[1].gap, -1, 'die Antwort der CPU ist vorher nicht sichtbar');
  // Runde für Runde: Lena legt immer richtig. Die CPU antwortet mit, das Spiel endet irgendwann
  for (let runde = 1; runde <= 12 && room(R, T).phase === 'final'; runde++) {
    f = room(R, T).final;
    R.tick(f.startAt - R.now() + 10);
    // Zu früh „cpu“ melden: nichts passiert
    await R.msg(T, { t: 'cpu', nr: f.nr, r: f.round });
    assert.equal(room(R, T).final.abgegeben[1], false);
    await R.msg(P[0], { t: 'f-reihe', nr: f.nr, r: f.round, gap: richtigeLuecke(f.reihe, f.neu, f.nw), ms: 2000 });
    const g = room(R, T).final;
    assert.ok(g.round > f.round || g.state === 'done', 'Runde ist ausgewertet, ohne auf die CPU zu warten');
  }
  f = room(R, T).final;
  assert.equal(f.state, 'done');
  assert.equal(f.places[0], 1, 'wer immer richtig liegt, gewinnt gegen die CPU');
});

test('CPU im Finale Bedarf: CPU gibt nach ihrer Bedenkzeit ab, zwei CPUs gegen eine Person', async () => {
  const { R, T, P } = await klasse(1, { art: 'bedarf', nw: 'mix', sieg: 3 });
  await R.msg(T, { t: 'quali-start' });
  await R.msg(T, { t: 'quali-end' });
  await R.msg(T, { t: 'final-pick', p: [P[0].pid, 'cpu-leicht', 'cpu-leicht'] });
  assert.deepEqual(room(R, T).final.p, [P[0].pid, 'cpu-leicht-2', 'cpu-leicht-3']);
  await R.msg(T, { t: 'final-start', p: room(R, T).final.p });
  let f = room(R, T).final;
  assert.deepEqual(f.names, ['Lena K.', 'CPU 1 (leicht)', 'CPU 2 (leicht)']);
  // Bedenkzeit der CPUs ist um → beide geben ab, Lena noch nicht
  R.tick(Math.max(f.cpuAt[1], f.cpuAt[2]) - R.now() + 10);
  await R.msg(T, { t: 'cpu', nr: f.nr, r: 1 });
  f = room(R, T).final;
  assert.deepEqual(f.abgegeben, [false, true, true]);
  assert.equal(f.round, 1);
  await R.msg(P[0], { t: 'f-bedarf', nr: f.nr, r: 1, pick: auswahl(f, 'best'), ms: 9000 });
  f = room(R, T).final;
  assert.equal(f.round, 2);
  assert.ok(f.last.gewinner.includes(0), 'die beste Kombination gewinnt die Karte');
  assert.equal(f.last.abgaben[1].pick.length > 0, true);
  // Zeit läuft ab, Lena gibt nicht ab: CPUs zählen trotzdem
  R.tick(f.deadline - R.now() + GNADE + 10);
  await R.msg(T, { t: 'tick', nr: f.nr, r: 2 });
  f = room(R, T).final;
  assert.equal(f.round, 3);
  assert.ok(f.last.abgaben[1].pick.length > 0 && f.last.abgaben[0].pick.length === 0);
  // Revanche behält die CPUs
  await R.msg(T, { t: 'final-abort' });
  await R.msg(T, { t: 'final-start', p: room(R, T).final.p });
  assert.equal(room(R, T).final.names[2], 'CPU 2 (leicht)');
});
