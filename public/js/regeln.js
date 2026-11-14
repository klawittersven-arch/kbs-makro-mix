/*
 * Spielregeln, Zeiten und Zufall. Diese Datei lesen Handys, Beamer UND der Cloudflare-Dienst.
 * Die Inhalte (Lebensmittel, Bedarfskarten) stehen in inhalte.js.
 */
import { LEBENSMITTEL, BEDARFSKARTEN, ABSTAND, TREFFER_PROZENT, MINDEST_KARTEN } from './inhalte.js';

export const SPIELARTEN = ['reihe', 'bedarf'];            // Qualifying, Finale und Übungsseite
export const KLASSE_ARTEN = ['reihe', 'bedarf', 'waage'];  // Klassenrunde (Waage gibt es nur hier)
export const ART_TEXT = {
  reihe: { name: 'Reihe', kurz: 'Lebensmittel nach dem Nährwert ordnen: Wo gehört die neue Karte hin?' },
  bedarf: { name: 'Bedarf', kurz: 'Bis zu 5 Lebensmittel kombinieren und den Zielwert der Bedarfskarte treffen, ohne ihn zu überschreiten.' },
  waage: { name: 'Waage', kurz: 'Grammzahlen einstellen: eine Mahlzeit, die die Zielwerte (kcal, Fett, Kohlenhydrate, Eiweiß) möglichst genau trifft. Nur als Klassenrunde.' },
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

// Zeit für eine Runde: sehr großzügig, getestet wird Wissen, nicht Tempo. zeit = 'aus' → 0 (kein Limit)
// n = Reihe: Karten in der Reihe; Waage: Anzahl der Lebensmittel (1 → 1 Min., 2 → 1:30, 3 → 2 Min.)
export function zeitLimit(art, n, zeit = 'an') {
  if (zeit === 'aus') return 0;
  if (art === 'waage') return 30000 + 30000 * (Number(n) || 1);
  return art === 'bedarf' ? 120000 : 30000 + 3000 * n;
}
// Das n für zeitLimit in der Klassenrunde (Server und Bildschirme)
export const klasseN = k => k.art === 'reihe' ? (k.reihe ? k.reihe.length : 0) : k.art === 'waage' ? k.zutaten : 0;
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
// Mindestens so viele Karten braucht man (aus inhalte.js, abgesichert gegen Tippfehler: 1 … MAX_AUSWAHL)
export const mindestKarten = () => Math.min(MAX_AUSWAHL, Math.max(1, Math.round(Number(MINDEST_KARTEN)) || 1));
// Satz für die Spielerklärung (leer, wenn schon eine Karte reichen darf)
export const kombiHinweis = () => {
  const m = mindestKarten();
  return m === 1 ? '' : m === 2 ? 'Eine Karte allein reicht nie.' : `Weniger als ${m} Karten reichen nie.`;
};
// 10 Handkarten, mit denen der Zielwert (mindestens TREFFER_PROZENT, höchstens 100 %) erreichbar ist –
// aber nicht schon mit weniger als mindestKarten() Karten (sonst wäre die Runde mit einem Tipp gelöst)
export function hand(seed, bIdx) {
  const b = BEDARFSKARTEN[bIdx], zielZ = zielZehntel(b), unten = untergrenze(b), mind = mindestKarten();
  const r = rng(mischSeed(seed, 3));
  let h = [], ersatz = null;
  for (let versuch = 0; versuch < 400; versuch++) {
    h = mische(LEBENSMITTEL.map((_, k) => k), r).slice(0, HAND);
    const best = besteKombi(h, b.wert, zielZ);
    // lösbar: Die beste Auswahl liegt im Treffer-Bereich
    if (!best.pick.length || best.sum < unten) continue;
    // zu leicht: Schon weniger Karten treffen den Bereich
    if (mind > 1 && besteKombi(h, b.wert, zielZ, mind - 1).sum >= unten) { ersatz = ersatz || h; continue; }
    return h;
  }
  return ersatz || h;
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
  waageMax: 10,       // Waage: Punkte für eine fast genaue Mahlzeit (weniger als waageProzent daneben)
  waageProzent: 5,    // Waage: je so viel Prozent Abweichung gibt es einen Punkt weniger
};
// Pause nach einer Runde: Auflösung zeigen (Reihe aufgedeckt dauert länger)
export const KLASSE_PAUSE = { reihe: 7000, aufgedeckt: 14000, bedarf: 13000, waage: 15000 };

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

// ---------------------------------------------------------------- Spielart „Waage“ (nur Klassenrunde)
// Am Beamer stehen Zielwerte einer Mahlzeit (kcal, Fett, Kohlenhydrate, Eiweiß). Auf dem Handy stellt man
// für 1 bis 3 Lebensmittel die Grammzahl ein. Die Zielwerte stammen aus einem versteckten Rezept,
// darum sind sie immer genau erreichbar. Punkte gibt es nach Genauigkeit.
export const WAAGE_ANZAHL = [1, 2, 3];     // Lebensmittel pro Mahlzeit (am Beamer wählbar)
export const WAAGE_RUNDEN = [5, 8, 10];
export const WAAGE_STUFE_TEXT = {
  offen: { name: 'Einfach', kurz: 'Die Nährwerte je 100 g stehen bei den Lebensmitteln. Man muss rechnen.' },
  verdeckt: { name: 'Schwer', kurz: 'Die Nährwerte bleiben verdeckt. Man muss sie wissen oder schätzen.' },
};
export const WAAGE_ANZAHL_TEXT = n => n === 1 ? 'Ein Lebensmittel: Wie viel Gramm sind es?' : `${n} Lebensmittel kombinieren${n === 3 ? ' (schwer)' : ''}.`;
// Kleine Zielwerte: Abweichung wird mindestens an 100 kcal bzw. 10 g gemessen (sonst wären 2 g statt 1 g schon 100 % daneben)
export const WAAGE_BODEN = { kcal: 100, g: 10 };
const WAAGE_MIN_KCAL = 45;                  // fast energiefreie Lebensmittel (Gurke, Paprika) machen die Waage langweilig

// Bereich des Schiebereglers: bis etwa 800 kcal, höchstens 300 g; feine Schritte bei energiereichen Lebensmitteln
export function waageBereich(i) {
  const kcal = wert(LEBENSMITTEL[i], 'kcal') || 1;
  const max = Math.min(300, Math.max(50, Math.floor(80000 / kcal / 50) * 50));
  return { max, schritt: max <= 100 ? 5 : 10 };
}
// Nährwerte einer Mahlzeit: g[k] Gramm von Lebensmittel lm[k]
export function waageWerte(lm, g) {
  const out = { kcal: 0, fett: 0, kh: 0, eiweiss: 0 };
  lm.forEach((i, k) => { for (const nw of NAEHRWERTE) out[nw] += wert(LEBENSMITTEL[i], nw) * (Number(g[k]) || 0) / 100; });
  return out;
}
// Zielwerte als ganze Zahlen (am Beamer gut lesbar)
export const waageRund = w => Object.fromEntries(NAEHRWERTE.map(nw => [nw, Math.round(w[nw])]));
// Nährstoff-Anteile an der Energie (Fett, KH, Eiweiß): daran erkennt man, ob zwei Lebensmittel sich deutlich unterscheiden
function anteile(i) {
  const l = LEBENSMITTEL[i], f = 9 * wert(l, 'fett'), c = 4 * wert(l, 'kh'), p = 4 * wert(l, 'eiweiss'), t = f + c + p || 1;
  return [f / t, c / t, p / t];
}
const abstand = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const det3 = (a, b, c) => a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
// Passen die Lebensmittel zusammen? Sie sollen sich deutlich unterscheiden (z. B. eins fettreich, eins eiweißreich),
// sonst gäbe es viele fast gleich gute Lösungen.
function waagePasst(lm) {
  const a = lm.map(anteile);
  for (let x = 0; x < a.length; x++) for (let y = x + 1; y < a.length; y++) if (abstand(a[x], a[y]) < (lm.length === 2 ? 0.4 : 0.3)) return false;
  return lm.length < 3 || Math.abs(det3(a[0], a[1], a[2])) >= 0.1;
}
/**
 * Eine Waage-Runde: n Lebensmittel, Bereiche der Schieberegler, verstecktes Rezept (Gramm) und Zielwerte.
 * ohne: Lebensmittel, die zuletzt dran waren (werden möglichst nicht wieder gewählt)
 */
export function waageRunde(seed, n, ohne = []) {
  n = WAAGE_ANZAHL.includes(Number(n)) ? Number(n) : 2;
  const r = rng(mischSeed(seed, 51));
  const alle = LEBENSMITTEL.map((_, i) => i).filter(i => wert(LEBENSMITTEL[i], 'kcal') >= WAAGE_MIN_KCAL);
  const frisch = alle.filter(i => !ohne.includes(i));
  let lm = null;
  for (let versuch = 0; versuch < 400 && !lm; versuch++) {
    const pool = versuch < 200 && frisch.length >= n * 4 ? frisch : alle;
    const t = mische(pool, r).slice(0, n);
    if (waagePasst(t)) lm = t;
  }
  if (!lm) lm = mische(alle, r).slice(0, n);
  const ber = lm.map(waageBereich);
  // Rezept: zwischen 20 % und 70 % des Reglers, genau auf einem Schritt des Reglers
  const rezept = ber.map(({ max, schritt }) => {
    const lo = Math.max(schritt, Math.ceil(max * 0.2 / schritt) * schritt), hi = Math.floor(max * 0.7 / schritt) * schritt;
    return lo + Math.floor(r() * ((hi - lo) / schritt + 1)) * schritt;
  });
  return { lm, max: ber.map(b => b.max), schritt: ber.map(b => b.schritt), rezept, ziel: waageRund(waageWerte(lm, rezept)) };
}
// Abweichung einer Mahlzeit von den Zielwerten in Zehntel-Prozent (Mittel über kcal, Fett, KH, Eiweiß)
export function waageAbweichung(ziel, werte) {
  let s = 0;
  for (const nw of NAEHRWERTE) s += Math.abs(werte[nw] - ziel[nw]) / Math.max(ziel[nw], nw === 'kcal' ? WAAGE_BODEN.kcal : WAAGE_BODEN.g);
  return Math.round(s / NAEHRWERTE.length * 1000);
}
// Punkte: 10 bei weniger als 5 % Abweichung, je weitere 5 % einen Punkt weniger (nie unter 0)
export const waagePunkte = abwZ => Math.max(0, PUNKTE.waageMax - Math.floor(abwZ / (PUNKTE.waageProzent * 10)));
// Abgabe prüfen: eine Grammzahl pro Lebensmittel, im Bereich des Reglers, auf einem Schritt
export function sauberGramm(g, w) {
  if (!Array.isArray(g) || g.length !== w.lm.length) return null;
  const out = g.map(Number);
  return out.every((x, k) => Number.isInteger(x) && x >= 0 && x <= w.max[k] && x % w.schritt[k] === 0) ? out : null;
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
