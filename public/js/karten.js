// Karten und Eingabe-Bausteine für Handy, Beamer und Übungsseite:
// Lebensmittelkarte, Bedarfskarte, Reihe mit Lücken zum Einordnen, Hand zum Auswählen, Auflösungen.
import { LEBENSMITTEL, BEDARFSKARTEN, TIPPS, TREFFER_PROZENT } from './inhalte.js';
import { bild, personBild } from './bilder.js';
import {
  NW, NAEHRWERTE, MAX_AUSWAHL, wert, zahl, mitEinheit, sortiert, richtigeLuecke, zielZehntel, untergrenze, summe, besteKombi,
  WAAGE_BODEN,
} from './regeln.js';

export const $ = s => document.querySelector(s);
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const LM = i => LEBENSMITTEL[i];
export const BK = i => BEDARFSKARTEN[i];
export const fmtMs = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s';
export const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
export const zehntelText = (z, nw) => mitEinheit(z / 10, nw);
export const tipp = (n = Math.random()) => TIPPS.length ? TIPPS[Math.floor(n * TIPPS.length) % TIPPS.length] : '';
export const nwChip = (nw, text) => `<span class="nwchip nw-${nw}"><i></i>${esc(text || NW[nw].name)}</span>`;

// ---------------------------------------------------------------- Lebensmittelkarte
/**
 * i: Index in LEBENSMITTEL. o: { nw, zeigen (Wert anzeigen), cls, extra (HTML rechts) }
 */
export function lmKarte(i, o = {}) {
  const l = LM(i); if (!l) return '';
  const w = o.nw && o.zeigen ? `<span class="lmwert nw-${o.nw}">${esc(mitEinheit(wert(l, o.nw), o.nw))}</span>` : (o.nw && o.verdeckt ? '<span class="lmwert zu">?</span>' : '');
  return `<div class="lm ${o.cls || ''}" data-lm="${esc(l.id)}"><span class="lmbild">${bild(l.bild)}</span><span class="lmname">${esc(l.name)}<small class="lmje">je 100 g</small></span>${w}${o.extra || ''}</div>`;
}
// Große Karte: „Wohin gehört …?“
export function lmGross(i, o = {}) {
  const l = LM(i); if (!l) return '';
  const w = o.nw && o.zeigen ? `<span class="lmwert nw-${o.nw}">${esc(mitEinheit(wert(l, o.nw), o.nw))}</span>` : '';
  return `<div class="lmgross ${o.cls || ''}"><span class="lmbild">${bild(l.bild)}</span><div><small>je 100 g</small><b>${esc(l.name)}</b>${w}</div></div>`;
}

// ---------------------------------------------------------------- Bedarfskarte
export function bedarfKarte(bIdx, o = {}) {
  const b = BK(bIdx); if (!b) return '';
  return `<div class="bk ${o.cls || ''} nw-${b.wert}">
    <div class="bkkopf">Bedarfskarte ${nwChip(b.wert)}</div>
    <div class="bkbody"><span class="bkbild">${personBild(b.alter)}</span>
      <div class="bktext"><b>${esc(b.name)} (${b.alter})</b><span>${esc(b.text)}</span></div>
      <div class="bkziel"><small>Zielwert</small><b>${esc(zielZahl(b.ziel))}</b><span>${b.wert === 'kcal' ? 'kcal' : 'g ' + esc(NW[b.wert].name)}</span></div>
    </div></div>`;
}
export const zielZahl = z => Number.isInteger(z) ? String(z) : String(z).replace('.', ',');
export const zielText = b => b.wert === 'kcal' ? `${zielZahl(b.ziel)} kcal` : `${zielZahl(b.ziel)} g ${NW[b.wert].name}`;

// ---------------------------------------------------------------- Reihe
/*
 * Die Reihe steht senkrecht: oben der höchste Wert, unten der niedrigste (wie am Tisch: „oberhalb = mehr“).
 * Lücke g (0 … n) = Anzahl der Karten mit kleinerem Wert; g = 0 ist ganz unten.
 * o.geordnet: Die Reihe ist schon in der gelegten Reihenfolge (von unten nach oben) und kann Fehler enthalten
 * (Klassenrunde). Dann ist Lücke g einfach die Stelle g in dieser Reihenfolge.
 */
export function reiheHtml(reiheIdx, nw, o = {}) {
  const sort = o.geordnet ? reiheIdx.slice() : sortiert(reiheIdx, nw);
  const n = sort.length;
  const luecke = g => {
    if (o.luecken === false) return '';
    const inhalt = o.lueckeInhalt ? o.lueckeInhalt(g) : '';
    return `<button type="button" class="luecke ${o.gewaehlt === g ? 'gewaehlt' : ''} ${o.lueckeCls ? o.lueckeCls(g) : ''}" data-g="${g}" ${o.aktiv ? '' : 'tabindex="-1" disabled'} aria-label="${esc(lueckeText(sort, g, nw))}">${inhalt || (o.aktiv ? '<span class="plus">+</span>' : '')}</button>`;
  };
  let h = `<div class="reihe ${o.aktiv ? 'aktiv' : ''} ${o.cls || ''}"><div class="pfeil oben">▲ ${esc(NW[nw].mehr)} <small>(je 100 g)</small></div>`;
  for (let k = n; k >= 0; k--) {
    h += luecke(k);
    if (k > 0) {
      const i = sort[k - 1];
      h += lmKarte(i, { nw, zeigen: o.zeigen || (o.zeigeIdx && o.zeigeIdx.includes(i)), verdeckt: !o.zeigen, cls: o.karteCls ? o.karteCls(i, k - 1) : '' });
    }
  }
  return h + `<div class="pfeil unten">▼ ${esc(NW[nw].weniger)}</div></div>`;
}
export function lueckeText(sort, g, nw) {
  const n = sort.length;
  if (n === 0) return 'hier';
  if (g === 0) return 'ganz unten, unter ' + LM(sort[0]).name;
  if (g === n) return 'ganz oben, über ' + LM(sort[n - 1]).name;
  return 'zwischen ' + LM(sort[g - 1]).name + ' und ' + LM(sort[g]).name;
}

/**
 * Einordnen auf dem Handy: Lücke antippen (Karte erscheint dort), dann „Einordnen“.
 * o: { reihe, neu, nw, zeigen, geordnet, onAbgabe(gap), knopf,
 *      zweifel (Knopf „Ich zweifle!“ zeigen), onZweifel() }
 */
export function reiheEingabe(el, o) {
  let gewaehlt = -1, aktiv = true, scharf = 0;
  const zeichne = () => {
    el.innerHTML = `<div class="einordnen">
      <div class="neukarte">${o.rueck || ''}<span class="eyebrow">Wohin gehört …</span>${lmGross(o.neu, {})}</div>
      <div class="reihebox" id="reiheBox">${reiheHtml(o.reihe, o.nw, {
        aktiv, zeigen: o.zeigen, gewaehlt, geordnet: o.geordnet,
        lueckeInhalt: g => g === gewaehlt ? lmKarte(o.neu, { cls: 'geist' }) : '',
      })}</div>
      <div class="abgabe ${o.zweifel ? 'mitzweifel' : ''}"><button class="big-btn" id="btnEin" ${gewaehlt < 0 || !aktiv ? 'disabled' : ''}>${gewaehlt < 0 ? 'Tippe auf eine Lücke' : esc(o.knopf || 'Hier einordnen ✓')}</button>${o.zweifel ? `<button class="ghost-btn zweifel" id="btnZweifel" ${aktiv ? '' : 'disabled'}>Ich zweifle!</button>` : ''}</div>
    </div>`;
    const bz = el.querySelector('#btnZweifel');
    if (bz) bz.onclick = () => {
      if (!aktiv) return;
      // Zweimal tippen, damit niemand aus Versehen zweifelt
      if (Date.now() - scharf > 4000) { scharf = Date.now(); bz.textContent = 'Sicher? Nochmal tippen'; bz.classList.add('scharf'); return; }
      aktiv = false; bz.disabled = true; el.querySelector('#btnEin').disabled = true; o.onZweifel();
    };
    el.querySelectorAll('.luecke').forEach(b => {
      b.onclick = () => {
        if (!aktiv) return;
        const box = el.querySelector('#reiheBox'), y = box.scrollTop;
        gewaehlt = Number(b.dataset.g); zeichne();
        el.querySelector('#reiheBox').scrollTop = y;
      };
    });
    const btn = el.querySelector('#btnEin');
    btn.onclick = () => { if (gewaehlt < 0 || !aktiv) return; aktiv = false; btn.disabled = true; o.onAbgabe(gewaehlt); };
  };
  zeichne();
  return { sperren() { aktiv = false; el.querySelectorAll('#btnEin, #btnZweifel, .luecke').forEach(x => { x.disabled = true; }); }, get gewaehlt() { return gewaehlt; } };
}

// Auflösung der Reihe: alle Werte sichtbar, neue Karte an der richtigen Stelle, Tipps als Namensschilder
export function reiheAufloesung(reihe, neu, nw, tipps = []) {
  const richtig = richtigeLuecke(reihe, neu, nw);
  return reiheHtml(reihe, nw, {
    zeigen: true, aktiv: false,
    lueckeCls: g => g === richtig ? 'soll' : (tipps.some(t => t.gap === g) ? 'falsch' : 'leer'),
    lueckeInhalt: g => {
      const schilder = tipps.filter(t => t.gap === g).map(t => `<span class="schild ${g === richtig ? 'ok' : 'bad'}">${esc(t.name)}</span>`).join('');
      if (g === richtig) return lmKarte(neu, { nw, zeigen: true, cls: 'neu', extra: schilder ? `<span class="schilder">${schilder}</span>` : '' });
      return schilder ? `<span class="schilder">${schilder}</span>` : '';
    },
  });
}

// ---------------------------------------------------------------- Bedarf: Hand
/**
 * Bis zu 5 Lebensmittel aus 10 auswählen. o: { hand, onAbgabe(pickPos), knopf }
 */
export function handEingabe(el, o) {
  const pick = new Set();
  let aktiv = true;
  el.innerHTML = `<div class="auswahl">
    <div class="handkopf"><span>Wähle bis zu ${MAX_AUSWAHL} Lebensmittel (je 100 g)</span><b id="zaehler">0 / ${MAX_AUSWAHL}</b></div>
    <div class="hand">${o.hand.map((i, k) => `<button type="button" class="hk" data-k="${k}" aria-pressed="false">${lmKarte(i)}<i class="haken">✓</i></button>`).join('')}</div>
    <div class="abgabe"><button class="big-btn" id="btnAb" disabled>Wähle Lebensmittel</button></div>
  </div>`;
  const btn = el.querySelector('#btnAb'), zaehler = el.querySelector('#zaehler');
  const update = () => {
    zaehler.textContent = `${pick.size} / ${MAX_AUSWAHL}`;
    btn.disabled = !pick.size || !aktiv;
    btn.textContent = pick.size ? (o.knopf || 'Abgeben ✓') : 'Wähle Lebensmittel';
    el.querySelectorAll('.hk').forEach(b => {
      const on = pick.has(Number(b.dataset.k));
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('voll', !on && pick.size >= MAX_AUSWAHL);
    });
  };
  el.querySelectorAll('.hk').forEach(b => {
    b.onclick = () => {
      if (!aktiv) return;
      const k = Number(b.dataset.k);
      if (pick.has(k)) pick.delete(k); else if (pick.size < MAX_AUSWAHL) pick.add(k);
      update();
    };
  });
  btn.onclick = () => { if (!pick.size || !aktiv) return; aktiv = false; update(); o.onAbgabe([...pick].sort((a, b) => a - b)); };
  return { sperren() { aktiv = false; update(); el.querySelectorAll('.hk').forEach(b => { b.disabled = true; }); }, get pick() { return [...pick]; } };
}

// Balken: 0 … Zielwert, grüner Bereich ab TREFFER_PROZENT (nur Qualifying), Markierung für die Summe
export function balken(sumZ, zielZ, o = {}) {
  const max = Math.max(zielZ * 1.35, sumZ * 1.05);
  const pct = v => Math.min(100, v / max * 100).toFixed(1) + '%';
  return `<div class="balken ${sumZ > zielZ ? 'drueber' : ''}">
    ${o.bereich ? `<i class="zone" style="left:${pct(zielZ * TREFFER_PROZENT / 100)};width:calc(${pct(zielZ)} - ${pct(zielZ * TREFFER_PROZENT / 100)})"></i>` : ''}
    <i class="ziel" style="left:${pct(zielZ)}"></i>
    <i class="fuell" style="width:${pct(sumZ)}"></i>
  </div>`;
}

// Liste der ausgewählten Karten mit Werten und Summe
export function kombiListe(pick, nw) {
  if (!pick.length) return '<p class="hint">Keine Karten ausgewählt.</p>';
  return `<div class="kombi">${pick.map(i => lmKarte(i, { nw, zeigen: true })).join('')}</div>`;
}
export function kombiText(pick, nw) {
  return 'Je 100 g ' + pick.map(i => LM(i).name).join(' + ') + ' = ' + zehntelText(summe(pick, nw), nw);
}

/**
 * Auswertung einer Bedarfskarte (Handy/Übung). Rückgabe: HTML.
 * e: Ergebnis von bewerte(); pick: Lebensmittel-Indizes.
 * o: { quali (Treffer-Bereich zählt), extra (HTML am Ende, z. B. Knopf) }
 */
export function bedarfAuswertung(bIdx, hand, pick, e, o = {}) {
  const quali = o.quali !== false;
  const b = BK(bIdx), zielZ = zielZehntel(b), nw = b.wert;
  const best = besteKombi(hand, nw, zielZ);
  const pct = Math.round(e.sum * 100 / zielZ);
  let titel, cls;
  if (e.drueber) { titel = 'Zu viel!'; cls = 'bad'; }
  else if (quali && !e.ok) { titel = 'Zu wenig!'; cls = 'bad'; }
  else if (!quali) { titel = `${pct} % des Zielwerts`; cls = o.gewonnen ? 'good' : ''; }
  else { titel = e.sum === zielZ ? 'Volltreffer!' : 'Geschafft!'; cls = 'good'; }
  const satz = e.drueber
    ? `${zehntelText(e.sum, nw)} – das ist mehr als der Zielwert (${zielText(b)}).`
    : quali && !e.ok
      ? `${zehntelText(e.sum, nw)} – das sind nur ${pct} %. Geschafft ist es ab ${TREFFER_PROZENT} % (${zehntelText(untergrenze(b), nw)}).`
      : `${zehntelText(e.sum, nw)} von ${zielText(b)} (${pct} %).`;
  const bestGleich = best.sum === e.sum;
  return `<div class="card ${cls} auswertung">
    <h2>${titel}</h2><p>${esc(satz)}</p>
    ${balken(e.sum, zielZ, { bereich: quali })}
    <h3>Deine Auswahl (je 100 g)</h3>${kombiListe(pick, nw)}
    <div class="beste ${bestGleich ? 'gleich' : ''}"><h3>${bestGleich ? 'Das war die beste Möglichkeit!' : 'Beste Möglichkeit mit diesen Karten'}</h3>
      ${bestGleich ? '' : `<p>${esc(kombiText(best.pick, nw))}</p>`}</div>
    ${o.extra || ''}
  </div>`;
}

// ---------------------------------------------------------------- Waage
const nwKurz = (nw, kurz) => nw === 'kcal' ? 'kcal' : kurz && nw === 'kh' ? 'KH' : NW[nw].name;
const nwZahl = (v, nw) => nw === 'kcal' ? `${Math.round(v)} kcal` : `${Math.round(v)} g`;
// Zahl mit kleiner Einheit (die Einheit in normaler Schrift, damit aus „g“ kein „G“ wird)
export const grammHtml = g => `${g}<small class="einh">g</small>`;
const zahlHtml = (v, nw) => `${Math.round(v)}<small class="einh">${nw === 'kcal' ? 'kcal' : 'g'}</small>`;
// Zielwerte als vier farbige Kästchen (kcal, Fett, Kohlenhydrate, Eiweiß)
export function waageZiel(ziel, o = {}) {
  return `<div class="wziel ${o.cls || ''}">${o.titel ? `<span class="wztitel">${esc(o.titel)}</span>` : ''}${NAEHRWERTE.map(nw =>
    `<div class="wz nw-${nw}"><b>${Math.round(ziel[nw])}${nw === 'kcal' ? '' : '<small class="einh">g</small>'}</b><span>${esc(nwKurz(nw, o.kurz))}</span></div>`).join('')}</div>`;
}
// Lebensmittel mit Bild, Name und (wenn zeigen) allen vier Werten je 100 g
export function waageLm(i, o = {}) {
  const l = LM(i); if (!l) return '';
  const werte = o.zeigen
    ? `<span class="wwerte">${NAEHRWERTE.map(nw => `<i class="nw-${nw}">${esc(zahl(wert(l, nw), nw))} ${nw === 'kcal' ? 'kcal' : 'g ' + (nw === 'kh' ? 'KH' : NW[nw].name)}</i>`).join('')}</span>`
    : '';
  return `<div class="lm wl ${o.cls || ''}" data-lm="${esc(l.id)}"><span class="lmbild">${bild(l.bild)}</span><span class="lmname">${esc(l.name)}<small class="lmje">je 100 g${o.zeigen ? '' : ' · Werte verdeckt'}</small>${werte}</span>${o.extra || ''}</div>`;
}
/**
 * Schieberegler für die Grammzahlen. o: { w: { lm, max, schritt }, zeigen, onAbgabe(g) }
 * Rückgabe: { sperren(), g (aktuelle Grammzahlen) }
 */
export function waageEingabe(el, o) {
  const w = o.w, g = w.lm.map(() => 0);
  let aktiv = true;
  el.innerHTML = `<div class="waage">${w.lm.map((i, k) => `<div class="wregel" data-k="${k}">
      ${waageLm(i, { zeigen: o.zeigen })}
      <div class="wregler">
        <button type="button" class="wbtn" data-d="-1" aria-label="${esc(LM(i).name)}: ${w.schritt[k]} g weniger">−</button>
        <input type="range" min="0" max="${w.max[k]}" step="${w.schritt[k]}" value="0" aria-label="Gramm ${esc(LM(i).name)}">
        <button type="button" class="wbtn" data-d="1" aria-label="${esc(LM(i).name)}: ${w.schritt[k]} g mehr">+</button>
        <b class="wg">${grammHtml(0)}</b>
      </div>
      <div class="wskala"><span>0 g</span><span>${w.max[k]} g</span></div>
    </div>`).join('')}
    <div class="abgabe"><button class="big-btn" id="btnAb" disabled>Grammzahlen einstellen</button></div></div>`;
  const btn = el.querySelector('#btnAb');
  const zeige = () => {
    el.querySelectorAll('.wregel').forEach(r => {
      const k = Number(r.dataset.k);
      r.querySelector('input').value = String(g[k]);
      r.querySelector('.wg').innerHTML = grammHtml(g[k]);
      r.classList.toggle('an', g[k] > 0);
    });
    const leer = g.every(x => x === 0);
    btn.disabled = leer || !aktiv;
    btn.textContent = leer ? 'Grammzahlen einstellen' : 'Fertig ✓';
  };
  const setze = (k, v) => { if (!aktiv) return; g[k] = Math.max(0, Math.min(w.max[k], Math.round(v / w.schritt[k]) * w.schritt[k])); zeige(); };
  el.querySelectorAll('.wregel').forEach(r => {
    const k = Number(r.dataset.k), inp = r.querySelector('input');
    inp.addEventListener('input', () => setze(k, Number(inp.value)));
    // + und −: antippen = ein Schritt, gedrückt halten = schnell weiter
    r.querySelectorAll('.wbtn').forEach(b => {
      let t1 = 0, t2 = 0;
      const stop = () => { clearTimeout(t1); clearInterval(t2); };
      const schritt = () => setze(k, g[k] + Number(b.dataset.d) * w.schritt[k]);
      b.addEventListener('pointerdown', e => { e.preventDefault(); schritt(); stop(); t1 = setTimeout(() => { t2 = setInterval(schritt, 90); }, 450); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
      b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); schritt(); } });
    });
  });
  btn.onclick = () => { if (!aktiv || g.every(x => x === 0)) return; aktiv = false; sperren(); o.onAbgabe(g.slice()); };
  function sperren() {
    aktiv = false;
    el.querySelectorAll('input,.wbtn').forEach(x => { x.disabled = true; });
    zeige();
  }
  zeige();
  return { sperren, get g() { return g.slice(); } };
}
// Ziel und eigene Mahlzeit nebeneinander, mit Unterschied (grün = fast genau)
export function waageVergleich(ziel, werte) {
  return `<table class="wvergleich"><thead><tr><th></th><th>Ziel</th><th>Du</th><th>Unterschied</th></tr></thead><tbody>${NAEHRWERTE.map(nw => {
    const d = werte[nw] - ziel[nw], boden = nw === 'kcal' ? WAAGE_BODEN.kcal : WAAGE_BODEN.g;
    const rel = Math.abs(d) / Math.max(ziel[nw], boden);
    const cls = rel < 0.05 ? 'gut' : rel < 0.2 ? 'mittel' : 'weit';
    const dt = Math.round(d) === 0 ? '±0' : (d > 0 ? '+' : '−') + zahlHtml(Math.abs(d), nw);
    return `<tr class="nw-${nw}"><th><i></i>${esc(nwKurz(nw, true))}</th><td>${zahlHtml(ziel[nw], nw)}</td><td>${zahlHtml(werte[nw], nw)}</td><td class="${cls}">${dt}</td></tr>`;
  }).join('')}</tbody></table>`;
}
// Grammzahlen je Lebensmittel in Spalten, z. B. „Du“ und „Lösung“. spalten: [{ titel, g, cls }]
export function waageTabelle(w, spalten, o = {}) {
  return `<div class="wtabelle" style="--spalten:${spalten.length}">
    ${w.lm.map((i, k) => `<div class="wtzeile">${waageLm(i, { zeigen: o.zeigen })}${spalten.map(c => `<b class="wtg ${c.cls || ''}"><small>${esc(c.titel)}</small><span>${c.g ? grammHtml(c.g[k]) : '–'}</span></b>`).join('')}</div>`).join('')}
  </div>`;
}
