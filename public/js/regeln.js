/*
 * Spielregeln, Zeiten und Zufall. Diese Datei lesen Handys, Beamer UND der Cloudflare-Dienst.
 * Die Inhalte (Lebensmittel, Bedarfskarten) stehen in inhalte.js.
 */
import { LEBENSMITTEL, BEDARFSKARTEN, ABSTAND, TREFFER_PROZENT } from './inhalte.js';

export const SPIELARTEN = ['reihe', 'bedarf'];
export const ART_TEXT = {
  reihe: { name: 'Reihe', kurz: 'Lebensmittel nach dem Nährwert ordnen: Wo gehört die neue Karte hin?' },
  bedarf: { name: 'Bedarf', kurz: 'Bis zu 5 Lebensmittel kombinieren und den Zielwert der Bedarfskarte treffen, ohne ihn zu überschreiten.' },
};

export const NAEHRWERTE = ['kcal', 'fett', 'kh', 'eiweiss'];
export const NW = {
  kcal: { name: 'Kalorien', einheit: 'kcal', mehr: 'mehr Kalorien', weniger: 'weniger Kalorien', farbe: '#6fa8dc' },
  fett: { name: 'Fett', einheit: 'g', mehr: 'mehr Fett', weniger: 'weniger Fett', farbe: '#f0b23a' },
  kh: { name: 'Kohlenhydrate', einheit: 'g', mehr: 'mehr Kohlenhydrate', weniger: 'weniger Kohlenhydrate', farbe: '#4cc77a' },
  eiweiss: { name: 'Eiweiß', einheit: 'g', mehr: 'mehr Eiweiß', weniger: 'weniger Eiweiß', farbe: '#a678d8' },
};
export const NW_WAHL = ['kcal', 'fett', 'kh', 'eiweiss', 'mix'];
export const NW_WAHL_TEXT = { kcal: 'Kalorien', fett: 'Fett', kh: 'Kohlenhydrate', eiweiss: 'Eiweiß', mix: 'Gemischt' };
export const nwWahlKurz = (art, nw) => nw === 'mix'
  ? (art === 'reihe' ? 'Jeder Versuch mit einem anderen Nährwert. Im Finale wird ein Nährwert ausgelost.' : 'Bedarfskarten mit Kalorien, Fett, Kohlenhydraten und Eiweiß gemischt.')
  : (art === 'reihe' ? `Geordnet wird nach ${NW[nw].name === 'Kalorien' ? 'den Kalorien (Energie)' : NW[nw].name}.` : `Nur Bedarfskarten mit ${NW[nw].name}.`);

export const STUFEN = ['offen', 'verdeckt'];   // Spielart „Reihe“: Werte der Reihe sichtbar oder verdeckt
export const STUFE_TEXT = {
  offen: { name: 'Einfach', kurz: 'Die Werte der Karten in der Reihe sind sichtbar. Schätzen musst du nur die neue Karte.' },
  verdeckt: { name: 'Schwer', kurz: 'Alle Werte bleiben verdeckt (wie am Tisch). Aufgedeckt wird erst bei der Auflösung.' },
};
export const ZEITEN = ['an', 'aus'];
export const ZEIT_TEXT = {
  an: { name: 'Mit Zeitlimit', kurz: 'Im Finale: Reihe 30 Sekunden plus 3 Sekunden pro Karte der Reihe, Bedarf 2 Minuten. Getestet wird Wissen, nicht Tempo.' },
  aus: { name: 'Ohne Zeitlimit', kurz: 'Im Finale wartet das Spiel, bis alle abgegeben haben. Hängt eine Runde, beendest du sie mit „Runde beenden“.' },
};
export const QUALI_MINUTEN = [2, 3, 5];
export const FINAL_GROESSEN = [2, 3, 4];
export const SIEG_KARTEN = [3, 5];               // Spielart „Bedarf“, Finale: so viele Bedarfskarten braucht man zum Sieg
export const QUALI_TEXT = 'Alle spielen gleichzeitig. Nach einem Fehler geht es mit einem neuen Versuch weiter. Es zählt der beste Versuch.';

export const REIHE_LAENGE = 12;  // so viele Karten werden pro Versuch bzw. im Finale eingeordnet (dazu kommt die Startkarte)
export const HAND = 10;          // Spielart „Bedarf“: Handkarten
export const MAX_AUSWAHL = 5;    // davon höchstens so viele auslegen
export const MAX_SERIE = 999;

// Zeiten (ms)
export const VORLAUF_START = 5000;   // Countdown vor der ersten Finalrunde
export const PAUSE = { reihe: 9000, bedarf: 15000 }; // Auflösung zeigen, dann nächste Runde
export const VORLAUF_WEITER = 3000;  // nach „Weiter“ (wenn die Lehrkraft angehalten hatte)
export const GNADE = 1500;           // so lange nach Ablauf der Zeit werden Antworten noch angenommen (Netz)
export const SCHLUSS_GNADE = 3000;   // so lange nach Ende des Qualifyings zählen Ergebnisse noch (Netz)

// Zeit für eine Finalrunde: sehr großzügig, getestet wird Wissen, nicht Tempo. zeit = 'aus' → 0 (kein Limit)
export function zeitLimit(art, reiheLen, zeit = 'an') {
  if (zeit === 'aus') return 0;
  return art === 'bedarf' ? 120000 : 30000 + 3000 * reiheLen;
}
export function rundenPlan(startAt, art, reiheLen, zeit) {
  const limit = zeitLimit(art, reiheLen, zeit);
  return { startAt, deadline: limit ? startAt + limit : 0 };
}

// ---------------------------------------------------------------- Zahlen
export const wert = (lm, nw) => Number(lm[nw]) || 0;
export const zehntel = v => Math.round(Number(v) * 10); // rechnen in Zehnteln, damit 0,1 + 0,2 genau 0,3 bleibt
export function zahl(v, nw) {
  if (nw === 'kcal') return String(Math.round(v));
  return (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
}
export const mitEinheit = (v, nw) => zahl(v, nw) + ' ' + NW[nw].einheit;
// Für Sätze: „30,6 g Fett je 100 g“ bzw. „191 kcal je 100 g“
export const proHundert = (v, nw) => nw === 'kcal' ? `${zahl(v, nw)} kcal je 100 g` : `${zahl(v, nw)} g ${NW[nw].name} je 100 g`;
export const prozentText = z => (Math.round(z / 10)) + ' %'; // z in Zehntel-Prozent

// ---------------------------------------------------------------- Zufall
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Mehrere Zahlen zu einem neuen Startwert verrühren
export function mischSeed(...n) {
  let h = 0x811c9dc5;
  for (const x of n) { h ^= (x >>> 0); h = Math.imul(h, 0x01000193) >>> 0; h ^= h >>> 13; }
  return h >>> 0;
}
function mische(arr, r) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function zufallsSeed() {
  if (globalThis.crypto && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 4294967296);
}

// ---------------------------------------------------------------- Spielart „Reihe“
// Zwei Werte sind „deutlich verschieden“, wenn sie mindestens ABSTAND auseinanderliegen
export function deutlich(a, b, nw) {
  const d = Math.abs(a - b), mx = Math.max(Math.abs(a), Math.abs(b));
  const min = nw === 'kcal' ? ABSTAND.kcal : ABSTAND.gramm;
  return d >= min - 1e-9 && d >= mx * ABSTAND.prozent / 100 - 1e-9;
}
/**
 * Karten für eine Reihe: len Lebensmittel (Indizes), deren Werte sich paarweise deutlich unterscheiden.
 * Die erste Karte ist die Startkarte, danach kommen die Karten in der Reihenfolge, in der sie eingeordnet werden.
 */
export function kette(seed, nw, len = REIHE_LAENGE + 1) {
  let best = [];
  for (let versuch = 0; versuch < 60; versuch++) {
    const r = rng(mischSeed(seed, versuch, 77));
    const reihe = [];
    for (const i of mische(LEBENSMITTEL.map((_, k) => k), r)) {
      if (reihe.every(j => deutlich(wert(LEBENSMITTEL[i], nw), wert(LEBENSMITTEL[j], nw), nw))) reihe.push(i);
      if (reihe.length === len) return reihe;
    }
    if (reihe.length > best.length) best = reihe;
  }
  return best;
}
// Nährwert eines Versuchs (bei „Gemischt“ wechselt er von Versuch zu Versuch)
export function nwFuer(nwWahl, seed, v) {
  if (nwWahl !== 'mix') return nwWahl;
  return NAEHRWERTE[(mischSeed(seed, 5) + v) % 4];
}
// Karten der Reihe aufsteigend sortiert (Indizes)
export const sortiert = (idx, nw) => idx.slice().sort((a, b) => wert(LEBENSMITTEL[a], nw) - wert(LEBENSMITTEL[b], nw));
// Richtige Lücke: Anzahl der Karten in der Reihe mit kleinerem Wert (0 = ganz unten, reihe.length = ganz oben)
export function richtigeLuecke(reiheIdx, neu, nw) {
  const x = wert(LEBENSMITTEL[neu], nw);
  return reiheIdx.filter(i => wert(LEBENSMITTEL[i], nw) < x).length;
}
// Ein Versuch im Qualifying: alle bekommen im v-ten Versuch dieselben Karten
export function reiheVersuch(seed, v, nwWahl) {
  const nw = nwFuer(nwWahl, seed, v);
  return { nw, karten: kette(mischSeed(seed, v, 1), nw) };
}

// ---------------------------------------------------------------- Spielart „Bedarf“
export const zielZehntel = b => zehntel(b.ziel);
export const untergrenze = b => Math.ceil(zielZehntel(b) * TREFFER_PROZENT / 100);
export const summe = (pick, nw) => pick.reduce((s, i) => s + zehntel(wert(LEBENSMITTEL[i], nw)), 0);

// Beste Auswahl aus der Hand: höchste Summe, die den Zielwert nicht überschreitet (bei Gleichstand weniger Karten)
export function besteKombi(hand, nw, zielZ, max = MAX_AUSWAHL) {
  return besteMitWerten(hand, hand.map(i => zehntel(wert(LEBENSMITTEL[i], nw))), zielZ, max);
}
// Wie besteKombi, aber mit vorgegebenen Werten (w[k] gehört zu hand[k]) – z. B. geschätzte Werte der CPU
export function besteMitWerten(hand, w, zielZ, max = MAX_AUSWAHL) {
  let best = { pick: [], sum: 0 };
  const n = hand.length, cur = [];
  (function such(start, s) {
    if (cur.length && (s > best.sum || (s === best.sum && cur.length < best.pick.length))) best = { pick: cur.map(k => hand[k]), sum: s };
    if (cur.length === max) return;
    for (let k = start; k < n; k++) {
      if (s + w[k] > zielZ) continue;
      cur.push(k); such(k + 1, s + w[k]); cur.pop();
    }
  })(0, 0);
  return best;
}
// Bedarfskarten (Indizes) gemischt, bei einem Nährwert nur dessen Karten
export function bedarfsStapel(seed, nwWahl) {
  const idx = BEDARFSKARTEN.map((_, i) => i).filter(i => nwWahl === 'mix' || BEDARFSKARTEN[i].wert === nwWahl);
  return mische(idx.length ? idx : BEDARFSKARTEN.map((_, i) => i), rng(mischSeed(seed, 2)));
}
// 10 Handkarten, mit denen der Zielwert (mindestens TREFFER_PROZENT, höchstens 100 %) erreichbar ist
export function hand(seed, bIdx) {
  const b = BEDARFSKARTEN[bIdx], zielZ = zielZehntel(b), unten = untergrenze(b);
  const r = rng(mischSeed(seed, 3));
  let h = [];
  for (let versuch = 0; versuch < 400; versuch++) {
    h = mische(LEBENSMITTEL.map((_, k) => k), r).slice(0, HAND);
    const best = besteKombi(h, b.wert, zielZ);
    // lösbar: Die beste Auswahl liegt im Treffer-Bereich
    if (best.pick.length && best.sum >= unten) return h;
  }
  return h;
}
// Runde i (ab 0) im v-ten Versuch des Qualifyings
export function bedarfRunde(seed, v, i, nwWahl) {
  const st = bedarfsStapel(mischSeed(seed, v, 9), nwWahl);
  const bIdx = st[i % st.length];
  return { b: bIdx, hand: hand(mischSeed(seed, v, i, 11), bIdx) };
}
// Runde r (ab 1) im Finale
export function bedarfFinalRunde(seed, r, nwWahl) {
  const st = bedarfsStapel(mischSeed(seed, 4), nwWahl);
  const bIdx = st[(r - 1) % st.length];
  return { b: bIdx, hand: hand(mischSeed(seed, r, 13), bIdx) };
}
// Auswahl prüfen: Indizes in die Hand (0 … HAND-1), ohne Doppelte, 1 bis MAX_AUSWAHL
export function sauberePick(p, handLen = HAND) {
  if (!Array.isArray(p)) return null;
  const out = [...new Set(p.map(Number).filter(x => Number.isInteger(x) && x >= 0 && x < handLen))];
  if (out.length !== p.length || out.length > MAX_AUSWAHL) return null;
  return out.sort((a, b) => a - b);
}
// Ergebnis einer Auswahl: sum (Zehntel), ok (im Treffer-Bereich, nur Qualifying), drueber, acc (Zehntel-Prozent)
export function bewerte(handIdx, pickPos, bIdx) {
  const b = BEDARFSKARTEN[bIdx], zielZ = zielZehntel(b);
  const pick = pickPos.map(k => handIdx[k]);
  const sum = summe(pick, b.wert);
  const drueber = sum > zielZ;
  return { sum, drueber, ok: pick.length > 0 && !drueber && sum >= untergrenze(b), acc: drueber ? 0 : Math.round(sum * 1000 / zielZ) };
}

// ---------------------------------------------------------------- Rangliste im Qualifying
// lvl = richtig eingeordnete Karten (Reihe) bzw. geschaffte Bedarfskarten in Serie (Bedarf)
// acc = nur Bedarf: durchschnittliche Trefferquote in Zehntel-Prozent (höher = näher dran)
// ms  = Bedenkzeit in diesem Versuch (kleiner = besser)
export function vergleichQuali(a, b) {
  return (b.lvl - a.lvl) || ((b.acc || 0) - (a.acc || 0)) || (a.ms - b.ms);
}

// ---------------------------------------------------------------- Klassenrunde (alle gleichzeitig)
export const KLASSE_RUNDEN = [10, 15, 20];
export const KLASSE_TEXT = 'Die ganze Klasse spielt gleichzeitig. Jede Runde kommt eine neue Karte bzw. Bedarfskarte, die Auflösung kommt am Beamer.';
// Punkte in der Klassenrunde
export const PUNKTE = {
  richtig: 1,         // Reihe: Karte an eine passende Stelle gelegt (wird erst beim Aufdecken gutgeschrieben)
  zweifelRichtig: 3,  // Reihe: gezweifelt, und die Reihe hatte wirklich einen Fehler
  zweifelFalsch: -2,  // Reihe: gezweifelt, aber die Reihe war richtig (der Punktestand fällt nie unter 0)
  beste: 3,           // Bedarf: die beste mögliche Kombination getroffen
  gut: 2,             // Bedarf: mindestens 90 % des Zielwerts, ohne zu überschreiten
  ok: 1,              // Bedarf: mindestens TREFFER_PROZENT (80 %) des Zielwerts
};
// Pause nach einer Runde: Auflösung zeigen (Reihe aufgedeckt dauert länger)
export const KLASSE_PAUSE = { reihe: 7000, aufgedeckt: 14000, bedarf: 13000 };

// Klassen-Reihe in gelegter Reihenfolge (unten → oben): Wo steht eine Karte falsch?
// Rückgabe: Positionen p, an denen Karte p mehr hat als Karte p+1 darüber.
export function reiheFehler(geordnet, nw) {
  const out = [];
  for (let p = 0; p + 1 < geordnet.length; p++) if (wert(LEBENSMITTEL[geordnet[p]], nw) > wert(LEBENSMITTEL[geordnet[p + 1]], nw)) out.push(p);
  return out;
}
// Passt die neue Karte in Lücke g der gelegten Reihe? (Nachbarn unten kleiner, oben größer)
export function passtLuecke(geordnet, neu, nw, g) {
  const x = wert(LEBENSMITTEL[neu], nw);
  const unten = g > 0 ? wert(LEBENSMITTEL[geordnet[g - 1]], nw) : -Infinity;
  const oben = g < geordnet.length ? wert(LEBENSMITTEL[geordnet[g]], nw) : Infinity;
  return unten < x && x < oben;
}
// Mehrheit: Lücke mit den meisten Stimmen (bei Gleichstand die untere)
export function mehrheit(gaps, n) {
  const stimmen = Array.from({ length: n + 1 }, () => 0);
  for (const g of gaps) if (g >= 0 && g <= n) stimmen[g]++;
  let best = -1;
  stimmen.forEach((c, g) => { if (c > 0 && (best < 0 || c > stimmen[best])) best = g; });
  return { gap: best, stimmen };
}
// Bedarf: Punkte für eine Abgabe (Summe und Zielwert in Zehnteln, best = beste mögliche Summe)
export function bedarfPunkte(sumZ, zielZ, bestZ, leer = false) {
  if (leer || sumZ > zielZ) return 0;
  if (sumZ === bestZ) return PUNKTE.beste;
  if (sumZ * 100 >= zielZ * 90) return PUNKTE.gut;
  if (sumZ * 100 >= zielZ * TREFFER_PROZENT) return PUNKTE.ok;
  return 0;
}

// ---------------------------------------------------------------- Computergegner (CPU) im Finale
// Die CPU schätzt Nährwerte wie ein Mensch: mit einem Schätzfehler. Leicht schätzt grob, schwer fast genau.
// Deshalb macht sie vor allem bei knappen Entscheidungen Fehler.
export const CPU_STUFEN = ['leicht', 'mittel', 'schwer'];
export const CPU_FEHLER = { leicht: 0.75, mittel: 0.4, schwer: 0.14 }; // Reihe: Streuung der Schätzung (log-normal)
// Bedarf: Beim Kombinieren addieren sich Schätzfehler, darum kleinere Streuung und ein Sicherheitsabstand zum Zielwert
export const CPU_BEDARF = { leicht: { fehler: 0.45, ziel: 0.85 }, mittel: { fehler: 0.22, ziel: 0.9 }, schwer: { fehler: 0.07, ziel: 0.96 } };
export const istCpu = pid => typeof pid === 'string' && /^cpu-(leicht|mittel|schwer)(-\d)?$/.test(pid);
export const cpuStufe = pid => istCpu(pid) ? pid.split('-')[1] : null;
// Name im Spiel, z. B. „CPU (mittel)“ bzw. „CPU 2 (mittel)“, wenn mehrere CPUs mitspielen
export function cpuName(pid, alle = [pid]) {
  const cpus = alle.filter(istCpu);
  const nr = cpus.length > 1 ? ' ' + (cpus.indexOf(pid) + 1) : '';
  return `CPU${nr} (${cpuStufe(pid)})`;
}
function normal(r) { // Standardnormalverteilt (Box-Muller)
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const schaetze = (x, fehler, r) => x * Math.exp(fehler * normal(r));
// Bedenkzeit der CPU in ms (sie antwortet sofort, sobald alle Menschen abgegeben haben)
export const cpuDenkzeit = (art, r) => Math.round(art === 'bedarf' ? 8000 + r() * 12000 : 3000 + r() * 6000);
// Reihe: In welche Lücke legt die CPU die neue Karte? (Die Reihe im Finale ist immer richtig sortiert)
export function cpuLuecke(reiheIdx, neu, nw, stufe, r) {
  const x = schaetze(wert(LEBENSMITTEL[neu], nw), CPU_FEHLER[stufe] || CPU_FEHLER.mittel, r);
  return reiheIdx.filter(i => wert(LEBENSMITTEL[i], nw) < x).length;
}
// Bedarf: Welche Lebensmittel (Positionen in der Hand) wählt die CPU? Sie zielt knapp unter den Zielwert.
export function cpuAuswahl(handIdx, bIdx, stufe, r) {
  const b = BEDARFSKARTEN[bIdx], c = CPU_BEDARF[stufe] || CPU_BEDARF.mittel;
  const w = handIdx.map(i => zehntel(schaetze(wert(LEBENSMITTEL[i], b.wert), c.fehler, r)));
  const best = besteMitWerten(handIdx.map((_, k) => k), w, Math.floor(zielZehntel(b) * c.ziel));
  return best.pick.length ? best.pick.sort((x, y) => x - y) : [w.indexOf(Math.min(...w))];
}
