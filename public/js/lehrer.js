// Beamer-Seite der Lehrkraft: Lobby mit QR-Code, Live-Rangliste im Qualifying, Finale mit Ton, Siegerehrung
import { KNet, randomCode, randomId, store } from './net.js';
import {
  SPIELARTEN, ART_TEXT, NW, NW_WAHL, NW_WAHL_TEXT, nwWahlKurz, STUFEN, STUFE_TEXT, ZEITEN, ZEIT_TEXT, QUALI_MINUTEN, QUALI_TEXT,
  FINAL_GROESSEN, SIEG_KARTEN, SCHLUSS_GNADE, GNADE, zeitLimit, prozentText, mitEinheit, wert, bewerte, sortiert,
} from './regeln.js';
import {
  $, esc, LM, BK, fmtMs, mmss, tipp, lmKarte, lmGross, bedarfKarte, reiheHtml, reiheAufloesung, kombiListe, kombiText, balken,
  zielText, zehntelText, nwChip,
} from './karten.js';
import { zielZehntel } from './regeln.js';
import { TREFFER_PROZENT } from './inhalte.js';
import { Ton } from './ton.js';

const view = $('#view'), netdot = $('#netdot'), codeChip = $('#codeChip'), toastEl = $('#toast');

let sess = store('makro.lehrer');
let net = null, room = null, screen = '';
let cfg = Object.assign({ art: 'reihe', nw: 'kcal', stufe: 'offen', zeit: 'an', qmin: 3, finalN: 4, sieg: 3 }, store('makro.lehrer.cfg') || {});
if (!SPIELARTEN.includes(cfg.art)) cfg.art = 'reihe';
if (!NW_WAHL.includes(cfg.nw)) cfg.nw = 'kcal';
if (!STUFEN.includes(cfg.stufe)) cfg.stufe = 'offen';
if (!ZEITEN.includes(cfg.zeit)) cfg.zeit = 'an';
if (!QUALI_MINUTEN.includes(Number(cfg.qmin))) cfg.qmin = 3;
if (!FINAL_GROESSEN.includes(Number(cfg.finalN))) cfg.finalN = 4;
if (!SIEG_KARTEN.includes(Number(cfg.sieg))) cfg.sieg = 3;
let quitArmed = 0;
const bekannt = new Set(); // Namen in der Lobby, die schon angezeigt wurden
const serverNow = () => net ? net.serverNow() : Date.now();
const ergebnis = (art, q) => !q || !q.lvl ? '0' : art === 'bedarf' ? `${q.lvl}` : `${q.lvl}`;
const nebenwert = (art, q) => !q || !q.lvl ? '' : art === 'bedarf' ? 'Ø ' + prozentText(q.acc) : fmtMs(q.ms);
const artNw = (art, nw, stufe) => `${ART_TEXT[art].name} · ${art === 'reihe' && NW[nw] ? NW[nw].name : NW_WAHL_TEXT[nw] || ''}${art === 'reihe' ? ' · ' + STUFE_TEXT[stufe].name : ''}`;

// ---------------------------------------------------------------- Ton & Werkzeuge
Ton.an = store('makro.ton.beamer') !== false;
const btnTon = $('#btnTon');
function tonText() { btnTon.textContent = Ton.an ? 'Ton: an' : 'Ton: aus'; btnTon.setAttribute('aria-pressed', String(Ton.an)); }
tonText();
btnTon.onclick = () => { Ton.an = !Ton.an; Ton.init(); store('makro.ton.beamer', Ton.an); tonText(); };
document.addEventListener('pointerdown', () => Ton.init(), { capture: true });
document.addEventListener('keydown', () => Ton.init(), { capture: true });
$('#btnFull').onclick = vollbild;
function vollbild() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => {});
}
$('#btnSess').onclick = () => { $('#dlgCode').textContent = sess.code; $('#dlg').hidden = false; };
$('#btnDlgClose').onclick = () => { $('#dlg').hidden = true; };
$('#btnNewSess').onclick = () => { $('#dlg').hidden = true; newSession(); };
$('#btnWipe').onclick = () => { $('#dlg').hidden = true; send({ t: 'wipe' }); setTimeout(newSession, 600); };

let toastT = 0;
function toast(t) { toastEl.textContent = t; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, 4500); }

// ---------------------------------------------------------------- Verbindung
function newSession() {
  sess = { code: randomCode(5), key: randomId(24) };
  store('makro.lehrer', sess);
  room = null; screen = '';
  connect();
}
function connect() {
  if (net) net.close();
  codeChip.hidden = false; codeChip.textContent = 'Code ' + sess.code;
  net = KNet({
    code: sess.code, params: { role: 'teacher', key: sess.key },
    onMessage,
    onStatus: s => { netdot.dataset.s = s; if (s === 'offline' && net.stopped === 'code-taken') newSession(); },
  });
  net.open();
}
function onMessage(m) {
  if (typeof m.now === 'number' && net.rtt > 5000) net.offset = m.now - Date.now();
  switch (m.t) {
    case 'room': room = m; render(); break;
    case 'error':
      if (m.why === 'code-taken') newSession();
      else if (m.why === 'final-offline') toast('Alle Finalisten-Handys müssen verbunden sein. Wer nicht verbunden ist, öffnet die Seite neu oder scannt den QR-Code noch einmal.');
      else if (m.why === 'final-players') toast('Bitte mindestens zwei verschiedene Personen für das Finale auswählen.');
      else if (m.why === 'no-players') toast('Es hat sich noch niemand angemeldet.');
      else if (m.why === 'kick-finalist') toast('Finalisten können während des Finales nicht entfernt werden.');
      break;
    case 'ended': room = null; screen = ''; break;
  }
}
function send(obj) { if (net && !net.send(obj, true)) toast('Keine Verbindung zum Server. Der Befehl wird gesendet, sobald die Verbindung wieder steht.'); }

function joinUrl() { return location.origin + '/mitspielen?c=' + sess.code; }
function drawQR(canvas, text) {
  const qr = window.qrcode(0, 'M'); qr.addData(text); qr.make();
  const n = qr.getModuleCount(), q = 2, s = Math.max(4, Math.floor(512 / (n + 2 * q)));
  canvas.width = canvas.height = (n + 2 * q) * s;
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#0d1030';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect((c + q) * s, (r + q) * s, s, s);
}

// ---------------------------------------------------------------- Bausteine
function seg(name, options, value, onPick) {
  const w = document.createElement('div');
  w.className = 'seg'; w.setAttribute('role', 'radiogroup'); w.setAttribute('aria-label', name);
  for (const [val, label] of options) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(val === value)); b.textContent = label;
    b.onclick = () => { w.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b))); onPick(val); };
    w.appendChild(b);
  }
  return w;
}
function setCfg(part) {
  Object.assign(cfg, part);
  store('makro.lehrer.cfg', cfg);
  send({ t: 'cfg', cfg });
}
// Einstellungen. modus: 'lobby' (mit Dauer des Qualifyings) oder 'finale'
function optionen(el, modus) {
  el.innerHTML = '';
  const add = (lbl, node, desc) => {
    const l = document.createElement('div'); l.className = 'lbl'; l.textContent = lbl;
    el.append(l, node);
    if (desc != null) { const d = document.createElement('div'); d.className = 'desc'; d.textContent = desc; el.appendChild(d); }
  };
  const neu = part => { setCfg(part); optionen(el, modus); };
  add('Spielart', seg('Spielart', SPIELARTEN.map(a => [a, ART_TEXT[a].name]), cfg.art, art => neu({ art })), ART_TEXT[cfg.art].kurz);
  add('Nährwert', seg('Nährwert', NW_WAHL.map(n => [n, NW_WAHL_TEXT[n]]), cfg.nw, nw => neu({ nw })), nwWahlKurz(cfg.art, cfg.nw));
  if (cfg.art === 'reihe') add('Schwierigkeit', seg('Schwierigkeit', STUFEN.map(s => [s, STUFE_TEXT[s].name]), cfg.stufe, stufe => neu({ stufe })), STUFE_TEXT[cfg.stufe].kurz);
  if (modus === 'lobby') add('Qualifying', seg('Dauer des Qualifyings', QUALI_MINUTEN.map(m => [m, m + ' Minuten']), Number(cfg.qmin), qmin => neu({ qmin })), QUALI_TEXT);
  add('Finale', seg('Größe des Finales', FINAL_GROESSEN.map(n => [n, n + ' Personen']), Number(cfg.finalN), finalN => neu({ finalN })),
    cfg.art === 'reihe' ? 'Im Finale ordnen alle gleichzeitig dieselbe Karte ein. Wer falsch liegt, scheidet aus.' : 'Im Finale bekommt die Bedarfskarte, wer am nächsten dran ist, ohne zu überschreiten.');
  if (cfg.art === 'bedarf') add('Sieg mit', seg('Bedarfskarten zum Sieg', SIEG_KARTEN.map(n => [n, n + ' Karten']), Number(cfg.sieg), sieg => neu({ sieg })), 'So viele Bedarfskarten braucht man im Finale zum Sieg.');
  add('Zeitlimit', seg('Zeitlimit', ZEITEN.map(z => [z, ZEIT_TEXT[z].name]), cfg.zeit, zeit => neu({ zeit })), ZEIT_TEXT[cfg.zeit].kurz);
}
function bigCount(num, text) {
  let el = $('#bigcount');
  if (num == null) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'bigcount'; el.className = 'bigcount'; document.body.appendChild(el); }
  el.innerHTML = `<div><b>${num}</b><span>${esc(text || '')}</span></div>`;
}

// ---------------------------------------------------------------- Bildschirme
function render() {
  if (!room) return;
  if (room.phase !== 'final' && room.phase !== 'podium') stopFinal();
  switch (room.phase) {
    case 'lobby': return lobby();
    case 'quali': return quali();
    case 'final-setup': return setup();
    case 'final': return final();
    case 'podium': return podium();
  }
}

function lobby() {
  if (screen !== 'lobby') {
    screen = 'lobby';
    view.innerHTML = `<div class="tpage"><div class="lobby">
      <div class="tcard joinbox">
        <h2>Mitspielen!</h2>
        <canvas id="qr" class="qr" role="img" aria-label="QR-Code zum Mitspielen"></canvas>
        <div class="joinurl">${esc(location.host)}/mitspielen</div>
        <div>Code: <span class="joincode">${esc(sess.code)}</span></div>
      </div>
      <div class="lobbyright">
        <div class="tcard" style="flex:1;min-height:0">
          <div class="thead"><h2 id="nameCount">Angemeldet</h2></div>
          <div class="names" id="names"></div>
        </div>
        <div class="tcard"><div class="optgrid" id="opts"></div></div>
        <div class="tactions">
          <p class="hint grow">💡 ${esc(tipp())}</p>
          <button class="big-btn" id="btnStart">Qualifying starten <span class="kbd">Enter</span></button>
        </div>
      </div>
    </div></div>`;
    drawQR($('#qr'), joinUrl());
    optionen($('#opts'), 'lobby');
    $('#btnStart').onclick = startQuali;
  }
  const ps = room.players;
  $('#nameCount').textContent = ps.length ? `Angemeldet: ${ps.length}` : 'Angemeldet';
  $('#names').innerHTML = ps.length ? ps.map(p => `<span class="name ${p.online ? '' : 'off'} ${bekannt.has(p.pid) ? '' : 'neu'}">${esc(p.name)}<button class="x" data-pid="${esc(p.pid)}" title="${esc(p.name)} entfernen" aria-label="${esc(p.name)} entfernen">×</button></span>`).join('')
    : '<p class="empty">Noch niemand da. Scannt den QR-Code und gebt euren Namen ein.</p>';
  ps.forEach(p => bekannt.add(p.pid));
  $('#names').querySelectorAll('.x').forEach(b => { b.onclick = () => send({ t: 'kick', pid: b.dataset.pid }); });
  $('#btnStart').disabled = !ps.length;
}
function startQuali() {
  Ton.init();
  if (!room || !room.players.length) return toast('Es hat sich noch niemand angemeldet.');
  send({ t: 'quali-start', cfg });
}

let qualiTimer = 0;
function quali() {
  const Q = room.quali;
  if (screen !== 'quali:' + Q.nr) {
    screen = 'quali:' + Q.nr;
    const min = Math.round((Q.endAt - Q.startAt) / 60000);
    const was = Q.art === 'reihe'
      ? `Jede Karte richtig eingeordnet zählt. Es zählt der beste Versuch, bei Gleichstand die kürzere Bedenkzeit.`
      : `Eine Bedarfskarte ist geschafft, wenn die Summe zwischen ${TREFFER_PROZENT} und 100 % des Zielwerts liegt. Es zählt die längste Serie, bei Gleichstand die höhere Trefferquote (Ø).`;
    view.innerHTML = `<div class="tpage">
      <div class="qhead">
        <div class="tcard"><div class="thead"><div><h2>Qualifying</h2><p>${esc(artNw(Q.art, Q.nw, Q.stufe))} · alle gleichzeitig auf dem Handy · ${min} Minuten</p></div></div>
          <p class="hint">${esc(was)} Nach einem Fehler beginnt sofort ein neuer Versuch.</p></div>
        <div class="tcard qside"><div class="qtimer" id="qTimer"></div><canvas id="qrSmall" class="qr small" role="img" aria-label="QR-Code für Nachzügler"></canvas></div>
      </div>
      <div class="ranks" id="ranks"></div>
      <div class="tactions"><p class="hint grow" id="qHint"></p>
        <button class="ghost-btn" id="btnBack">Zurück zur Anmeldung</button>
        <button class="big-btn" id="btnEnd"></button></div>
    </div>`;
    drawQR($('#qrSmall'), joinUrl());
    $('#btnEnd').onclick = endQuali;
    $('#btnBack').onclick = () => { if (confirm('Zurück zur Anmeldung? Die Ergebnisse dieses Qualifyings werden gelöscht.')) send({ t: 'to-lobby' }); };
    // Countdown vor dem Start und Restzeit. Ist die Zeit um, meldet der Beamer das dem Server (Endstand)
    clearInterval(qualiTimer);
    let gemeldet = 0;
    const tick = () => {
      if (screen !== 'quali:' + Q.nr || !room || room.phase !== 'quali') { clearInterval(qualiTimer); bigCount(null); return; }
      const now = serverNow();
      const vor = Q.startAt - now;
      if (vor > 0) { const s = Math.ceil(vor / 1000); bigCount(s <= 3 ? s : '…', 'Alle schauen aufs eigene Handy!'); } else bigCount(null);
      const el = $('#qTimer');
      const rest = Math.min(Q.endAt - Q.startAt, Q.endAt - now);
      if (!room.quali.open) { el.className = 'qtimer um'; el.innerHTML = 'Endstand'; }
      else if (rest > 0) { el.className = 'qtimer' + (rest <= 10000 ? ' knapp' : ''); el.innerHTML = `${mmss(rest)}<small>NOCH</small>`; }
      else {
        el.className = 'qtimer um'; el.innerHTML = 'Zeit um!<small>AUSWERTUNG …</small>';
        if (now > Q.endAt + SCHLUSS_GNADE && now - gemeldet > 3000) { gemeldet = now; send({ t: 'quali-schluss', nr: Q.nr }); }
      }
    };
    qualiTimer = setInterval(tick, 200);
    tick();
  }
  const offen = room.quali.open, art = Q.art;
  const ps = room.players;
  const ranked = ps.filter(p => p.q).sort((a, b) => a.rank - b.rank);
  const rest = ps.filter(p => !p.q);
  const N = cfg.finalN;
  const versuche = v => v === 1 ? '1 Versuch' : v + ' Versuche';
  const row = (p, place) => {
    const v = p.q ? p.q.v || 0 : 0;
    const st = offen ? `<span class="stt live">${v > 1 ? 'Versuch ' + v : 'spielt …'}</span>` : `<span class="stt">${v ? versuche(v) : '–'}</span>`;
    return `<div class="rk ${place && place <= N ? 'fin' : ''} ${p.online ? '' : 'off'}"><span class="p">${place ? place + '.' : ''}</span><span class="nm">${esc(p.name)}</span>${st}<span class="tm">${esc(nebenwert(art, p.q))}</span><span class="lv">${ergebnis(art, p.q)}</span></div>`;
  };
  $('#ranks').innerHTML = ranked.map(p => row(p, p.rank)).join('') + rest.map(p => row(p, 0)).join('');
  const btn = $('#btnEnd');
  btn.innerHTML = offen ? 'Qualifying beenden <span class="kbd">Enter</span>' : 'Weiter zum Finale <span class="kbd">Enter</span>';
  btn.classList.toggle('pulse', !offen);
  const zahl = art === 'reihe' ? 'richtig eingeordnete Karten' : 'geschaffte Bedarfskarten in Serie';
  $('#qHint').textContent = offen
    ? `Zahl rechts: ${zahl} im besten Versuch. Die ersten ${N} kommen ins Finale.`
    : `Zeit um! Das ist der Endstand. Die ersten ${N} kommen ins Finale.`;
}
function endQuali() {
  const Q = room.quali;
  const rest = Q.endAt - serverNow();
  if (Q.open && rest > 0 && Date.now() - quitArmed > 4000) {
    quitArmed = Date.now();
    return toast(`Das Qualifying läuft noch ${Math.ceil(rest / 1000)} Sekunden. Nochmal drücken, um es jetzt zu beenden (der beste Versuch bis jetzt zählt).`);
  }
  quitArmed = 0;
  send({ t: 'quali-end' });
}

function setup() {
  const f = room.final || { p: [] };
  const ranked = room.players.filter(p => p.rank > 0).sort((a, b) => a.rank - b.rank);
  const others = room.players.filter(p => !(p.rank > 0));
  const all = ranked.concat(others);
  const art = room.quali ? room.quali.art : cfg.art;
  if (screen !== 'setup') {
    screen = 'setup';
    view.innerHTML = `<div class="tpage">
      <div class="thead"><div><h2>Finale</h2><p>Die Besten aus dem Qualifying sind ausgewählt. Gespielt wird auf dem Handy, die Auflösung kommt am Beamer. Die Spielart kannst du fürs Finale noch ändern.</p></div></div>
      <div class="tcard"><div class="slots" id="slots"></div></div>
      <div class="tcard"><div class="optgrid" id="opts"></div></div>
      <div class="ranks" id="ranks"></div>
      <div class="tactions"><button class="ghost-btn" id="btnLobby">Neues Spiel <span class="kbd">Esc</span></button><span class="grow"></span>
        <button class="big-btn" id="btnFinal">Finale starten <span class="kbd">Enter</span></button></div>
    </div>`;
    optionen($('#opts'), 'finale');
    // Größe des Finales geändert → Auswahl anpassen
    $('#opts').addEventListener('click', () => setTimeout(() => {
      const cur = (room.final && room.final.p) || [];
      if (cur.length !== cfg.finalN) {
        const r = room.players.filter(p => p.rank > 0).sort((a, b) => a.rank - b.rank).map(p => p.pid);
        const next = cur.slice(0, cfg.finalN);
        for (const pid of r) if (next.length < cfg.finalN && !next.includes(pid)) next.push(pid);
        send({ t: 'final-pick', p: next });
      }
    }, 0));
    $('#btnLobby').onclick = toLobby;
    $('#btnFinal').onclick = startFinal;
  }
  const slots = $('#slots');
  const n = Math.min(cfg.finalN, Math.max(2, all.length));
  slots.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const pid = f.p[i] || '';
    const pl = room.players.find(p => p.pid === pid);
    const d = document.createElement('div'); d.className = 'slot';
    d.innerHTML = `<h3>Finalist/in ${i + 1}</h3>`;
    const sel = document.createElement('select');
    sel.innerHTML = '<option value="">– niemand –</option>' + all.map(p => `<option value="${esc(p.pid)}" ${p.pid === pid ? 'selected' : ''}>${p.rank ? p.rank + '. ' : ''}${esc(p.name)}${p.q ? ' · ' + ergebnis(art, p.q) : ''}</option>`).join('');
    sel.onchange = () => {
      const next = [];
      slots.querySelectorAll('select').forEach(s => { if (s.value && !next.includes(s.value)) next.push(s.value); });
      send({ t: 'final-pick', p: next });
    };
    d.appendChild(sel);
    const on = document.createElement('div');
    on.className = 'online ' + (pl ? (pl.online ? 'ja' : 'nein') : '');
    on.textContent = pl ? (pl.online ? '● Handy verbunden' : '● Handy nicht verbunden: Seite neu öffnen') : '';
    d.appendChild(on);
    slots.appendChild(d);
  }
  $('#ranks').innerHTML = ranked.map(p => `<div class="rk ${f.p.includes(p.pid) ? 'fin' : ''}"><span class="p">${p.rank}.</span><span class="nm">${esc(p.name)}</span><span></span><span class="tm">${esc(nebenwert(art, p.q))}</span><span class="lv">${ergebnis(art, p.q)}</span></div>`).join('');
  $('#btnFinal').disabled = f.p.length < 2;
}
function startFinal() {
  Ton.init();
  const f = room.final || { p: [] };
  if (f.p.length < 2) return toast('Bitte mindestens zwei Personen für das Finale auswählen.');
  send({ t: 'final-start', p: f.p, cfg });
}
function toLobby() {
  if (!confirm('Neues Spiel starten? Alle bleiben angemeldet, die Ergebnisse werden gelöscht.')) return;
  send({ t: 'to-lobby' });
}

// ---------------------------------------------------------------- Finale
let FB = null; // { nr, key, timers, raf, lastShown, abgegeben }
function stopFinal() {
  if (!FB) return;
  FB.timers.forEach(clearTimeout);
  cancelAnimationFrame(FB.raf);
  bigCount(null);
  FB = null;
}
const at = (fn, when) => FB.timers.push(setTimeout(fn, Math.max(0, when - serverNow())));

function final() {
  const f = room.final;
  if (!FB || FB.nr !== f.nr || !screen.startsWith('final:' + f.nr)) {
    stopFinal();
    screen = 'final:' + f.nr;
    view.innerHTML = `<div class="tpage"><div class="final">
      <div class="fmain">
        <div class="fbar"><div class="runde" id="fRunde"></div><div class="hinweis" id="fText"></div></div>
        <div class="zeitbalken" id="fBarBox" hidden><i id="fBar"></i></div>
        <div class="buehne" id="fBuehne"></div>
      </div>
      <div class="fside"><div id="fCards" class="fside"></div>
        <div class="factions">
          <button class="ghost-btn" id="btnPause"></button>
          <button class="ghost-btn" id="btnStop">Runde beenden</button>
          <button class="ghost-btn" id="btnAbort">Finale abbrechen</button></div></div>
    </div></div>`;
    FB = { nr: f.nr, key: '', timers: [], raf: 0, lastShown: '', abgegeben: 0 };
    $('#btnAbort').onclick = () => { if (confirm('Finale abbrechen? Es geht zurück zur Auswahl der Finalisten.')) send({ t: 'final-abort' }); };
    $('#btnPause').onclick = pauseKnopf;
    // Runde beenden: z. B. ohne Zeitlimit, wenn jemand nicht abgibt
    $('#btnStop').onclick = () => {
      const g = room && room.final;
      if (!g || g.state !== 'run') return;
      if (g.paused || serverNow() < g.startAt) return toast('Die Runde hat noch nicht begonnen.');
      const wer = g.art === 'reihe' ? 'scheidet aus' : 'bekommt in dieser Runde nichts';
      if (confirm(`Runde jetzt beenden? Wer noch nicht abgegeben hat, ${wer}.`)) send({ t: 'runde-stopp', nr: g.nr, r: g.round });
    };
  }
  // Ton, wenn jemand abgibt
  const ab = f.abgegeben.filter(Boolean).length;
  if (f.state === 'run' && ab > FB.abgegeben && serverNow() >= f.startAt) Ton.klick();
  FB.abgegeben = ab;
  // Neue Auswertung?
  if (f.last && FB.lastShown !== f.nr + ':' + f.last.round) {
    FB.lastShown = f.nr + ':' + f.last.round;
    FB.key = '';
    aufloesungTon(f);
  }
  buehne(f);
  seite(f);
  pauseText(f);
}

function fstatus(runde, text, cls) {
  $('#fRunde').innerHTML = runde;
  const t = $('#fText'); t.textContent = text; t.className = 'hinweis ' + (cls || '');
}
const rundeTitel = f => f.art === 'reihe'
  ? `Karte ${f.round}<small>von ${f.total} · ${esc(NW[f.nw].name)} · ${esc(STUFE_TEXT[f.stufe].name)}</small>`
  : `Runde ${f.round}<small>Bedarf · Sieg mit ${f.sieg} Karten</small>`;

// Hauptbereich: Countdown, laufende Runde oder Auflösung der letzten Runde
function buehne(f) {
  const now = serverNow();
  const phase = f.state === 'done' ? 'ende' : (f.paused || now < f.startAt) ? (f.last ? 'aufl' : 'vor') : 'lauf';
  const key = [f.round, phase, f.paused].join(':');
  if (FB.key === key) return;
  FB.key = key;
  FB.timers.forEach(clearTimeout); FB.timers = [];
  cancelAnimationFrame(FB.raf);
  zeit(null);
  const el = $('#fBuehne');
  if (phase === 'vor') {
    fstatus(rundeTitel(f), 'Gleich geht’s los!', 'beamer');
    el.innerHTML = `<div class="tcard intro"><h2>Finale${f.revanche ? ' · Revanche' : ''}</h2>
      <p>${f.art === 'reihe'
        ? `Alle ordnen gleichzeitig dieselbe Karte ein – geordnet nach <b>${esc(NW[f.nw].name)}</b>. Wer falsch liegt, scheidet aus. Liegen alle falsch, bleiben alle im Spiel.`
        : `Alle bekommen dieselbe Bedarfskarte und dieselben 10 Lebensmittel. Wer am nächsten am Zielwert liegt, ohne ihn zu überschreiten, bekommt die Bedarfskarte. Wer zuerst <b>${f.sieg}</b> hat, gewinnt.`}</p></div>`;
    if (f.first && !f.paused) for (let s = 3; s >= 1; s--) at(() => { bigCount(s, 'Alle schauen aufs eigene Handy!'); Ton.piep(false); }, f.startAt - s * 1000);
  } else if (phase === 'aufl' || phase === 'ende') {
    bigCount(null);
    el.innerHTML = f.art === 'reihe' ? reiheAufl(f) : bedarfAufl(f);
    if (phase === 'ende') fstatus(rundeTitel({ ...f, round: f.last.round }), 'Finale vorbei!', 'tippen');
    else if (f.paused) fstatus(rundeTitel({ ...f, round: f.last.round }), 'Pause', 'beamer');
    else {
      fstatus(rundeTitel({ ...f, round: f.last.round }), 'Auflösung', 'beamer');
      const tickNext = () => {
        const n = $('#naechste'); if (!n || !FB) return;
        const rest = f.startAt - serverNow();
        n.textContent = rest > 0 ? `Nächste Runde in ${Math.ceil(rest / 1000)} s` : '';
        if (rest > 0) FB.timers.push(setTimeout(tickNext, 250));
      };
      tickNext();
    }
  } else {
    bigCount(null);
    Ton.karte(); Ton.piep(true);
    if (f.art === 'reihe') {
      fstatus(rundeTitel(f), 'Wohin gehört die Karte?', 'tippen');
      el.innerHTML = `<div class="reihebuehne">
        <div class="neuspalte"><span class="eyebrow">Wohin gehört …</span>${lmGross(f.neu)}<p class="hint">Alle Finalisten ordnen jetzt auf dem Handy ein.</p></div>
        <div class="reihebox beamer">${reiheHtml(f.reihe, f.nw, { zeigen: f.stufe === 'offen', cls: f.reihe.length > 8 ? 'dicht' : '' })}</div></div>`;
    } else {
      fstatus(rundeTitel(f), 'Triff den Zielwert!', 'tippen');
      el.innerHTML = `<div class="bedarfbuehne">${bedarfKarte(f.b, { cls: 'gross' })}
        <div class="handbeamer">${f.hand.map(i => lmKarte(i)).join('')}</div>
        <p class="hint">Bis zu 5 Lebensmittel (je 100 g). Rate mit: Welche Kombination passt am besten?</p></div>`;
    }
    // Zeitbalken; ist die Zeit um, gibt der Beamer dem Server Bescheid
    const box = $('#fBarBox'); box.hidden = !f.deadline;
    if (f.deadline) {
      const limit = zeitLimit(f.art, f.art === 'reihe' ? f.reihe.length : 0, f.zeit);
      const tick = () => {
        if (!FB || FB.key !== key) return;
        const rest = f.deadline - serverNow();
        zeit(Math.max(0, rest), limit);
        if (rest > 0) FB.raf = requestAnimationFrame(tick);
      };
      FB.raf = requestAnimationFrame(tick);
      at(() => send({ t: 'tick', nr: f.nr, r: f.round }), f.deadline + GNADE + 200);
      at(() => send({ t: 'tick', nr: f.nr, r: f.round }), f.deadline + GNADE + 2500);
    }
  }
  // Wechsel zur laufenden Runde zum Startzeitpunkt
  if (phase !== 'lauf' && phase !== 'ende' && !f.paused) at(() => { if (room && room.final) final(); }, f.startAt);
}
function zeit(rest, gesamt) {
  const box = $('#fBarBox'), bar = $('#fBar'); if (!box) return;
  if (rest == null) { bar.style.transform = 'scaleX(0)'; box.classList.remove('knapp'); return; }
  bar.style.transform = `scaleX(${Math.max(0, Math.min(1, rest / gesamt))})`;
  box.classList.toggle('knapp', rest < 10000);
}

// Auflösung „Reihe“: Reihe mit allen Werten, neue Karte an der richtigen Stelle, Tipps als Namensschilder
function reiheAufl(f) {
  const L = f.last, l = LM(L.neu);
  const tipps = L.tipps.filter(t => t.gap >= 0).map(t => ({ gap: t.gap, name: f.names[t.slot] }));
  const ok = L.tipps.filter(t => t.ok).map(t => f.names[t.slot]);
  const raus = L.raus.map(i => f.names[i]);
  const ohne = L.tipps.filter(t => t.gap < 0).map(t => f.names[t.slot]);
  let titel, cls;
  if (L.keiner) { titel = 'Alle lagen daneben – alle bleiben im Spiel!'; cls = 'bad'; }
  else if (!raus.length) { titel = 'Alle richtig! ✓'; cls = 'good'; }
  else { titel = `Raus: ${raus.join(', ')}`; cls = 'bad'; }
  return `<div class="reihebuehne aufl">
    <div class="neuspalte">
      <div class="aufltitel ${cls}">${esc(titel)}</div>
      ${lmGross(L.neu, { nw: f.nw, zeigen: true })}
      ${ok.length ? `<p><span class="schild ok">✓</span> ${esc(ok.join(', '))}</p>` : ''}
      ${ohne.length ? `<p class="hint">Keine Abgabe: ${esc(ohne.join(', '))}</p>` : ''}
      <p class="hint" id="naechste"></p>
    </div>
    <div class="reihebox beamer">${reiheAufloesung(L.reihe, L.neu, f.nw, tipps).replace('class="reihe ', `class="reihe ${L.reihe.length > 8 ? 'dicht ' : ''}`)}</div>
  </div>`;
}
// Auflösung „Bedarf“: Auswahl aller Finalisten mit Werten, Summen, wer die Karte bekommt
function bedarfAufl(f) {
  const L = f.last, b = BK(L.b), zielZ = zielZehntel(b), nw = b.wert;
  const spalten = f.names.map((n, i) => {
    const a = L.abgaben[i], pick = (a.pick || []).map(k => L.hand[k]);
    const gewonnen = L.gewinner.includes(i);
    const e = bewerte(L.hand, a.pick || [], L.b);
    const info = !pick.length ? (a.why ? 'keine Abgabe' : '–') : e.drueber ? `zu viel (${Math.round(e.sum * 100 / zielZ)} %)` : `${Math.round(e.sum * 100 / zielZ)} %`;
    return `<div class="abgabe-spalte ${gewonnen ? 'sieg' : e.drueber ? 'drueber' : ''}">
      <div class="asname"><b>${esc(n)}</b>${gewonnen ? '<span class="schild ok">🃏 bekommt die Karte</span>' : ''}</div>
      ${pick.length ? kombiListe(pick, nw) : '<p class="hint">Keine Abgabe</p>'}
      <div class="assumme"><b>${esc(zehntelText(e.sum, nw).split(' ')[0])}<small>${esc(NW[nw].einheit)}</small></b><span>${esc(info)}</span></div>
      ${balken(e.sum, zielZ)}
    </div>`;
  }).join('');
  return `<div class="bedarfbuehne aufl">
    <div class="bkzeile">${bedarfKarte(L.b)}<div class="beste"><h3>Beste Möglichkeit</h3><p>${esc(kombiText(L.beste.pick, nw))}</p><p class="hint" id="naechste"></p></div></div>
    <div class="abgaben n${f.names.length}">${spalten}</div>
  </div>`;
}
function aufloesungTon(f) {
  const L = f.last;
  if (f.art === 'reihe') {
    if (L.keiner) Ton.fehler();
    else if (L.raus.length) Ton.raus();
    else Ton.richtig();
  } else {
    Ton.aufdecken(6);
    if (L.gewinner.length) setTimeout(() => Ton.richtig(), 500);
  }
}

// Seitenleiste: Finalisten mit Status
function seite(f) {
  const el = $('#fCards'); if (!el) return;
  const now = serverNow(), lauf = f.state === 'run' && !f.paused && now >= f.startAt;
  el.innerHTML = f.p.map((pid, i) => {
    let cls = '', txt = '';
    const x = f.st[i];
    if (f.art === 'reihe' && !x.alive) {
      cls = 'out';
      txt = x.place === 1 ? '🏆 Sieg' : `raus · Platz ${x.place} (Karte ${x.out || f.round})`;
      if (x.place === 1) cls = 'ok';
    } else if (room.phase === 'podium' && x.place === 1) { cls = 'ok'; txt = '🏆 Sieg'; }
    else if (lauf && x.res) { cls = 'ab'; txt = '✓ abgegeben'; }
    else if (lauf) txt = 'überlegt …';
    else txt = f.art === 'reihe' ? 'noch im Spiel' : '';
    const karten = f.art === 'bedarf' ? `<div class="kartenzahl" title="Bedarfskarten">${'<i></i>'.repeat(f.karten[i])}<b>${f.karten[i]}</b><span>/ ${f.sieg}</span></div>` : '';
    const off = f.online && !f.online[i] && room.phase === 'final' ? '<div class="warn">Handy nicht verbunden!</div>' : '';
    return `<div class="fcard ${cls}" data-slot="${i}"><div class="fn"><b>${esc(f.names[i])}</b></div>${karten}<div class="fs">${txt}</div>${off}</div>`;
  }).join('');
  $('#btnStop').disabled = !lauf;
}
// Zwischenstand regelmäßig auffrischen (Status „überlegt …“ beim Rundenstart)
setInterval(() => { if (FB && room && room.phase === 'final') { seite(room.final); buehne(room.final); } }, 500);

function pauseText(f) {
  const b = $('#btnPause'); if (!b) return;
  if (f.state !== 'run') { b.hidden = true; return; }
  b.hidden = false;
  const zwischen = !f.paused && serverNow() < f.startAt;
  b.innerHTML = f.paused ? 'Weiter <span class="kbd">Leertaste</span>' : f.haltNext ? 'Pause vorgemerkt' : zwischen ? 'Anhalten <span class="kbd">Leertaste</span>' : 'Nach der Runde anhalten <span class="kbd">Leertaste</span>';
  b.classList.toggle('big-btn', !!f.paused); b.classList.toggle('ghost-btn', !f.paused);
  b.disabled = !!f.haltNext && !f.paused;
}
function pauseKnopf() {
  const f = room && room.final; if (!f || f.state !== 'run') return;
  Ton.init();
  send({ t: f.paused ? 'weiter' : 'halt', nr: f.nr });
}

// ---------------------------------------------------------------- Siegerehrung
let podiumT = 0;
function podium() {
  const f = room.final;
  if (screen === 'podium:' + f.nr) return;
  // Erst die Auflösung der letzten Runde zeigen
  if (screen === 'final:' + f.nr && FB) {
    final();
    clearTimeout(podiumT);
    podiumT = setTimeout(() => { screen = 'pre-podium'; podiumZeigen(); }, f.art === 'bedarf' ? 7000 : 4500);
    screen = 'final-end:' + f.nr;
    return;
  }
  if (screen === 'final-end:' + f.nr) return;
  podiumZeigen();
}
function podiumZeigen() {
  const f = room && room.final; if (!f || room.phase !== 'podium') return;
  stopFinal();
  screen = 'podium:' + f.nr;
  const order = f.p.map((pid, i) => ({ name: f.names[i], place: f.st[i].place, x: f.st[i], i })).sort((a, b) => a.place - b.place);
  const w = order[0];
  let unter, liste, rechts;
  if (f.art === 'reihe') {
    unter = f.last && f.last.alleKarten ? `Alle ${f.total} Karten richtig eingeordnet – und die kürzeste Bedenkzeit (${fmtMs(w.x.total)}).` : `Hat die meisten Karten richtig eingeordnet.`;
    liste = order.map(o => `<li>${o.place}. ${esc(o.name)} <span>${o.place === 1 ? 'Sieg' : 'raus bei Karte ' + o.x.out}</span></li>`).join('');
    rechts = `<div class="tcard seqcard"><h2 style="font-size:1.3em">Die ganze Reihe: ${esc(NW[f.nw].name)}</h2><div class="reihebox beamer">${reiheHtml(f.reihe, f.nw, { zeigen: true, luecken: false, cls: f.reihe.length > 8 ? 'dicht' : '' })}</div></div>`;
  } else {
    unter = `${w.x.karten} Bedarfskarten gesammelt.`;
    liste = order.map(o => `<li>${o.place}. ${esc(o.name)} <span>${o.x.karten} ${o.x.karten === 1 ? 'Karte' : 'Karten'}</span></li>`).join('');
    rechts = `<div class="tcard seqcard"><h2 style="font-size:1.3em">Gesammelte Bedarfskarten</h2>${order.map(o => `<div class="gesammelt"><b>${esc(o.name)}</b>${o.x.gewonnen.length ? o.x.gewonnen.map(b => `<span class="minibk nw-${BK(b).wert}">${esc(BK(b).name)} · ${esc(zielText(BK(b)))}</span>`).join('') : '<span class="hint">keine</span>'}</div>`).join('')}</div>`;
  }
  view.innerHTML = `<div class="tpage"><div class="podium">
      <div class="tcard winner">
        <div class="pokal">🏆</div>
        <h2>${esc(w.name)} gewinnt!</h2>
        <p>${esc(unter)}</p>
        <ol class="places">${liste}</ol>
      </div>
      ${rechts}
    </div>
    <div class="tactions"><button class="ghost-btn" id="btnLobby">Neues Spiel <span class="kbd">Esc</span></button>
      <button class="ghost-btn" id="btnOther">Andere Finalisten</button><span class="grow"></span>
      <button class="big-btn" id="btnRev">Revanche <span class="kbd">Enter</span></button></div>
  </div>`;
  $('#btnLobby').onclick = toLobby;
  $('#btnOther').onclick = () => send({ t: 'to-setup' });
  $('#btnRev').onclick = () => { Ton.init(); send({ t: 'revanche', cfg }); };
  Ton.fanfare();
  konfetti();
}
function konfetti() {
  const c = document.createElement('div'); c.className = 'confetti';
  const cols = ['#ffb238', '#6fa8dc', '#f0b23a', '#4cc77a', '#a678d8', '#fff'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = cols[i % cols.length];
    p.style.animationDuration = 2.4 + Math.random() * 2.6 + 's';
    p.style.animationDelay = Math.random() * 1.2 + 's';
    c.appendChild(p);
  }
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 6500);
}

// ---------------------------------------------------------------- Tasten
document.addEventListener('keydown', e => {
  if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (!$('#dlg').hidden) { if (e.key === 'Escape') $('#dlg').hidden = true; return; }
  if (!room) return;
  if (e.key === 'Enter') {
    e.preventDefault();
    if (room.phase === 'lobby') startQuali();
    else if (room.phase === 'quali') endQuali();
    else if (room.phase === 'final-setup') startFinal();
    else if (room.phase === 'podium' && screen.startsWith('podium')) { Ton.init(); send({ t: 'revanche', cfg }); }
  } else if (e.key === ' ') {
    if (room.phase === 'final') { e.preventDefault(); const b = $('#btnPause'); if (b && !b.disabled) pauseKnopf(); }
  } else if (e.key === 'Escape') {
    if (room.phase === 'final-setup' || (room.phase === 'podium' && screen.startsWith('podium'))) toLobby();
  } else if (e.key === 'f' || e.key === 'F') vollbild();
  else if (e.key === 'm' || e.key === 'M') btnTon.click();
});

// ---------------------------------------------------------------- Start
if (!sess || !sess.code || !sess.key) newSession(); else connect();
