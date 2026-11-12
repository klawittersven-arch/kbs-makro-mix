/*
 * Lebensmittel- und Personen-Bilder als SVG (eigene Zeichnungen, © 2026 Sven Klawitter).
 * Jedes Bild liegt in einem Feld von 100 × 100. bild(name) liefert das fertige <svg>.
 * Bewusst ohne id-Attribute, Verläufe, Filter und Masken: Dieselben Bilder stehen oft
 * mehrmals auf einer Seite, und so kann nichts kollidieren.
 */

const D = '#2b3346'; // dunkler Standard-Umriss

// Grundformen: Fläche mit Umriss, Linie, weißer Glanz
const shape = (d, fill, line, w = 2.4) => `<path d="${d}" fill="${fill}" stroke="${line}" stroke-width="${w}" stroke-linejoin="round"/>`;
const line = (d, color, w = 1.8, op = 1) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op < 1 ? ` opacity="${op}"` : ''}/>`;
const glanz = (d, op = 0.3) => `<path d="${d}" fill="#fff" opacity="${op}"/>`;
// Röhre (Gurke, Brezel, Knochen): dunkler Rand + farbige Füllung entlang desselben Pfads
const tube = (d, w, fill, line) =>
  `<path d="${d}" fill="none" stroke="${line}" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
// Kreis und Ellipse, wahlweise mit Umriss und Drehung
const kreis = (cx, cy, r, fill, line, w = 2.4) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${line ? ` stroke="${line}" stroke-width="${w}"` : ''}/>`;
const oval = (cx, cy, rx, ry, fill, line, w = 2.4, rot = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${line ? ` stroke="${line}" stroke-width="${w}"` : ''}${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
// viele kleine Punkte (Kerne, Poren, Salz): Liste als 'x,y x,y …'
const punkte = (fill, liste, r = 1.6, op = 1) =>
  `<g fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}>` +
  liste.trim().split(/\s+/).map(p => { const [x, y] = p.split(','); return `<circle cx="${x}" cy="${y}" r="${r}"/>`; }).join('') + '</g>';
// gleiche Form mehrmals, verschoben und gedreht (Bohnen, Chips, Flocken)
const stempel = (d, liste, attr) =>
  `<g ${attr}>` + liste.map(([x, y, r = 0, k = 1]) => `<path transform="translate(${x} ${y})${r ? ` rotate(${r})` : ''}${k !== 1 ? ` scale(1 ${k})` : ''}" d="${d}"/>`).join('') + '</g>';
// Schüssel von der Seite (oben gerade, unten rund) mit kleinem Fuß
const schuessel = (fill, rand) =>
  shape('M38 86 L36 93 L64 93 L62 86 Z', fill, rand, 2) +
  shape('M8 50 L92 50 C92 74 74 89 50 89 C26 89 8 74 8 50 Z', fill, rand) +
  line('M12 58 C30 62 70 62 88 58', '#fff', 2.4, 0.45);

// Brustbild einer Person: Körper, Hals, Ohren, Kopf, Gesicht; Haare und Extras als fertiges Markup
function person({ haut, hautL, kopf: [x, y, rx, ry], s, oben, hemd, hemdL = D, hinten = '', vorn = '', extra = '', augen = 2.4 }) {
  return hinten +
    shape(`M${50 - s} 97 C${50 - s} ${oben + 8} ${62 - s} ${oben} 50 ${oben} C${38 + s} ${oben} ${50 + s} ${oben + 8} ${50 + s} 97 Z`, hemd, hemdL) +
    shape(`M44 ${y + ry - 8} L44 ${oben + 1} C47 ${oben + 4} 53 ${oben + 4} 56 ${oben + 1} L56 ${y + ry - 8} Z`, haut, hautL, 2) +
    oval(x - rx, y + 3, 4.5, 6.5, haut, hautL, 2) + oval(x + rx, y + 3, 4.5, 6.5, haut, hautL, 2) +
    oval(x, y, rx, ry, haut, hautL) +
    kreis(x - 7, y + 3, augen, D) + kreis(x + 7, y + 3, augen, D) +
    line(`M${x - 6} ${y + 12} C${x - 3} ${y + 15} ${x + 3} ${y + 15} ${x + 6} ${y + 12}`, D, 2.2) +
    vorn + extra;
}

export const BILDER = {
  // Gurke: leicht gebogen, mit hellen Punkten und Glanzstreifen
  gurke: (() => {
    const L = '#1d461a';
    return tube('M18 78 C34 74 70 54 82 20', 22, '#4c9a3a', L) +
      line('M22 68 C36 62 62 46 73 22', '#a6dc7e', 3.2, 0.8) +
      punkte('#cdeaa6', '25,73 31,80 36,66 41,74 47,58 52,67 56,50 63,57 66,38 73,45 73,28 80,33', 1.5) +
      kreis(85, 9, 2.6, '#2e6a22');
  })(),

  // Banane: gelber Bogen mit Stiel und dunkler Spitze
  banane: (() => {
    const L = '#6e4f0c';
    return shape('M10 35 C14 85 70 101 90 39 L84 35 C66 67 32 69 16 33 Z', '#f7d348', L) +
      line('M18 43 C28 73 64 83 84 45', '#d9a520', 1.8, 0.8) +
      line('M28 54 C38 68 60 72 76 52', '#fff', 3, 0.55) +
      shape('M83 37 L86 23 L93 24 L90 41 Z', '#8a9a3a', L, 2) +
      kreis(12, 34, 3.6, '#4a3410');
  })(),

  // Apfel: rot mit Stiel und Blatt
  apfel: (() => {
    const L = '#6a1216';
    return shape('M50 30 C40 22 16 22 15 46 C14 70 32 92 50 86 C68 92 86 70 85 46 C84 22 60 22 50 30 Z', '#e0383d', L) +
      line('M50 30 C50 22 51 16 54 10', '#5a3a14', 3.4) +
      shape('M53 20 C58 8 72 6 82 10 C76 22 62 25 53 20 Z', '#5aa646', '#24461a', 2) +
      line('M56 19 C64 15 72 12 79 11', '#24461a', 1.2, 0.7) +
      glanz('M24 40 C26 30 34 28 40 30 C34 34 30 42 28 52 C25 50 23 45 24 40 Z', 0.45);
  })(),

  // Paprika (rot): drei Wölbungen, grüner Kelch und Stiel
  paprika: (() => {
    const L = '#6a140e', G = '#1f4a1c';
    return shape('M50 28 C38 20 18 24 18 46 C18 66 24 86 38 88 C44 89 47 86 50 84 C53 86 56 89 62 88 C76 86 82 66 82 46 C82 24 62 20 50 28 Z', '#e33b2e', L) +
      line('M36 32 C30 46 30 68 38 86 M64 32 C70 46 70 68 62 86', '#a8231a', 1.8, 0.7) +
      shape('M35 30 C40 21 60 21 65 30 C60 34 54 32 50 35 C46 32 40 34 35 30 Z', '#4f9a3a', G, 2) +
      tube('M50 27 C50 19 53 13 58 10', 5, '#5aa646', G) +
      glanz('M24 44 C24 34 30 30 36 31 C32 38 30 48 30 62 C26 58 24 52 24 44 Z', 0.4);
  })(),

  // Weintrauben: grüne Traube mit Stiel und Blatt
  trauben: (() => {
    const L = '#36561a';
    const beeren = '23,36 41,36 59,36 77,36 32,52 50,52 68,52 41,68 59,68 50,84'.split(' ');
    return line('M50 30 L51 18 C52 12 49 8 45 6', '#6b4a1e', 3.4) +
      shape('M52 20 C58 8 74 6 86 12 C80 24 66 28 52 20 Z', '#5aa646', '#24461a', 2) +
      beeren.map(p => { const [x, y] = p.split(','); return kreis(x, y, 9.5, '#a8d45a', L, 2.2); }).join('') +
      punkte('#fff', beeren.map(p => { const [x, y] = p.split(','); return `${x - 3},${y - 3}`; }).join(' '), 2.6, 0.6);
  })(),

  // Avocado: aufgeschnittene Hälfte mit braunem Kern
  avocado: (() => {
    const L = '#1f3510';
    return shape('M50 6 C38 6 32 19 30 33 C28 45 15 55 16 71 C17 87 32 95 50 95 C68 95 83 87 84 71 C85 55 72 45 70 33 C68 19 62 6 50 6 Z', '#3f6b22', L) +
      shape('M50 12 C41 12 37 23 35 35 C33 48 22 57 22 71 C23 83 35 89 50 89 C65 89 77 83 78 71 C78 57 67 48 65 35 C63 23 59 12 50 12 Z', '#dcec92', '#9ab84a', 1.4) +
      oval(50, 66, 19, 20, '#f1f5b6') +
      kreis(50, 66, 13, '#8a5428', '#4a2a10') +
      glanz('M42 61 C43 56 47 54 51 55 C47 58 45 62 45 67 C43 66 42 64 42 61 Z', 0.5);
  })(),

  // Kartoffeln: zwei hellbraune Knollen mit Augen
  kartoffel: (() => {
    const L = '#6b4718', A = '#946828';
    return shape('M12 44 C10 28 28 18 46 22 C62 26 66 42 60 54 C54 66 34 70 22 64 C15 60 12 52 12 44 Z', '#cf9f58', L) +
      line('M26 34 c2 -1 4 0 5 2 M42 30 c2 -1 4 0 5 2 M22 52 c2 -1 4 0 5 2', A, 2) +
      glanz('M20 38 C22 30 30 26 36 27 C30 30 25 35 23 44 C21 43 20 41 20 38 Z', 0.4) +
      shape('M38 68 C36 52 54 44 70 46 C86 48 92 60 88 72 C84 84 66 90 54 86 C44 83 38 78 38 68 Z', '#dfb26a', L) +
      line('M54 58 c2 -1 4 0 5 2 M72 55 c2 -1 4 0 5 2 M64 74 c2 -1 4 0 5 2 M46 72 c2 -1 4 0 5 2', A, 2) +
      glanz('M46 60 C48 54 54 50 60 50 C54 54 50 58 48 64 C46 63 46 62 46 60 Z', 0.45);
  })(),

  // Maiskolben mit Körnerraster und zwei Hüllblättern
  mais: (() => {
    const L = '#7a5a10', K = '#d39a18', G = '#2f5a14';
    return shape('M50 6 C61 6 66 22 66 44 C66 64 60 80 50 82 C40 80 34 64 34 44 C34 22 39 6 50 6 Z', '#f6cc3a', L) +
      line('M43 9 C40 30 40 60 44 80 M50 7 L50 81 M57 9 C60 30 60 60 56 80', K, 1.6) +
      line('M40 18 L60 18 M37 28 L63 28 M36 38 L64 38 M36 48 L64 48 M37 58 L63 58 M39 68 L61 68 M43 76 L57 76', K, 1.6) +
      glanz('M40 16 C42 10 46 8 48 8 C44 16 42 28 42 40 C40 32 39 22 40 16 Z', 0.45) +
      shape('M50 94 C32 92 20 76 22 50 C28 64 38 74 50 78 Z', '#7cbf4a', G) +
      shape('M50 94 C68 92 80 76 78 50 C72 64 62 74 50 78 Z', '#68ac38', G);
  })(),

  // Vollkornbrot: dunkler Laib mit Einschnitten und Körnern
  brot: (() => {
    const L = '#3a1e0a';
    return shape('M10 66 C8 42 24 24 50 24 C76 24 92 42 90 66 C90 74 86 80 78 80 L22 80 C14 80 10 74 10 66 Z', '#8a522a', L) +
      tube('M28 42 L36 58 M46 35 L54 52 M64 36 L72 52', 3, '#d8a468', '#4a280e') +
      punkte('#efdcae', '20,56 30,68 42,64 58,66 74,62 84,64 22,68 50,72 68,72 38,48 56,46', 1.5) +
      glanz('M18 50 C20 38 30 30 40 28 C32 34 26 42 22 56 C19 55 18 53 18 50 Z', 0.25);
  })(),

  // Weißbrot: helle Toastscheibe mit goldener Kruste
  weissbrot: (() => {
    const L = '#6b4214';
    return shape('M22 88 L22 44 C10 42 8 24 20 17 C32 9 68 9 80 17 C92 24 90 42 78 44 L78 88 Z', '#d79a4e', L) +
      shape('M28 82 L28 39 C18 37 16 26 25 22 C35 15 65 15 75 22 C84 26 82 37 72 39 L72 82 Z', '#fbefcf', '#e2c48a', 1.2) +
      punkte('#e9d3a0', '38,32 50,26 62,32 44,46 58,50 38,62 54,68 64,60 34,48 48,76 66,74', 1.6);
  })(),

  // Brezel: geschlungener Teigstrang mit Salzkörnern
  brezel: (() => {
    const d = 'M26 58 L50 43 C61 36 64 22 73 20 C86 18 92 36 85 52 C78 68 64 80 50 80 C36 80 22 68 15 52 C8 36 14 18 27 20 C36 22 39 36 50 43 L74 58';
    return tube(d, 11, '#a5602a', '#43240c') +
      line(d, '#c98446', 3.6) +
      punkte('#fff', '17,22 12,36 30,70 50,78 70,70 88,36 83,22 62,28 38,28 67,52 33,52', 1.8);
  })(),

  // Croissant: fünf Teigrollen im Bogen
  croissant: (() => {
    const L = '#6e3a0c', A = '#e9a443', B = '#d4852c';
    return shape('M22 48 C12 52 5 62 8 74 C14 76 21 72 25 66 C21 60 19 55 22 48 Z', B, L) +
      shape('M78 48 C88 52 95 62 92 74 C86 76 79 72 75 66 C79 60 81 55 78 48 Z', B, L) +
      shape('M36 32 C25 34 17 46 18 58 C24 67 32 71 41 73 C35 61 32 46 36 32 Z', A, L) +
      shape('M64 32 C75 34 83 46 82 58 C76 67 68 71 59 73 C65 61 68 46 64 32 Z', A, L) +
      shape('M36 32 C44 24 56 24 64 32 C68 50 64 70 50 78 C36 70 32 50 36 32 Z', '#f2b85c', L) +
      line('M41 42 C46 39 54 39 59 42 M40 55 C46 52 54 52 60 55', '#b8701e', 1.6, 0.8) +
      glanz('M40 34 C44 30 50 29 54 30 C48 33 44 36 42 42 C40 40 39 37 40 34 Z', 0.5);
  })(),

  // Reiswaffel: runde, gepuffte Scheibe von schräg oben
  reiswaffel: (() => {
    const L = '#7a5a2a';
    return shape('M10 46 L10 56 C10 71 28 84 50 84 C72 84 90 71 90 56 L90 46 Z', '#d8b676', L) +
      line('M20 64 L20 72 M32 70 L32 79 M44 72 L44 82 M56 72 L56 82 M68 70 L68 79 M80 64 L80 72', '#b8955a', 1.6, 0.8) +
      oval(50, 46, 40, 28, '#f3e2b6', L) +
      punkte('#d4b072', '26,40 36,32 50,28 64,32 74,40 30,52 42,44 58,44 70,52 38,60 50,56 62,60 50,68 22,48 78,48 46,36 56,36', 2.4) +
      punkte('#fffaf0', '31,36 43,30 57,30 69,36 36,46 50,42 64,46 44,56 56,56 28,58 72,58 50,64', 1.7);
  })(),

  // Reis (auch Couscous): Schüssel mit weißem Körnerberg
  reis: (() => {
    return shape('M14 51 C14 33 30 22 50 22 C70 22 86 33 86 51 Z', '#fbf7ea', '#7a705a') +
      line('M30 40 l4 -2 M40 31 l4 1 M52 28 l4 -2 M62 35 l4 2 M71 44 l4 -1 M44 41 l4 2 M24 47 l4 -1 M56 45 l4 -1 M35 48 l3 -2 M48 50 l4 0 M66 49 l3 1', '#cfc29a', 2.8) +
      schuessel('#5b95d8', '#1e3f6e');
  })(),

  // Nudeln: Spaghetti-Nest auf einem Teller, Gabel mit aufgewickelten Nudeln
  nudeln: (() => {
    const L = '#8a6510', F = '#f8da7a';
    const hinten = 'M20 68 C22 52 36 44 46 52 C56 60 64 46 74 50 C80 52 82 60 80 68 M26 56 C30 44 44 38 54 42 C62 45 66 42 70 46';
    const vorn = 'M24 72 C28 60 40 58 48 64 C58 72 66 60 78 68 M30 48 C36 42 46 46 52 52 C58 58 68 56 76 60 M20 62 C28 64 34 72 44 70 C52 68 58 72 68 72';
    return oval(50, 76, 45, 13, '#e6edf5', D) + oval(50, 74, 33, 7, '#fff') +
      shape('M18 74 C16 54 30 40 50 40 C70 40 84 54 82 74 C70 79 30 79 18 74 Z', '#e9b83c', L, 2) +
      line(hinten, L, 5.2) + line(hinten, F, 3) +
      tube('M60 40 L82 8', 3.4, '#c9d1dd', '#5a6478') +
      line('M50 42 C50 34 70 34 70 42 M50 37 C50 30 68 30 68 37', L, 5.2) + line('M50 42 C50 34 70 34 70 42 M50 37 C50 30 68 30 68 37', F, 3) +
      line(vorn, L, 5.2) + line(vorn, F, 3);
  })(),

  // Müsli/Haferflocken: Schüssel mit Flocken und Beeren
  muesli: (() => {
    return shape('M14 51 C16 36 30 28 50 28 C70 28 84 36 86 51 Z', '#ead2a0', '#8a6a30') +
      stempel('M-5 0 Q0 -4 5 0 Q0 4 -5 0 Z', [[28, 44, -20], [40, 36, 15], [54, 34, -10], [66, 40, 25], [76, 46, -15], [36, 47, 30], [50, 44, 0], [62, 48, -25], [22, 50, 10]], 'fill="#d4a556" stroke="#8a6a30" stroke-width="1.2"') +
      kreis(44, 33, 4.4, '#d9304a', '#6a1020', 1.6) + kreis(60, 31, 4.2, '#4a5ad0', '#1e2a6a', 1.6) + kreis(70, 38, 4, '#d9304a', '#6a1020', 1.6) + kreis(32, 40, 3.8, '#4a5ad0', '#1e2a6a', 1.6) +
      schuessel('#f08a4a', '#7a3410');
  })(),

  // Ei: ganzes Ei und gekochte Hälfte mit Dotter
  ei: (() => {
    return shape('M38 8 C24 8 14 30 14 48 C14 64 24 74 38 74 C52 74 62 64 62 48 C62 30 52 8 38 8 Z', '#f4e4c8', '#7a6040') +
      glanz('M23 32 C25 24 29 18 33 16 C30 25 28 33 28 43 C25 41 22 37 23 32 Z', 0.6) +
      shape('M62 46 C76 46 88 58 88 72 C88 86 76 92 62 92 C48 92 38 84 38 72 C38 58 48 46 62 46 Z', '#fffdf8', '#5e6270') +
      kreis(63, 71, 12.5, '#f6b52a', '#a8700c', 2) +
      kreis(59, 67, 3.4, '#fff', null) ;
  })(),

  // Hähnchen: gegrillte Keule mit Knochen
  haehnchen: (() => {
    const K = '#f6efe0', KL = '#6b5a40';
    return tube('M54 56 L78 80', 9, K, KL) +
      kreis(77, 89, 6.5, K, KL, 2.2) + kreis(88, 79, 6.5, K, KL, 2.2) +
      line('M62 64 L81 83', K, 9) +
      shape('M14 38 C14 20 34 8 52 14 C70 20 76 40 68 54 C63 62 56 64 50 68 C42 72 30 68 22 60 C16 54 14 46 14 38 Z', '#d98a3a', '#5e2e0c') +
      line('M26 28 L44 48 M38 20 L58 42 M22 44 L36 58', '#8a4614', 3.2, 0.75) +
      glanz('M20 32 C22 22 32 16 40 16 C32 20 26 28 24 38 C22 37 20 35 20 32 Z', 0.4);
  })(),

  // Fisch (Lachs, Makrele): ganzer Fisch mit Flossen, Kieme und Auge
  fisch: (() => {
    const L = '#6a2a20', F = '#e8745a';
    return shape('M38 31 C44 18 58 20 62 34 Z', F, L, 2) +
      shape('M40 66 C44 76 54 76 56 66 Z', F, L, 2) +
      shape('M70 50 L92 30 C88 42 88 58 92 70 Z', F, L) +
      shape('M8 50 C20 28 52 22 72 42 C76 46 76 54 72 58 C52 78 20 72 8 50 Z', '#f59a80', L) +
      line('M30 36 C35 44 35 56 30 64', L, 2) +
      line('M44 40 C48 46 48 54 44 60 M55 42 C58 46 58 54 55 58', '#d9654a', 1.8, 0.8) +
      kreis(21, 46, 3.6, '#fff', L, 1.6) + kreis(21.5, 46, 1.7, L) +
      glanz('M16 46 C24 36 38 32 50 33 C38 36 28 40 20 48 Z', 0.4);
  })(),

  // Konservendose (Thunfisch): Dose mit blauem Etikett und Fisch-Zeichen
  dose: (() => {
    const L = '#344052';
    return shape('M14 31 L14 71 C14 77 30 81 50 81 C70 81 86 77 86 71 L86 31 Z', '#c4cdd8', L) +
      shape('M14 41 C14 47 30 51 50 51 C70 51 86 47 86 41 L86 63 C86 69 70 73 50 73 C30 73 14 69 14 63 Z', '#3f7fc4', L, 2) +
      shape('M34 62 C40 55 52 55 58 61 L67 55 L67 69 L58 63 C52 69 40 69 34 62 Z', '#fff', 'none', 0) +
      kreis(40, 61, 1.6, '#3f7fc4') +
      oval(50, 31, 36, 10, '#e4e9f0', L) + oval(50, 31, 29, 7, 'none', '#9aa6b6', 1.6) +
      shape('M54 29 C58 25 67 26 66 31 C65 35 57 34 54 29 Z', '#c4cdd8', L, 1.6) +
      glanz('M18 34 L22 36 L22 70 L18 68 Z', 0.6);
  })(),

  // Käse (Gouda): Keil mit Löchern, Rinde an der breiten Seite
  kaese: (() => {
    const L = '#7a5208', H = '#dca01c';
    return shape('M10 54 L76 42 L76 70 L10 82 Z', '#f6c234', L) +
      shape('M76 42 L90 22 L90 50 L76 70 Z', '#df981c', L) +
      shape('M10 54 L90 22 L76 42 Z', '#ffe27a', L) +
      kreis(26, 68, 5, H) + kreis(46, 58, 3.6, H) + kreis(62, 61, 5, H) + kreis(40, 72, 2.6, H) +
      oval(58, 39, 5, 2.2, H) + oval(77, 31, 3, 1.5, H) + oval(40, 45.5, 4, 1.6, H);
  })(),

  // Mozzarella: weiße Kugel mit zwei Scheiben und Basilikumblättern
  mozzarella: (() => {
    const L = '#5c6272', G = '#1f4a1c';
    const scheibe = (x, y, rx, ry) =>
      shape(`M${x - rx} ${y} L${x - rx} ${y + 4} A${rx} ${ry} 0 0 0 ${x + rx} ${y + 4} L${x + rx} ${y} Z`, '#dfe3eb', L, 2) +
      oval(x, y, rx, ry, '#fefefb', L, 2);
    return kreis(40, 50, 28, '#e4e7ee') + kreis(36, 46, 22, '#fefefb') + kreis(40, 50, 28, 'none', L) +
      glanz('M22 46 C23 38 28 33 34 31 C30 36 27 42 27 50 C25 49 22 48 22 46 Z', 0.9) +
      scheibe(74, 66, 18, 7) + scheibe(64, 80, 22, 8.5) +
      shape('M38 24 C37 10 50 2 64 4 C66 16 55 26 38 24 Z', '#3f9a3a', G, 2) +
      shape('M40 24 C30 12 17 12 10 18 C16 28 30 30 40 24 Z', '#56b04a', G, 2) +
      line('M40 23 C48 17 54 12 61 6 M38 23 C30 20 22 18 14 18', G, 1.2, 0.7);
  })(),

  // Becher (Quark, Joghurt, Skyr, Sahne): weißer Becher mit blauem Band und Deckel
  becher: (() => {
    const cup = 'M18 26 L27 86 C28 91 72 91 73 86 L82 26 Z';
    return shape(cup, '#fff', D) +
      shape('M70 30 L80 30 L72.6 84 L66 86 Z', '#e3e8ef', 'none', 0) +
      shape('M20.7 44 C30 49 70 49 79.3 44 L76.6 62 C66 67 34 67 23.4 62 Z', '#3f7fc4', 'none', 0) +
      line('M27 55 C33 52 39 58 45 55 C51 52 57 58 63 55 C67 53 71 55 74 55', '#fff', 2.2) +
      shape(cup, 'none', D) +
      oval(50, 26, 33, 8, '#cdd8e6', D) + oval(50, 26, 26, 5, 'none', '#9fb0c6', 1.4) +
      shape('M74 30 L87 35 L84 40 L70 33 Z', '#cdd8e6', D, 1.8);
  })(),

  // Hülsenfrüchte (Bohnen, Kichererbsen, Linsen): Schüssel voller roter Bohnen
  bohnen: (() => {
    const b = 'M-9 1C-9-5-4-6 0-3C4-6 9-5 9 1S-9 6-9 1Z';
    const lage = [[50, 28, -5], [40, 31, -30], [60, 31, 20], [32, 37, 30], [68, 36, -25], [22, 46, -15], [42, 43, 10], [60, 44, -10], [78, 46, 20], [32, 49, 5], [50, 49, -20], [68, 49, 15]];
    return '<g stroke="#4a140c" stroke-width="1.8" stroke-linejoin="round">' +
      lage.map(([x, y, r], i) => `<path transform="translate(${x} ${y}) rotate(${r})" d="${b}" fill="${i % 3 ? '#b03a2a' : '#7c2a1e'}"/>`).join('') + '</g>' +
      line(lage.map(([x, y]) => `M${x - 4} ${y - 1}l4 -1`).join(''), '#fff', 1.6, 0.5) +
      schuessel('#ead9b4', '#6a4e22');
  })(),

  // Hummus: Dip in türkiser Schale mit Wirbel, Öl, Paprikapulver und Kichererbsen
  hummus: (() => {
    return shape('M8 46 C8 70 28 86 50 86 C72 86 92 70 92 46 Z', '#3f8f92', '#163c40') +
      oval(50, 46, 42, 20, '#62b3b6', '#163c40') +
      oval(50, 46, 34, 14, '#efd6a2', '#9a7a3e', 1.6) +
      line('M24 46 C26 36 74 36 76 46 C76 54 34 56 34 46 C34 40 64 38 64 46 C64 50 46 51 46 46', '#c49a58', 2) +
      `<path d="M44 45 C46 41 56 41 57 45 C57 49 45 50 44 45 Z" fill="#c8b42a" opacity=".85"/>` +
      punkte('#d9482a', '30,42 36,52 66,40 70,50 52,38 58,54', 1.3) +
      kreis(40, 44, 3, '#e6bc6c', '#8a6a2a', 1.2) + kreis(62, 47, 3, '#e6bc6c', '#8a6a2a', 1.2) +
      line('M20 70 C30 78 40 80 50 80', '#fff', 2.4, 0.35);
  })(),

  // Tofu: heller Würfel mit feinen Poren
  tofu: (() => {
    const L = '#6a5a3a';
    return shape('M50 16 L86 34 L50 52 L14 34 Z', '#fffcf2', L) +
      shape('M14 34 L50 52 L50 90 L14 72 Z', '#f1e6cc', L) +
      shape('M50 52 L86 34 L86 72 L50 90 Z', '#e0cfa8', L) +
      punkte('#cfbd92', '24,50 32,58 22,64 38,70 30,78 42,82 40,58 60,62 72,52 66,74 78,64 58,80', 1.4) +
      punkte('#e6dcc2', '40,30 54,26 60,36 46,40 30,34 70,34', 1.4);
  })(),

  // Nüsse: Walnuss, Mandel und Cashew
  nuss: (() => {
    return shape('M66 12 C80 18 90 38 86 58 C83 72 70 78 62 68 C54 56 56 28 66 12 Z', '#b8743a', '#4e2a10') +
      line('M66 18 C62 32 62 50 66 64 M74 24 C72 36 72 52 76 64 M80 36 C80 46 80 54 80 60', '#8a4e22', 1.4, 0.7) +
      tube('M72 70 C62 76 64 92 77 92 C83 92 87 89 89 85', 9, '#f0d8a6', '#7a5a2a') +
      shape('M38 32 C54 30 64 44 62 60 C60 78 46 88 32 84 C16 80 10 64 14 50 C18 38 28 32 38 32 Z', '#c99a5e', '#5a3a18') +
      line('M38 33 C34 46 42 58 36 70 C34 76 34 80 34 84', '#5a3a18', 2) +
      line('M22 46 C26 50 22 56 26 60 M22 70 C26 66 28 72 26 76 M48 42 C44 48 50 52 46 56 M52 64 C48 68 54 72 50 76', '#8a6030', 1.6) +
      glanz('M20 46 C22 40 28 36 34 35 C28 40 24 46 22 52 C20 50 20 48 20 46 Z', 0.4);
  })(),

  // Erdnussbutter: Glas mit brauner Creme, rotem Deckel und Erdnuss-Etikett
  erdnussbutter: (() => {
    const L = '#4a2a0e';
    return shape('M22 34 C22 31 24 30 28 30 L72 30 C76 30 78 31 78 34 L78 86 C78 90 75 92 71 92 L29 92 C25 92 22 90 22 86 Z', '#a8682a', L) +
      shape('M18 13 C18 11 20 10 22 10 L78 10 C80 10 82 11 82 13 L82 29 C82 31 80 32 78 32 L22 32 C20 32 18 31 18 29 Z', '#d9483a', '#5a1a10') +
      line('M26 14 L26 28 M34 14 L34 28 M42 14 L42 28 M50 14 L50 28 M58 14 L58 28 M66 14 L66 28 M74 14 L74 28', '#a83020', 1.6) +
      shape('M22 48 L78 48 L78 76 L22 76 Z', '#f6e7c4', L, 2) +
      shape('M32 62 C32 54 40 53 46 57 C49 59 51 59 54 57 C60 53 68 54 68 62 C68 70 60 71 54 67 C51 65 49 65 46 67 C40 71 32 70 32 62 Z', '#d9a660', '#6a4418', 1.8) +
      punkte('#a8783a', '38,60 42,65 58,59 62,64', 1.1) +
      glanz('M26 36 L31 36 L31 46 L26 46 Z M26 78 L31 78 L31 88 L26 88 Z', 0.3);
  })(),

  // Honig: goldenes Glas mit Waben-Etikett und Honiglöffel
  honig: (() => {
    const L = '#6e420a', H = '#4e2a0c';
    return shape('M24 44 C14 54 14 80 22 88 C28 94 72 94 78 88 C86 80 86 54 76 44 Z', '#f2ae22', L) +
      shape('M20 38 C20 36 22 35 24 35 L76 35 C78 35 80 36 80 38 L80 44 C80 46 78 47 76 47 L24 47 C22 47 20 46 20 44 Z', '#f6c64a', L) +
      shape('M64 46 L64 56 C64 61 70 61 70 56 L70 46 Z', '#f6c64a', L, 1.6) +
      shape('M50 57 L61 63 L61 75 L50 81 L39 75 L39 63 Z', '#fde9a8', '#a8700c', 2) +
      glanz('M22 58 C24 52 28 50 30 50 C27 56 26 64 27 74 C24 70 22 64 22 58 Z', 0.4) +
      tube('M44 23 L90 9', 4, '#c8945a', H) +
      `<g transform="rotate(-16 33 26)">${oval(33, 26, 12, 8, '#d9a05a', H, 2.2)}${line('M27 19 L27 33 M33 18 L33 34 M39 19 L39 33', H, 1.6)}</g>` +
      shape('M31 33 C31 37 34 39 33 44 C32 48 29 48 29 44 C29 40 31 37 31 33 Z', '#f2ae22', L, 1.4);
  })(),

  // Schokolade: Tafel, halb aus Folie und Papier gewickelt
  schokolade: (() => {
    const L = '#3a1a0a', S = '#83492a';
    let stuecke = '';
    for (const y of [16, 30]) for (const x of [30, 51]) stuecke += shape(`M${x} ${y} h19 v12 h-19 Z`, S, L, 1.6);
    return '<g transform="rotate(-10 50 50)">' +
      shape('M28 14 L72 14 L72 56 L28 56 Z', '#5a2e14', L) + stuecke +
      line('M32 18 L46 18 M53 18 L67 18 M32 32 L46 32 M53 32 L67 32', '#a8683e', 1.4, 0.8) +
      shape('M26 48 L74 48 L74 58 L68 53 L62 58 L56 53 L50 58 L44 53 L38 58 L32 53 L26 58 Z', '#dfe5ec', '#5a6474', 1.8) +
      shape('M26 54 L32 58 L38 54 L44 58 L50 54 L56 58 L62 54 L68 58 L74 54 L74 86 L26 86 Z', '#3a6fc4', '#1e3a6e') +
      shape('M26 70 C36 64 44 76 54 70 C62 64 68 72 74 68 L74 76 C68 80 62 72 54 78 C44 84 36 72 26 78 Z', '#f6f0e0', 'none', 0) +
      '</g>';
  })(),

  // Schokoriegel: neutral verpackter Riegel mit gezackten Enden und Nuss-Bild (keine Marke)
  riegel: (() => {
    const L = '#4a1e0a';
    return '<g transform="rotate(-18 50 50)">' +
      shape('M20 38 L7 32 L10 40 L5 45 L10 50 L5 55 L10 60 L7 68 L20 62 Z', '#c4561e', L, 2) +
      shape('M80 38 L93 32 L90 40 L95 45 L90 50 L95 55 L90 60 L93 68 L80 62 Z', '#c4561e', L, 2) +
      shape('M18 36 L82 36 L82 64 L18 64 Z', '#e8732e', L) +
      shape('M18 54 C30 50 40 58 50 54 C60 50 70 58 82 54 L82 64 L18 64 Z', '#6b3418', 'none', 0) +
      line('M18 64 L82 64', L, 2.4) +
      oval(50, 46, 13, 7, '#fbe9c8', L, 1.6) +
      shape('M41 46 C41 42 45 41 48 43 C49 44 51 44 52 43 C55 41 59 42 59 46 C59 50 55 51 52 49 C51 48 49 48 48 49 C45 51 41 50 41 46 Z', '#c8904a', '#6a4418', 1.2) +
      line('M22 40 L78 40', '#fff', 2, 0.45) +
      '</g>';
  })(),

  // Butter (auch Margarine): gelber Block auf kleinem Teller
  butter: (() => {
    const L = '#7a5a10';
    return oval(50, 72, 46, 14, '#dde7f2', D) + oval(50, 70, 35, 8, '#f3f7fb') +
      shape('M15 40 L65 40 L65 72 L15 72 Z', '#f8d75c', L) +
      shape('M15 40 L31 24 L83 24 L65 40 Z', '#fde88f', L) +
      shape('M65 40 L83 24 L83 56 L65 72 Z', '#e6b834', L) +
      line('M36 32 C43 27 53 27 60 32', '#e0b030', 2.2) +
      glanz('M20 45 L40 45 L40 50 L20 50 Z', 0.5);
  })(),

  // Olivenöl: Flasche mit olivgrünem Öl und Olivenzweig
  oel: (() => {
    const L = '#3a4a1a', G = '#2f4010';
    return shape('M24 44 C24 36 34 32 35 26 L35 16 L45 16 L45 26 C46 32 56 36 56 44 L56 88 C56 91 54 93 51 93 L29 93 C26 93 24 91 24 88 Z', '#eef3e2', L) +
      `<path d="M26 52 L54 52 L54 88 C54 90 53 91 51 91 L29 91 C27 91 26 90 26 88 Z" fill="#b4bf2e"/>` +
      shape('M24 44 C24 36 34 32 35 26 L35 16 L45 16 L45 26 C46 32 56 36 56 44 L56 88 C56 91 54 93 51 93 L29 93 C26 93 24 91 24 88 Z', 'none', L) +
      shape('M33 6 L47 6 L47 17 L33 17 Z', '#4a5a1e', L, 2) +
      shape('M24 62 L56 62 L56 78 L24 78 Z', '#f6f0d6', L, 2) +
      oval(40, 70, 4, 5, '#6b8a22', G, 1.4) +
      glanz('M28 40 C29 37 31 35 33 34 L33 50 L28 50 Z', 0.6) +
      line('M90 34 C80 44 74 56 72 68', '#6b5a2a', 2.2) +
      shape('M84 40 C74 36 66 38 62 44 C70 47 78 46 84 40 Z', '#8aa05a', G, 1.6) +
      shape('M78 52 C86 50 92 54 94 60 C86 62 80 58 78 52 Z', '#8aa05a', G, 1.6) +
      oval(73, 76, 8, 11, '#6b8a22', G, 2.2, -15) + oval(87, 70, 7, 9.5, '#4f6a18', G, 2.2, 20) +
      kreis(70, 72, 2, '#fff', null);
  })(),

  // Salami: Wurst mit Anschnitt und zwei Scheiben
  salami: (() => {
    const L = '#4a1210', R = '#b0352e', S = '#d9544e', W = '#f6dcd0';
    return '<g transform="translate(6 2) rotate(30 34 38)">' +
      shape('M60 23 L14 23 C1 23 1 53 14 53 L60 53 Z', R, L) +
      line('M3 38 L-3 36', '#e8dcc0', 2.6) +
      punkte(W, '14,30 24,44 34,30 44,46 52,32 18,46 30,38 48,38', 1.5) +
      oval(60, 38, 6, 15, S, L) +
      punkte(W, '59,30 61,38 58,45', 1.4) +
      '</g>' +
      kreis(62, 79, 13, S, L) + punkte(W, '56,74 64,72 68,80 58,84 62,79', 1.6) +
      kreis(84, 67, 11, S, L) + punkte(W, '80,63 88,64 84,72 79,70', 1.5);
  })(),

  // Datteln: drei glänzende braune Früchte
  datteln: (() => {
    const L = '#2e1206', F = '#7e3818', R = '#b4652e';
    const dattel = (x, y, r) => `<g transform="rotate(${r} ${x} ${y})">` + oval(x, y, 11, 24, F, L) +
      line(`M${x - 9} ${y - 11} C${x - 4} ${y - 8} ${x + 2} ${y - 9} ${x + 6} ${y - 13} M${x - 10} ${y + 1} C${x - 4} ${y + 4} ${x + 3} ${y + 2} ${x + 9} ${y - 1} M${x - 8} ${y + 13} C${x - 3} ${y + 15} ${x + 3} ${y + 14} ${x + 7} ${y + 11}`, R, 1.6) +
      `<ellipse cx="${x + 4}" cy="${y - 6}" rx="2.4" ry="7" fill="#fff" opacity=".35"/>` + kreis(x, y - 23, 2.8, '#c8904a', L, 1.4) + '</g>';
    return dattel(31, 44, -22) + dattel(69, 42, 22) + dattel(50, 72, 82);
  })(),

  // Kokos: Kokosnuss-Hälfte mit weißem Fruchtfleisch und einem Häufchen Raspeln
  kokos: (() => {
    const L = '#3a1e0a', W = '#8a8478';
    return shape('M8 52 C8 76 26 92 50 92 C74 92 92 76 92 52 Z', '#7a4a26', L) +
      line('M16 64 l5 2 M22 74 l4 3 M32 82 l4 2 M46 86 l4 1 M60 85 l4 -1 M72 80 l4 -3 M82 70 l4 -3 M30 70 l4 2 M44 76 l4 1 M58 76 l4 -1 M70 70 l4 -2', '#4e2a12', 1.6) +
      oval(50, 52, 42, 16, '#fffdf6', L) + oval(50, 53, 31, 9.5, '#e6dfcc') +
      shape('M22 62 C22 52 26 46 30 44 C30 39 36 35 40 36 C42 31 48 29 52 31 C56 29 62 32 63 36 C68 36 72 40 71 44 C76 47 78 54 78 62 Z', '#fff', W, 2) +
      line('M30 52 l4 -1 M40 44 l3 2 M50 38 l4 0 M60 42 l3 -2 M46 48 l4 1 M36 38 l3 1 M66 50 l3 1 M56 50 l3 -1 M68 44 l2 2', '#b0a898', 1.6) +
      '<path d="M8 52 A42 16 0 0 0 92 52 L81 53 A31 9.5 0 0 1 19 53 Z" fill="#fffdf6"/>' +
      line('M19 53 A31 9.5 0 0 0 81 53', '#c8bfae', 1.6) +
      line('M30 26 l3 1 M48 20 l2 2 M68 24 l3 -1 M80 34 l2 2 M18 38 l3 -1', W, 1.6);
  })(),

  // Kartoffelchips: rote Schale, aus der große, gewellte Chips ragen
  chips: (() => {
    const c = 'M-15 0C-16-9-7-14 0-13C7-14 16-9 15 0C16 9 7 14 0 13C-7 14-16 9-15 0Z';
    const r = 'M-10-6C-5-3 5-3 10-6M-12 0C-5 3 5 3 12 0M-10 6C-5 9 5 9 10 6';
    const chip = ([x, y, w, k = 1]) => `<g transform="translate(${x} ${y}) rotate(${w}) scale(1 ${k})">` +
      `<path d="${c}" fill="#fbd35a" stroke="#8a5a0c" stroke-width="2" stroke-linejoin="round"/>` +
      `<path d="${r}" fill="none" stroke="#e3a536" stroke-width="1.5" stroke-linecap="round"/></g>`;
    return [[26, 40, -40], [74, 40, 40], [50, 30, 0, 0.9], [36, 48, 20, 0.6], [64, 48, -20, 0.6]].map(chip).join('') +
      punkte('#c8702a', '22,36 47,24 80,37 56,32', 1.3) +
      schuessel('#d9483a', '#5a1410');
  })(),

  // Teller mit Gabel und Messer (auch Ersatzbild für unbekannte Namen)
  teller: (() => {
    const G = '#5a6478', F = '#c9d1dd';
    return kreis(50, 50, 28, '#fff', D) + kreis(50, 50, 19, 'none', '#c4ccd8', 2) +
      line('M6 10 L6 28 M12 10 L12 28 M18 10 L18 28', G, 2.2) +
      shape('M5 26 L19 26 C19 34 15 38 12 38 C9 38 5 34 5 26 Z', F, G, 2) +
      shape('M10 37 L14 37 L14 88 C14 91 10 91 10 88 Z', F, G, 2) +
      shape('M85 52 L85 14 C85 9 93 11 93 26 L93 52 Z', F, G, 2) +
      shape('M84 50 L94 50 L94 88 C94 92 84 92 84 88 Z', G, D, 2);
  })(),

  // Kind: großer runder Kopf, rote Strubbelhaare, Sommersprossen, gelbes T-Shirt
  kind: person({
    haut: '#f6d2b2', hautL: '#8a5a3a', kopf: [50, 47, 21, 21], s: 27, oben: 77, hemd: '#f6c445', augen: 2.8,
    vorn: shape('M28 48 C25 30 36 21 50 21 C64 21 75 30 72 48 C70 41 66 37 62 35 C58 39 52 39 48 35 C44 39 38 39 36 37 C32 39 30 43 28 48 Z', '#d0652a', '#6a2a0e') +
      line('M48 22 C47 16 51 12 56 14', '#6a2a0e', 2.4) +
      `<g fill="#f08a8a" opacity=".55"><circle cx="38" cy="58" r="4"/><circle cx="62" cy="58" r="4"/></g>` +
      punkte('#c07a4a', '40,54 44,56 56,56 60,54', 0.9),
    extra: line('M26 89 L74 89', '#e8902a', 4),
  }),

  // Jugendliche/r: Kapuzenpulli und Kopfhörer
  jugend: person({
    haut: '#8d5a3b', hautL: '#3e2214', kopf: [50, 41, 19, 22], s: 34, oben: 71, hemd: '#2f9e8f', hemdL: '#164a42',
    vorn: shape('M31 38 C27 30 30 22 36 21 C37 15 45 13 50 16 C55 12 64 15 65 21 C71 22 73 30 69 38 C66 31 58 28 50 29 C42 28 34 31 31 38 Z', '#1e1a1a', '#0e0c0c', 2),
    extra: shape('M33 77 C30 67 40 64 50 66 C60 64 70 67 67 77 C62 73 56 73 50 75 C44 73 38 73 33 77 Z', '#268a7d', '#164a42', 2) +
      line('M45 77 L44 89 M55 77 L56 89', '#f4f7fa', 2.2) +
      line('M29 40 C29 18 71 18 71 40', '#3a3f4e', 3.6) +
      shape('M25 34 C25 32 27 31 29 31 L33 31 L33 50 L29 50 C27 50 25 49 25 47 Z', '#e0483a', '#5a1410', 2) +
      shape('M75 34 C75 32 73 31 71 31 L67 31 L67 50 L71 50 C73 50 75 49 75 47 Z', '#e0483a', '#5a1410', 2),
  }),

  // Erwachsene/r: schulterlange dunkle Haare, blaues Hemd mit Kragen
  erwachsen: person({
    haut: '#d39a6a', hautL: '#6e4024', kopf: [50, 40, 19, 22], s: 35, oben: 70, hemd: '#3f6fc4', hemdL: '#1e3a6e',
    hinten: shape('M28 42 C26 22 38 14 50 14 C62 14 74 22 72 42 C72 54 76 64 70 70 L30 70 C24 64 28 54 28 42 Z', '#4a2c1a', '#24140a'),
    vorn: shape('M31 38 C30 24 40 17 50 17 C61 17 70 24 69 38 C64 30 56 26 48 28 C42 30 36 34 31 38 Z', '#4a2c1a', '#24140a', 2),
    extra: shape('M42 70 L50 82 L58 70 L62 74 L54 84 L50 82 L46 84 L38 74 Z', '#fff', '#1e3a6e', 2),
  }),

  // Seniorin/Senior: graue Haare, Brille, Strickjacke
  senior: person({
    haut: '#f0c6a4', hautL: '#8a5a3a', kopf: [50, 41, 19, 22], s: 35, oben: 71, hemd: '#8a62b8', hemdL: '#3e2462',
    vorn: shape('M30 46 C27 30 33 20 44 18 C54 15 68 19 70 33 C71 39 71 43 70 47 C67 41 66 35 62 31 C56 29 46 29 40 31 C35 34 33 40 30 46 Z', '#e1e4ea', '#6a7080', 2) +
      line('M40 33 C46 31 54 31 60 33', '#c9a888', 1.4, 0.8),
    extra: kreis(43, 44, 6.2, '#fff', D, 2) + kreis(57, 44, 6.2, '#fff', D, 2) +
      kreis(43, 44, 2.4, D) + kreis(57, 44, 2.4, D) +
      line('M49 43 C49.5 42 50.5 42 51 43 M36.8 43 L31 41 M63.2 43 L69 41 M35 51 l-2 1 M65 51 l2 1', D, 1.6) +
      shape('M43 71 L50 86 L57 71 Z', '#fff', '#3e2462', 2) +
      punkte('#f6e7c4', '50,90 50,95', 1.6),
  }),
};

export const BILD_NAMEN = Object.keys(BILDER);

// fertiges <svg> zu einem Namen; unbekannte Namen bekommen den Teller
export function bild(name, cls = '') {
  const inner = (Object.prototype.hasOwnProperty.call(BILDER, name) && BILDER[name]) || BILDER.teller;
  return `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 100 100" aria-hidden="true" focusable="false">${inner}</svg>`;
}

// Person passend zum Alter (in Jahren)
export function personBild(alter) {
  const a = Number(alter);
  if (!Number.isFinite(a)) return bild('erwachsen');
  if (a < 12) return bild('kind');
  if (a < 18) return bild('jugend');
  if (a < 65) return bild('erwachsen');
  return bild('senior');
}
