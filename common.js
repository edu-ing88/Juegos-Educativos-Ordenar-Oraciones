'use strict';
/* ===== Utilidades compartidas (juego y configuración) ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = s => { s = Math.max(0, s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const words = t => String(t || '').trim().split(/\s+/).filter(Boolean);

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

/* Sonidos con Web Audio API */
const Sound = {
  on: true, ctx: null,
  seqs: {
    pick: [[520, 0, .08, 'triangle']],
    tick: [[440, 0, .12, 'square', .07]],
    ok: [[660, 0, .12], [880, .12, .22]],
    bad: [[240, 0, .16, 'sawtooth', .1], [160, .16, .28, 'sawtooth', .1]],
    win: [[523, 0, .15], [659, .15, .15], [784, .3, .15], [1047, .45, .5]]
  },
  play(n) {
    if (!this.on) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = this.ctx || new AC(); if (this.ctx.state === 'suspended') this.ctx.resume();
      const t0 = this.ctx.currentTime;
      this.seqs[n].forEach(([f, st, d, type = 'sine', v = .16]) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0, t0 + st); g.gain.linearRampToValueAtTime(v, t0 + st + .02);
        g.gain.exponentialRampToValueAtTime(.001, t0 + st + d);
        o.connect(g).connect(this.ctx.destination); o.start(t0 + st); o.stop(t0 + st + d + .05);
      });
    } catch (e) { }
  }
};

/* LocalStorage */
function defaultActivity() {
  return {
    id: 'demo', title: 'Ordena las frases', time: 0, sound: true,
    phrases: ['El sol sale por la mañana', 'Mi familia vive en una casa grande', 'Los niños juegan en el parque', 'Me gusta leer cuentos divertidos']
      .map(text => ({ id: uid(), text }))
  };
}
function blankActivity() { return { id: uid(), title: 'Mi actividad', time: 0, sound: true, phrases: [{ id: uid(), text: '' }, { id: uid(), text: '' }] }; }
const Store = {
  KEY: 'ow_activities', CUR: 'ow_current',
  load() { try { const a = JSON.parse(localStorage.getItem(this.KEY)); if (Array.isArray(a) && a.length) return a; } catch (e) { } return [defaultActivity()]; },
  save(l) { try { localStorage.setItem(this.KEY, JSON.stringify(l)); return true; } catch (e) { toast('No se pudo guardar en el navegador.'); return false; } },
  getCur() { try { return localStorage.getItem(this.CUR); } catch (e) { return null; } },
  setCur(id) { try { localStorage.setItem(this.CUR, id); } catch (e) { } }
};
function validate(a) {
  if (!a.title.trim()) return 'Escribe un título para la actividad.';
  if (!a.phrases.length) return 'Agrega al menos una frase.';
  for (let i = 0; i < a.phrases.length; i++) {
    const n = words(a.phrases[i].text).length;
    if (n < 2) return `La frase ${i + 1} necesita al menos 2 palabras.`;
    if (n > 12) return `La frase ${i + 1} tiene más de 12 palabras.`;
  }
  if (!(a.time >= 0)) return 'El tiempo límite no es válido.';
  return '';
}

/* Ventana modal de confirmación (reutilizable) */
const Confirm = {
  cb: null, onCancel: null,
  ask(text, cb, o = {}) {
    this.cb = cb; this.onCancel = o.onCancel || null;
    $('#cText').textContent = text; $('#cYes').textContent = o.yes || 'SÍ';
    $('#cNo').textContent = o.no || 'CANCELAR'; $('#cIcon').textContent = o.icon || '❓';
    $('#cModal').classList.add('show'); $('#cNo').focus();
  },
  close() { $('#cModal').classList.remove('show'); this.cb = null; this.onCancel = null; },
  cancel() { const f = this.onCancel; this.close(); if (f) f(); },
  get open() { return $('#cModal').classList.contains('show'); }
};
document.addEventListener('DOMContentLoaded', () => {
  $('#cNo').addEventListener('click', () => Confirm.cancel());
  $('#cYes').addEventListener('click', () => { const f = Confirm.cb; Confirm.close(); if (f) f(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && Confirm.open) Confirm.cancel(); });
});
