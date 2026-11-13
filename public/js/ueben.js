// Übungsseite: allein spielen, ohne Klasse und ohne Server. Dazu eine Übersicht aller Karten zum Lernen.
import { store } from './net.js';
import { LEBENSMITTEL, BEDARFSKARTEN } from './inhalte.js';
import { SPIELARTEN, ART_TEXT, NW, NAEHRWERTE, NW_WAHL, NW_WAHL_TEXT, nwWahlKurz, STUFEN, STUFE_TEXT, zufallsSeed, prozentText, zahl, wert } from './regeln.js';
import { $, esc, tipp, zielText } from './karten.js';
import { bild, personBild } from './bilder.js';
import { Solo } from './solo.js';
import { Ton } from './ton.js';
import { spielfeldZeigen, status, zeitbalkenZeigen, wachHalten } from './ui.js';

const panel = $('#panel');
const opt = Object.assign({ art: 'reihe', nw: 'kcal', stufe: 'offen' }, store('makro.ueben') || {});
if (!SPIELARTEN.includes(opt.art)) opt.art = 'reihe';
if (!NW_WAHL.includes(opt.nw)) opt.nw = 'kcal';
if (!STUFEN.includes(opt.stufe)) opt.stufe = 'offen';
let rekorde = store('makro.rekorde') || {};
let spiel = null;

// Auch beim Üben bleibt das Handy stumm
Ton.an = false;

// Rekorde getrennt nach Einstellungen
const rkey = () => opt.art + ':' + opt.nw + (opt.art === 'reihe' ? ':' + opt.stufe : '');
const rekText = r => !r ? '' : opt.art === 'bedarf' ? `Serie ${r.lvl} (Ø ${prozentText(r.acc)})` : `${r.lvl} ${r.lvl === 1 ? 'Karte' : 'Karten'} richtig`;

function seg(name, options, value) {
  return `<div class="seg c${options.length}" role="radiogroup" aria-label="${esc(name)}" data-name="${esc(name)}">${options.map(([v, l]) => `<button type="button" role="radio" data-v="${esc(v)}" aria-checked="${v === value}">${esc(l)}</button>`).join('')}</div>`;
}

function menu() {
  if (spiel) { spiel.stop(); spiel = null; }
  spielfeldZeigen(false);
  wachHalten(false);
  const rek = rekorde[rkey()];
  panel.innerHTML = `
    <div class="card">
      <h2>Makro-Mix üben</h2>
      <p>Wie gut kennst du die Nährwerte unserer Lebensmittel? Alle Werte gelten je 100 g.</p>
      <div class="settings">
        <div><div class="lbl">Spielart</div>${seg('art', SPIELARTEN.map(a => [a, ART_TEXT[a].name]), opt.art)}<p class="hint" style="margin-top:6px">${esc(ART_TEXT[opt.art].kurz)}</p></div>
        <div><div class="lbl">Nährwert</div>${seg('nw', NW_WAHL.map(n => [n, NW_WAHL_TEXT[n]]), opt.nw)}<p class="hint" style="margin-top:6px">${esc(nwWahlKurz(opt.art, opt.nw))}</p></div>
        ${opt.art === 'reihe' ? `<div><div class="lbl">Schwierigkeit</div>${seg('stufe', STUFEN.map(s => [s, STUFE_TEXT[s].name]), opt.stufe)}<p class="hint" style="margin-top:6px">${esc(STUFE_TEXT[opt.stufe].kurz)}</p></div>` : ''}
      </div>
      <p class="hint">${rek ? `Dein Rekord mit diesen Einstellungen: <b>${esc(rekText(rek))}</b>` : 'Die Karten werden jedes Mal neu gemischt.'}</p>
      <button class="big-btn" id="btnGo">Spielen</button>
      <button class="ghost-btn" id="btnLex">Alle Karten ansehen</button>
    </div>
    <div class="card tipp"><h3>💡 Wusstest du?</h3><p>${esc(tipp())}</p></div>
    <p class="foot">Klassenturnier mit Beamer: <a class="mehr" href="lehrer">Klassenmodus für Lehrkräfte</a><br>© 2026 Sven Klawitter · Karoline-Breitinger-Schule</p>`;
  panel.querySelectorAll('.seg').forEach(g => {
    g.querySelectorAll('button').forEach(b => b.onclick = () => {
      opt[g.dataset.name] = b.dataset.v;
      store('makro.ueben', opt);
      menu();
    });
  });
  $('#btnGo').onclick = start;
  $('#btnLex').onclick = () => lexikon(opt.nw === 'mix' ? 'kcal' : opt.nw);
  window.scrollTo(0, 0);
}

function start() {
  const k = rkey();
  spiel = new Solo({
    el: $('#spiel'), art: opt.art, seed: zufallsSeed(), nwWahl: opt.nw, stufe: opt.stufe,
    onStatus: (l, r, art) => status(l, r, art),
    onLevel: r => {
      const alt = rekorde[k];
      if (!alt || r.lvl > alt.lvl || (r.lvl === alt.lvl && (r.acc || 0) > (alt.acc || 0))) {
        rekorde[k] = { lvl: r.lvl, acc: r.acc || 0 };
        store('makro.rekorde', rekorde);
      }
      infoZeile();
    },
    onVersuch: () => infoZeile(),
  });
  spielfeldZeigen(true);
  wachHalten(true);
  zeitbalkenZeigen(false);
  $('#sInfo').hidden = false;
  spiel.start(1);
}
function infoZeile() {
  const r = rekorde[rkey()];
  $('#sInfo').innerHTML = `<span>Rekord: <b>${esc(r ? rekText(r) : '–')}</b></span><button class="chip" id="btnEnde">Beenden</button>`;
  $('#btnEnde').onclick = menu;
}

// Alle Lebensmittel mit Werten, sortiert nach einem Nährwert (zum Lernen)
function lexikon(nw) {
  spielfeldZeigen(false);
  const list = LEBENSMITTEL.map((l, i) => i).sort((a, b) => wert(LEBENSMITTEL[b], nw) - wert(LEBENSMITTEL[a], nw));
  panel.innerHTML = `<div class="card">
      <h2>Alle Karten</h2>
      <p>Nährwerte je 100 g, sortiert nach <b>${esc(NW[nw].name)}</b> (oben am meisten).</p>
      <div class="settings">${seg('lex', NAEHRWERTE.map(n => [n, NW[n].name]), nw)}</div>
      <table class="lex"><thead><tr><th></th><th>Lebensmittel</th>${NAEHRWERTE.map(n => `<th class="${n === nw ? 'akt' : ''}">${n === 'kcal' ? 'kcal' : esc(NW[n].name.replace('Kohlenhydrate', 'KH'))}</th>`).join('')}</tr></thead>
      <tbody>${list.map(i => { const l = LEBENSMITTEL[i]; return `<tr><td class="lexbild">${bild(l.bild)}</td><td>${esc(l.name)}</td>${NAEHRWERTE.map(n => `<td class="zahl ${n === nw ? 'akt' : ''}">${zahl(l[n], n)}</td>`).join('')}</tr>`; }).join('')}</tbody></table>
      <p class="hint">Kohlenhydrate ohne Ballaststoffe, wie auf deutschen Verpackungen. Werte von den Makro-Mix-Karten, geprüft mit dem Bundeslebensmittelschlüssel (Max Rubner-Institut, BLS 4.0, Lizenz CC BY 4.0); 10 Werte daraus übernommen.</p>
      <button class="big-btn" id="btnZurueck">Zurück</button>
    </div>
    <div class="card"><h3>Die Bedarfskarten</h3>
      <ul class="bklist">${BEDARFSKARTEN.map(b => `<li><span class="lexbild">${personBild(b.alter)}</span><span><b>${esc(b.name)} (${b.alter})</b> · ${esc(b.text)}</span><span class="nwchip nw-${b.wert}"><i></i>${esc(zielText(b))}</span></li>`).join('')}</ul>
    </div>`;
  panel.querySelector('.seg').querySelectorAll('button').forEach(b => { b.onclick = () => lexikon(b.dataset.v); });
  $('#btnZurueck').onclick = menu;
  window.scrollTo(0, 0);
}

menu();
