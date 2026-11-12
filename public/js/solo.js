// Ein Spiel allein auf dem Handy (Qualifying und Übungsseite).
// Reihe: Karte für Karte einordnen, bis zum ersten Fehler (dann neuer Versuch mit neuen Karten).
// Bedarf: Bedarfskarte für Bedarfskarte treffen, bis eine danebengeht (dann neuer Versuch).
import { NW, reiheVersuch, richtigeLuecke, sortiert, bedarfRunde, bewerte, mitEinheit, wert } from './regeln.js';
import { esc, LM, reiheEingabe, reiheAufloesung, lueckeText, bedarfKarte, handEingabe, bedarfAuswertung } from './karten.js';

export class Solo {
  /**
   * o: { el, art, seed, nwWahl, stufe,
   *      onStatus(links, rechts)        Statuszeile
   *      onLevel({v, lvl, acc, ms})     neuer Stand im Versuch v
   *      onFehler(v)                    Versuch v ist zu Ende (Fehler)
   *      onVersuch(v) }                 Versuch v beginnt
   */
  constructor(o) { this.o = o; this.aktiv = false; this.timers = []; }
  later(fn, ms) { const t = setTimeout(fn, ms); this.timers.push(t); return t; }
  stop() { this.aktiv = false; this.timers.forEach(clearTimeout); this.timers = []; if (this.eingabe) this.eingabe.sperren(); }
  start(v = 1) { this.aktiv = true; this.versuch(v); }
  status(l, r, art = 'tippen') { this.o.onStatus && this.o.onStatus(l, r, art); }

  versuch(v) {
    if (!this.aktiv) return;
    this.v = v; this.lvl = 0; this.ms = 0; this.acc = 0;
    this.o.onVersuch && this.o.onVersuch(v);
    if (this.o.art === 'reihe') {
      const { nw, karten } = reiheVersuch(this.o.seed, v, this.o.nwWahl);
      this.nw = nw; this.karten = karten; this.reihe = [karten[0]]; this.k = 1; this.rueck = '';
      this.reiheKarte();
    } else {
      this.i = 0; this.accSumme = 0;
      this.bedarfKarte();
    }
  }

  // ---------------------------------------------------------------- Reihe
  reiheKarte() {
    if (!this.aktiv) return;
    const { el, stufe } = this.o, nw = this.nw;
    this.status(`Karte ${this.k} <small>von ${this.karten.length - 1} · Versuch ${this.v}</small>`, `Ordne nach: ${NW[nw].name}`);
    const neu = this.karten[this.k];
    this.eingabe = reiheEingabe(el, { reihe: this.reihe, neu, nw, zeigen: stufe === 'offen', rueck: this.rueck, onAbgabe: gap => this.reihePruefen(gap) });
    this.t0 = performance.now();
  }
  reihePruefen(gap) {
    if (!this.aktiv) return;
    const dt = performance.now() - this.t0, nw = this.nw, neu = this.karten[this.k];
    const richtig = richtigeLuecke(this.reihe, neu, nw);
    if (gap === richtig) {
      this.ms += dt; this.lvl = this.k;
      this.reihe.push(neu);
      this.o.onLevel && this.o.onLevel({ v: this.v, lvl: this.lvl, acc: 0, ms: Math.round(this.ms) });
      const wertText = this.o.stufe === 'offen' ? ` ${LM(neu).name}: ${mitEinheit(wert(LM(neu), nw), nw)}` : '';
      this.rueck = `<div class="rueck ok">✓ Richtig!${esc(wertText)}</div>`;
      this.k++;
      if (this.k >= this.karten.length) return this.reiheFertig();
      return this.reiheKarte();
    }
    // Fehler: Auflösung zeigen, dann neuer Versuch
    this.o.onFehler && this.o.onFehler(this.v);
    const l = LM(neu), sort = sortiert(this.reihe, nw);
    this.status(`Versuch ${this.v} <small>vorbei</small>`, 'Leider falsch', 'bad');
    this.o.el.innerHTML = `<div class="card bad aufl">
      <h2>Leider falsch!</h2>
      <p><b>${esc(l.name)}</b> hat ${esc(mitEinheit(wert(l, nw), nw))} und gehört ${esc(lueckeText(sort, richtig, nw))}.</p>
      <p class="hint">Grün: richtiger Platz. Rot: dein Tipp. ${this.lvl ? `In diesem Versuch hattest du ${this.lvl} ${this.lvl === 1 ? 'Karte' : 'Karten'} richtig.` : ''}</p>
      <div class="reihebox klein">${reiheAufloesung(this.reihe, neu, nw, [{ gap, name: 'Dein Tipp' }])}</div>
      <button class="big-btn" id="btnNeu" disabled>Neuer Versuch</button>
    </div>`;
    this.weiterKnopf('#btnNeu', () => this.versuch(this.v + 1));
  }
  reiheFertig() {
    const nw = this.nw;
    this.status(`Geschafft! <small>Versuch ${this.v}</small>`, `${this.lvl} richtig`);
    this.o.el.innerHTML = `<div class="card good aufl">
      <h2>Super, alle ${this.lvl} Karten richtig!</h2>
      <p>Hier die ganze Reihe mit allen Werten. Mit einem neuen Versuch kannst du noch schneller werden.</p>
      <div class="reihebox klein">${reiheAufloesung(this.reihe.slice(0, -1), this.reihe[this.reihe.length - 1], nw, [])}</div>
      <button class="big-btn" id="btnNeu" disabled>Neuer Versuch</button>
    </div>`;
    this.o.onFehler && this.o.onFehler(this.v); // Versuch ist zu Ende (ohne Fehler)
    this.weiterKnopf('#btnNeu', () => this.versuch(this.v + 1));
  }

  // ---------------------------------------------------------------- Bedarf
  bedarfKarte() {
    if (!this.aktiv) return;
    const { el, seed, nwWahl } = this.o;
    const r = bedarfRunde(seed, this.v, this.i, nwWahl);
    this.b = r.b; this.hand = r.hand;
    this.status(`Serie ${this.lvl} <small>Versuch ${this.v}</small>`, `Bedarfskarte ${this.i + 1}`);
    el.innerHTML = `<div class="bedarfspiel">${bedarfKarte(this.b, { cls: 'klein' })}<div id="handBox"></div></div>`;
    this.eingabe = handEingabe(el.querySelector('#handBox'), { hand: this.hand, onAbgabe: pick => this.bedarfPruefen(pick) });
    this.t0 = performance.now();
  }
  bedarfPruefen(pickPos) {
    if (!this.aktiv) return;
    const dt = performance.now() - this.t0;
    const e = bewerte(this.hand, pickPos, this.b);
    const pick = pickPos.map(k => this.hand[k]);
    const knopf = t => `<button class="big-btn" id="btnNeu" disabled>${t}</button>`;
    if (e.ok) {
      this.lvl++; this.accSumme += e.acc; this.ms += dt;
      this.acc = Math.round(this.accSumme / this.lvl);
      this.o.onLevel && this.o.onLevel({ v: this.v, lvl: this.lvl, acc: this.acc, ms: Math.round(this.ms) });
      this.status(`Serie ${this.lvl} <small>Versuch ${this.v}</small>`, 'Geschafft!');
      this.o.el.innerHTML = bedarfAuswertung(this.b, this.hand, pick, e, { extra: knopf('Nächste Bedarfskarte') });
      this.weiterKnopf('#btnNeu', () => { this.i++; this.bedarfKarte(); });
    } else {
      this.o.onFehler && this.o.onFehler(this.v);
      this.status(`Serie ${this.lvl} <small>Versuch ${this.v} vorbei</small>`, e.drueber ? 'Zu viel' : 'Zu wenig', 'bad');
      this.o.el.innerHTML = bedarfAuswertung(this.b, this.hand, pick, e, { extra: knopf('Neuer Versuch') });
      this.weiterKnopf('#btnNeu', () => this.versuch(this.v + 1));
    }
  }

  // Knopf erst nach kurzer Zeit freigeben (kein versehentliches Weitertippen)
  weiterKnopf(sel, fn) {
    const b = this.o.el.querySelector(sel);
    if (!b) return;
    this.o.el.scrollTop = 0; window.scrollTo(0, 0);
    this.later(() => { b.disabled = false; }, 1200);
    b.onclick = () => { if (!this.aktiv) return; fn(); };
  }
}
