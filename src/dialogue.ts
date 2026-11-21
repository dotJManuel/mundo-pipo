// DIÁLOGO — caja de texto estilo RPG con máquina de escribir y "blips" de voz.
import { $, $$, rm } from './util';
import { S } from './state';
import { Audio } from './audio';

const dlg = $('#dlg'), dlgWho = $('#dlgWho'), dlgTxt = $('#dlgTxt'), dlgPic = $('#dlgPic');
const WHO: Record<string, string> = {
  PIPO: '#ffc93c', LOLA: '#ff9fc0', BRUNO: '#d9a06a', TITO: '#f1ead8', 'PIPO?': '#7d7140', '???': '#000',
};

let dq: [string, string][] = [];
let dBusy = false;
let dTok = 0;

function say(who: string, text: string, force?: boolean): void {
  text = text.replaceAll('amigo', S.name || 'amigo');
  if (force) { dq = [[who, text]]; dTok++; dBusy = false; nextLine(); return; }
  if (dq.length > 2) return;
  dq.push([who, text]);
  if (!dBusy) nextLine();
}

function nextLine(): void {
  const it = dq.shift();
  if (!it) { dlg.classList.remove('on'); dBusy = false; return; }
  dBusy = true;
  const tok = ++dTok, [who, text] = it, evil = who === '???' || who === 'PIPO?';
  dlgWho.textContent = who; dlgPic.style.background = WHO[who] || '#000'; dlgPic.textContent = who === '???' ? '?' : who[0];
  dlg.classList.toggle('evil', evil); dlg.classList.add('on'); dlgTxt.textContent = '';
  let i = 0;
  const step = () => {
    if (tok !== dTok) return;
    i++; dlgTxt.textContent = text.slice(0, i); if (i % 2) Audio.blip(evil);
    if (i < text.length) setTimeout(step, rm ? 0 : (evil ? 55 : 30));
    else setTimeout(() => { if (tok === dTok) nextLine(); }, 1700 + text.length * 38);
  };
  step();
}

// Disparadores del mundo: cualquier elemento con data-say habla al cruzar el centro de la pantalla.
const triggers = $$('[data-say]').map((el) => ({ el, done: false }));
const trigIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting || !S.playing) return;
  const t = triggers.find((t) => t.el === e.target);
  if (!t || t.done) return;
  t.done = true;
  (e.target as HTMLElement).dataset.say!.split('||').forEach((part) => {
    const [w, ...r] = part.split('|');
    say(w, r.join('|'));
  });
}), { rootMargin: '-45% 0px -45% 0px' });
triggers.forEach((t) => trigIO.observe(t.el));

export const Dialogue = {
  say,
  isBusy: () => dBusy,
  // Usado por el scare: invalida el texto en curso y oculta la caja.
  clear: () => { dq = []; dTok++; dlg.classList.remove('on'); },
  // Usado por restart: los disparadores vuelven a poder hablar.
  resetTriggers: () => { triggers.forEach((t) => { t.done = false; }); },
};
