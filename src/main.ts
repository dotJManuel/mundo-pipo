// ENTRY / MOTOR — un solo loop rAF lee el scroll, calcula el nivel de corrupción y
// escribe variables CSS. Todo lo demás reacciona a esos números.
import './styles.css';
import { $, $$, root, body, clamp, lerp, sstep, rnd, rm, fine } from './util';
import { S } from './state';
import { palette } from './palette';
import { Audio } from './audio';
import { Dialogue } from './dialogue';
import {
  injectPipo, injectBadpipoTeeth, injectCreature, HEART, STAR_SVG,
} from './sprites';

const say = Dialogue.say;

if (fine) body.classList.add('has-cur');

/* ---- mapeo de historia: marcadores de nivel → límites de etapa ---- */
function measure(): void {
  const max = Math.max(1, root.scrollHeight - innerHeight);
  const at = (id: string) => clamp(($(id).getBoundingClientRect().top + scrollY - innerHeight * 0.5) / max);
  S.anchors = [at('#m2'), at('#m3'), at('#m4')];
}
function mapQ(p: number): number {
  const pts: [number, number][] = [[0, 0], [S.anchors[0], 0.15], [S.anchors[1], 0.40], [S.anchors[2], 0.68], [1, 1]];
  for (let i = 1; i < pts.length; i++) { const [a, qa] = pts[i - 1], [b, qb] = pts[i]; if (p <= b) return lerp(qa, qb, b > a ? (p - a) / (b - a) : 1); }
  return 1;
}
addEventListener('resize', measure); addEventListener('load', measure); document.fonts?.ready.then(measure); measure();

/* ---- Pipo (dibujado una vez, usado en el título y como sprite) ---- */
injectPipo();
const sprite = $('#sprite');
const spriteEyes = $$<SVGGraphicsElement>('#spriteArt .pipoEye');
const titleEyes = $$<SVGGraphicsElement>('#tPipo .pipoEye');

/* ---- dirección por puntero / teclado ---- */
const cur = $('#cur'), curIris = $('#curIris'), ceye = $('.ceye');
let vx = 0, vy = 0, keyDir = 0;
addEventListener('pointermove', (e) => { vx = e.clientX - S.mx; vy = e.clientY - S.my; S.mx = e.clientX; S.my = e.clientY; }, { passive: true });
addEventListener('touchstart', (e) => { const t = e.touches[0]; S.mx = t.clientX; S.my = t.clientY; }, { passive: true });
addEventListener('touchmove', (e) => { const t = e.touches[0]; S.mx = t.clientX; S.my = t.clientY; }, { passive: true });
addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') keyDir = -1; if (e.key === 'ArrowRight') keyDir = 1; });
addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') keyDir = 0; });
setInterval(() => { if (S.s3 > 0.3 && !rm) { ceye.classList.add('blink'); setTimeout(() => ceye.classList.remove('blink'), 140); } }, 3400);

/* ---- textura de grano ---- */
{
  const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d')!; const d = x.createImageData(160, 160);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); $('#grain').style.backgroundImage = `url(${c.toDataURL()})`;
}

/* ---- HUD: corazones, estrellas, nivel, profundidad ---- */
const heartsEl = $('#hearts'), hud = $('#hud'), scoreEl = $('#score'), lvName = $('#lvName'), depthEl = $('#depth');
function drawHearts(): void { heartsEl.innerHTML = HEART.repeat(3); [...heartsEl.children].forEach((h, i) => h.classList.toggle('lost', i >= S.hearts)); }
drawHearts();
const HEART_LOSS: [number, string, string][] = [
  [0.25, 'PIPO', 'Ups, se te cayó una vida. No importa. Aquí abajo no la vas a necesitar.'],
  [0.48, '???', 'Otra vida menos. Qué rápido se van.'],
  [0.72, '???', 'Ya no te quedan vidas. Sigue jugando.'],
];
function loseHeart(i: number): void { S.hearts = 2 - i; drawHearts(); $('#pH').textContent = String(S.hearts); hud.classList.remove('hurt'); void hud.offsetWidth; hud.classList.add('hurt'); Audio.hurt(); say(HEART_LOSS[i][1], HEART_LOSS[i][2], true); }
const LEVELS: [string, string][] = [['NIVEL 1', 'El cielo'], ['NIVEL 2', 'El bosque'], ['NIVEL 3', 'El sótano'], ['NIVEL 4', 'Abajo']];
const LV_Q = [0, 0.15, 0.40, 0.68];
const banner = $('#banner'); let bannerT: number | undefined;
function showBanner(i: number): void {
  $('#bnNum').textContent = LEVELS[i][0]; $('#bnName').textContent = i === 3 ? 'abajo' : LEVELS[i][1];
  banner.classList.toggle('evil', i >= 2); banner.classList.add('on'); Audio.jingle(i);
  clearTimeout(bannerT); bannerT = setTimeout(() => banner.classList.remove('on'), 1900);
}

/* ---- estrellas: guía a Pipo a través de ellas ---- */
interface Star { el: HTMLElement; x: number; y: number; state: number; }
const starBox = $('#stars'); let stars: Star[] = [], score = 0; let placeStarsT: number | undefined;
function placeStars(): void {
  const end = $('#lair').offsetTop, H = innerHeight; starBox.innerHTML = ''; stars = [];
  for (let y = H * 0.75; y < end - H * 0.3; y += H * rnd(0.28, 0.42)) {
    const el = document.createElement('div'); el.className = 'star'; const x = rnd(14, 86);
    el.style.cssText = `left:${x.toFixed(1)}%;top:${y.toFixed(0)}px;--dl:${rnd(-2, 0).toFixed(2)}s`; el.innerHTML = STAR_SVG;
    starBox.append(el); stars.push({ el, x, y, state: 0 });
  }
}
addEventListener('load', placeStars); addEventListener('resize', () => { clearTimeout(placeStarsT); placeStarsT = setTimeout(placeStars, 300); }); placeStars();
function plus(txt: string): void { const p = document.createElement('div'); p.className = 'plus'; p.textContent = txt; p.style.left = (S.px - 20) + 'px'; p.style.top = (innerHeight * 0.3 - 60) + 'px'; body.append(p); setTimeout(() => p.remove(), 900); }
function starTick(): void {
  const line = scrollY + innerHeight * 0.3, win = fine ? 110 : 170;
  for (const st of stars) {
    if (st.state || st.y > line) continue;
    const sx = st.x / 100 * innerWidth;
    if (Math.abs(sx - S.px) < win) {
      st.state = 1; score++; st.el.classList.add('got'); setTimeout(() => st.el.style.display = 'none', 500);
      scoreEl.textContent = S.s4 > 0.5 ? `${score} · te falta una: tú` : S.s3 > 0.5 ? `${score} (${score + 3})` : `${score}`;
      plus(S.s3 > 0.4 ? '+1 ojo' : '+1'); hud.classList.remove('bump'); void hud.offsetWidth; hud.classList.add('bump'); Audio.chime();
    } else { st.state = 2; st.el.classList.add('miss'); }
  }
}

/* ---- nivel 2–3: ojos que siguen, corrupción de letras, texto que repta ---- */
const npcEyes = $$<SVGGraphicsElement>('.npc .pe'), tito = $<SVGGraphicsElement>('#tito'), titoEyes = $('#titoEyes');
$$('.crawl').forEach((el) => {
  const txt = el.textContent ?? ''; el.setAttribute('aria-label', txt); el.textContent = '';
  for (const ch of txt) {
    if (ch === ' ') { el.append(' '); continue; }
    const s = document.createElement('span'); s.textContent = ch; s.setAttribute('aria-hidden', 'true');
    s.style.cssText = `--rx:${rnd(-6, 6).toFixed(1)};--ry:${rnd(-5, 5).toFixed(1)};--rr:${rnd(-14, 14).toFixed(0)};--d:${rnd(1, 2.4).toFixed(2)}s;--dl:${rnd(-2, 0).toFixed(2)}s`; el.append(s);
  }
});
const GLY = '▓░▒█ʍʞǝɹɥΞΨҖѪ¿§¤';
interface Corrupt { el: HTMLElement; orig: string; start: number; vis: boolean; }
const corrupt: Corrupt[] = $$('[data-c]').map((el) => ({ el, orig: el.textContent ?? '', start: +(el.dataset.c as string), vis: false }));
const corrIO = new IntersectionObserver((es) => es.forEach((e) => { const c = corrupt.find((c) => c.el === e.target); if (c) c.vis = e.isIntersecting; }));
corrupt.forEach((c) => corrIO.observe(c.el));
function corruptTick(): void {
  for (const c of corrupt) {
    if (!c.vis) continue; const k = clamp((S.qs - c.start) / 0.2);
    if (k <= 0) { if (c.el.textContent !== c.orig) c.el.textContent = c.orig; continue; }
    const ch = [...c.orig], pr = k * (rm ? 0.04 : 0.11);
    for (let i = 0; i < ch.length; i++) {
      if (ch[i] === ' ' || Math.random() > pr) continue;
      if (Math.random() < 0.5 && i < ch.length - 1 && ch[i + 1] !== ' ') { [ch[i], ch[i + 1]] = [ch[i + 1], ch[i]]; i++; } else ch[i] = GLY[Math.random() * GLY.length | 0];
    }
    c.el.textContent = ch.join('');
  }
}
const pC = $('#pC'), pT = $('#pT'), pL = $('#pL'), pO = $('#pO');
function panelTick(): void {
  pC.textContent = `${Math.round(S.mx)}, ${Math.round(S.my)}`;
  const s = Math.floor((Date.now() - S.start) / 1000); pT.textContent = `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  pL.textContent = new Date().toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  if (S.qs > 0.45 && Math.random() < 0.03) S.others++; pO.textContent = String(S.others);
}
injectBadpipoTeeth();
const bpp = $$<SVGGraphicsElement>('.bpp');

/* ---- la página te devuelve la mirada, destellos, algo asomándose ---- */
const bigeye = $('#bigeye'), bigIris = $('#bigIris'), flash = $('#flash'), peek = $('#peek');
let nextEye = performance.now() + 9000, nextFlash = performance.now() + 6000, nextPeek = performance.now() + 4000, peekUntil = 0;
function doFlash(): void {
  if (rm) return; flash.style.background = Math.random() < 0.5 ? '#000' : '#2a0000';
  flash.querySelector('svg')!.style.transform = `scale(${rnd(0.8, 1.3).toFixed(2)}) translateX(${rnd(-20, 20) | 0}%)`;
  flash.classList.add('on'); Audio.tick(); setTimeout(() => flash.classList.remove('on'), 70);
}

/* ---- nivel 4: la criatura, el scare, game over ---- */
injectCreature();
const lair = $('#lair'), creature = $('#creature'), cAll = $('#cAll'), headT = $('#cHeadT'), pupils = $$<SVGGraphicsElement>('.cp'), glints = $$<SVGGraphicsElement>('.cp2');
let nextTilt = 0, tilted = false;
const scareEl = $('#scare'), endEl = $('#end'), lines = $$('#end .line'), go = $('#go'), cont = $('#cont'), cd = $('#cd');
let endTimers: number[] = [], cdTimer: number | undefined;
function scare(): void {
  if (S.scared) return; S.scared = true; S.playing = false; Dialogue.clear();
  body.classList.add('lock', 'scaring', 'over'); scareEl.classList.add('on'); if (!rm) scareEl.classList.add('anim'); Audio.scare();
  setTimeout(() => scareEl.classList.add('out'), rm ? 1600 : 1350);
  setTimeout(() => {
    body.classList.remove('lock', 'scaring'); scrollTo({ top: endEl.getBoundingClientRect().top + scrollY, behavior: 'instant' });
    scareEl.classList.remove('on', 'anim', 'out'); showEnd();
  }, rm ? 2200 : 1950);
}
function showEnd(): void {
  endTimers.forEach(clearTimeout); endTimers = [];
  endTimers.push(setTimeout(() => go.classList.add('show'), 3300));
  lines.forEach((l, i) => endTimers.push(setTimeout(() => l.classList.add('show'), 4800 + i * 1800)));
  endTimers.push(setTimeout(countdown, 4800 + lines.length * 1800 + 600));
  document.title = 'Mundo Pipo · Fin del juego';
}
function countdown(): void {
  cont.classList.add('show'); let n = 9; cd.textContent = String(n); Audio.lastNotes();
  clearInterval(cdTimer); cdTimer = setInterval(() => {
    n--; cd.textContent = String(n); Audio.blip(true);
    if (n <= 0) {
      clearInterval(cdTimer);
      if (!rm) { scareEl.classList.add('on', 'anim'); Audio.sting(); setTimeout(() => { scareEl.classList.remove('on', 'anim'); restart(); }, 450); } else restart();
    }
  }, 1000);
}
($('#yes1') as HTMLElement).onclick = () => { clearInterval(cdTimer); restart(); };
$('#yes2').addEventListener('pointerenter', (e) => { (e.target as HTMLElement).textContent = 'SÍ'; });
($('#yes2') as HTMLElement).onclick = () => { clearInterval(cdTimer); restart(); };

/* ---- pantalla de título y (re)inicio del juego ---- */
const title = $('#title');
function startGame(): void {
  Audio.autoStart();
  title.classList.add('gone'); body.classList.remove('title', 'lock'); S.playing = true; S.start = Date.now();
  scrollTo({ top: 0, behavior: 'instant' }); showBanner(0); S.banners = [true];
  setTimeout(() => scrollTo({ top: innerHeight * 0.45, behavior: rm ? 'auto' : 'smooth' }), 1500);   // Pipo empieza a caer solo
  setTimeout(() => {
    if (S.haunted) { say('PIPO', 'Volviste. Sabía que ibas a volver.'); say('PIPO', 'Esta vez bajamos hasta el fondo. Juntos.'); }
    else { say('PIPO', '¡Hola! Soy Pipo. ¡Vamos a bajar juntos!'); say('PIPO', '¡Guíame hacia las estrellas!'); }
  }, 900);
}
$('#tPlay').addEventListener('click', startGame);
function restart(): void {
  S.haunted = true; body.classList.remove('over'); body.classList.add('haunted', 'title', 'lock'); S.playing = false; S.scared = false;
  $('#tSub').textContent = 'Bienvenido de nuevo. Guardamos tu lugar.';
  $('#tPlay').textContent = '▶ JUGAR OTRA VEZ'; title.classList.remove('gone');
  go.classList.remove('show'); lines.forEach((l) => l.classList.remove('show')); cont.classList.remove('show'); $('#yes2').textContent = 'NO';
  S.hearts = 3; drawHearts(); $('#pH').textContent = '3'; score = 0; scoreEl.textContent = '0';
  Dialogue.resetTriggers(); S.banners = []; S.lostAt = [];
  scrollTo({ top: 0, behavior: 'instant' }); placeStars(); document.title = 'Mundo Pipo';
}

/* ---- botón de sonido + auto start ---- */
const snd = $('#snd'), sndLabel = $('#sndLabel');
addEventListener('scroll', () => { if (S.playing) Audio.autoStart(); }, { passive: true });
(['pointerdown', 'keydown', 'touchend'] as const).forEach((ev) => addEventListener(ev, (e) => { if (S.playing && !(e.target as Element | null)?.closest?.('#snd')) Audio.autoStart(); }, { passive: true }));
function sndSync(): void {
  const on = Audio.isOn(), live = Audio.running(); snd.classList.toggle('on', on && live); snd.setAttribute('aria-pressed', String(on && live));
  const L = !on ? 'Sin sonido' : !live ? 'Toca para oír' : 'Sonido'; if (sndLabel.textContent !== L) sndLabel.textContent = L;
}
snd.addEventListener('click', async () => { await Audio.toggle(); sndSync(); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (S.qs > 0.25) document.title = S.qs > 0.6 ? 'sigue aquí' : 'regresa'; }
  else if (S.qs > 0.3 && S.playing && !Dialogue.isBusy()) say('???', 'Qué bueno que regresaste. No nos movimos.');
});

/* ---- LOOP PRINCIPAL ---- */
const world = $('#world');
let last = performance.now(), acc = 0, accA = 0, accP = 0, titleStage = -1;
function frame(now: number): void {
  const dt = Math.min(64, now - last); last = now;
  const sy = scrollY, max = Math.max(1, root.scrollHeight - innerHeight);
  S.p = clamp(sy / max); S.q = mapQ(S.p);
  S.qs += (S.q - S.qs) * (1 - Math.exp(-dt / 160));
  const q = S.qs, s2 = S.s2 = sstep(0.16, 0.38, q), s3 = S.s3 = sstep(0.34, 0.64, q), s4 = S.s4 = sstep(0.62, 0.9, q);

  // velocidad de scroll → Pipo cae más rápido / se inclina
  const dy = sy - S.lastY; S.vel = lerp(S.vel, dy / Math.max(dt, 1) * 16, 0.2);
  if (Math.abs(dy) > 1) {
    if (dy < -60 && s3 > 0.35 && S.playing && !Dialogue.isBusy()) say('???', s4 > 0.5 ? 'No puedes volver arriba. Está detrás de ti.' : 'No. Sigue bajando.');
    S.lastY = sy; S.lastScrollT = now;
  } else if (now - S.lastScrollT > 6500 && S.playing && !Dialogue.isBusy()) {
    say(s3 > 0.3 ? '???' : 'PIPO', s4 > 0.4 ? 'Se acerca cuando te detienes.' : s3 > 0.3 ? '¿Por qué te detuviste?' : s2 > 0.3 ? '¿Por qué te detienes? Abajo nos esperan.' : '¿Seguimos? ¡Abajo hay más estrellas!'); S.lastScrollT = now;
  }

  // dirección: Pipo sigue al puntero (o las flechas)
  if (keyDir) S.mx = clamp(S.mx + keyDir * dt * 0.7, 0, innerWidth);
  S.cx += (S.mx - S.cx) * (1 - Math.exp(-dt / (60 + s3 * 90))); S.cy += (S.my - S.cy) * (1 - Math.exp(-dt / (60 + s3 * 90)));
  const target = clamp(S.mx, innerWidth * 0.1, innerWidth * 0.9);
  S.px += (target - S.px) * (1 - Math.exp(-dt / (220 + s3 * 260)));   // se vuelve más pesado al decaer
  const tilt = clamp((target - S.px) * 0.05, -18, 18) + (rm ? 0 : clamp(S.vel * 0.4, -8, 8));
  const spriteOp = S.haunted ? 1 : 1 - sstep(0.35, 0.6, s4);
  sprite.style.transform = `translate3d(${(S.px).toFixed(1)}px,0,0) translate(-50%,-50%) rotate(${tilt.toFixed(1)}deg)`;
  sprite.style.opacity = spriteOp.toFixed(2);
  sprite.classList.toggle('fall', Math.abs(S.vel) > 3 && !rm);
  // Pipo mira al cursor
  [...spriteEyes, ...titleEyes].forEach((g) => {
    const r = g.getBoundingClientRect(); if (!r.width) return;
    const ex = clamp((S.cx - (r.left + r.width / 2)) / 300, -1, 1), ey = clamp((S.cy - (r.top + r.height / 2)) / 300, -1, 1); g.setAttribute('transform', `translate(${(ex * 11).toFixed(1)} ${(ey * 13).toFixed(1)})`);
  });

  if (fine) {
    const j = rm ? 0 : s3 * s3 * 2.2; cur.style.transform = `translate3d(${S.cx + rnd(-j, j)}px,${S.cy + rnd(-j, j)}px,0)`;
    if (s3 > 0.2) {
      const a = Math.atan2(vy, vx), m = Math.min(14, Math.hypot(vx, vy) * 0.8); curIris.setAttribute('transform', `translate(${(Math.cos(a) * m).toFixed(1)} ${(Math.sin(a) * m * 0.6).toFixed(1)})`); vx *= 0.85; vy *= 0.85;
      if (!rm && Math.random() < 0.02 * s3) ceye.style.transform = `skew(${rnd(-25, 25) | 0}deg,${rnd(-10, 10) | 0}deg) scale(${rnd(0.8, 1.5).toFixed(2)},${rnd(0.7, 1.2).toFixed(2)})`; else if (Math.random() < 0.05) ceye.style.transform = '';
    }
  }

  // parpadeo
  if (!rm) { if (S.fl <= 0) { if (Math.random() < 0.002 * s2 + 0.008 * s3 + 0.05 * s4) { S.fl = rnd(40, 140); S.flA = rnd(0.08, 0.25) + s4 * rnd(0.3, 0.7); } } else S.fl -= dt; }
  const flick = S.fl > 0 ? S.flA : 0;

  // la guarida
  const lr = lair.getBoundingClientRect(), t = S.lairT = clamp(-lr.top / (lr.height - innerHeight)), inLair = lr.top < innerHeight && lr.bottom > 0, e = sstep(0.05, 0.8, t);
  body.classList.toggle('inlair', inLair);
  if (inLair) {
    cAll.setAttribute('opacity', (0.02 + e * 0.98).toFixed(3)); glints.forEach((g) => g.setAttribute('opacity', String(sstep(0, 0.25, t) * (1 - e))));
    creature.style.transform = `translateY(${((1 - e) * 14).toFixed(2)}%) scale(${(0.82 + 0.18 * e).toFixed(3)})`;
    const r = creature.getBoundingClientRect(), sc = Math.min(r.width / 600, r.height / 1100), ox = r.left + (r.width - 600 * sc) / 2, oy = r.top + (r.height - 1100 * sc);
    const ex = ox + 300 * sc, ey = oy + 182 * sc, dx = clamp((S.cx - ex) / (innerWidth * 0.5), -1, 1) * 9, dyy = clamp((S.cy - ey) / (innerHeight * 0.5), -1, 1) * 9;
    [...pupils, ...glints].forEach((p) => p.setAttribute('transform', `translate(${dx.toFixed(2)} ${dyy.toFixed(2)})`));
    if (!rm && e > 0.5 && now > nextTilt) { tilted = !tilted; headT.setAttribute('transform', tilted ? `rotate(${rnd(-11, 11).toFixed(1)} 300 300)` : ''); nextTilt = now + (tilted ? rnd(900, 1600) : rnd(4000, 8000)); }
    if (t >= 0.9 && !S.scared) scare();
  }

  // overlays
  const beat = S.beat ? Math.max(0, 1 - (now - S.beat) / 350) : 0;
  const night = inLair ? s4 * 0.92 * (1 - e * 0.55) : s4 * 0.9;
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set('--q', q.toFixed(4)); set('--s2', s2.toFixed(4)); set('--s3', s3.toFixed(4)); set('--s4', s4.toFixed(4));
  set('--eyeK', (S.haunted ? 1 : sstep(0.2, 0.6, s3)).toFixed(3)); set('--teethK', (S.haunted ? 1 : sstep(0.45, 0.9, s3)).toFixed(3));
  set('--night', night.toFixed(3));
  set('--lx', (fine ? S.cx : S.px).toFixed(0) + 'px'); set('--ly', (fine ? S.cy : innerHeight * 0.4).toFixed(0) + 'px');
  set('--lr', (Math.max(innerWidth, innerHeight) * (0.34 + e * 0.3) + (rm ? 0 : rnd(-6, 6))).toFixed(0) + 'px');
  set('--red', (s4 * 0.28 + beat * 0.18 * s4).toFixed(3)); set('--static', (s4 * 0.35 + (flick ? 0.3 * s4 : 0)).toFixed(3));
  set('--grain', (0.04 * s2 + 0.16 * s3 + 0.18 * s4).toFixed(3)); set('--vig', (s3 * 0.75 + s4 * 0.25).toFixed(3)); set('--flick', flick.toFixed(3));
  palette(q);
  if (!rm && s3 > 0.05) $('#grain').style.backgroundPosition = `${rnd(0, 160) | 0}px ${rnd(0, 160) | 0}px`;
  if (!rm && s4 > 0.15) { const a = s4 * 1.6 + (flick ? 4 * s4 : 0) + beat * 2; world.style.transform = `translate(${rnd(-a, a).toFixed(1)}px,${rnd(-a, a).toFixed(1)}px)`; } else if (world.style.transform) world.style.transform = '';

  // los NPC observan a Pipo; Tito gira la cabeza
  if (s2 > 0.02 && s4 < 0.5) {
    npcEyes.forEach((g) => {
      const r = g.ownerSVGElement!.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      const dx = clamp((S.px - (r.left + r.width / 2)) / r.width, -1, 1), dy = clamp((innerHeight * 0.3 - (r.top + r.height / 2)) / r.height, -1, 1);
      g.style.transform = `translate(${(dx * 6).toFixed(1)}px,${(dy * 4).toFixed(1)}px)`;
    });
    const tr = tito.ownerSVGElement!.getBoundingClientRect(), tdx = clamp((S.px - (tr.left + tr.width / 2)) / innerWidth, -1, 1);
    tito.style.transform = `rotate(${(tdx * 16).toFixed(1)}deg)`; titoEyes.style.opacity = sstep(0.6, 1, s2).toFixed(2);
  }
  if (s3 > 0.1) { const r = bpp[0].ownerSVGElement!.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) { const dx = clamp((S.cx - (r.left + r.width / 2)) / 400, -1, 1) * 14, dy = clamp((S.cy - (r.top + r.height * 0.45)) / 400, -1, 1) * 14; bpp.forEach((p) => p.setAttribute('transform', `translate(${dx.toFixed(1)} ${dy.toFixed(1)})`)); } }

  // sustos que viven en los márgenes
  if (S.playing) {
    if (s3 > 0.45 && !inLair && now > nextPeek && !peek.classList.contains('on')) { peek.classList.toggle('r', Math.random() < 0.5); peek.style.top = rnd(15, 55).toFixed(0) + 'vh'; peek.classList.remove('snap'); peek.classList.add('on'); peekUntil = now + rnd(2500, 4500); nextPeek = now + rnd(6000, 11000) * (1 - s4 * 0.4); }
    if (s3 > 0.25 && s4 < 0.5 && !rm && now > nextEye) { bigeye.classList.add('on'); setTimeout(() => bigeye.classList.remove('on'), 2600); nextEye = now + rnd(11000, 17000); }
    if (s3 > 0.35 && !S.scared && now > nextFlash) { doFlash(); nextFlash = now + rnd(4000, 8000) * (1 - s4 * 0.5); }
    // banners de nivel + perder corazones
    for (let i = 1; i < 4; i++) if (q > LV_Q[i] && !S.banners[i]) { S.banners[i] = true; showBanner(i); }
    HEART_LOSS.forEach((h, i) => { if (q > h[0] && !S.lostAt[i]) { S.lostAt[i] = true; loseHeart(i); } });
  }
  if (peek.classList.contains('on')) {
    const pr = peek.getBoundingClientRect(), d = Math.hypot(S.cx - (pr.left + pr.width / 2), S.cy - (pr.top + pr.height / 2));
    if (d < 280 || now > peekUntil || inLair) { peek.classList.add('snap'); peek.classList.remove('on'); if (d < 280 && !Dialogue.isBusy() && Math.random() < 0.6) say('???', 'Lo viste. Ahora él también te vio.'); }
  }
  if (bigeye.classList.contains('on')) { const dx = clamp((S.cx / innerWidth - 0.5) * 2, -1, 1), dy = clamp((S.cy / innerHeight - 0.5) * 2, -1, 1); bigIris.setAttribute('transform', `translate(${(dx * 80).toFixed(0)} ${(dy * 36).toFixed(0)})`); }

  // HUD
  const li = q < LV_Q[1] ? 0 : q < LV_Q[2] ? 1 : q < LV_Q[3] ? 2 : 3;
  const L = inLair ? 'NIVEL ∞' : `${LEVELS[li][0]} · ${LEVELS[li][1].toUpperCase()}`; if (lvName.textContent !== L) lvName.textContent = L;
  const m = Math.round(S.p * 2400); depthEl.textContent = inLair ? '∞ m' : s4 > 0.5 && Math.random() < 0.3 ? `${(Math.random() * 99999 | 0)} m` : `${m} m`;
  if (S.playing) starTick();

  acc += dt; if (acc > 110) { acc = 0; corruptTick(); }
  accA += dt; if (accA > 120) { accA = 0; Audio.update(s2, s3, s4, inLair ? S.lairT : 0); }
  accP += dt; if (accP > 100) { accP = 0; panelTick(); sndSync(); }

  const st = s4 > 0.3 ? 3 : s3 > 0.3 ? 2 : s2 > 0.4 ? 1 : 0;
  if (st !== titleStage && !document.hidden && !S.scared) { titleStage = st; document.title = ['Mundo Pipo', 'Mundo Pipo · nivel 2', 'Mundo Pipo · te vemos', 'Mundo Pipo · no'][st]; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
