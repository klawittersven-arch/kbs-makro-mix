// Tests der Inhalte und Regeln:  node --test tests/regeln.test.mjs
// Prüft auch die Datei inhalte.js – nach einer Änderung dort zeigt dieser Test Tippfehler sofort an.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEBENSMITTEL, BEDARFSKARTEN, ABSTAND, TREFFER_PROZENT, TIPPS } from '../public/js/inhalte.js';
import {
  NAEHRWERTE, NW, REIHE_LAENGE, HAND, MAX_AUSWAHL, deutlich, kette, richtigeLuecke, reiheVersuch, nwFuer, sortiert,
  besteKombi, hand, bedarfRunde, bedarfFinalRunde, bedarfsStapel, sauberePick, bewerte, zielZehntel, untergrenze,
  vergleichQuali, zahl, mitEinheit, wert, zeitLimit,
} from '../public/js/regeln.js';

const ERLAUBTE_BILDER = 'gurke banane apfel paprika trauben avocado kartoffel mais brot weissbrot brezel croissant reiswaffel reis nudeln muesli ei haehnchen fisch dose kaese mozzarella becher bohnen hummus tofu nuss erdnussbutter honig schokolade riegel butter oel salami datteln kokos chips teller'.split(' ');

test('inhalte.js: Lebensmittel vollständig und gültig', () => {
  assert.ok(LEBENSMITTEL.length >= 20, 'mindestens 20 Lebensmittel');
  const ids = new Set();
  for (const l of LEBENSMITTEL) {
    assert.ok(l.id && !ids.has(l.id), 'Kennung fehlt oder doppelt: ' + l.id); ids.add(l.id);
    assert.ok(typeof l.name === 'string' && l.name.trim(), 'Name fehlt bei ' + l.id);
    for (const nw of NAEHRWERTE) assert.ok(typeof l[nw] === 'number' && l[nw] >= 0 && l[nw] < 1000, `${l.name}: ${nw} ist keine Zahl`);
    assert.ok(ERLAUBTE_BILDER.includes(l.bild), `${l.name}: unbekanntes Bild „${l.bild}“`);
    // Plausibel: Energie passt grob zu den Makronährstoffen (9 kcal/g Fett, 4 kcal/g KH und Eiweiß).
    // Großzügig, weil z. B. Ballaststoffe auch Energie liefern – es geht nur um Tippfehler (Komma verrutscht o. Ä.).
    const kcal = 9 * l.fett + 4 * l.kh + 4 * l.eiweiss;
    assert.ok(Math.abs(kcal - l.kcal) <= Math.max(50, l.kcal * 0.35), `${l.name}: ${l.kcal} kcal passt nicht zu den Nährwerten (≈ ${Math.round(kcal)})`);
  }
  assert.equal(new Set(LEBENSMITTEL.map(l => l.name)).size, LEBENSMITTEL.length, 'kein Lebensmittel doppelt');
});

test('inhalte.js: Bedarfskarten vollständig und gültig', () => {
  const ids = new Set();
  for (const b of BEDARFSKARTEN) {
    assert.ok(b.id && !ids.has(b.id), 'Kennung fehlt oder doppelt: ' + b.id); ids.add(b.id);
    assert.ok(b.name && b.text, b.id + ': Name oder Text fehlt');
    assert.ok(Number.isInteger(b.alter) && b.alter > 0 && b.alter < 120, b.id + ': Alter');
    assert.ok(NAEHRWERTE.includes(b.wert), b.id + ': wert muss kcal, fett, kh oder eiweiss sein');
    assert.ok(typeof b.ziel === 'number' && b.ziel > 0, b.id + ': Zielwert');
  }
  for (const nw of NAEHRWERTE) assert.ok(BEDARFSKARTEN.some(b => b.wert === nw), 'Bedarfskarten für ' + nw);
  assert.ok(ABSTAND.prozent >= 0 && ABSTAND.kcal >= 0 && ABSTAND.gramm >= 0);
  assert.ok(TREFFER_PROZENT > 0 && TREFFER_PROZENT <= 100);
  assert.ok(TIPPS.length && TIPPS.every(t => typeof t === 'string' && t.length > 10));
});

test('Zahlen auf Deutsch: Komma statt Punkt', () => {
  assert.equal(zahl(0.2, 'fett'), '0,2');
  assert.equal(zahl(30, 'eiweiss'), '30,0');
  assert.equal(zahl(889, 'kcal'), '889');
  assert.equal(mitEinheit(19.7, 'kh'), '19,7 g');
  assert.equal(mitEinheit(52, 'kcal'), '52 kcal');
});

test('Reihe: Werte gelten nur als verschieden, wenn sie deutlich auseinanderliegen', () => {
  assert.ok(!deutlich(0.2, 0.2, 'fett'));
  assert.ok(!deutlich(0.1, 0.2, 'fett'), '0,1 g und 0,2 g sind zu nah');
  assert.ok(deutlich(0, 1.0, 'fett'));
  assert.ok(!deutlich(116, 116, 'kcal'), 'Kidneybohnen und Linsen (beide 116 kcal)');
  assert.ok(!deutlich(370, 377, 'kcal'), 'weniger als 10 %');
  assert.ok(deutlich(52, 75, 'kcal'));
});

test('Reihe: Für jeden Nährwert gibt es genug Karten, alle paarweise deutlich verschieden', () => {
  for (const nw of NAEHRWERTE) {
    for (let seed = 1; seed < 300; seed += 7) {
      const k = kette(seed, nw);
      assert.equal(k.length, REIHE_LAENGE + 1, `${nw}: zu wenige Karten (${k.length})`);
      assert.equal(new Set(k).size, k.length);
      for (let a = 0; a < k.length; a++) for (let b = a + 1; b < k.length; b++) {
        assert.ok(deutlich(wert(LEBENSMITTEL[k[a]], nw), wert(LEBENSMITTEL[k[b]], nw), nw), `${nw}: ${LEBENSMITTEL[k[a]].name} / ${LEBENSMITTEL[k[b]].name}`);
      }
    }
  }
  assert.deepEqual(kette(42, 'fett'), kette(42, 'fett'), 'gleicher Startwert → gleiche Karten');
  assert.notDeepEqual(reiheVersuch(42, 1, 'kcal').karten, reiheVersuch(42, 2, 'kcal').karten, 'jeder Versuch hat neue Karten');
});

test('Reihe: richtige Lücke', () => {
  const idx = id => LEBENSMITTEL.findIndex(l => l.id === id);
  const reihe = [idx('apfel'), idx('butter'), idx('nudeln')]; // 52, 744, 157 kcal
  assert.equal(richtigeLuecke(reihe, idx('gurke'), 'kcal'), 0);        // 9 kcal: ganz unten
  assert.equal(richtigeLuecke(reihe, idx('reis'), 'kcal'), 1);         // 111 kcal: zwischen Apfel und Nudeln
  assert.equal(richtigeLuecke(reihe, idx('mandeln'), 'kcal'), 2);      // 601 kcal: zwischen Nudeln und Butter
  assert.equal(richtigeLuecke(reihe, idx('olivenoel'), 'kcal'), 3);    // 889 kcal: ganz oben
  assert.deepEqual(sortiert(reihe, 'kcal').map(i => LEBENSMITTEL[i].id), ['apfel', 'nudeln', 'butter']);
});

test('Reihe „Gemischt“: Nährwert wechselt von Versuch zu Versuch', () => {
  const seen = new Set();
  for (let v = 1; v <= 4; v++) seen.add(nwFuer('mix', 99, v));
  assert.equal(seen.size, 4);
  assert.equal(nwFuer('fett', 99, 3), 'fett');
});

test('Bedarf: Jede Hand ist lösbar (Treffer-Bereich erreichbar)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    for (let b = 0; b < BEDARFSKARTEN.length; b++) {
      const h = hand(seed * 1009, b);
      assert.equal(h.length, HAND);
      assert.equal(new Set(h).size, HAND);
      const best = besteKombi(h, BEDARFSKARTEN[b].wert, zielZehntel(BEDARFSKARTEN[b]));
      assert.ok(best.pick.length >= 1 && best.pick.length <= MAX_AUSWAHL);
      assert.ok(best.sum <= zielZehntel(BEDARFSKARTEN[b]) && best.sum >= untergrenze(BEDARFSKARTEN[b]), `${BEDARFSKARTEN[b].id} Startwert ${seed}`);
    }
  }
});

test('Bedarf: beste Kombination und Bewertung', () => {
  const idx = id => LEBENSMITTEL.findIndex(l => l.id === id);
  const h = ['apfel', 'banane', 'nudeln', 'butter', 'olivenoel', 'gurke', 'reis', 'ei', 'skyr', 'honig'].map(idx);
  const b500 = BEDARFSKARTEN.findIndex(b => b.ziel === 500 && b.wert === 'kcal');
  const best = besteKombi(h, 'kcal', 5000);
  assert.ok(best.sum <= 5000 && best.sum >= 4610, 'nahe an 500 kcal: ' + best.sum);
  // Apfel + Banane + Nudeln = 52 + 88 + 157 = 297 kcal → unter 80 % von 500
  let e = bewerte(h, [0, 1, 2], b500);
  assert.equal(e.sum, 2970); assert.equal(e.ok, false); assert.equal(e.drueber, false);
  // Honig + Nudeln = 304 + 157 = 461 kcal → geschafft (92,2 %)
  e = bewerte(h, [9, 2], b500);
  assert.equal(e.sum, 4610); assert.equal(e.ok, true); assert.equal(e.acc, 922);
  // Butter allein = 744 kcal → zu viel
  e = bewerte(h, [3], b500);
  assert.equal(e.drueber, true); assert.equal(e.ok, false);
  // Kommazahlen exakt: 0,1 + 0,2 = 0,3
  assert.equal(bewerte(h, [0, 1], BEDARFSKARTEN.findIndex(b => b.wert === 'fett')).sum, 4);
});

test('Bedarf: Auswahl wird geprüft', () => {
  assert.deepEqual(sauberePick([3, 1]), [1, 3]);
  assert.equal(sauberePick([1, 1]), null);
  assert.equal(sauberePick([0, 1, 2, 3, 4, 5]), null, 'höchstens 5 Karten');
  assert.equal(sauberePick([10]), null);
  assert.equal(sauberePick('x'), null);
  assert.deepEqual(sauberePick([]), []);
});

test('Bedarf: Stapel nach Nährwert und gleiche Runden für alle', () => {
  assert.ok(bedarfsStapel(5, 'eiweiss').every(i => BEDARFSKARTEN[i].wert === 'eiweiss'));
  assert.equal(bedarfsStapel(5, 'mix').length, BEDARFSKARTEN.length);
  assert.deepEqual(bedarfRunde(7, 2, 3, 'mix'), bedarfRunde(7, 2, 3, 'mix'));
  assert.deepEqual(bedarfFinalRunde(7, 4, 'kh'), bedarfFinalRunde(7, 4, 'kh'));
  assert.equal(BEDARFSKARTEN[bedarfFinalRunde(7, 4, 'kh').b].wert, 'kh');
  // Runden 1–8 einer Sorte: jede Bedarfskarte einmal
  const r = new Set(); for (let i = 1; i <= 8; i++) r.add(bedarfFinalRunde(3, i, 'fett').b);
  assert.equal(r.size, 8);
});

test('Rangliste im Qualifying', () => {
  assert.ok(vergleichQuali({ lvl: 5, acc: 0, ms: 9000 }, { lvl: 4, acc: 0, ms: 1000 }) < 0, 'mehr geschafft');
  assert.ok(vergleichQuali({ lvl: 3, acc: 950, ms: 9000 }, { lvl: 3, acc: 900, ms: 1000 }) < 0, 'näher dran');
  assert.ok(vergleichQuali({ lvl: 3, acc: 900, ms: 1000 }, { lvl: 3, acc: 900, ms: 2000 }) < 0, 'schneller');
});

test('Zeitlimit: großzügig oder aus', () => {
  assert.equal(zeitLimit('reihe', 1), 33000);
  assert.equal(zeitLimit('reihe', 12), 66000);
  assert.equal(zeitLimit('bedarf', 0), 120000);
  assert.equal(zeitLimit('reihe', 5, 'aus'), 0);
  assert.ok(NW.kcal && NW.eiweiss.name === 'Eiweiß');
});
