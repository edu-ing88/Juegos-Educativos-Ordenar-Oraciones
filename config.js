(() => {
'use strict';
let acts = Store.load(), D = null;
const ask = (text, fn) => Confirm.ask(text, fn, { yes: 'SÍ, ELIMINAR', icon: '🗑️' });

function read() { D.title = $('#aTitle').value; D.time = parseInt($('#aTime').value, 10) || 0; D.sound = $('#aSound').checked; }
function fill() { $('#aTitle').value = D.title; $('#aTime').value = D.time; $('#aSound').checked = D.sound; savedList(); phrases(); }
function open(a) { D = clone(a); fill(); }
function savedList() {
  const s = $('#aSaved'); s.innerHTML = '';
  acts.forEach(a => { const o = el('option', '', a.title); o.value = a.id; s.append(o); });
  s.value = acts.some(a => a.id === D.id) ? D.id : acts[0].id;
}
function phrases() {
  const box = $('#aPhrases'); box.innerHTML = ''; $('#aCount').textContent = D.phrases.length + ' frases';
  D.phrases.forEach((p, i) => {
    const row = el('div', 'prow'), n = el('span', 'n', i + 1), inp = el('input'), cnt = el('span', 'tag', ''), del = el('button', 'btn small red', '🗑');
    inp.type = 'text'; inp.value = p.text; inp.placeholder = 'Ej.: El gato duerme en el sofá'; inp.maxLength = 120; inp.setAttribute('aria-label', 'Frase ' + (i + 1));
    const upd = () => { const c = words(inp.value).length; cnt.textContent = c + (c === 1 ? ' palabra' : ' palabras'); cnt.classList.toggle('badc', c < 2 || c > 12); };
    inp.oninput = () => { p.text = inp.value; upd(); }; upd();
    del.title = 'Eliminar frase'; del.setAttribute('aria-label', 'Eliminar frase ' + (i + 1));
    del.onclick = () => {
      read(); if (D.phrases.length <= 1) return toast('Debe haber al menos una frase.');
      ask(`¿Seguro que deseas eliminar la frase ${i + 1}? Esta acción no se puede deshacer.`, () => { D.phrases.splice(i, 1); phrases(); toast('Frase eliminada'); });
    };
    row.append(n, inp, cnt, del); box.append(row);
  });
}
function save() {
  read(); const err = validate(D); if (err) { toast('⚠ ' + err); return false; }
  const c = clone(D), i = acts.findIndex(a => a.id === c.id);
  if (i >= 0) acts[i] = c; else acts.push(c);
  if (!Store.save(acts)) { if (i < 0) acts.pop(); return false; }
  Store.setCur(c.id); savedList(); toast('Actividad guardada ✅'); return true;
}

$('#aAdd').onclick = () => { read(); if (D.phrases.length >= 30) return toast('Máximo 30 frases.'); D.phrases.push({ id: uid(), text: '' }); phrases(); const r = $$('#aPhrases input'); r[r.length - 1].focus(); };
$('#aSave').onclick = save;
$('#aPlay').onclick = () => { if (save()) location.href = 'index.html'; };
$('#aLoad').onclick = () => { const a = acts.find(x => x.id === $('#aSaved').value); if (a) { open(a); toast('Actividad cargada'); } };
$('#aDelete').onclick = () => {
  const a = acts.find(x => x.id === $('#aSaved').value); if (!a) return;
  ask(`¿Seguro que deseas eliminar la actividad «${a.title}»? Esta acción no se puede deshacer.`, () => {
    acts = acts.filter(x => x.id !== a.id); if (!acts.length) acts = [defaultActivity()];
    Store.save(acts); Store.setCur(acts[0].id); open(acts[0]); toast('Actividad eliminada');
  });
};
$('#aReset').onclick = () => { D = Object.assign(blankActivity(), { title: '' }); fill(); $('#aTitle').value = ''; $('#aTitle').focus(); toast('Configuración reiniciada'); };

const cur = acts.find(a => a.id === Store.getCur()) || acts[0];
open(cur);
})();
