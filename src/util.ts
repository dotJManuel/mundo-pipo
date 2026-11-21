// Helpers compartidos y flags de entorno.

export const root = document.documentElement;
export const body = document.body;

// querySelector tipado: el juego asume que los elementos existen (markup estático).
export const $ = <T extends Element = HTMLElement>(s: string): T =>
  document.querySelector(s) as unknown as T;
export const $$ = <T extends Element = HTMLElement>(s: string): T[] =>
  [...document.querySelectorAll(s)] as unknown as T[];

export const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const sstep = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

// `rm` (reduced-motion) es un export mutable: ES Modules usa live bindings, así que
// los módulos que lo importan ven el valor actualizado cuando cambia la media query.
const RMQ = matchMedia('(prefers-reduced-motion: reduce)');
export let rm = RMQ.matches;
RMQ.addEventListener?.('change', (e) => { rm = e.matches; });

export const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
