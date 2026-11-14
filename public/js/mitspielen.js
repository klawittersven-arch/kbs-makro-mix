// Handy-Seite der SuS: anmelden, Qualifying allein spielen, Klassenrunde und Finale mitspielen (Auflösung am Beamer)
import { KNet, randomId, store } from './net.js';
import { ART_TEXT, NW, NW_WAHL_TEXT, STUFE_TEXT, REIHE_LAENGE, GNADE, zeitLimit, bewerte, prozentText } from './regeln.js';
import { $, esc, LM, BK, bedarfKarte, reiheEingabe, reiheAufloesung, reiheHtml, handEingabe, bedarfAuswertung, lmKarte, lueckeText, tipp, mmss, waageZiel, waageEingabe, waageVergleich, waageTabelle } from './karten.js';
import { sortiert, richtigeLuecke, proHundert, wert, kombiHinweis, klasseN, waageWerte, PUNKTE } from './regeln.js';
import { Solo } from './solo.js';
import { Ton } from './ton.js';
import { spielfeldZeigen, status, zeitbalken, zeitbalkenZeigen, countdown, toast, wachHalten } from './ui.js';

const panel = $('#panel'), netdot = $('#netdot');

const params = new URLSearchParams(location.search);
let code = (params.get('c') || params.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
let pid = store('makro.pid');
if (!pid || !/^[a-z0-9]{8,24}$/.test(pid)) { pid = randomId(16); store('makro.pid', pid); }

let net = null, you = null, shown = '';
let Q = null;   // laufendes Qualifying
let F = null;   // Finale (eigene Sicht)
let K = null;   // Klassenrunde (eigene Sicht)

// Handys bleiben immer stumm (kein Ton im Klassenzimmer). Ton gibt es nur im Finale vom Beamer-Laptop.
Ton.an = false;

// ---------------------------------------------------------------- Verbindung
const serverNow = () => net ? net.serverNow() : Date.now();
function connect() {
  net = KNet({
    code, params: { role: 'player', pid },
    onMessage,
    onStatus: s => {
      netdot.dataset.s = s;
      if (s === 'offline' && net.stopped) {
        if (net.stopped === 'no-room') show('noroom', `<div class="card"><h2>Raum nicht gefunden</h2><p>Zum Code <b>${esc(code)}</b> gibt es gerade kein Spiel. Ist die Lehrer-Seite am Beamer geöffnet? Scanne den QR-Code noch einmal.</p><button class="big-btn" id="btnRetry">Nochmal versuchen</button></div>`, () => { $('#btnRetry').onclick = () => location.reload(); });
        else if (net.stopped === 'ended') { stopQuali(); stopFinal(); show('ended', '<div class="card"><h2>Das Spiel ist beendet</h2><p>Die Lehrkraft hat die Sitzung geschlossen. Danke fürs Mitspielen!</p></div>'); }
      }
    },
  });
  net.open();
}
function send(obj) { if (net) net.send(obj, true); }

function onMessage(m) {
  if (typeof m.now === 'number' && net.rtt > 5000) net.offset = m.now - Date.now();
  switch (m.t) {
    case 'you': you = m; update(); break;
    case 'q-ok': break;
    case 'kicked': you = null; stopQuali(); stopFinal(); store('makro.name', null); show('kicked', '<div class="card"><h2>Abgemeldet</h2><p>Die Lehrkraft hat deinen Namen entfernt. Du kannst dich mit einem anderen Namen neu anmelden.</p><button class="big-btn" id="btnAgain">Neu anmelden</button></div>', () => { $('#btnAgain').onclick = () => location.reload(); }); break;
    case 'error':
      if (m.why === 'bad-name') { const e = $('#joinErr'); if (e) { e.textContent = 'Bitte einen Vornamen (nur Buchstaben) und den ersten Buchstaben des Nachnamens eingeben.'; e.hidden = false; } }
      else if (m.why === 'full') toast('Das Spiel ist voll (60 Personen).');
      break;
  }
}

// ---------------------------------------------------------------- Anzeige
function show(key, html, after) {
  spielfeldZeigen(false);
  if (shown === key) return;
  shown = key;
  panel.innerHTML = html;
  window.scrollTo(0, 0);
  after && after();
}
const tippKarte = () => `<div class="card tipp"><h3>💡 Wusstest du?</h3><p>${esc(tipp())}</p></div>`;
function spielErklaerung(art, nw, stufe) {
  if (art === 'waage') return `<b>Waage:</b> Am Beamer stehen die Zielwerte einer Mahlzeit: Kalorien, Fett, Kohlenhydrate und Eiweiß. Stelle mit den Schiebereglern ein, wie viel Gramm du von jedem Lebensmittel nimmst – so, dass alle vier Werte möglichst genau passen.${stufe === 'verdeckt' ? ' Die Nährwerte der Lebensmittel bleiben verdeckt.' : ''}`;
  if (art === 'bedarf') return `<b>Bedarf:</b> Auf der Bedarfskarte steht eine Person und ein Zielwert (${esc(NW_WAHL_TEXT[nw] || '')}). Wähle aus 10 Lebensmitteln bis zu 5 aus (je 100 g). Komm so nah wie möglich an den Zielwert – aber nicht drüber!${kombiHinweis() ? ' ' + kombiHinweis() : ''}`;
  return `<b>Reihe:</b> Ordne Lebensmittel nach ${nw === 'mix' ? 'dem Nährwert' : esc(NW[nw] ? NW[nw].name : '')} (je 100 g). Oben steht mehr, unten weniger. Tippe auf die Lücke, in die die neue Karte gehört.${stufe === 'verdeckt' ? ' Die Werte bleiben verdeckt.' : ''}`;
}

function update() {
  if (!you) return;
  const me = you.me;
  if (!me) { stopQuali(); stopFinal(); stopKlasse(); return joinForm(); }
  if (you.phase !== 'klasse') stopKlasse();
  switch (you.phase) {
    case 'lobby': stopQuali(); stopFinal(); wachHalten(false); return lobbyKarte(me);
    case 'quali': stopFinal(); return quali();
    case 'final-setup': stopQuali(); stopFinal(); wachHalten(false); return afterQuali();
    case 'final': case 'podium': stopQuali(); return final();
    case 'klasse': stopQuali(); stopFinal(); return klasse();
  }
}

function lobbyKarte(me) {
  const c = you.cfg || {};
  show('lobby:' + me.name + ':' + c.art + ':' + c.nw + ':' + c.stufe, `<div class="card"><p class="eyebrow">Hallo ${esc(me.name)}!</p><h2>Gleich geht’s los</h2>
      <p>Warte, bis die Lehrkraft das Spiel startet. Alle spielen gleichzeitig auf dem eigenen Handy, die Auflösung kommt am Beamer.</p>
      <div class="waitdots"><i></i><i></i><i></i></div>
      <p>${spielErklaerung(c.art, c.nw, c.stufe)}</p>
      <button class="ghost-btn" id="btnLeave">Nicht ${esc(me.name)}? Namen ändern</button></div>${tippKarte()}`, () => {
    $('#btnLeave').onclick = () => { store('makro.name', null); send({ t: 'leave' }); shown = ''; };
  });
}

function joinForm() {
  if (shown === 'join') return;
  const last = store('makro.name') || {};
  show('join', `<div class="card">
    <h2>Mitspielen</h2>
    <p>Gib deinen Vornamen und den ersten Buchstaben deines Nachnamens ein. Der Name erscheint am Beamer.</p>
    <form id="joinForm" class="settings" autocomplete="off">
      <div class="row">
        <div class="field grow"><label for="fFirst">Vorname</label><input id="fFirst" maxlength="16" required value="${esc(last.first || '')}" autocapitalize="words" enterkeyhint="next"></div>
        <div class="field initial"><label for="fInit">Nachname</label><input id="fInit" maxlength="1" required value="${esc(last.initial || '')}" autocapitalize="characters" enterkeyhint="go" aria-label="Erster Buchstabe des Nachnamens"></div>
      </div>
      <p class="err" id="joinErr" hidden></p>
      <button class="big-btn" type="submit">Mitspielen</button>
    </form></div>`, () => {
    const f = $('#fFirst'), i = $('#fInit');
    f.addEventListener('input', () => { if (/\s/.test(f.value)) { f.value = f.value.trim(); i.focus(); } });
    $('#joinForm').onsubmit = e => {
      e.preventDefault();
      const first = f.value.trim(), initial = i.value.trim();
      store('makro.name', { first, initial });
      send({ t: 'join', first, initial });
    };
  });
}

// ---------------------------------------------------------------- Qualifying
const ergebnisText = (art, q) => {
  if (!q || !q.lvl) return '–';
  return art === 'bedarf' ? `Serie ${q.lvl} · Ø ${prozentText(q.acc)}` : `${q.lvl} ${q.lvl === 1 ? 'Karte' : 'Karten'} richtig`;
};

function quali() {
  const me = you.me, qi = you.quali;
  if (!qi) return;
  if (!qi.open || serverNow() > qi.endAt) {
    if (Q && Q.nr === qi.nr && !Q.vorbei) return zeitUm();
    return qualiErgebnis();
  }
  if (Q && Q.nr === qi.nr) return; // läuft bereits
  stopQuali();
  // Neues Qualifying (auch nach Neuladen: einfach mit einem neuen Versuch weiter)
  Q = {
    nr: qi.nr, qi, solo: null, timers: [], raf: 0, vorbei: false,
    best: me.q && me.q.lvl ? { lvl: me.q.lvl, acc: me.q.acc || 0, ms: me.q.ms } : { lvl: 0, acc: 0, ms: 0 },
    v: (me.q && me.q.v) || 0,
  };
  spielfeldZeigen(true);
  shown = 'quali-play';
  zeitbalkenZeigen(true);
  zeitbalken(null);
  $('#sInfo').hidden = false;
  wachHalten(true);
  status('Qualifying', 'Gleich geht’s los', 'merken');
  $('#spiel').innerHTML = `<div class="card"><p class="eyebrow">Qualifying · ${esc(ART_TEXT[qi.art].name)}</p><h2>Gleich geht’s los!</h2><p>${spielErklaerung(qi.art, qi.nw, qi.stufe)}</p><p class="hint">Es zählt dein bester Versuch. Lass dir Zeit zum Nachdenken: Getestet wird dein Wissen, nicht dein Tempo.</p></div>`;
  // Gemeinsamer Start: Countdown bis zur Startzeit, Nachzügler bekommen 2 Sekunden
  const bis = Math.max(qi.startAt - serverNow(), Q.v > 0 ? 800 : 2000);
  const startLokal = performance.now() + bis;
  const cd = () => {
    if (!Q || Q.nr !== qi.nr) { countdown(null); return; }
    const rest = startLokal - performance.now();
    if (rest <= 0) { countdown(null); return; }
    const sec = Math.ceil(rest / 1000);
    countdown(sec <= 3 ? sec : '…', 'Gleich geht’s los');
    Q.timers.push(setTimeout(cd, Math.min(250, rest)));
  };
  cd();
  Q.timers.push(setTimeout(() => qualiStart(), bis));
  // Restzeit: Balken + Anzeige, am Ende ist Schluss
  const tick = () => {
    if (!Q || Q.nr !== qi.nr || Q.vorbei) return;
    const rest = qi.endAt - serverNow();
    const ges = qi.endAt - qi.startAt;
    zeitbalken(Math.max(0, Math.min(ges, rest)), ges);
    infoZeile(rest);
    if (rest <= 0) return zeitUm();
    Q.raf = requestAnimationFrame(tick);
  };
  Q.raf = requestAnimationFrame(tick);
}

function infoZeile(rest) {
  if (!Q) return;
  const html = `<span>⏱ <b>${mmss(Math.min(rest, Q.qi.endAt - Q.qi.startAt))}</b></span><span>Bester Versuch: <b>${esc(ergebnisText(Q.qi.art, Q.best))}</b></span>`;
  const el = $('#sInfo');
  if (el.innerHTML !== html) el.innerHTML = html;
}

function qualiStart() {
  if (!Q || Q.vorbei) return;
  const qi = Q.qi;
  Q.solo = new Solo({
    el: $('#spiel'), art: qi.art, seed: qi.seed, nwWahl: qi.nw, stufe: qi.stufe,
    onStatus: (l, r, art) => status(l, r, art),
    onVersuch: v => { Q.v = Math.max(Q.v, v); },
    onLevel: r => {
      const neu = { lvl: r.lvl, acc: r.acc, ms: r.ms };
      if (r.lvl > Q.best.lvl || (r.lvl === Q.best.lvl && (r.acc > Q.best.acc || (r.acc === Q.best.acc && r.ms < Q.best.ms)))) Q.best = neu;
      send({ t: 'q', nr: qi.nr, v: r.v, lvl: r.lvl, acc: r.acc, ms: r.ms });
    },
    onFehler: v => send({ t: 'q-fehler', nr: qi.nr, v }),
  });
  Q.solo.start(Q.v + 1);
}

function zeitUm() {
  if (!Q || Q.vorbei) return;
  Q.vorbei = true;
  if (Q.solo) Q.solo.stop();
  Q.timers.forEach(clearTimeout); Q.timers = [];
  countdown(null);
  if (navigator.vibrate) try { navigator.vibrate(200); } catch (e) {}
  shown = '';
  qualiErgebnis();
}

function stopQuali() {
  if (!Q) return;
  Q.vorbei = true;
  Q.timers.forEach(clearTimeout);
  cancelAnimationFrame(Q.raf);
  countdown(null);
  if (Q.solo) Q.solo.stop();
  $('#sInfo').hidden = true;
  Q = null;
}

function qualiErgebnis() {
  const me = you.me, qi = you.quali;
  const lokal = Q && Q.nr === (qi && qi.nr) ? Q.best : null;
  const srv = me.q || { lvl: 0, acc: 0, ms: 0, v: 0 };
  const best = lokal && (lokal.lvl > (srv.lvl || 0)) ? lokal : srv;
  const endstand = qi && !qi.open;
  const art = qi ? qi.art : 'reihe';
  const key = 'qres:' + best.lvl + ':' + best.acc + ':' + me.rank + ':' + me.of + ':' + endstand;
  wachHalten(false);
  const rank = endstand && me.rank > 0 ? `<div class="placebox">Platz ${me.rank} von ${me.of}</div>` : '<p class="hint">Gleich steht deine Platzierung fest …</p>';
  show(key, `<div class="card ${best.lvl ? 'good' : ''}">
      <p class="eyebrow">Qualifying</p>
      <h2>Zeit um!</h2>
      <div class="bigstat"><b>${best.lvl || 0}</b><span>${art === 'bedarf' ? `Bedarfskarten in Serie${best.lvl ? ` · Ø ${prozentText(best.acc)} des Zielwerts` : ''}` : (best.lvl === 1 ? 'Karte richtig eingeordnet' : 'Karten richtig eingeordnet')} (bester Versuch)</span></div>
      ${rank}
    </div>
    <div class="card"><p>Die Besten kommen ins Finale am Beamer. Lass diese Seite offen.</p></div>${tippKarte()}`);
}

function afterQuali() {
  const me = you.me, qi = you.quali, chosen = you.final && you.final.chosen;
  const art = qi ? qi.art : 'reihe';
  show('after:' + (me.q && me.q.lvl) + ':' + me.rank + ':' + chosen, `<div class="card ${chosen ? 'good' : ''}">
      <p class="eyebrow">Qualifying beendet</p>
      <h2>${chosen ? 'Du bist im Finale! 🎉' : 'Gleich kommt das Finale'}</h2>
      <div class="bigstat"><b>${me.q ? me.q.lvl : 0}</b><span>${me.q && me.q.lvl ? esc(ergebnisText(art, me.q)) + ' · ' : ''}Platz ${me.rank || '–'} von ${me.of}</span></div>
      <p>${chosen ? 'Lass diese Seite offen. Im Finale spielst du hier auf dem Handy, die Auflösung kommt am Beamer.' : 'Das Finale läuft am Beamer. Schau zu und rate mit!'}</p>
    </div>${tippKarte()}`);
}

// ---------------------------------------------------------------- Finale
function stopFinal() {
  if (!F) return;
  F.timers.forEach(clearTimeout);
  cancelAnimationFrame(F.raf);
  countdown(null);
  if (F.eingabe) F.eingabe.sperren();
  F = null;
}
const later = (fn, at) => F.timers.push(setTimeout(fn, Math.max(0, at - serverNow())));
const namen = f => f.names.map(esc).join(', ');

function final() {
  const f = you.final;
  if (!f) return;
  if (f.slot < 0) return zuschauen(f);
  wachHalten(you.phase === 'final');
  if (!F || F.nr !== f.nr) { stopFinal(); F = { nr: f.nr, key: '', timers: [], raf: 0, eingabe: null }; }
  if (you.phase === 'podium') return finalEnde(f);
  const me = f.me;
  if (f.art === 'reihe' && !me.alive) return finalAus(f);
  // Nur neu zeichnen, wenn sich die Runde ändert (sonst geht eine halbe Auswahl verloren)
  const key = [f.round, f.startAt, f.paused, !!me.res].join(':');
  if (F.key === key) return;
  F.key = key;
  if (me.res && F.abgabeRunde === f.round) return; // eigene Abgabe steht schon auf dem Bildschirm
  F.timers.forEach(clearTimeout); F.timers = []; cancelAnimationFrame(F.raf);
  spielfeldZeigen(true); shown = 'final-play';
  zeitbalkenZeigen(false); zeitbalken(null);
  $('#sInfo').hidden = true;
  if (me.res) return finalWarten(f);
  if (f.paused || serverNow() < f.startAt) {
    zwischenstand(f);
    if (!f.paused) {
      if (f.first) for (let s = 3; s >= 1; s--) later(() => countdown(s, 'Gleich geht’s los!'), f.startAt - s * 1000);
      later(() => { countdown(null); F.key = ''; final(); }, f.startAt);
    }
    return;
  }
  eingabe(f);
}

const rundeText = f => f.art === 'reihe' ? `Karte ${f.round} <small>von ${f.total} · Finale</small>` : `Runde ${f.round} <small>Finale · Sieg mit ${f.sieg} Karten</small>`;

function eingabe(f) {
  countdown(null);
  const el = $('#spiel');
  const t0 = f.startAt;
  if (f.art === 'reihe') {
    status(rundeText(f), `Ordne nach: ${NW[f.nw].name}`, 'tippen');
    F.eingabe = reiheEingabe(el, {
      reihe: f.reihe, neu: f.neu, nw: f.nw, zeigen: f.stufe === 'offen',
      onAbgabe: gap => { send({ t: 'f-reihe', nr: f.nr, r: f.round, gap, ms: Math.max(0, Math.round(serverNow() - t0)) }); abgegeben(f); },
    });
  } else {
    status(rundeText(f), 'Triff den Zielwert!', 'tippen');
    el.innerHTML = `<div class="bedarfspiel">${bedarfKarte(f.b, { cls: 'klein' })}<div id="handBox"></div></div>`;
    F.eingabe = handEingabe($('#handBox'), {
      hand: f.hand,
      onAbgabe: pick => { send({ t: 'f-bedarf', nr: f.nr, r: f.round, pick, ms: Math.max(0, Math.round(serverNow() - t0)) }); abgegeben(f); },
    });
  }
  if (navigator.vibrate) try { navigator.vibrate(40); } catch (e) {}
  if (f.deadline) {
    const limit = zeitLimit(f.art, f.art === 'reihe' ? f.reihe.length : 0, f.zeit);
    zeitbalkenZeigen(true);
    const tick = () => {
      if (!F) return;
      const rest = f.deadline - serverNow();
      zeitbalken(Math.max(0, rest), limit);
      if (rest > 0) F.raf = requestAnimationFrame(tick);
      else { if (F.eingabe) F.eingabe.sperren(); status(rundeText(f), 'Zeit um!', 'beamer'); }
    };
    F.raf = requestAnimationFrame(tick);
  }
}
function abgegeben(f) {
  F.abgabeRunde = f.round;
  cancelAnimationFrame(F.raf); zeitbalken(null);
  status(rundeText(f), 'Abgegeben ✓', 'tippen');
  const el = $('#spiel');
  el.insertAdjacentHTML('afterbegin', '<div class="rueck warten">Abgegeben ✓ Warte auf die anderen – die Auflösung kommt am Beamer.</div>');
  el.scrollTop = 0;
}
function finalWarten(f) {
  // z. B. nach dem Neuladen: Abgabe ist schon beim Server
  status(rundeText(f), 'Abgegeben ✓', 'tippen');
  $('#spiel').innerHTML = `<div class="card"><h2>Abgegeben ✓</h2><p>Warte auf die anderen. Die Auflösung kommt am Beamer.</p><div class="waitdots"><i></i><i></i><i></i></div></div>`;
}

// Zwischen zwei Runden: eigenes Ergebnis der letzten Runde, Stand, „Pause“
function zwischenstand(f) {
  const el = $('#spiel'), L = f.last, me = f.me;
  let h = '';
  if (!L) {
    status(rundeText(f), 'Gleich geht’s los!', 'beamer');
    h = `<div class="card"><p class="eyebrow">Finale${f.revanche ? ' · Revanche' : ''}</p><h2>Du bist im Finale!</h2><p>Mit dir spielen: <b>${namen(f)}</b>.</p><p>${spielErklaerung(f.art, f.art === 'reihe' ? f.nw : f.nwWahl, f.stufe)}</p>${f.art === 'bedarf' ? `<p>Wer am nächsten dran ist, ohne zu überschreiten, bekommt die Bedarfskarte. Wer zuerst <b>${f.sieg}</b> hat, gewinnt.</p>` : '<p>Wer falsch einordnet, scheidet aus. Liegen alle falsch, bleiben alle im Spiel.</p>'}</div>`;
  } else if (f.art === 'reihe') {
    const t = L.tipps.find(x => x.slot === f.slot);
    const ok = t && t.ok;
    status(rundeText(f), ok ? 'Richtig ✓' : 'Alle lagen falsch', ok ? 'tippen' : 'beamer');
    const l = LM(L.neu);
    h = `<div class="card ${ok ? 'good' : ''}"><h2>${ok ? 'Richtig! ✓' : 'Falsch – aber alle lagen daneben'}</h2>
      <p><b>${esc(l.name)}</b> hat ${esc(proHundert(wert(l, f.nw), f.nw))}.${ok ? '' : ' Darum bleiben alle im Spiel.'}</p>
      <div class="reihebox klein">${reiheAufloesung(L.reihe, L.neu, f.nw, t ? [{ gap: t.gap, name: 'Du' }] : [])}</div></div>`;
  } else {
    const a = L.abgaben[f.slot], gewonnen = L.gewinner.includes(f.slot);
    const pick = (a.pick || []).map(k => L.hand[k]);
    const e = bewerte(L.hand, a.pick || [], L.b);
    status(rundeText(f), gewonnen ? 'Karte gewonnen!' : 'Diesmal nicht', gewonnen ? 'tippen' : 'beamer');
    h = (gewonnen ? `<div class="card good"><h2>Du bekommst die Bedarfskarte! 🎉</h2></div>` : '') +
      (pick.length ? bedarfAuswertung(L.b, L.hand, pick, e, { quali: false, gewonnen }) : `<div class="card"><h2>Keine Abgabe</h2><p>Diesmal hast du keine Lebensmittel abgegeben.</p></div>`);
    h += `<div class="card"><h3>Stand</h3><ol class="stand">${f.names.map((n, i) => ({ n, k: f.karten[i], i })).sort((x, y) => y.k - x.k).map(x => `<li class="${x.i === f.slot ? 'ich' : ''}"><b>${esc(x.n)}</b><span>${x.k} ${x.k === 1 ? 'Karte' : 'Karten'}</span></li>`).join('')}</ol></div>`;
  }
  const fuss = f.paused ? '<div class="card"><h2>Pause</h2><p>Die Lehrkraft bespricht die Auflösung. Schau zum Beamer!</p></div>'
    : `<div class="card"><p class="hint">Die nächste Runde beginnt gleich. Schau zum Beamer!</p></div>`;
  el.innerHTML = h + fuss;
  el.scrollTop = 0;
}

function finalAus(f) {
  const me = f.me, L = f.last;
  const key = 'fout:' + f.nr + ':' + me.place;
  if (shown === key) return;
  stopFinal(); wachHalten(false);
  const t = L && L.tipps.find(x => x.slot === f.slot);
  show(key, `<div class="card bad"><p class="eyebrow">Finale${f.revanche ? ' · Revanche' : ''}</p>
      <h2>Ausgeschieden</h2>
      <div class="placebox">Platz ${me.place} <small>· bei Karte ${me.out}</small></div>
      ${L && L.neu != null && t ? `<p><b>${esc(LM(L.neu).name)}</b> hat ${esc(proHundert(wert(LM(L.neu), f.nw), f.nw))} und gehört ${esc(lueckeText(sortiert(L.reihe, f.nw), richtigeLuecke(L.reihe, L.neu, f.nw), f.nw))}.</p>
        ${t.gap < 0 ? '<p>Du hast nichts abgegeben (Zeit um oder Runde beendet).</p>' : ''}
        <div class="reihebox klein">${reiheAufloesung(L.reihe, L.neu, f.nw, [{ gap: t.gap, name: 'Du' }])}</div>` : ''}
      <p>Schau zum Beamer, wer gewinnt!</p></div>`);
}

function finalEnde(f) {
  const me = f.me, place = me.place, win = place === 1;
  const key = 'fend:' + f.nr + ':' + place;
  if (shown === key) return;
  stopFinal(); wachHalten(false);
  const sieger = f.names[f.places.indexOf(1)] || '';
  show(key, `<div class="card ${win ? 'good' : ''}"><p class="eyebrow">Finale${f.revanche ? ' · Revanche' : ''}</p>
      <h2>${win ? '🏆 Du hast gewonnen!' : `Platz ${place} 🎉`}</h2>
      <p>${win ? 'Herzlichen Glückwunsch!' : `Stark gespielt! Sieg: <b>${esc(sieger)}</b>`}</p>
      ${f.art === 'bedarf' ? `<div class="bigstat"><b>${f.karten[f.slot]}</b><span>Bedarfskarten gesammelt</span></div>` : ''}
    </div>${tippKarte()}`);
}

function zuschauen(f) {
  stopFinal(); wachHalten(false);
  if (you.phase === 'podium') {
    const list = f.places ? f.names.map((n, i) => ({ n, p: f.places[i] })).sort((a, b) => a.p - b.p) : [];
    return show('spec-podium:' + f.nr, `<div class="card good"><p class="eyebrow">Finale</p><h2>🏆 ${esc(list[0] ? list[0].n : '')} gewinnt!</h2>
      <ol class="stand">${list.map(x => `<li><b>${x.p}. ${esc(x.n)}</b></li>`).join('')}</ol></div>${tippKarte()}`);
  }
  return show('spec:' + f.nr, `<div class="card"><p class="eyebrow">Finale</p><h2>Schau zum Beamer! 👀</h2><p>Gerade spielen <b>${namen(f)}</b> das Finale. Rate im Kopf mit!</p></div>${tippKarte()}`);
}

// ---------------------------------------------------------------- Klassenrunde
function stopKlasse() {
  if (!K) return;
  K.timers.forEach(clearTimeout); cancelAnimationFrame(K.raf);
  countdown(null);
  if (K.eingabe) K.eingabe.sperren();
  K = null;
}
const klater = (fn, at) => K.timers.push(setTimeout(fn, Math.max(0, at - serverNow())));
const punkteText = p => `${p} ${p === 1 ? 'Punkt' : 'Punkte'}`;
const plusText = n => n > 0 ? `+${n}` : n < 0 ? `${n}` : '±0';

function klasse() {
  const k = you.klasse;
  if (!k) return;
  if (k.state === 'ende') return klasseEnde(k);
  wachHalten(true);
  if (!K || K.nr !== k.nr) { stopKlasse(); K = { nr: k.nr, key: '', timers: [], raf: 0, eingabe: null, abgabeRunde: 0 }; }
  const me = k.me;
  // Nur neu zeichnen, wenn sich die Runde ändert (sonst geht eine halbe Auswahl verloren)
  const key = [k.runde, k.startAt, k.paused, !!me.abgegeben].join(':');
  if (K.key === key) return;
  K.key = key;
  if (me.abgegeben && K.abgabeRunde === k.runde) return; // eigene Abgabe steht schon auf dem Bildschirm
  K.timers.forEach(clearTimeout); K.timers = []; cancelAnimationFrame(K.raf);
  spielfeldZeigen(true); shown = 'klasse-play';
  zeitbalkenZeigen(false); zeitbalken(null);
  $('#sInfo').hidden = true;
  const titel = `Runde ${k.runde} <small>von ${k.runden} · Klassenrunde</small>`;
  if (me.abgegeben) { status(titel, punkteText(me.p), 'tippen'); $('#spiel').innerHTML = '<div class="card"><h2>Abgegeben ✓</h2><p>Warte auf die anderen. Die Auflösung kommt am Beamer.</p><div class="waitdots"><i></i><i></i><i></i></div></div>'; return; }
  if (k.paused || serverNow() < k.startAt) {
    kZwischen(k);
    if (!k.paused) {
      if (k.first) for (let s = 3; s >= 1; s--) klater(() => countdown(s, 'Gleich geht’s los!'), k.startAt - s * 1000);
      klater(() => { countdown(null); K.key = ''; klasse(); }, k.startAt);
    }
    return;
  }
  kEingabe(k, titel);
}

function kEingabe(k, titel) {
  countdown(null);
  const el = $('#spiel'), t0 = k.startAt;
  const ab = extra => { send(Object.assign({ nr: k.nr, r: k.runde, ms: Math.max(0, Math.round(serverNow() - t0)) }, extra)); kAbgegeben(k, titel); };
  if (k.art === 'reihe') {
    status(titel, punkteText(k.me.p), 'tippen');
    K.eingabe = reiheEingabe(el, {
      reihe: k.reihe, neu: k.neu, nw: k.nw, zeigen: false, geordnet: true, zweifel: k.reihe.length >= 2,
      rueck: `<div class="rueck info">Ordne nach <b>${esc(NW[k.nw].name)}</b>. Die Karte kommt dorthin, wo die Mehrheit sie hinlegt.${k.reihe.length >= 2 ? ' Steckt schon ein Fehler in der Reihe? Dann zweifle!' : ''}</div>`,
      onAbgabe: gap => ab({ t: 'k-reihe', gap }),
      onZweifel: () => ab({ t: 'k-reihe', zweifel: true }),
    });
  } else if (k.art === 'waage') {
    status(titel, punkteText(k.me.p), 'tippen');
    el.innerHTML = `<div class="waagespiel">${waageZiel(k.w.ziel, { cls: 'klein', titel: 'Ziel', kurz: true })}<div id="waageBox"></div></div>`;
    K.eingabe = waageEingabe($('#waageBox'), { w: k.w, zeigen: k.stufe === 'offen', onAbgabe: g => ab({ t: 'k-waage', g }) });
    // Zeit um: Was eingestellt ist, wird automatisch abgegeben (kurz vor Ablauf, damit es sicher ankommt)
    if (k.deadline) klater(() => {
      if (!K || !K.eingabe || K.abgabeRunde === k.runde) return;
      const g = K.eingabe.g; K.eingabe.sperren();
      ab({ t: 'k-waage', g, auto: true });
    }, k.deadline - 400);
  } else {
    status(titel, punkteText(k.me.p), 'tippen');
    el.innerHTML = `<div class="bedarfspiel">${bedarfKarte(k.b, { cls: 'klein' })}<div id="handBox"></div></div>`;
    K.eingabe = handEingabe($('#handBox'), { hand: k.hand, onAbgabe: pick => ab({ t: 'k-bedarf', pick }) });
  }
  if (navigator.vibrate) try { navigator.vibrate(40); } catch (e) {}
  if (k.deadline) {
    const limit = zeitLimit(k.art, klasseN(k), k.zeit);
    zeitbalkenZeigen(true);
    const tick = () => {
      if (!K) return;
      const rest = k.deadline - serverNow();
      zeitbalken(Math.max(0, rest), limit);
      if (rest > 0) K.raf = requestAnimationFrame(tick);
      else { if (K.eingabe) K.eingabe.sperren(); status(titel, 'Zeit um!', 'bad'); }
    };
    K.raf = requestAnimationFrame(tick);
    // Auch das Handy meldet das Ende der Zeit (falls der Beamer-Laptop schläft); leicht versetzt, damit nicht alle gleichzeitig senden
    klater(() => send({ t: 'k-tick', nr: k.nr, r: k.runde }), k.deadline + GNADE + 300 + Math.random() * 2000);
  }
}
function kAbgegeben(k, titel) {
  K.abgabeRunde = k.runde;
  cancelAnimationFrame(K.raf); zeitbalken(null);
  status(titel, 'Abgegeben ✓', 'tippen');
  const el = $('#spiel');
  el.insertAdjacentHTML('afterbegin', '<div class="rueck warten">Abgegeben ✓ Warte auf die anderen – die Auflösung kommt am Beamer.</div>');
  el.scrollTop = 0;
}

// Zwischen zwei Runden: eigenes Ergebnis der letzten Runde und Punktestand
function kZwischen(k) {
  const el = $('#spiel'), L = k.last, me = k.me, z = me.zuletzt;
  let h = '';
  const stand = `<div class="card"><div class="bigstat"><b>${me.p}</b><span>${me.p === 1 ? 'Punkt' : 'Punkte'} · Platz ${me.platz} von ${me.von}</span></div></div>`;
  if (!L) {
    status(`Runde ${k.runde} <small>von ${k.runden} · Klassenrunde</small>`, 'Gleich geht’s los!', 'beamer');
    h = `<div class="card"><p class="eyebrow">Klassenrunde</p><h2>Alle spielen mit!</h2>${k.art === 'waage'
      ? `<p>Jede Runde steht am Beamer eine Mahlzeit mit vier Zielwerten. Stelle mit den Schiebereglern ein, wie viel Gramm du von jedem Lebensmittel nimmst.</p>
         <p>Je genauer alle vier Werte passen, desto mehr Punkte: fast genau = <b>${PUNKTE.waageMax} Punkte</b>. ${k.deadline ? 'Wenn die Zeit um ist, wird abgegeben, was eingestellt ist.' : ''}</p>`
      : k.art === 'reihe'
      ? `<p>Jede Runde kommt eine neue Karte. Du kannst sie <b>einordnen</b> oder <b>zweifeln</b>, wenn du glaubst, dass in der Reihe schon ein Fehler steckt.</p>
         <p>Die Karte kommt dorthin, wo die <b>Mehrheit</b> sie hinlegt. Die Werte bleiben verdeckt, bis jemand zweifelt oder die Reihe voll ist.</p>`
      : `<p>Jede Runde kommt eine Bedarfskarte. Wähle bis zu 5 Lebensmittel und komm dem Zielwert so nah wie möglich, ohne ihn zu überschreiten. ${kombiHinweis()}</p>`}</div>`;
  } else if (k.art === 'reihe') {
    status(`Runde ${L.runde} <small>von ${k.runden} · Auflösung</small>`, punkteText(me.p), 'beamer');
    let txt = '', cls = '';
    if (!z) txt = '<p>Du hast in dieser Runde nicht abgegeben.</p>';
    else if (z.zweifel) { txt = `<p>Du hast gezweifelt: <b>${plusText(z.plus)}</b> ${Math.abs(z.plus) === 1 ? 'Punkt' : 'Punkte'}.</p>`; cls = z.plus > 0 ? 'good' : z.plus < 0 ? 'bad' : ''; }
    else if (L.gap >= 0) txt = z.gap === L.gap ? '<p>Du hast die Karte dorthin gelegt, wo auch die Mehrheit sie hingelegt hat.</p>' : '<p>Die Mehrheit hat die Karte woanders hingelegt als du.</p>';
    if (L.aufgedeckt) {
      const fehler = L.fehler.length > 0;
      const titel = L.aufgedeckt === 'zweifel' ? (L.zweifelRecht ? 'Zu Recht gezweifelt!' : 'Die Reihe war richtig!') : (fehler ? 'Aufgedeckt: Da war ein Fehler!' : 'Aufgedeckt: Alles richtig!');
      const rp = z && z.reihePlus != null ? `<p>Fürs Einordnen in dieser Reihe bekommst du <b>${plusText(z.reihePlus)}</b>.</p>` : '';
      h = `<div class="card ${cls}"><h2>${esc(titel)}</h2>${txt}${rp}
        ${L.zweifler.length ? `<p class="hint">Gezweifelt haben ${L.zweifler.length}.</p>` : ''}
        <div class="reihebox klein">${reiheHtml(L.offen, L.nw, { geordnet: true, zeigen: true, luecken: false, karteCls: (i, pos) => L.fehler.includes(pos) || L.fehler.includes(pos - 1) ? 'falschrum' : '' })}</div>
        <p class="hint">Rot markierte Karten liegen falsch herum. Jetzt beginnt eine neue Reihe.</p></div>`;
    } else {
      h = `<div class="card"><h2>Die Mehrheit hat entschieden</h2>${txt}<p class="hint">Ob die Reihe stimmt, siehst du erst, wenn jemand zweifelt oder die Reihe voll ist. Schau zum Beamer!</p></div>`;
    }
  } else if (k.art === 'waage') {
    status(`Runde ${L.runde} <small>von ${k.runden} · Auflösung</small>`, punkteText(me.p), 'beamer');
    if (!z) h = `<div class="card"><h2>Keine Abgabe</h2><p>Du hast in dieser Runde nichts abgegeben.</p><h3>So wäre es genau gegangen</h3>${waageTabelle(L.w, [{ titel: 'Lösung', g: L.w.rezept, cls: 'loesung' }], { zeigen: true })}</div>`;
    else {
      const werte = waageWerte(L.w.lm, z.g), genau = Math.max(0, 100 - Math.round(z.abw / 10));
      h = `<div class="card ${z.plus >= 7 ? 'good' : ''}"><h2>${z.plus > 0 ? '+' + z.plus : '0'} ${z.plus === 1 ? 'Punkt' : 'Punkte'}</h2>
        <p>Deine Mahlzeit trifft die Zielwerte zu <b>${genau} %</b>.${z.auto ? ' Die Zeit war um – abgegeben wurde, was eingestellt war.' : ''}</p>
        ${waageVergleich(L.w.ziel, werte)}
        <h3>Deine Grammzahlen und die Lösung</h3>
        ${waageTabelle(L.w, [{ titel: 'Du', g: z.g }, { titel: 'Lösung', g: L.w.rezept, cls: 'loesung' }], { zeigen: true })}</div>`;
    }
  } else {
    status(`Runde ${L.runde} <small>von ${k.runden} · Auflösung</small>`, punkteText(me.p), 'beamer');
    if (!z) h = '<div class="card"><h2>Keine Abgabe</h2><p>Du hast in dieser Runde nichts abgegeben.</p></div>';
    else {
      const pick = z.pick.map(i => L.hand[i]);
      const e = bewerte(L.hand, z.pick, L.b);
      h = `<div class="card ${z.plus > 0 ? 'good' : ''}"><h2>${plusText(z.plus)} ${Math.abs(z.plus) === 1 ? 'Punkt' : 'Punkte'}</h2></div>` + bedarfAuswertung(L.b, L.hand, pick, e, { quali: false, gewonnen: z.plus > 0 });
    }
  }
  const fuss = k.paused ? '<div class="card"><h2>Pause</h2><p>Die Lehrkraft bespricht die Auflösung. Schau zum Beamer!</p></div>'
    : L ? '<div class="card"><p class="hint">Die nächste Runde beginnt gleich. Schau zum Beamer!</p></div>' : '';
  el.innerHTML = stand + h + fuss;
  el.scrollTop = 0;
}

function klasseEnde(k) {
  const me = k.me;
  const key = 'kende:' + k.nr + ':' + me.p + ':' + me.platz;
  if (shown === key) return;
  stopKlasse(); wachHalten(false);
  show(key, `<div class="card ${me.platz === 1 ? 'good' : ''}"><p class="eyebrow">Klassenrunde vorbei</p>
      <h2>${me.platz === 1 ? '🏆 Du hast gewonnen!' : `Platz ${me.platz} von ${me.von}`}</h2>
      <div class="bigstat"><b>${me.p}</b><span>${me.p === 1 ? 'Punkt' : 'Punkte'}</span></div>
      <ol class="stand">${k.top.map(x => `<li><b>${1 + k.top.filter(y => y.p > x.p).length}. ${esc(x.name)}</b><span>${punkteText(x.p)}</span></li>`).join('')}</ol>
      <p>${k.art === 'waage' ? 'Schau zum Beamer!' : 'Schau zum Beamer: Vielleicht geht es gleich mit dem Finale weiter.'}</p></div>${tippKarte()}`);
}

// ---------------------------------------------------------------- Start
if (!code) {
  show('nocode', `<div class="card"><h2>Code eingeben</h2><p>Scanne den QR-Code am Beamer oder gib den Code ein, der dort oben rechts steht.</p>
    <form id="codeForm" class="settings"><div class="field"><label for="fCode">Code</label><input id="fCode" maxlength="5" autocapitalize="characters" required></div><button class="big-btn">Weiter</button></form></div>`, () => {
    $('#codeForm').onsubmit = e => { e.preventDefault(); const c = $('#fCode').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length === 5) location.search = '?c=' + c; };
  });
} else {
  connect();
}
