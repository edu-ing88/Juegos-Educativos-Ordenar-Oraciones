(() => {
'use strict';
const S = { acts: [], cur: null };
const curAct = () => S.acts.find(a => a.id === S.cur) || S.acts[0];
const G = { act: null, idx: 0, words: [], ok: 0, err: 0, tries: 0, sec: 0, total: 0, placed: 0, active: false, paused: false, busy: false, sel: null, drag: null, token: 0, timer: null, suppress: false };

function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); window.scrollTo(0, 0); }
function renderHome() {
  const s = $('#homeSelect'); s.innerHTML = '';
  S.acts.forEach(a => { const o = el('option', '', a.title); o.value = a.id; s.append(o); });
  s.value = curAct().id;
}
$('#homeSelect').addEventListener('change', e => { S.cur = e.target.value; Store.setCur(S.cur); });
$('#btnStart').addEventListener('click', () => start(curAct()));

function say(t, c) { const m = $('#msg'); m.className = 'msg'; void m.offsetWidth; m.className = 'msg ' + (c || ''); m.textContent = t || '\u00a0'; }
function stats() {
  $('#sOk').textContent = G.ok; $('#sErr').textContent = G.err;
  $('#sPhrase').textContent = Math.min(G.idx + 1, G.act.phrases.length) + '/' + G.act.phrases.length;
  const lim = G.act.time; $('#sTime').textContent = fmt(lim > 0 ? lim - G.sec : G.sec);
  const pct = G.total ? Math.round(G.placed / G.total * 100) : 0;
  $('#pBar').style.width = pct + '%'; $('#pTxt').textContent = pct + '%'; $('.progress').setAttribute('aria-valuenow', pct);
}

function start(act) {
  const err = validate(act); if (err) return toast('⚠ ' + err);
  clearInterval(G.timer); G.token++;
  Object.assign(G, { act, idx: 0, ok: 0, err: 0, tries: 0, sec: 0, placed: 0, active: false, paused: false, busy: false, sel: null,
    total: act.phrases.reduce((n, p) => n + words(p.text).length, 0) });
  Sound.on = act.sound; $('#gSound').textContent = Sound.on ? '🔊' : '🔇';
  $('#gTitle').textContent = act.title; $('#stage').classList.add('off');
  loadPhrase(); stats(); say('');
  show('game');
  const token = G.token, o = $('#countdown'), n = $('#cdNum'), seq = ['3', '2', '1', '¡EMPIEZA EL JUEGO!']; let i = 0;
  o.classList.add('show');
  (function step() {
    if (token !== G.token) { o.classList.remove('show'); return; }
    n.textContent = seq[i]; n.className = ''; void n.offsetWidth; n.className = 'tick' + (i === 3 ? ' small' : '');
    Sound.play(i === 3 ? 'ok' : 'tick'); i++;
    setTimeout(i < seq.length ? step : () => {
      o.classList.remove('show'); if (token !== G.token) return;
      G.active = true; $('#stage').classList.remove('off'); G.timer = setInterval(tick, 1000);
    }, 900);
  })();
}
function tick() {
  if (!G.active || G.paused) return;
  G.sec++; stats(); if (G.act.time > 0 && G.sec >= G.act.time) finish(false);
}

function loadPhrase() {
  const w = words(G.act.phrases[G.idx].text); G.words = w; G.sel = null; G.busy = false;
  const slots = $('#slots'), bank = $('#bank'); slots.innerHTML = ''; bank.innerHTML = '';
  w.forEach((_, i) => { const s = el('div', 'slot'); s.dataset.i = i; s.dataset.n = i + 1; s.addEventListener('click', () => { if (G.sel) place(G.sel, s); }); slots.append(s); });
  let t, n = 0; const mixable = new Set(w).size > 1;
  do { t = shuffle(w); } while (mixable && n++ < 30 && t.every((x, i) => x === w[i]));
  t.forEach(text => bank.append(tile(text)));
}
function tile(text) {
  const d = el('div', 'tile', text); d.dataset.text = text; d.tabIndex = 0;
  d.addEventListener('click', () => {
    if (G.suppress || !G.active || G.busy || d.classList.contains('done')) return;
    const was = G.sel === d; clearSel(); if (!was) { G.sel = d; d.classList.add('sel'); Sound.play('pick'); }
  });
  d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); d.click(); } });
  d.addEventListener('pointerdown', e => {
    if (!G.active || G.busy || d.classList.contains('done') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    G.drag = { d, x: e.clientX, y: e.clientY, moved: false, ghost: null };
    document.addEventListener('pointermove', pmove); document.addEventListener('pointerup', pup); document.addEventListener('pointercancel', pup);
  });
  return d;
}
function clearSel() { $$('.tile.sel').forEach(x => x.classList.remove('sel')); G.sel = null; }
function pmove(e) {
  const g = G.drag; if (!g) return;
  if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 8) {
    g.moved = true; clearSel(); g.d.classList.add('dragging'); Sound.play('pick');
    g.ghost = g.d.cloneNode(true); g.ghost.className = 'tile ghost'; g.ghost.style.width = g.d.offsetWidth + 'px'; document.body.append(g.ghost);
  }
  if (!g.moved) return;
  g.ghost.style.transform = `translate(${e.clientX - g.ghost.offsetWidth / 2}px,${e.clientY - g.ghost.offsetHeight / 2}px)`;
  const s = document.elementFromPoint(e.clientX, e.clientY), slot = s && s.closest && s.closest('.slot');
  $$('.slot.over').forEach(x => x.classList.remove('over')); if (slot && !slot.firstChild) slot.classList.add('over');
}
function pup(e) {
  document.removeEventListener('pointermove', pmove); document.removeEventListener('pointerup', pup); document.removeEventListener('pointercancel', pup);
  const g = G.drag; G.drag = null; if (!g) return;
  $$('.slot.over').forEach(x => x.classList.remove('over'));
  if (!g.moved) return;
  g.ghost.remove(); g.d.classList.remove('dragging');
  G.suppress = true; setTimeout(() => G.suppress = false, 80);
  if (e.type !== 'pointerup') return;
  const s = document.elementFromPoint(e.clientX, e.clientY), slot = s && s.closest && s.closest('.slot');
  if (slot) place(g.d, slot);
}
function place(t, slot) {
  if (!G.active || G.busy || slot.firstChild || t.classList.contains('done')) return;
  clearSel(); G.tries++;
  if (t.dataset.text === G.words[+slot.dataset.i]) {
    slot.append(t); t.classList.add('done'); slot.classList.add('ok'); G.ok++; G.placed++;
    Sound.play('ok'); say('¡Muy bien!', 'ok'); stats();
    if (!$('#bank').children.length) phraseDone();
  } else {
    G.err++; t.classList.remove('no'); void t.offsetWidth; t.classList.add('no'); slot.classList.add('no');
    setTimeout(() => { t.classList.remove('no'); slot.classList.remove('no'); }, 450);
    Sound.play('bad'); say('¡Ahí no va! Inténtalo de nuevo', 'bad'); stats();
  }
}
function phraseDone() {
  G.busy = true; G.idx++; const token = G.token;
  if (G.idx >= G.act.phrases.length) { say('¡Excelente! ¡Lo lograste!', 'ok'); return finish(true); }
  say('¡Frase completa! Vamos con la siguiente', 'ok');
  setTimeout(() => { if (token !== G.token) return; loadPhrase(); stats(); say(''); }, 1100);
}
function stop() { G.active = false; clearInterval(G.timer); G.token++; $('#countdown').classList.remove('show'); }
function finish(win) {
  const token = G.token; G.active = false; clearInterval(G.timer); stats();
  const bonus = win && G.act.time > 0 ? Math.max(0, G.act.time - G.sec) : 0;
  const score = Math.max(0, G.ok * 10 - G.err * 3 + bonus), perf = G.tries ? Math.round(G.ok / G.tries * 100) : 0;
  Sound.play(win ? 'win' : 'bad');
  setTimeout(() => {
    if (token !== G.token) return;
    $('#rIcon').textContent = win ? '🏆' : '⏰';
    $('#rTitle').textContent = win ? '¡Felicidades, has completado la actividad!' : '¡Se acabó el tiempo! Inténtalo otra vez.';
    $('#rScore').textContent = score; $('#rOk').textContent = G.ok + '/' + G.total; $('#rErr').textContent = G.err;
    $('#rTime').textContent = fmt(G.sec); $('#rPerf').textContent = perf + '%'; show('result');
  }, win ? 1200 : 300);
}

$('#gSound').addEventListener('click', () => { Sound.on = !Sound.on; $('#gSound').textContent = Sound.on ? '🔊' : '🔇'; Sound.play('tick'); });
function ask(text, yes, icon, no, fn) {
  if (Confirm.open || !G.act) return;
  const was = G.paused; G.paused = true;
  Confirm.ask(text, () => { G.paused = false; fn(); }, { yes, icon, no, onCancel: () => { G.paused = was; } });
}
$('#gRestart').addEventListener('click', () => ask('¿Quieres reiniciar la actividad? Empezarás de nuevo y perderás tu progreso actual.', 'SÍ, REINICIAR', '↻', 'CONTINUAR JUGANDO', () => start(G.act)));
$('#gExit').addEventListener('click', () => ask('¿Estás seguro de que deseas salir del juego? Tu progreso actual podría perderse.', 'SÍ, SALIR', '🚪', 'CONTINUAR JUGANDO', () => { stop(); renderHome(); show('home'); }));
$('#rAgain').addEventListener('click', () => start(G.act));
$('#rExit').addEventListener('click', () => { stop(); renderHome(); show('home'); });

S.acts = Store.load();
S.cur = S.acts.some(a => a.id === Store.getCur()) ? Store.getCur() : S.acts[0].id;
renderHome();
})();
