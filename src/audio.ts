// AUDIO — Web Audio, empieza muteado (cualquier botón "¡Jugar!" lo enciende).
// Todo pasa por una "sala" con reverb generada.
//  Nivel 1: caja de música alegre (melodía original).
//  Nivel 2: la caja se ralentiza, se desafina, pasa a menor; zumbido fluorescente.
//  Nivel 3: la caja salta notas y se apaga; drone disonante, susurros, golpes metálicos.
//  Nivel 4: retumbe sub, cuerdas en trémolo subiendo, latido, respiración detrás,
//           estática, chirridos. En la guarida un riser construye hacia el scare,
//           luego silencio total.
import { rnd, sstep } from './util';
import { S } from './state';

export const Audio = (() => {
  let ctx!: AudioContext;
  let master!: GainNode, comp!: DynamicsCompressorNode, rev!: ConvolverNode, noiseBuf!: AudioBuffer;
  let on = false;
  let musicBus!: GainNode, musicF!: BiquadFilterNode, musicSend!: GainNode, humG!: GainNode;
  let droneG!: GainNode, droneF!: BiquadFilterNode, strG!: GainNode;
  const strOsc: OscillatorNode[] = [];
  let subG!: GainNode, statG!: GainNode, riseG!: GainNode;
  const riseOsc: [OscillatorNode, number][] = [];
  let riseNG!: GainNode, riseNF!: BiquadFilterNode;
  let nextNote = 0, step = 0, nextWhis = 0, nextBeat = 0, nextMetal = 0, nextBreath = 0, nextScreech = 0, silentUntil = 0;

  // Melodía original tipo canción de cuna (notas MIDI, rejilla de corcheas; null = silencio)
  const MEL = [72, 76, 79, 84, 83, 79, 76, 79, 77, 81, 84, 81, 79, 76, 74, 71, 72, 76, 79, 84, 86, 84, 79, 76, 77, 74, 71, 74, 72, null, 72, null];
  const BAS = [48, null, 55, null, 53, null, 55, null, 53, null, 57, null, 55, null, 50, null, 48, null, 55, null, 57, null, 52, null, 53, null, 55, null, 48, null, null, null];
  const m2f = (m: number) => 440 * 2 ** ((m - 69) / 12);
  const minor = (m: number) => { const pc = ((m % 12) + 12) % 12; return pc === 4 || pc === 9 || pc === 11 ? m - 1 : m; };
  const noiseSrc = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.loopStart = Math.random(); return s; };
  function sendBus(wet: number): [GainNode, GainNode] {
    const g = ctx.createGain(), s = ctx.createGain();
    s.gain.value = wet; g.connect(comp); g.connect(s); s.connect(rev); return [g, s];
  }
  function env(g: GainNode, t: number, peak: number, a: number, d: number) {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function init() {
    ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = 0; comp.connect(master).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    // reverb: respuesta de impulso sintética, un cuarto grande y vacío
    rev = ctx.createConvolver();
    {
      const len = ctx.sampleRate * 4, b = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
      rev.buffer = b;
    }
    const rg = ctx.createGain(); rg.gain.value = 0.9; rev.connect(rg).connect(comp);

    // bus de la caja de música
    musicF = ctx.createBiquadFilter(); musicF.type = 'lowpass'; musicF.frequency.value = 7000;
    [musicBus, musicSend] = sendBus(0.2); musicF.connect(musicBus);
    // zumbido fluorescente
    const [hb] = sendBus(0.05); humG = ctx.createGain(); humG.gain.value = 0;
    const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 400;
    hf.connect(humG).connect(hb);
    ([[60, 'sine'], [120, 'sawtooth'], [180, 'square']] as [number, OscillatorType][]).forEach(([f, t], i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = t; o.frequency.value = f; g.gain.value = [1, 0.3, 0.05][i]; o.connect(g).connect(hf); o.start();
    });
    // drone disonante (segundas menores y un tritono)
    const [db] = sendBus(0.5); droneF = ctx.createBiquadFilter(); droneF.type = 'lowpass'; droneF.frequency.value = 260; droneF.Q.value = 5; droneG = ctx.createGain(); droneG.gain.value = 0;
    droneF.connect(droneG).connect(db);
    [55, 58.27, 77.78, 82.4, 116.5].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.05 + i * 0.03; lg.gain.value = 12; l.connect(lg).connect(o.detune); l.start(); o.connect(droneF); o.start();
    });
    { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.08; lg.gain.value = 140; l.connect(lg).connect(droneF.frequency); l.start(); }
    // cuerdas en trémolo, agudas y agrupadas
    const [sb] = sendBus(1.2); const sf = ctx.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 1100; sf.Q.value = 0.7;
    strG = ctx.createGain(); strG.gain.value = 0; const trem = ctx.createGain(); trem.gain.value = 0.6; sf.connect(trem).connect(strG).connect(sb);
    { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 7.5; lg.gain.value = 0.4; l.connect(lg).connect(trem.gain); l.start(); }
    [659.3, 698.5, 739.99, 1396.9, 1480].forEach((f) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(sf); o.start(); strOsc.push(o); });
    // retumbe sub
    subG = ctx.createGain(); subG.gain.value = 0; subG.connect(comp);
    [29, 43.5].forEach((f) => { const o = ctx.createOscillator(); o.frequency.value = f; o.connect(subG); o.start(); });
    { const n = noiseSrc(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 70; const g = ctx.createGain(); g.gain.value = 2; n.connect(lp).connect(g).connect(subG); n.start(); }
    // estática
    statG = ctx.createGain(); statG.gain.value = 0;
    { const n = noiseSrc(), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.5; n.connect(bp).connect(statG).connect(comp); n.start(); }
    // riser para la guarida
    const [rb] = sendBus(0.8); riseG = ctx.createGain(); riseG.gain.value = 0; riseG.connect(rb);
    [110, 116.5, 164.8, 233].forEach((f) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(riseG); o.start(); riseOsc.push([o, f]); });
    riseNF = ctx.createBiquadFilter(); riseNF.type = 'highpass'; riseNF.frequency.value = 400; riseNG = ctx.createGain(); riseNG.gain.value = 0;
    { const n = noiseSrc(); n.connect(riseNF).connect(riseNG).connect(rb); n.start(); }
  }

  /* ---- voces de un disparo ---- */
  function bell(t: number, f: number, vel: number, detune: number) {
    ([[1, 1, 1.8], [2.01, 0.32, 1], [3.98, 0.12, 0.5], [5.43, 0.05, 0.3]] as [number, number, number][]).forEach(([r, a, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * r; o.detune.value = detune;
      env(g, t, vel * a, 0.004, d); o.connect(g).connect(musicF); o.start(t); o.stop(t + d + 0.1);
    });
  }
  function voice(t: number, amp: number) { // sílabas con aire desde la nada, paneadas a tu alrededor
    const n = noiseSrc(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner(), [b] = sendBus(1);
    f1.type = f2.type = 'bandpass'; f1.Q.value = 7; f2.Q.value = 9; f1.frequency.value = rnd(450, 850); f2.frequency.value = rnd(1500, 2700);
    n.connect(f1).connect(g); n.connect(f2).connect(g); g.connect(p).connect(b); p.pan.value = rnd(-1, 1); g.gain.value = 0;
    let tt = t; const syl = 4 + (Math.random() * 5 | 0);
    for (let i = 0; i < syl; i++) {
      const d = rnd(0.07, 0.17); g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(amp * rnd(0.5, 1), tt + d * 0.35); g.gain.linearRampToValueAtTime(0, tt + d);
      f1.frequency.setValueAtTime(rnd(450, 850), tt); f2.frequency.setValueAtTime(rnd(1500, 2700), tt); tt += d + rnd(0.01, 0.08);
    }
    n.start(t); n.stop(tt + 0.1);
  }
  function breath(t: number, amp: number) { // algo respirando justo detrás de tu oído izquierdo
    const n = noiseSrc(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
    lp.type = 'bandpass'; lp.frequency.value = 650; lp.Q.value = 0.8; p.pan.value = -0.7; n.connect(lp).connect(g).connect(p).connect(comp);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 1.6);
    lp.frequency.setValueAtTime(500, t + 1.6); g.gain.linearRampToValueAtTime(amp * 1.2, t + 1.9); g.gain.linearRampToValueAtTime(0, t + 3.4);
    n.start(t); n.stop(t + 3.5);
  }
  function metal(t: number, amp: number) { // un tubo lejano siendo golpeado
    const f = rnd(160, 320), [b] = sendBus(2.5), p = ctx.createStereoPanner(); p.pan.value = rnd(-1, 1); p.connect(b);
    [1, 2.76, 5.4, 8.93].forEach((r, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * r; env(g, t, amp / (i + 1), 0.002, 3.5 - i * 0.6); o.connect(g).connect(p); o.start(t); o.stop(t + 4); });
  }
  function screech(t: number, amp: number) {
    const o = ctx.createOscillator(), g = ctx.createGain(), v = ctx.createOscillator(), vg = ctx.createGain(), [b] = sendBus(1.5);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(rnd(1500, 2000), t); o.frequency.exponentialRampToValueAtTime(rnd(2600, 3400), t + 1.4);
    v.frequency.value = 11; vg.gain.value = 80; v.connect(vg).connect(o.frequency);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2500; bp.Q.value = 3;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.4); g.gain.linearRampToValueAtTime(0, t + 1.5);
    o.connect(bp).connect(g).connect(b); o.start(t); v.start(t); o.stop(t + 1.6); v.stop(t + 1.6);
  }
  function heartbeat(t: number, amp: number) {
    [0, 0.24].forEach((o, i) => {
      const osc = ctx.createOscillator(), g = ctx.createGain(); osc.frequency.setValueAtTime(60 - i * 8, t + o); osc.frequency.exponentialRampToValueAtTime(32, t + o + 0.2);
      env(g, t + o, amp * (i ? 0.7 : 1), 0.012, 0.28); osc.connect(g).connect(comp); osc.start(t + o); osc.stop(t + o + 0.35);
    });
  }
  function burst(t: number, amp: number, dur: number) { const n = noiseSrc(), g = ctx.createGain(); env(g, t, amp, 0.003, dur); n.connect(g).connect(comp); n.start(t); n.stop(t + dur + 0.05); }

  /* ---- llamado ~8×/segundo con los niveles de corrupción ---- */
  function update(s2: number, s3: number, s4: number, lt: number) {
    if (!ctx || !on) return; const t = ctx.currentTime, T = 0.3, sil = t < silentUntil ? 0 : 1;
    // caja de música: se ralentiza, se desafina, va a menor, salta notas y se detiene
    const musicOn = sil * (1 - sstep(0.55, 1, s3)) * (lt > 0 ? 0 : 1);
    musicF.frequency.setTargetAtTime(7000 - 5600 * s3, t, T); musicSend.gain.setTargetAtTime(0.2 + 1.3 * s2 + s3, t, T);
    if (nextNote < t) nextNote = t + 0.05;
    while (musicOn > 0.02 && nextNote < t + 0.35) {
      const i = step % MEL.length; let m = MEL[i], b = BAS[i];
      if (s2 > 0.45) { m = m && minor(m); b = b && minor(b); }
      if (s3 > 0.35 && Math.random() < 0.12) m = m && m - 12;
      const det = (Math.random() - 0.5) * (s2 * 60 + s3 * 180) - s3 * 120, skip = Math.random() < s3 * 0.4;
      if (m && !skip) bell(nextNote, m2f(m), 0.16 * musicOn, det);
      if (b && !skip) bell(nextNote, m2f(b), 0.09 * musicOn, det * 0.5);
      nextNote += 0.19 * (1 + 1.4 * s2 + 2.6 * s3) + (Math.random() - 0.5) * s3 * 0.12; step++;
    }
    humG.gain.setTargetAtTime(sil * 0.035 * s2 * (1 - s4), t, T);
    droneG.gain.setTargetAtTime(sil * (0.11 * s3 + 0.07 * s4), t, T);
    droneF.frequency.setTargetAtTime(200 + 220 * s4, t, T);
    strG.gain.setTargetAtTime(sil * (0.02 * sstep(0.5, 1, s3) + 0.05 * s4), t, T);
    strOsc.forEach((o) => o.detune.setTargetAtTime(s4 * 250 + lt * 500, t, 1.5));         // las cuerdas suben
    subG.gain.setTargetAtTime(sil * (0.25 * s4 + 0.2 * lt), t, T);
    statG.gain.setTargetAtTime(sil * (0.006 * s3 + 0.035 * s4 + (S.fl > 0 ? 0.06 * s4 : 0)), t, 0.04);
    riseOsc.forEach(([o, f]) => o.frequency.setTargetAtTime(f * (1 + 3 * lt * lt), t, 0.2));
    riseG.gain.setTargetAtTime(sil * 0.05 * lt * lt, t, 0.2);
    riseNF.frequency.setTargetAtTime(400 + 7000 * lt, t, 0.2); riseNG.gain.setTargetAtTime(sil * 0.12 * lt * lt, t, 0.2);
    if (!sil) return;
    if (s2 > 0.6 && t > nextWhis) { nextWhis = t + rnd(2.5, 7) * (1.4 - s4); voice(t, 0.25 * Math.max(s3, 0.25) + 0.1 * s4); }
    if (s3 > 0.2 && t > nextMetal) { nextMetal = t + rnd(6, 14); metal(t, 0.05 + 0.06 * s4); }
    if (s4 > 0.25 && t > nextBeat) { nextBeat = t + (1.15 - 0.5 * s4 - 0.25 * lt); heartbeat(t, 0.6 * s4); S.beat = performance.now(); }
    if (s4 > 0.35 && t > nextBreath) { nextBreath = t + rnd(7, 12); breath(t, 0.18 * s4); }
    if (s4 > 0.5 && t > nextScreech) { nextScreech = t + rnd(9, 18); screech(t, 0.04); }
  }
  function tick() { if (ctx && on) burst(ctx.currentTime, 0.3, 0.09); }
  function chime() { // estrella atrapada: feliz → agria → un golpe sordo en la oscuridad
    if (!ctx || !on) return; const t = ctx.currentTime;
    if (S.s4 > 0.4) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.3); env(g, t, 0.5, 0.005, 0.35); o.connect(g).connect(comp); o.start(t); o.stop(t + 0.4); return; }
    const d = S.s2 * -40 - S.s3 * 90; ([[84, 0], [88 - (S.s2 > 0.4 ? 1 : 0), 0.07], [91, 0.14]] as [number, number][]).forEach(([m, o]) => bell(t + o, m2f(m), 0.12, d + (S.s3 > 0.3 ? rnd(-60, 60) : 0)));
  }
  function scare() {
    if (!ctx || !on) return; const t = ctx.currentTime;
    burst(t, 0.9, 1.4);
    [880, 932, 1245, 1318, 1661, 1760, 2349].forEach((f) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f / 6, t + 1.3); env(g, t, 0.11, 0.01, 1.3); o.connect(g).connect(comp); o.start(t); o.stop(t + 1.4);
    });
    screech(t, 0.25);
    const b = ctx.createOscillator(), bg = ctx.createGain(); b.frequency.setValueAtTime(110, t); b.frequency.exponentialRampToValueAtTime(25, t + 1); env(bg, t, 1, 0.005, 1.1); b.connect(bg).connect(comp); b.start(t); b.stop(t + 1.2);
    silentUntil = t + 3.2;   // y luego: nada. El silencio es peor.
  }
  function sting() {
    if (!ctx || !on) return; const t = ctx.currentTime; burst(t, 0.7, 0.5); screech(t, 0.18);
    [622, 659, 698].forEach((f) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = f; env(g, t, 0.08, 0.005, 0.5); o.connect(g).connect(comp); o.start(t); o.stop(t + 0.6); });
  }
  function lastNotes() { // tres notas de la caja de música, muy lentas, muy mal
    if (!ctx || !on) return; const t = ctx.currentTime; [72, 71, 63].forEach((m, i) => bell(t + i * 1.1, m2f(m), 0.12, -60));
  }
  // Los navegadores solo permiten sonido tras un gesto real (clic, toque, tecla). Hacer
  // scroll con la rueda no cuenta, así que armamos el audio en el primer scroll y arranca
  // en el primer gesto que el navegador acepte. Si el visitante apagó el sonido, lo respetamos.
  let userOff = false;
  function autoStart() {
    if (userOff) return;
    try { if (!ctx) init(); } catch (e) { return; }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    if (!on) { on = true; master.gain.setTargetAtTime(0.85, ctx.currentTime, 0.4); }
  }
  function blip(evil: boolean) { // voz del diálogo: un chirrido alegre de onda cuadrada… que pierde su tono
    if (!ctx || !on) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = evil ? 'sawtooth' : 'square'; o.frequency.value = evil ? rnd(70, 130) : rnd(520, 640) * (1 - S.s2 * 0.35 - S.s3 * 0.3);
    env(g, t, evil ? 0.05 : 0.03, 0.003, evil ? 0.09 : 0.05); o.connect(g).connect(comp); o.start(t); o.stop(t + 0.12);
  }
  function hurt() { // perder una vida
    if (!ctx || !on) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.5); env(g, t, 0.12, 0.005, 0.5); o.connect(g).connect(comp); o.start(t); o.stop(t + 0.6);
    burst(t, 0.15, 0.25);
  }
  function jingle(k: number) { // inicio de nivel: brillante → menor → mal → un quejido
    if (!ctx || !on) return; const t = ctx.currentTime;
    [72, 76, 79, 84].forEach((m, i) => { let mm = k >= 1 ? minor(m) : m; if (k >= 2) mm -= 12; bell(t + i * 0.12 * (1 + k * 0.7), m2f(mm), 0.18, k * -40 + (k >= 2 ? rnd(-90, 90) : 0)); });
    if (k >= 3) { burst(t, 0.25, 0.8); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.5); env(g, t, 0.2, 0.1, 1.5); o.connect(g).connect(comp); o.start(t); o.stop(t + 1.7); }
  }
  async function toggle() {
    try { if (!ctx) init(); await ctx.resume(); } catch (e) { return false; }
    on = !on; userOff = !on; master.gain.setTargetAtTime(on ? 0.85 : 0, ctx.currentTime, 0.4); return on;
  }
  return { update, tick, chime, blip, hurt, jingle, scare, sting, lastNotes, toggle, autoStart, isOn: () => on, running: () => !!ctx && ctx.state === 'running' };
})();
