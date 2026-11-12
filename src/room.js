// Raum-Logik für eine Klasse: Anmeldung, Qualifying (jede/r allein auf dem Handy) und Finale am Beamer.
// Diese Datei kennt weder Cloudflare noch Node. Der Server-Adapter
// (src/worker.js für Cloudflare, server/local.mjs für den Laptop) reicht Verbindungen und Speicher herein.
import { BEDARFSKARTEN } from '../public/js/inhalte.js';
import {
  SPIELARTEN, NAEHRWERTE, NW_WAHL, STUFEN, ZEITEN, QUALI_MINUTEN, FINAL_GROESSEN, SIEG_KARTEN,
  REIHE_LAENGE, MAX_SERIE, VORLAUF_START, VORLAUF_WEITER, PAUSE, GNADE, SCHLUSS_GNADE,
  zeitLimit, rundenPlan, kette, richtigeLuecke, bedarfFinalRunde, sauberePick, bewerte, besteKombi, zielZehntel,
  vergleichQuali, zufallsSeed, mischSeed, nwFuer,
  KLASSE_RUNDEN, PUNKTE, KLASSE_PAUSE, reiheFehler, passtLuecke, mehrheit, bedarfPunkte,
  CPU_STUFEN, istCpu, cpuName, cpuDenkzeit, cpuLuecke, cpuAuswahl, rng,
} from '../public/js/regeln.js';

export const MAX_PLAYERS = 60;
export const MAX_RUNDEN_BEDARF = 30; // Notbremse, falls im Finale „Bedarf“ immer wieder Gleichstand herrscht
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' -]{0,15}$/;

export function cleanName(first, initial) {
  first = String(first || '').trim().replace(/\s+/g, ' ');
  initial = String(initial || '').trim();
  if (!NAME_RE.test(first)) return null;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]$/.test(initial)) return null;
  const cap = s => s.charAt(0).toLocaleUpperCase('de-DE') + s.slice(1);
  return cap(first) + ' ' + initial.toLocaleUpperCase('de-DE') + '.';
}
const int = (v, lo, hi, def) => {
  v = Number(v);
  return Number.isInteger(v) && v >= lo && v <= hi ? v : def;
};
const ms = v => { v = Math.round(Number(v)); return Number.isFinite(v) && v >= 0 && v < 3600000 ? v : 0; };

export function cleanCfg(c, old) {
  c = c || {}; old = old || {};
  const pick = (v, list, def) => list.includes(v) ? v : def;
  return {
    art: pick(c.art, SPIELARTEN, pick(old.art, SPIELARTEN, 'reihe')),
    nw: pick(c.nw, NW_WAHL, pick(old.nw, NW_WAHL, 'kcal')),
    stufe: pick(c.stufe, STUFEN, pick(old.stufe, STUFEN, 'offen')),
    zeit: pick(c.zeit, ZEITEN, pick(old.zeit, ZEITEN, 'an')),
    qmin: pick(Number(c.qmin), QUALI_MINUTEN, pick(Number(old.qmin), QUALI_MINUTEN, 3)),
    finalN: pick(Number(c.finalN), FINAL_GROESSEN, pick(Number(old.finalN), FINAL_GROESSEN, 4)),
    sieg: pick(Number(c.sieg), SIEG_KARTEN, pick(Number(old.sieg), SIEG_KARTEN, 3)),
    runden: pick(Number(c.runden), KLASSE_RUNDEN, pick(Number(old.runden), KLASSE_RUNDEN, 15)),
  };
}

export function freshState(code) {
  return {
    v: 1, code, teacherKey: null, created: 0, updated: 0,
    phase: 'lobby', // lobby | quali | final-setup | final | podium | klasse
    cfg: cleanCfg({}),
    players: {},
    order: [], // pids in Anmelde-Reihenfolge
    quali: null,
    final: null,
    klasse: null, // Klassenrunde: alle gleichzeitig
    nr: 0, // zählt Qualifying- und Finalrunden, damit alte Nachrichten nicht zählen
  };
}

/*
 * Finale „Reihe“ (K.-o.): eine Runde auswerten. st: Zustand je Finalist.
 * Wer falsch einordnet, scheidet aus. Liegen ALLE Verbliebenen falsch, bleiben alle im Spiel.
 * Scheiden mehrere aus, steht vorn, wer näher an der richtigen Lücke lag, dann wer schneller war.
 * Rückgabe: { ok: [Slots], out: [Slots, bester zuerst], keiner: bool, done: bool }
 */
export function werteReihe(st) {
  const alive = st.map((x, i) => i).filter(i => st[i].alive);
  const ok = alive.filter(i => st[i].res === 'ok');
  let out = alive.filter(i => st[i].res !== 'ok');
  for (const i of alive) st[i].total = (st[i].total || 0) + (st[i].ms || 0);
  if (!ok.length) return { ok, out: [], keiner: true, done: false };
  out.sort((a, b) => (st[a].dist - st[b].dist) || (st[a].ms - st[b].ms) || (a - b));
  let place = ok.length + 1;
  for (const i of out) { st[i].alive = false; st[i].place = place++; }
  let done = false;
  if (ok.length === 1) { st[ok[0]].place = 1; done = true; }
  return { ok, out, keiner: false, done };
}

/*
 * Finale „Bedarf“: eine Runde auswerten. Die Bedarfskarte bekommt, wer am nächsten am Zielwert liegt,
 * ohne ihn zu überschreiten (bei Gleichstand alle Gleichstehenden). Gewonnen hat, wer zuerst
 * „sieg“ Karten hat und dabei allein vorn liegt (sonst geht es weiter).
 */
export function werteBedarf(st, zielZ, sieg) {
  const gueltig = st.map((x, i) => i).filter(i => st[i].pick && st[i].pick.length && !st[i].drueber);
  const best = gueltig.reduce((m, i) => Math.max(m, st[i].sum), -1);
  const gewinner = gueltig.filter(i => st[i].sum === best);
  for (const i of gueltig) st[i].acc = (st[i].acc || 0) + Math.round(st[i].sum * 1000 / zielZ);
  for (const i of gewinner) st[i].karten = (st[i].karten || 0) + 1;
  const max = Math.max(...st.map(x => x.karten || 0));
  const vorn = st.filter(x => (x.karten || 0) === max).length;
  return { gewinner, done: max >= sieg && vorn === 1 };
}
// Platzierung im Finale „Bedarf“: mehr Karten vorn, dann höhere Trefferquote insgesamt
export function plaetzeBedarf(st) {
  const order = st.map((x, i) => i).sort((a, b) => ((st[b].karten || 0) - (st[a].karten || 0)) || ((st[b].acc || 0) - (st[a].acc || 0)) || (a - b));
  order.forEach((i, j) => { st[i].place = j + 1; });
}

const neuePunkte = () => ({ p: 0, richtig: 0, zweifelOk: 0, zweifelFalsch: 0, ms: 0, runden: 0 });

export class RoomLogic {
  /**
   * @param {object} io  Adapter:
   *   io.load() -> Promise<state|null>
   *   io.save(state) -> Promise
   *   io.wipe() -> Promise
   *   io.conns() -> Array<{meta, ws, send(obj), sendRaw(str), close(code, reason)}>
   *   io.setMeta(conn, meta)
   *   io.now() -> ms
   */
  constructor(io) { this.io = io; this.s = null; }

  async state(code) {
    if (!this.s) this.s = (await this.io.load()) || freshState(code);
    return this.s;
  }
  async persist() { this.s.updated = this.io.now(); await this.io.save(this.s); }

  // ---------- Verbindungen
  async open(conn, q) {
    const s = await this.state(q.code);
    const role = q.role === 'teacher' ? 'teacher' : 'player';
    if (role === 'teacher') {
      const key = String(q.key || '');
      if (key.length < 12 || key.length > 64) return this.reject(conn, 'bad-key');
      if (!s.teacherKey) { s.teacherKey = key; s.created = this.io.now(); await this.persist(); }
      else if (s.teacherKey !== key) return this.reject(conn, 'code-taken');
      this.io.setMeta(conn, { role: 'teacher' });
      conn.send(this.roomMsg());
    } else {
      const pid = String(q.pid || '');
      if (!/^[a-z0-9]{8,24}$/.test(pid)) return this.reject(conn, 'bad-pid');
      if (!s.teacherKey) return this.reject(conn, 'no-room');
      this.io.setMeta(conn, { role: 'player', pid });
      conn.send(this.youMsg(pid));
      this.pushTeachers();
    }
  }
  reject(conn, why) {
    try { conn.send({ t: 'error', why }); conn.close(4001, why); } catch (e) {}
  }
  async close(conn) {
    const m = conn.meta || {};
    if (m.role !== 'player') return;
    await this.state();
    this.closing = conn.ws;
    try {
      // Klassenrunde: Haben jetzt alle verbundenen Handys abgegeben? Dann nicht länger warten
      const s = this.s, k = s && s.klasse;
      if (s && s.phase === 'klasse' && k && k.state === 'run' && this.klasseOffen(k) && Object.keys(k.antworten).length && this.alleGeantwortet(s)) await this.klasseAuswerten(s);
      else this.pushTeachers();
    } finally { this.closing = null; }
  }

  // ---------- Nachrichten
  async message(conn, raw) {
    if (typeof raw !== 'string' || raw.length > 4096) return;
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;
    const m = conn.meta || {};
    const s = await this.state();
    if (msg.t === 'sync') { conn.send({ t: 'sync', c: msg.c, s: this.io.now() }); return; }
    if (m.role === 'teacher') return this.teacherMsg(conn, msg, s);
    if (m.role === 'player') return this.playerMsg(conn, msg, s, m.pid);
  }

  async teacherMsg(conn, msg, s) {
    const now = this.io.now();
    const f = s.final;
    const laeuft = () => s.phase === 'final' && f && f.state === 'run' && msg.nr === f.nr && msg.r === f.round;
    switch (msg.t) {
      case 'cfg': {
        s.cfg = cleanCfg(msg.cfg, s.cfg);
        await this.persist(); this.pushAll(); return;
      }
      case 'kick': {
        const pid = String(msg.pid || ''); if (!s.players[pid]) return;
        if (f && f.p.includes(pid) && (s.phase === 'final' || s.phase === 'podium')) return conn.send({ t: 'error', why: 'kick-finalist' });
        delete s.players[pid]; s.order = s.order.filter(p => p !== pid);
        if (f && s.phase === 'final-setup') f.p = f.p.filter(p => p !== pid);
        for (const c of this.io.conns()) if ((c.meta || {}).pid === pid) c.send({ t: 'kicked' });
        await this.persist(); this.pushTeachers(); return;
      }
      case 'quali-start': {
        if (s.phase !== 'lobby') return;
        if (!s.order.length) return conn.send({ t: 'error', why: 'no-players' });
        s.cfg = cleanCfg(msg.cfg, s.cfg);
        s.nr++;
        s.quali = {
          nr: s.nr, seed: zufallsSeed(), art: s.cfg.art, nw: s.cfg.nw, stufe: s.cfg.stufe,
          startAt: now + VORLAUF_START, endAt: now + VORLAUF_START + s.cfg.qmin * 60000, open: true,
        };
        for (const pid of s.order) s.players[pid].q = null;
        s.final = null; s.phase = 'quali';
        await this.persist(); this.pushAll(); return;
      }
      case 'quali-schluss': {
        // Der Beamer meldet: Die Zeit des Qualifyings ist um → Endstand
        if (s.phase !== 'quali' || !s.quali || !s.quali.open || msg.nr !== s.quali.nr) return;
        if (now < s.quali.endAt) return;
        this.qualiSchliessen(s);
        await this.persist(); this.pushAll(); return;
      }
      case 'quali-end': {
        if (s.phase !== 'quali' || !s.quali) return;
        this.qualiSchliessen(s);
        s.phase = 'final-setup';
        s.final = { p: this.vorauswahl(s), state: 'setup' };
        await this.persist(); this.pushAll(); return;
      }
      case 'final-pick': {
        if (s.phase !== 'final-setup') return;
        const p = this.cleanFinalists(msg.p, s);
        if (!p) return;
        s.final = { p, state: 'setup' };
        await this.persist(); this.pushTeachers(); return;
      }
      case 'final-start': case 'revanche': {
        if (msg.t === 'final-start' && s.phase !== 'final-setup') return;
        if (msg.t === 'revanche' && s.phase !== 'podium') return;
        const p = msg.t === 'revanche' && f ? f.p.slice() : this.cleanFinalists(msg.p, s);
        if (!p || p.length < 2 || !p.every(pid => istCpu(pid) || s.players[pid]) || p.every(istCpu)) return conn.send({ t: 'error', why: 'final-players' });
        const on = this.online();
        if (!p.every(pid => istCpu(pid) || on.has(pid))) return conn.send({ t: 'error', why: 'final-offline' });
        if (msg.cfg) s.cfg = cleanCfg(msg.cfg, s.cfg);
        const seed = zufallsSeed(), c = s.cfg;
        s.nr++;
        const neu = {
          nr: s.nr, art: c.art, p, names: p.map(pid => istCpu(pid) ? cpuName(pid, p) : s.players[pid].name), seed,
          nwWahl: c.nw, nw: c.art === 'reihe' && c.nw === 'mix' ? NAEHRWERTE[mischSeed(seed, 6) % 4] : c.nw,
          stufe: c.stufe, zeit: c.zeit, sieg: c.sieg, round: 1, state: 'run', last: null, paused: false, haltNext: false,
          revanche: msg.t === 'revanche' ? ((f && f.revanche) || 0) + 1 : 0,
        };
        if (c.art === 'reihe') {
          neu.kette = kette(seed, neu.nw, REIHE_LAENGE + 1);
          neu.reihe = [neu.kette[0]];
          neu.st = p.map(() => ({ alive: true, res: null, gap: -1, dist: 0, ms: 0, total: 0, why: '', place: 0, out: 0 }));
        } else {
          Object.assign(neu, bedarfFinalRunde(seed, 1, neu.nwWahl));
          neu.st = p.map(() => ({ alive: true, res: null, pick: null, sum: 0, drueber: false, ms: 0, karten: 0, acc: 0, gewonnen: [], place: 0 }));
        }
        Object.assign(neu, rundenPlan(now + VORLAUF_START, neu.art, 1, neu.zeit));
        neu.first = true;
        this.cpuPlanen(neu);
        s.final = neu;
        s.phase = 'final';
        await this.persist(); this.pushAll(); return;
      }
      case 'tick': case 'runde-stopp': {
        // tick: Der Beamer meldet, dass die Zeit abgelaufen ist. runde-stopp: Die Lehrkraft beendet die Runde.
        if (!laeuft() || f.paused || !f.startAt || now < f.startAt) return;
        if (msg.t === 'tick' && (!f.deadline || now < f.deadline + GNADE)) return; // ohne Zeitlimit: nie
        const why = msg.t === 'tick' ? 'zeit' : 'stopp';
        this.cpuZuege(f, true);
        const dauer = msg.t === 'tick' ? zeitLimit(f.art, f.art === 'reihe' ? f.reihe.length : 0, f.zeit) : Math.round(now - f.startAt);
        f.st.forEach(x => {
          if (!x.alive || x.res) return;
          if (f.art === 'reihe') Object.assign(x, { res: 'fail', why, gap: -1, dist: 99, ms: dauer });
          else Object.assign(x, { res: 'ab', why, pick: [], sum: 0, drueber: false, ms: dauer });
        });
        return this.maybeResolve(s);
      }
      case 'cpu': {
        // Der Beamer meldet: Die Bedenkzeit einer CPU ist um → sie gibt ab
        if (!laeuft() || f.paused || !f.startAt) return;
        if (!this.cpuZuege(f, false)) return;
        return this.maybeResolve(s);
      }
      case 'halt': {
        // Pause: vor der nächsten Runde anhalten (z. B. um die Auflösung zu besprechen)
        if (s.phase !== 'final' || !f || f.state !== 'run' || msg.nr !== f.nr) return;
        if (f.startAt && now < f.startAt) { f.paused = true; f.startAt = 0; f.deadline = 0; }
        else f.haltNext = true;
        await this.persist(); this.pushAll(); return;
      }
      case 'weiter': {
        if (s.phase !== 'final' || !f || f.state !== 'run' || msg.nr !== f.nr) return;
        f.haltNext = false;
        if (f.paused) {
          f.paused = false;
          Object.assign(f, rundenPlan(now + VORLAUF_WEITER, f.art, f.art === 'reihe' ? f.reihe.length : 0, f.zeit));
        }
        await this.persist(); this.pushAll(); return;
      }
      case 'final-abort': case 'to-setup': {
        if (msg.t === 'final-abort' && s.phase !== 'final' && s.phase !== 'podium') return;
        if (msg.t === 'to-setup' && s.phase !== 'podium') return;
        s.final = { p: f ? f.p : [], state: 'setup' };
        s.phase = 'final-setup';
        await this.persist(); this.pushAll(); return;
      }
      // ---------- Klassenrunde
      case 'klasse-start': {
        if (s.phase !== 'lobby' && !(s.phase === 'klasse' && s.klasse && s.klasse.state === 'ende')) return;
        if (!s.order.length) return conn.send({ t: 'error', why: 'no-players' });
        s.cfg = cleanCfg(msg.cfg, s.cfg);
        this.klasseStart(s, now);
        await this.persist(); this.pushAll(); return;
      }
      case 'k-tick': case 'k-stopp': {
        const k = s.klasse;
        if (s.phase !== 'klasse' || !k || k.state !== 'run' || msg.nr !== k.nr || msg.r !== k.runde || !this.klasseOffen(k)) return;
        if (msg.t === 'k-tick' && (!k.deadline || now < k.deadline + GNADE)) return; // ohne Zeitlimit: nie
        return this.klasseAuswerten(s);
      }
      case 'k-halt': case 'k-weiter': {
        const k = s.klasse;
        if (s.phase !== 'klasse' || !k || k.state !== 'run' || msg.nr !== k.nr) return;
        if (msg.t === 'k-halt') {
          if (k.startAt && now < k.startAt) { k.paused = true; k.startAt = 0; k.deadline = 0; }
          else k.haltNext = true;
        } else {
          k.haltNext = false;
          if (k.paused) { k.paused = false; Object.assign(k, rundenPlan(now + VORLAUF_WEITER, k.art, k.art === 'reihe' ? k.reihe.length : 0, k.zeit)); }
        }
        await this.persist(); this.pushAll(); return;
      }
      case 'k-ende': {
        // Lehrkraft beendet die Klassenrunde vorzeitig
        const k = s.klasse;
        if (s.phase !== 'klasse' || !k || k.state !== 'run') return;
        if (this.klasseOffen(k) && Object.keys(k.antworten).length) { k.runden = k.runde; return this.klasseAuswerten(s); }
        if (k.art === 'reihe' && k.last && !k.last.aufgedeckt) this.reiheAufdecken(k, 'schluss', k.reihe.slice());
        k.state = 'ende'; k.startAt = 0; k.deadline = 0; k.paused = false; k.antworten = {};
        await this.persist(); this.pushAll(); return;
      }
      case 'klasse-final': {
        // Weiter zum Finale: Die Punkte der Klassenrunde sind die Rangliste
        const k = s.klasse;
        if (s.phase !== 'klasse' || !k || k.state !== 'ende') return;
        for (const pid of s.order) {
          const pk = k.punkte[pid];
          s.players[pid].q = pk ? { lvl: pk.p, acc: pk.richtig, ms: pk.ms, v: 0, fehler: 0, done: true, klasse: true } : null;
        }
        s.phase = 'final-setup';
        s.final = { p: this.vorauswahl(s), state: 'setup' };
        await this.persist(); this.pushAll(); return;
      }
      case 'to-lobby': {
        s.phase = 'lobby'; s.quali = null; s.final = null; s.klasse = null;
        for (const pid of s.order) s.players[pid].q = null;
        await this.persist(); this.pushAll(); return;
      }
      case 'wipe': {
        for (const c of this.io.conns()) { try { c.send({ t: 'ended' }); c.close(4000, 'ended'); } catch (e) {} }
        this.s = null; await this.io.wipe(); return;
      }
    }
  }

  qualiSchliessen(s) {
    s.quali.open = false;
    for (const pid of s.order) {
      const p = s.players[pid];
      if (!p.q) p.q = { lvl: 0, acc: 0, ms: 0, v: 0, fehler: 0, done: true };
      else p.q.done = true;
    }
  }

  // Finalisten prüfen. „cpu-leicht“, „cpu-mittel“, „cpu-schwer“ = Computergegner; jede CPU bekommt eine eigene Kennung je Platz.
  cleanFinalists(list, s) {
    if (!Array.isArray(list)) return null;
    const p = [];
    for (const raw of list.map(String)) {
      if (istCpu(raw)) p.push(raw.split('-').slice(0, 2).join('-') + '-' + (p.length + 1));
      else if (s.players[raw]) p.push(raw);
    }
    const menschen = p.filter(pid => !istCpu(pid));
    if (new Set(menschen).size !== menschen.length || p.length > 4) return null;
    return p;
  }
  // Vorauswahl fürs Finale: die Besten; ist nur eine Person da, spielt sie gegen die CPU (mittel)
  vorauswahl(s) {
    const p = this.ranking().slice(0, s.cfg.finalN);
    if (p.length === 1) p.push('cpu-mittel-2');
    return p;
  }

  async playerMsg(conn, msg, s, pid) {
    const now = this.io.now();
    switch (msg.t) {
      case 'join': {
        const name = cleanName(msg.first, msg.initial);
        if (!name) return conn.send({ t: 'error', why: 'bad-name' });
        let p = s.players[pid];
        if (!p) {
          if (s.order.length >= MAX_PLAYERS) return conn.send({ t: 'error', why: 'full' });
          let shown = name, n = 2;
          const taken = new Set(Object.values(s.players).map(x => x.name));
          while (taken.has(shown)) shown = name + ' ' + (n++);
          p = s.players[pid] = { name: shown, at: now, q: null };
          s.order.push(pid);
        }
        await this.persist();
        conn.send(this.youMsg(pid)); this.pushTeachers(); return;
      }
      case 'leave': {
        // „Nicht ich?“: Name freigeben, solange kein Spiel mit diesem Namen läuft
        const p = s.players[pid]; if (!p) return;
        if (s.final && s.final.p.includes(pid) && s.phase !== 'lobby') return;
        delete s.players[pid]; s.order = s.order.filter(x => x !== pid);
        await this.persist(); conn.send(this.youMsg(pid)); this.pushTeachers(); return;
      }
      case 'q': case 'q-fehler': {
        // Qualifying: q = im Versuch v jetzt lvl geschafft, q-fehler = Fehler im Versuch v.
        // Es zählt der beste Versuch (mehr geschafft, dann höhere Trefferquote, dann weniger Bedenkzeit).
        const p = s.players[pid], Q = s.quali;
        if (!p || !Q || s.phase !== 'quali' || !Q.open || msg.nr !== Q.nr) return;
        if (now > Q.endAt + SCHLUSS_GNADE) return;
        const v = int(msg.v, 1, 999, 1);
        if (!p.q) p.q = { lvl: 0, acc: 0, ms: 0, v: 0, fehler: 0, done: false };
        p.q.v = Math.max(p.q.v || 0, v);
        if (msg.t === 'q') {
          const lvl = int(msg.lvl, 1, Q.art === 'reihe' ? REIHE_LAENGE : MAX_SERIE, -1);
          if (lvl < 0) return;
          const neu = { lvl, acc: Q.art === 'bedarf' ? int(msg.acc, 0, 1000, 0) : 0, ms: ms(msg.ms) };
          if (p.q.lvl === 0 || vergleichQuali(neu, p.q) < 0) Object.assign(p.q, neu);
        } else {
          p.q.fehler = (p.q.fehler || 0) + 1;
        }
        await this.persist();
        this.pushTeachers();
        conn.send({ t: 'q-ok', best: p.q.lvl });
        return;
      }
      case 'k-reihe': case 'k-bedarf': {
        // Klassenrunde: eine Abgabe pro Runde (einordnen, zweifeln oder Lebensmittel auswählen)
        const k = s.klasse;
        if (s.phase !== 'klasse' || !k || k.state !== 'run' || msg.nr !== k.nr || msg.r !== k.runde) return;
        if (k.paused || !k.startAt || now < k.startAt - 1000) return;
        if (k.deadline && now > k.deadline + GNADE) return;
        if (!s.players[pid] || k.antworten[pid]) return;
        const limit = zeitLimit(k.art, k.art === 'reihe' ? k.reihe.length : 0, k.zeit);
        const dauer = limit ? Math.min(ms(msg.ms), limit) : ms(msg.ms);
        if (msg.t === 'k-reihe' && k.art === 'reihe') {
          if (msg.zweifel === true) {
            if (k.reihe.length < 2) return; // eine einzelne Karte kann nicht falsch liegen
            k.antworten[pid] = { zweifel: true, ms: dauer };
          } else {
            const gap = int(msg.gap, 0, k.reihe.length, -1);
            if (gap < 0) return;
            k.antworten[pid] = { gap, ms: dauer };
          }
        } else if (msg.t === 'k-bedarf' && k.art === 'bedarf') {
          const pick = sauberePick(msg.pick);
          if (!pick || !pick.length) return;
          k.antworten[pid] = { pick, ms: dauer };
        } else return;
        if (!k.punkte[pid]) k.punkte[pid] = neuePunkte();
        if (this.alleGeantwortet(s)) return this.klasseAuswerten(s);
        await this.persist();
        conn.send(this.youMsg(pid));
        this.klasseFortschritt(s);
        return;
      }
      case 'k-tick': {
        // Auch Handys melden das Ende der Zeit (falls der Beamer-Laptop schläft)
        const k = s.klasse;
        if (s.phase !== 'klasse' || !k || k.state !== 'run' || msg.nr !== k.nr || msg.r !== k.runde || !this.klasseOffen(k)) return;
        if (!k.deadline || now < k.deadline + GNADE) return;
        return this.klasseAuswerten(s);
      }
      case 'f-reihe': case 'f-bedarf': {
        const f = s.final;
        if (s.phase !== 'final' || !f || f.state !== 'run' || msg.nr !== f.nr || msg.r !== f.round) return;
        if (f.paused || !f.startAt || now < f.startAt - 1000) return;
        if (f.deadline && now > f.deadline + GNADE) return;
        const slot = f.p.indexOf(pid); if (slot < 0) return;
        const x = f.st[slot]; if (!x.alive || x.res) return;
        if (msg.t === 'f-reihe' && f.art === 'reihe') {
          const gap = int(msg.gap, 0, f.reihe.length, -1);
          if (gap < 0) return;
          this.abgabeReihe(f, slot, gap, ms(msg.ms));
        } else if (msg.t === 'f-bedarf' && f.art === 'bedarf') {
          const pick = sauberePick(msg.pick);
          if (!pick || !pick.length) return;
          this.abgabeBedarf(f, slot, pick, ms(msg.ms));
        } else return;
        return this.maybeResolve(s);
      }
    }
  }

  // Abgabe im Finale (Mensch oder CPU)
  abgabeReihe(f, slot, gap, dauer) {
    const x = f.st[slot], limit = zeitLimit(f.art, f.reihe.length, f.zeit);
    const richtig = richtigeLuecke(f.reihe, f.kette[f.round], f.nw);
    Object.assign(x, { gap, dist: Math.abs(gap - richtig), res: gap === richtig ? 'ok' : 'fail', why: gap === richtig ? '' : 'falsch', ms: limit ? Math.min(dauer, limit) : dauer });
  }
  abgabeBedarf(f, slot, pick, dauer) {
    const x = f.st[slot], limit = zeitLimit(f.art, 0, f.zeit);
    const e = bewerte(f.hand, pick, f.b);
    Object.assign(x, { res: 'ab', why: '', pick, sum: e.sum, drueber: e.drueber, ms: limit ? Math.min(dauer, limit) : dauer });
  }
  // CPU: Bedenkzeit und Antwort für die neue Runde festlegen (gleicher Startwert → nachvollziehbar)
  cpuPlanen(f) {
    f.cpu = f.p.map((pid, i) => {
      if (!istCpu(pid) || !f.st[i].alive) return null;
      const r = rng(mischSeed(f.seed, f.round, i, 99));
      const denk = cpuDenkzeit(f.art, r), stufe = pid.split('-')[1];
      return f.art === 'reihe'
        ? { denk, gap: cpuLuecke(f.reihe, f.kette[f.round], f.nw, stufe, r) }
        : { denk, pick: cpuAuswahl(f.hand, f.b, stufe, r) };
    });
  }
  // CPUs geben ab, deren Bedenkzeit um ist (alle = sofort). Rückgabe: ob eine CPU abgegeben hat
  cpuZuege(f, alle) {
    const now = this.io.now();
    let neu = false;
    (f.cpu || []).forEach((c, i) => {
      const x = f.st[i];
      if (!c || !x.alive || x.res || !f.startAt) return;
      if (!alle && now < f.startAt + c.denk - 300) return;
      if (f.art === 'reihe') this.abgabeReihe(f, i, c.gap, c.denk); else this.abgabeBedarf(f, i, c.pick, c.denk);
      neu = true;
    });
    return neu;
  }

  // Alle Verbliebenen haben geantwortet (oder die Zeit ist um): Runde auswerten
  async maybeResolve(s) {
    const f = s.final;
    // Haben alle Menschen abgegeben, wartet niemand auf die CPU
    if (f.st.every((x, i) => !x.alive || x.res || istCpu(f.p[i]))) this.cpuZuege(f, true);
    if (f.st.some(x => x.alive && !x.res)) {
      await this.persist(); this.pushAll(); return;
    }
    const now = this.io.now();
    let done = false;
    if (f.art === 'reihe') {
      const neu = f.kette[f.round];
      const luecke = richtigeLuecke(f.reihe, neu, f.nw);
      const tipps = f.st.map((x, i) => x.alive ? { slot: i, gap: x.gap, ok: x.res === 'ok', why: x.why } : null).filter(Boolean);
      const r = werteReihe(f.st);
      for (const i of r.out) f.st[i].out = f.round;
      f.last = { round: f.round, neu, luecke, reihe: f.reihe.slice(), tipps, keiner: r.keiner, raus: r.out };
      f.reihe.push(neu);
      done = r.done;
      if (!done && f.round >= f.kette.length - 1) {
        // Alle Karten eingeordnet und noch mehrere übrig: weniger Bedenkzeit insgesamt gewinnt
        const alive = f.st.map((x, i) => i).filter(i => f.st[i].alive).sort((a, b) => (f.st[a].total - f.st[b].total) || (a - b));
        alive.forEach((i, j) => { f.st[i].alive = false; f.st[i].place = j + 1; });
        f.last.alleKarten = true;
        done = true;
      }
    } else {
      const b = BEDARFSKARTEN[f.b], zielZ = zielZehntel(b);
      const r = werteBedarf(f.st, zielZ, f.sieg);
      for (const i of r.gewinner) f.st[i].gewonnen.push(f.b);
      f.last = {
        round: f.round, b: f.b, hand: f.hand, gewinner: r.gewinner,
        abgaben: f.st.map(x => ({ pick: x.pick || [], sum: x.sum, drueber: x.drueber, why: x.why })),
        beste: besteKombi(f.hand, b.wert, zielZ),
      };
      done = r.done || f.round >= MAX_RUNDEN_BEDARF;
      if (done) plaetzeBedarf(f.st);
    }
    if (done) {
      f.state = 'done'; f.endAt = now;
      s.phase = 'podium';
    } else {
      f.round++;
      f.first = false;
      if (f.art === 'bedarf') Object.assign(f, bedarfFinalRunde(f.seed, f.round, f.nwWahl));
      for (const x of f.st) if (x.alive) Object.assign(x, { res: null, why: '', ms: 0, gap: -1, dist: 0, pick: null, sum: 0, drueber: false });
      this.cpuPlanen(f);
      if (f.haltNext) { f.paused = true; f.haltNext = false; f.startAt = 0; f.deadline = 0; }
      else Object.assign(f, rundenPlan(now + PAUSE[f.art], f.art, f.art === 'reihe' ? f.reihe.length : 0, f.zeit));
    }
    await this.persist(); this.pushAll();
  }

  // ---------- Klassenrunde
  klasseStart(s, now) {
    const c = s.cfg, seed = zufallsSeed();
    s.nr++;
    const k = {
      nr: s.nr, art: c.art, nwWahl: c.nw, zeit: c.zeit, runden: c.runden, seed, runde: 1, gespielt: 0, state: 'run',
      last: null, paused: false, haltNext: false, first: true,
      antworten: {}, // Abgaben der laufenden Runde
      punkte: {},    // Punktestand je Person
      offen: {},     // Reihe: vorgemerkte Punkte fürs Einordnen (gutgeschrieben beim Aufdecken)
      zuletzt: {},   // eigenes Ergebnis der letzten Runde (für die Handys)
    };
    for (const pid of s.order) k.punkte[pid] = neuePunkte();
    if (k.art === 'reihe') { k.reiheNr = 0; this.neueReihe(k); }
    else Object.assign(k, bedarfFinalRunde(mischSeed(seed, 21), 1, k.nwWahl));
    Object.assign(k, rundenPlan(now + VORLAUF_START, k.art, k.art === 'reihe' ? k.reihe.length : 0, k.zeit));
    s.klasse = k; s.phase = 'klasse'; s.quali = null; s.final = null;
    for (const pid of s.order) s.players[pid].q = null;
  }
  neueReihe(k) {
    k.reiheNr++;
    k.nw = nwFuer(k.nwWahl, k.seed, k.reiheNr);
    k.kette = kette(mischSeed(k.seed, k.reiheNr, 31), k.nw, REIHE_LAENGE + 1);
    k.reihe = [k.kette[0]]; // gelegte Reihenfolge von unten nach oben, kann Fehler enthalten
    k.kPos = 1;             // nächste Karte aus der Kette
  }
  klasseOffen(k) { return !k.paused && !!k.startAt && this.io.now() >= k.startAt; }
  // Haben alle verbundenen Personen abgegeben? (Wer nicht verbunden ist, hält das Spiel nicht auf)
  alleGeantwortet(s) {
    const k = s.klasse, on = this.online();
    const da = s.order.filter(pid => on.has(pid));
    return da.length > 0 && da.every(pid => k.antworten[pid]);
  }
  // Kurze Fortschrittsmeldung an den Beamer (statt jedes Mal den ganzen Raum zu schicken)
  klasseFortschritt(s) {
    const k = s.klasse, on = this.online();
    const out = JSON.stringify({ t: 'kp', nr: k.nr, r: k.runde, n: Object.keys(k.antworten).length, von: s.order.filter(pid => on.has(pid)).length });
    for (const c of this.io.conns()) if ((c.meta || {}).role === 'teacher') c.sendRaw(out);
  }
  async klasseAuswerten(s) {
    const k = s.klasse, now = this.io.now();
    k.zuletzt = {};
    for (const [pid, a] of Object.entries(k.antworten)) {
      const pk = k.punkte[pid] || (k.punkte[pid] = neuePunkte());
      pk.ms += a.ms || 0; pk.runden++;
    }
    const pause = k.art === 'reihe' ? this.klasseReihe(s) : this.klasseBedarf(s);
    k.antworten = {};
    k.gespielt++;
    if (k.runde >= k.runden) {
      if (k.art === 'reihe' && !k.last.aufgedeckt) this.reiheAufdecken(k, 'schluss', k.reihe.slice());
      k.state = 'ende'; k.endAt = now; k.startAt = 0; k.deadline = 0;
    } else {
      k.runde++; k.first = false;
      if (k.art === 'bedarf') Object.assign(k, bedarfFinalRunde(mischSeed(k.seed, 21), k.runde, k.nwWahl));
      if (k.haltNext) { k.paused = true; k.haltNext = false; k.startAt = 0; k.deadline = 0; }
      else Object.assign(k, rundenPlan(now + pause, k.art, k.art === 'reihe' ? k.reihe.length : 0, k.zeit));
    }
    await this.persist(); this.pushAll();
  }
  // Reihe: Die neue Karte kommt dorthin, wo die Mehrheit sie hingelegt hat (auch wenn das falsch ist).
  // Zweifelt jemand, wird die Reihe aufgedeckt und beginnt danach neu (wie am Tisch).
  klasseReihe(s) {
    const k = s.klasse, nw = k.nw, neu = k.kette[k.kPos], vor = k.reihe.slice();
    const ant = Object.entries(k.antworten);
    const zweifler = ant.filter(([, a]) => a.zweifel).map(([pid]) => pid);
    const leger = ant.filter(([, a]) => a.gap >= 0);
    for (const [pid, a] of leger) {
      const o = k.offen[pid] || (k.offen[pid] = { p: 0, richtig: 0 });
      if (passtLuecke(vor, neu, nw, a.gap)) { o.p += PUNKTE.richtig; o.richtig++; }
      k.zuletzt[pid] = { gap: a.gap };
    }
    const m = mehrheit(leger.map(([, a]) => a.gap), vor.length);
    const L = k.last = {
      runde: k.runde, art: 'reihe', nw, neu, vor, stimmen: m.stimmen, gap: m.gap, anzahl: ant.length, gelegt: leger.length,
      zweifler: zweifler.map(pid => s.players[pid] ? s.players[pid].name : '?'), aufgedeckt: '',
    };
    if (zweifler.length) {
      const fehler = reiheFehler(vor, nw).length > 0;
      L.zweifelRecht = fehler;
      // Erst die Punkte fürs Einordnen gutschreiben, dann den Zweifel werten. Die neue Karte kommt nicht mehr in die Reihe.
      this.reiheAufdecken(k, 'zweifel', vor);
      for (const pid of zweifler) {
        const pk = k.punkte[pid], vorher = pk.p;
        if (fehler) pk.zweifelOk++; else pk.zweifelFalsch++;
        pk.p = Math.max(0, pk.p + (fehler ? PUNKTE.zweifelRichtig : PUNKTE.zweifelFalsch));
        Object.assign(k.zuletzt[pid] || (k.zuletzt[pid] = {}), { zweifel: true, plus: pk.p - vorher });
      }
      return KLASSE_PAUSE.aufgedeckt;
    }
    if (m.gap >= 0) k.reihe.splice(m.gap, 0, neu);
    k.kPos++;
    if (k.kPos >= k.kette.length) { this.reiheAufdecken(k, 'voll', k.reihe.slice()); return KLASSE_PAUSE.aufgedeckt; }
    return KLASSE_PAUSE.reihe;
  }
  // Reihe aufdecken: Fehler zeigen, vorgemerkte Punkte gutschreiben, neue Reihe beginnen
  reiheAufdecken(k, grund, reihe) {
    const L = k.last;
    L.aufgedeckt = grund; L.offen = reihe; L.fehler = reiheFehler(reihe, L.nw);
    for (const [pid, o] of Object.entries(k.offen)) {
      const pk = k.punkte[pid] || (k.punkte[pid] = neuePunkte());
      pk.p += o.p; pk.richtig += o.richtig;
      (k.zuletzt[pid] || (k.zuletzt[pid] = {})).reihePlus = o.p;
    }
    k.offen = {};
    this.neueReihe(k);
  }
  // Bedarf: alle dieselbe Bedarfskarte und dieselben 10 Lebensmittel, Punkte nach Nähe zum Zielwert
  klasseBedarf(s) {
    const k = s.klasse, b = BEDARFSKARTEN[k.b], zielZ = zielZehntel(b);
    const beste = besteKombi(k.hand, b.wert, zielZ);
    const verteilung = { beste: 0, gut: 0, ok: 0, wenig: 0, drueber: 0 };
    const haeufig = k.hand.map(() => 0);
    for (const [pid, a] of Object.entries(k.antworten)) {
      const e = bewerte(k.hand, a.pick, k.b);
      const plus = bedarfPunkte(e.sum, zielZ, beste.sum);
      const pk = k.punkte[pid];
      pk.p += plus; if (plus > 0) pk.richtig++;
      verteilung[e.drueber ? 'drueber' : plus === PUNKTE.beste ? 'beste' : plus === PUNKTE.gut ? 'gut' : plus === PUNKTE.ok ? 'ok' : 'wenig']++;
      for (const i of a.pick) haeufig[i]++;
      k.zuletzt[pid] = { pick: a.pick, sum: e.sum, drueber: e.drueber, plus };
    }
    k.last = { runde: k.runde, art: 'bedarf', b: k.b, hand: k.hand, beste, verteilung, haeufig, anzahl: Object.keys(k.antworten).length };
    return KLASSE_PAUSE.bedarf;
  }
  klasseRanking() {
    const s = this.s, k = s.klasse;
    const list = s.order.filter(pid => s.players[pid]);
    const P = pid => k.punkte[pid] || neuePunkte();
    list.sort((a, b) => (P(b).p - P(a).p) || (P(b).richtig - P(a).richtig) || (P(a).ms - P(b).ms) || (s.players[a].at - s.players[b].at));
    return list;
  }
  klasseView(full, pid, rk) {
    const s = this.s, k = s.klasse;
    if (!k) return null;
    const v = {
      nr: k.nr, art: k.art, state: k.state, runde: k.runde, runden: k.runden, gespielt: k.gespielt,
      startAt: k.startAt, deadline: k.deadline, paused: k.paused, haltNext: k.haltNext, first: k.first, zeit: k.zeit, nwWahl: k.nwWahl,
      last: k.last, anzahl: Object.keys(k.antworten).length,
    };
    if (k.art === 'reihe') { v.nw = k.nw; v.reihe = k.reihe; v.neu = k.state === 'run' ? k.kette[k.kPos] : null; v.reiheNr = k.reiheNr; v.kPos = k.kPos; v.kLen = k.kette.length - 1; }
    else { v.b = k.b; v.hand = k.hand; }
    rk = rk || this.klasseRanking();
    const eintrag = id => { const pk = k.punkte[id] || neuePunkte(); return { pid: id, name: s.players[id].name, p: pk.p, richtig: pk.richtig, zweifelOk: pk.zweifelOk, zweifelFalsch: pk.zweifelFalsch }; };
    if (full) { v.rangliste = rk.map(eintrag); v.beantwortet = Object.keys(k.antworten); }
    else {
      v.top = rk.slice(0, 3).map(eintrag);
      const pk = k.punkte[pid] || neuePunkte();
      // Gleiche Punktzahl = gleicher Platz
      const platz = 1 + rk.filter(id => (k.punkte[id] || neuePunkte()).p > pk.p).length;
      v.me = { p: pk.p, platz, von: rk.length, abgegeben: k.antworten[pid] || null, zuletzt: k.zuletzt[pid] || null };
    }
    return v;
  }

  // ---------- Sicht auf den Raum
  online() {
    const set = new Set();
    for (const c of this.io.conns()) { const m = c.meta || {}; if (m.role === 'player' && c.ws !== this.closing) set.add(m.pid); }
    return set;
  }
  ranking() {
    const s = this.s;
    const list = s.order.filter(p => s.players[p] && s.players[p].q);
    list.sort((a, b) => vergleichQuali(s.players[a].q, s.players[b].q) || s.players[a].at - s.players[b].at);
    return list;
  }
  // Finale für Beamer (full) und Handys: Abgaben der anderen erst nach der Auswertung
  finalView(f, full) {
    if (!f) return null;
    if (f.state === 'setup') return { state: 'setup', p: f.p };
    const v = {
      nr: f.nr, art: f.art, state: f.state, p: f.p, names: f.names, nw: f.nw, nwWahl: f.nwWahl, stufe: f.stufe, zeit: f.zeit, sieg: f.sieg,
      round: f.round, startAt: f.startAt, deadline: f.deadline, paused: f.paused, haltNext: f.haltNext, first: f.first, last: f.last, revanche: f.revanche,
      alive: f.st.map(x => x.alive), places: f.state === 'done' ? f.st.map(x => x.place) : null,
      abgegeben: f.st.map(x => !!x.res),
      cpuAt: (f.cpu || []).map(c => c && f.startAt ? f.startAt + c.denk : 0),
    };
    if (f.art === 'reihe') {
      v.reihe = f.reihe; v.neu = f.state === 'run' ? f.kette[f.round] : null; v.total = f.kette.length - 1;
      v.outRound = f.st.map(x => x.out);
    } else {
      v.b = f.b; v.hand = f.hand; v.karten = f.st.map(x => x.karten); v.gewonnen = f.st.map(x => x.gewonnen);
    }
    if (full) v.st = f.st;
    return v;
  }
  roomMsg() {
    const s = this.s, on = this.online(), rank = this.ranking();
    const players = s.order.filter(p => s.players[p]).map(pid => {
      const p = s.players[pid];
      return { pid, name: p.name, q: p.q, online: on.has(pid), rank: rank.indexOf(pid) + 1 };
    });
    const f = this.finalView(s.final, true);
    if (f) f.online = f.p.map(pid => istCpu(pid) || on.has(pid));
    const klasse = s.phase === 'klasse' ? this.klasseView(true) : null;
    if (klasse) klasse.online = players.filter(p => p.online).length;
    return { t: 'room', code: s.code, phase: s.phase, cfg: s.cfg, quali: s.quali, players, now: this.io.now(), final: f, klasse };
  }
  youMsg(pid, rk) {
    const s = this.s, p = s.players[pid] || null, f = s.final;
    const rank = this.ranking(), r = rank.indexOf(pid);
    let final = null;
    if (f && f.state !== 'setup' && (s.phase === 'final' || s.phase === 'podium')) {
      const slot = f.p.indexOf(pid);
      final = this.finalView(f, false);
      final.slot = slot;
      final.me = slot >= 0 ? f.st[slot] : null;
    } else if (f && s.phase === 'final-setup') {
      final = { state: 'setup', chosen: f.p.includes(pid) };
    }
    const Q = s.quali;
    return {
      t: 'you', phase: s.phase, now: this.io.now(), cfg: { art: s.cfg.art, nw: s.cfg.nw, stufe: s.cfg.stufe },
      me: p ? { name: p.name, q: p.q, rank: r + 1, of: rank.length } : null,
      quali: Q ? { nr: Q.nr, seed: Q.seed, art: Q.art, nw: Q.nw, stufe: Q.stufe, startAt: Q.startAt, endAt: Q.endAt, open: Q.open } : null,
      final,
      klasse: s.phase === 'klasse' && p ? this.klasseView(false, pid, rk) : null,
    };
  }
  pushTeachers() {
    if (!this.s) return;
    let msg = null;
    for (const c of this.io.conns()) if ((c.meta || {}).role === 'teacher') { msg = msg || JSON.stringify(this.roomMsg()); c.sendRaw(msg); }
  }
  pushPlayers() {
    if (!this.s) return;
    const rk = this.s.phase === 'klasse' && this.s.klasse ? this.klasseRanking() : null; // einmal sortieren, nicht für jedes Handy
    for (const c of this.io.conns()) { const m = c.meta || {}; if (m.role === 'player') c.send(this.youMsg(m.pid, rk)); }
  }
  pushAll() { this.pushTeachers(); this.pushPlayers(); }
}
