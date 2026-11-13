/*
 * ===================================================================
 *  INHALTE von „KBS Makro-Mix“ – diese Datei darfst du selbst ändern
 * ===================================================================
 *
 * So geht's auf GitHub: Datei öffnen → Stift (Bearbeiten) → ändern → „Commit changes“.
 * Nach ein bis zwei Minuten ist die Änderung im Spiel.
 *
 * Wichtig beim Ändern:
 *  - Text steht zwischen Hochkommas: 'Gurke'. Ein Hochkomma im Text so schreiben: 'Kinder\'s'.
 *  - Kommazahlen mit PUNKT schreiben: 0.2 (nicht 0,2). Im Spiel erscheint trotzdem „0,2 g“.
 *  - Jede Zeile endet mit einem Komma.
 *  - Die Kennung „id“ darf nicht doppelt vorkommen.
 *  - „bild“ ist der Name einer Grafik. Erlaubt sind:
 *      gurke banane apfel paprika trauben avocado kartoffel mais brot weissbrot brezel croissant
 *      reiswaffel reis nudeln muesli ei haehnchen fisch dose kaese mozzarella becher bohnen hummus
 *      tofu nuss erdnussbutter honig schokolade riegel butter oel salami datteln kokos chips teller
 *      pueree brei milchreis fischstaebchen pizza pommes leberwurst frikadelle
 *  - Die Tests (node --test) prüfen die Datei. Ein Tippfehler fällt dort sofort auf.
 */

// ------------------------------------------------------------------
// LEBENSMITTEL – Nährwerte je 100 g (aus den Makro-Mix-Karten)
//   kcal = Energie, fett / kh (Kohlenhydrate) / eiweiss in Gramm, alles je 100 g
//   kh = verfügbare Kohlenhydrate OHNE Ballaststoffe (wie auf deutschen Verpackungen)
//   nr = Nummer der gedruckten Karte (nur zur Orientierung). #65–#72 sind neu und nicht gedruckt.
// Geprüft gegen den Bundeslebensmittelschlüssel: Max Rubner-Institut (2025), BLS Version 4.0,
// https://doi.org/10.25826/Data20251217-134202-0 (Lizenz CC BY 4.0). Unplausible Kartenwerte
// sind durch BLS-Werte ersetzt; der alte Kartenwert steht jeweils dahinter.
// Für ein abwechslungsreicheres Spiel sind 8 fast doppelte Karten herausgenommen (Margarine, Skyr,
// Couscous, Kidneybohnen, Schwarze Bohnen, Makrele, Harzer Käse, Kokosraspeln) und durch
// 8 gemischte Gerichte ersetzt (unten, ab #65).
// ------------------------------------------------------------------
export const LEBENSMITTEL = [
  { id: 'gurke', nr: '01', name: 'Gurke', kcal: 9, fett: 0.0, kh: 1.3, eiweiss: 0.8, bild: 'gurke' },
  { id: 'banane', nr: '02', name: 'Banane', kcal: 88, fett: 0.2, kh: 19.7, eiweiss: 1.1, bild: 'banane' },
  { id: 'magerquark', nr: '03', name: 'Magerquark', kcal: 66, fett: 0.2, kh: 3.7, eiweiss: 11.9, bild: 'becher' }, // BLS 4.0 (vorher Karte #03: 66 kcal, 1,0 g Fett, 4,3 g KH, 10,0 g Eiweiß – zu viel Fett für Magerquark)
  { id: 'reis', nr: '05', name: 'Reis, weiß, gekocht', kcal: 111, fett: 0.2, kh: 24.5, eiweiss: 2.5, bild: 'reis' },
  { id: 'vollkornbrot', nr: '06', name: 'Vollkornbrot', kcal: 232, fett: 1.3, kh: 42.0, eiweiss: 9.2, bild: 'brot' },
  { id: 'haferflocken', nr: '07', name: 'Haferflocken', kcal: 369, fett: 6.7, kh: 57.2, eiweiss: 14.1, bild: 'muesli' },
  { id: 'ei', nr: '08', name: 'Ei', kcal: 149, fett: 10.7, kh: 0.3, eiweiss: 13.0, bild: 'ei' },
  { id: 'haehnchen', nr: '09', name: 'Hähnchenfilet, gegart', kcal: 135, fett: 1.6, kh: 0.0, eiweiss: 30.0, bild: 'haehnchen' },
  { id: 'lachs', nr: '10', name: 'Lachs', kcal: 223, fett: 15.9, kh: 0.0, eiweiss: 19.9, bild: 'fisch' },
  { id: 'avocado', nr: '11', name: 'Avocado', kcal: 191, fett: 19.6, kh: 0.4, eiweiss: 1.8, bild: 'avocado' },
  { id: 'gouda', nr: '12', name: 'Gouda', kcal: 377, fett: 30.6, kh: 0.0, eiweiss: 25.3, bild: 'kaese' },
  { id: 'mandeln', nr: '13', name: 'Mandeln', kcal: 601, fett: 52.1, kh: 6.6, eiweiss: 21.2, bild: 'nuss' },
  { id: 'snickers', nr: '14', name: 'Snickers', kcal: 489, fett: 23.9, kh: 59.5, eiweiss: 8.1, bild: 'riegel' },
  { id: 'butter', nr: '15', name: 'Butter', kcal: 744, fett: 82.0, kh: 0.5, eiweiss: 1.0, bild: 'butter' },
  { id: 'olivenoel', nr: '16', name: 'Olivenöl', kcal: 889, fett: 98.8, kh: 0.0, eiweiss: 0.0, bild: 'oel' },
  { id: 'kartoffeln', nr: '17', name: 'Kartoffeln, gekocht', kcal: 75, fett: 0.1, kh: 17.0, eiweiss: 2.0, bild: 'kartoffel' },
  { id: 'apfel', nr: '18', name: 'Apfel', kcal: 52, fett: 0.2, kh: 13.8, eiweiss: 0.3, bild: 'apfel' },
  { id: 'naturjoghurt', nr: '19', name: 'Naturjoghurt, 3,5 %', kcal: 64, fett: 3.5, kh: 4.7, eiweiss: 3.5, bild: 'becher' },
  { id: 'mais', nr: '20', name: 'Mais, gekocht', kcal: 96, fett: 1.5, kh: 18.7, eiweiss: 3.4, bild: 'mais' },
  { id: 'linsen', nr: '21', name: 'Linsen, gekocht', kcal: 119, fett: 0.7, kh: 15.5, eiweiss: 9.1, bild: 'bohnen' }, // BLS 4.0 (vorher Karte #21: 116 kcal, 0,4 g Fett, 20,1 g KH, 9,0 g Eiweiß – KH mit Ballaststoffen gezählt)
  { id: 'tofu', nr: '22', name: 'Tofu, natur', kcal: 144, fett: 8.7, kh: 2.3, eiweiss: 15.7, bild: 'tofu' },
  { id: 'nudeln', nr: '23', name: 'Nudeln, gekocht', kcal: 157, fett: 0.9, kh: 30.0, eiweiss: 5.8, bild: 'nudeln' },
  { id: 'kichererbsen', nr: '24', name: 'Kichererbsen, gekocht', kcal: 151, fett: 3.0, kh: 17.4, eiweiss: 8.4, bild: 'bohnen' }, // BLS 4.0 (vorher Karte #24: 164 kcal, 2,6 g Fett, 27,4 g KH, 8,9 g Eiweiß – KH mit Ballaststoffen gezählt)
  { id: 'thunfisch', nr: '25', name: 'Thunfisch, im eigenen Saft', kcal: 116, fett: 1.0, kh: 0.0, eiweiss: 26.0, bild: 'dose' },
  { id: 'hummus', nr: '26', name: 'Hummus', kcal: 324, fett: 28.5, kh: 8.0, eiweiss: 5.9, bild: 'hummus' }, // BLS 4.0 (vorher Karte #26: 166 kcal, 9,6 g Fett, 14,3 g KH, 7,9 g Eiweiß – US-Produkt, KH mit Ballaststoffen)
  { id: 'schokolade', nr: '27', name: 'Vollmilchschokolade', kcal: 535, fett: 30.0, kh: 59.4, eiweiss: 7.3, bild: 'schokolade' },
  { id: 'muesli', nr: '28', name: 'Müsli', kcal: 372, fett: 7.0, kh: 64.0, eiweiss: 10.0, bild: 'muesli' },
  { id: 'erdnussbutter', nr: '29', name: 'Erdnussbutter', kcal: 588, fett: 49.0, kh: 12.0, eiweiss: 25.0, bild: 'erdnussbutter' },
  { id: 'walnuesse', nr: '30', name: 'Walnüsse', kcal: 654, fett: 65.2, kh: 6.7, eiweiss: 15.2, bild: 'nuss' },
  { id: 'sahne', nr: '31', name: 'Sahne, 30 % Fett', kcal: 292, fett: 30.0, kh: 3.2, eiweiss: 2.3, bild: 'becher' },
  { id: 'croissant', nr: '42', name: 'Croissant', kcal: 406, fett: 21.0, kh: 45.0, eiweiss: 8.2, bild: 'croissant' },
  { id: 'chips', nr: '43', name: 'Kartoffelchips', kcal: 536, fett: 35.0, kh: 50.0, eiweiss: 6.3, bild: 'chips' },
  { id: 'weissbrot', nr: '46', name: 'Weißbrot', kcal: 265, fett: 3.2, kh: 49.0, eiweiss: 9.0, bild: 'weissbrot' },
  { id: 'salami', nr: '47', name: 'Salami', kcal: 400, fett: 34.0, kh: 1.0, eiweiss: 22.0, bild: 'salami' },
  { id: 'reiswaffeln', nr: '48', name: 'Reiswaffeln', kcal: 387, fett: 3.0, kh: 81.0, eiweiss: 8.0, bild: 'reiswaffel' },
  { id: 'paprika', nr: '49', name: 'Paprika, rot', kcal: 31, fett: 0.3, kh: 6.0, eiweiss: 1.0, bild: 'paprika' },
  { id: 'weintrauben', nr: '50', name: 'Weintrauben', kcal: 69, fett: 0.2, kh: 18.1, eiweiss: 0.7, bild: 'trauben' },
  { id: 'roggenbrot', nr: '52', name: 'Roggenbrot', kcal: 220, fett: 1.2, kh: 43.0, eiweiss: 6.0, bild: 'brot' }, // BLS 4.0 (vorher Karte #52: 259 kcal, 3,3 g Fett, 48,3 g KH, 8,5 g Eiweiß – US-„rye bread“ statt deutsches Roggenbrot)
  { id: 'mozzarella', nr: '54', name: 'Mozzarella', kcal: 259, fett: 21.0, kh: 0.0, eiweiss: 17.1, bild: 'mozzarella' }, // BLS 4.0 (vorher Karte #54: 280 kcal, 17,0 g Fett, 3,0 g KH, 18,0 g Eiweiß – Energie passte nicht zu den Nährwerten)
  { id: 'cashewkerne', nr: '58', name: 'Cashewkerne', kcal: 553, fett: 43.9, kh: 30.2, eiweiss: 18.2, bild: 'nuss' },
  { id: 'datteln', nr: '59', name: 'Datteln, getrocknet', kcal: 277, fett: 0.2, kh: 75.0, eiweiss: 1.8, bild: 'datteln' },
  { id: 'brezel', nr: '61', name: 'Brezel', kcal: 282, fett: 4.1, kh: 50.0, eiweiss: 9.1, bild: 'brezel' }, // BLS 4.0 (vorher Karte #61: 339 kcal, 4,4 g Fett, 68,0 g KH, 10,0 g Eiweiß – US-Soft-Pretzel statt Laugenbrezel)
  { id: 'mascarpone', nr: '62', name: 'Mascarpone', kcal: 429, fett: 42.0, kh: 4.0, eiweiss: 5.5, bild: 'becher' },
  { id: 'honig', nr: '64', name: 'Honig', kcal: 304, fett: 0.0, kh: 82.4, eiweiss: 0.3, bild: 'honig' },  // Neu im Spiel (nicht im gedruckten Deck), Werte aus dem BLS 4.0 – Code jeweils dahinter
  { id: 'kartoffelpueree', nr: '65', name: 'Kartoffelpüree, mit Milch', kcal: 88, fett: 3.0, kh: 12.4, eiweiss: 2.4, bild: 'pueree' }, // BLS X634012
  { id: 'haferbrei', nr: '66', name: 'Haferbrei, mit Milch', kcal: 134, fett: 4.9, kh: 15.0, eiweiss: 6.3, bild: 'brei' }, // BLS X9A2100 (Porridge ungesüßt, mit Milch 3,5 %)
  { id: 'milchreis', nr: '67', name: 'Milchreis', kcal: 140, fett: 3.2, kh: 22.4, eiweiss: 4.9, bild: 'milchreis' }, // BLS X810033 (gesüßt, mit Milch 3,5 %)
  { id: 'fischstaebchen', nr: '68', name: 'Fischstäbchen, aus dem Ofen', kcal: 206, fett: 9.3, kh: 16.3, eiweiss: 13.8, bild: 'fischstaebchen' }, // BLS T930162 (paniert, im Ofen gegart)
  { id: 'pizza', nr: '69', name: 'Pizza Margherita', kcal: 238, fett: 13.6, kh: 20.0, eiweiss: 7.8, bild: 'pizza' }, // BLS X912033
  { id: 'pommes', nr: '70', name: 'Pommes, aus dem Ofen', kcal: 167, fett: 4.3, kh: 27.4, eiweiss: 3.0, bild: 'pommes' }, // BLS K130262 (frittiert: 203 kcal, 9 g Fett)
  { id: 'leberwurst', nr: '71', name: 'Leberwurst', kcal: 236, fett: 18.1, kh: 0.6, eiweiss: 17.6, bild: 'leberwurst' }, // BLS W327000
  { id: 'frikadelle', nr: '72', name: 'Frikadelle', kcal: 269, fett: 19.5, kh: 4.5, eiweiss: 18.7, bild: 'frikadelle' }, // BLS Y036122
];

// ------------------------------------------------------------------
// BEDARFSKARTEN – für die Spielart „Bedarf“ (alle Personen fiktiv)
//   wert = kcal | fett | kh | eiweiss   ·   ziel = Zielwert (kcal bzw. Gramm)
// ------------------------------------------------------------------
export const BEDARFSKARTEN = [
  { id: 'B01', name: 'Gertrud Müller', alter: 87, text: 'Bewohnerin in einem Pflegeheim · Mittagessen', wert: 'kcal', ziel: 500 },
  { id: 'B02', name: 'Miray Gül', alter: 6, text: 'Schülerin in der Grundschule · Frühstück', wert: 'kcal', ziel: 420 },
  { id: 'B03', name: 'Jonas Weber', alter: 16, text: 'Schüler in der Berufsschule · Pausensnack', wert: 'kcal', ziel: 300 },
  { id: 'B04', name: 'Fatma Aydin', alter: 74, text: 'Reha-Patientin nach Hüft-OP · Abendessen', wert: 'kcal', ziel: 450 },
  { id: 'B05', name: 'Tim Neumann', alter: 10, text: 'nach dem Fußballtraining · Zwischenmahlzeit', wert: 'kcal', ziel: 350 },
  { id: 'B06', name: 'Lea Berger', alter: 28, text: 'arbeitet im Büro · Mittagessen', wert: 'kcal', ziel: 550 },
  { id: 'B07', name: 'Paul Schneider', alter: 81, text: 'Bewohner im Seniorenheim · Zwischenmahlzeit', wert: 'kcal', ziel: 250 },
  { id: 'B08', name: 'Nicole Hartmann', alter: 35, text: 'Pflegekraft in der Nachtschicht · Abendbrot', wert: 'kcal', ziel: 600 },
  { id: 'B09', name: 'Axel Fischer', alter: 23, text: 'passionierter Bodybuilder', wert: 'eiweiss', ziel: 25 },
  { id: 'B10', name: 'Mina Özdemir', alter: 14, text: 'nach dem Schwimmtraining', wert: 'eiweiss', ziel: 18 },
  { id: 'B11', name: 'Karl Brenner', alter: 79, text: 'nach einem Sturz in der Reha', wert: 'eiweiss', ziel: 20 },
  { id: 'B12', name: 'Sophie Lang', alter: 31, text: 'isst vegetarisch · Mittagessen', wert: 'eiweiss', ziel: 22 },
  { id: 'B13', name: 'Lukas Meier', alter: 8, text: 'im Wachstum · Frühstück', wert: 'eiweiss', ziel: 12 },
  { id: 'B14', name: 'Heike Sommer', alter: 67, text: 'nach einem Krankenhausaufenthalt', wert: 'eiweiss', ziel: 24 },
  { id: 'B15', name: 'Nina Krämer', alter: 26, text: 'nach dem Krafttraining · Snack', wert: 'eiweiss', ziel: 30 },
  { id: 'B16', name: 'Emil Roth', alter: 90, text: 'Bewohner im Pflegeheim · Zwischenmahlzeit', wert: 'eiweiss', ziel: 15 },
  { id: 'B17', name: 'Simone Specht', alter: 32, text: 'Marathonläuferin vor dem Wettkampf', wert: 'kh', ziel: 80 },
  { id: 'B18', name: 'Ben Richter', alter: 11, text: 'vor einem Fußballturnier', wert: 'kh', ziel: 55 },
  { id: 'B19', name: 'Alina Koch', alter: 19, text: 'vor einem langen Lernabend · Abendessen', wert: 'kh', ziel: 70 },
  { id: 'B20', name: 'Murat Demir', alter: 45, text: 'fährt jeden Tag mit dem Rad zur Arbeit · Mittagessen', wert: 'kh', ziel: 65 },
  { id: 'B21', name: 'Lotte Franke', alter: 7, text: 'vor einem Schulausflug · Frühstück', wert: 'kh', ziel: 50 },
  { id: 'B22', name: 'David Hahn', alter: 27, text: 'vor einer Wanderung · Zwischenmahlzeit', wert: 'kh', ziel: 45 },
  { id: 'B23', name: 'Rita Vogel', alter: 83, text: 'Bewohnerin im Pflegeheim · Nachmittagsmahlzeit', wert: 'kh', ziel: 35 },
  { id: 'B24', name: 'Jana Seidel', alter: 38, text: 'vor einem langen Arbeitstag · Frühstück', wert: 'kh', ziel: 60 },
  { id: 'B25', name: 'Bettina Bender', alter: 88, text: 'kachektische Patientin nach OP', wert: 'fett', ziel: 50 },
  { id: 'B26', name: 'Harald Wolf', alter: 62, text: 'kann nur kleine Portionen essen · Zwischenmahlzeit', wert: 'fett', ziel: 30 },
  { id: 'B27', name: 'Melek Yilmaz', alter: 5, text: 'braucht ein sättigendes Frühstück', wert: 'fett', ziel: 18 },
  { id: 'B28', name: 'Stefan Krüger', alter: 41, text: 'wünscht ein Low-Carb-Mittagessen', wert: 'fett', ziel: 35 },
  { id: 'B29', name: 'Inge Peters', alter: 76, text: 'hat wenig Appetit · Abendessen', wert: 'fett', ziel: 28 },
  { id: 'B30', name: 'Carla Winter', alter: 29, text: 'vor einer Bergwanderung · Zwischenmahlzeit', wert: 'fett', ziel: 22 },
  { id: 'B31', name: 'Oskar Blum', alter: 13, text: 'nach einem langen Schultag · Snack', wert: 'fett', ziel: 20 },
  { id: 'B32', name: 'Renate Scholz', alter: 84, text: 'Bewohnerin im Seniorenheim · Zusatzmahlzeit', wert: 'fett', ziel: 25 },
];

// ------------------------------------------------------------------
// SPIELART „REIHE“: Welche Karten dürfen zusammen in eine Reihe?
// Zwei Werte müssen sich um mindestens so viel unterscheiden – sonst wäre
// das Einordnen Glückssache (z. B. Banane 0,2 g und Apfel 0,2 g Fett).
// Es gilt beides: mindestens „prozent“ vom größeren Wert UND mindestens kcal bzw. gramm.
// ------------------------------------------------------------------
export const ABSTAND = { prozent: 10, kcal: 10, gramm: 1 };

// ------------------------------------------------------------------
// SPIELART „BEDARF“, Qualifying: Eine Bedarfskarte gilt als geschafft, wenn die
// Summe zwischen „treffer“ Prozent und 100 Prozent des Zielwerts liegt.
// ------------------------------------------------------------------
export const TREFFER_PROZENT = 80;

// ------------------------------------------------------------------
// SPIELART „BEDARF“: Wie viele Lebensmittel braucht man mindestens?
// Die 10 Lebensmittel werden so gemischt, dass weniger Karten den Bedarf nie decken.
//   2 = eine Karte allein reicht nie, man muss kombinieren (empfohlen)
//   1 = auch eine einzelne Karte darf schon reichen (wie am Tisch)
// ------------------------------------------------------------------
export const MINDEST_KARTEN = 2;

// ------------------------------------------------------------------
// „WUSSTEST DU?“ – kurze Sätze für Wartebildschirme (aus den Infotexten)
// ------------------------------------------------------------------
export const TIPPS = [
  'Kohlenhydrate = Treibstoff, Fett = Reserve und Schutz, Eiweiß = Baustoff.',
  'Fett liefert mehr als doppelt so viel Energie wie Kohlenhydrate oder Eiweiß.',
  'Eine ausgewogene Ernährung: etwa 55 % Kohlenhydrate, 30 % Fett und 15 % Eiweiß.',
  'Nach einer OP braucht der Körper oft mehr Eiweiß, damit Wunden besser heilen.',
  'Wer nur kleine Portionen schafft, bekommt mit etwas mehr Fett trotzdem genug Energie.',
  'Komplexe Kohlenhydrate wie Vollkornbrot oder Haferflocken sättigen länger als Zucker.',
  'Fett hilft dem Körper, die Vitamine A, D, E und K aufzunehmen.',
  'Grundumsatz = Energie in Ruhe. Leistungsumsatz = Energie für Bewegung.',
  'Je mehr Bewegung (höherer PAL-Wert), desto höher der Energiebedarf.',
  'Gut verteilt: Frühstück 25 %, zweites Frühstück 10 %, Mittagessen 30 %, Nachmittag 10 %, Abendessen 25 %.',
  'Ältere Menschen essen oft besser mehrere kleine Mahlzeiten als wenige große.',
  'Mindestens eine warme Mahlzeit am Tag gibt Struktur und ist oft leichter zu essen.',
  'Bei Risiko für Mangelernährung: Speisen mit Sahne oder Butter anreichern.',
  'Kein Makronährstoff ist „böse“. Entscheidend sind Menge, Auswahl und Kombination.',
];
