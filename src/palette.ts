// Interpolación de paleta a lo largo de q: cielo alegre → hueso → verde enfermizo → rojo → negro.
import { root, clamp, lerp } from './util';

type PalStop = [number, string[]];

const PAL: PalStop[] = [
  [0,    ['#fff8e6', '#2a2350', '#625c88', '#ff4f8b', '#ffb81f', '#ffffff', '#f1e4c4']],
  [0.16, ['#fff8e6', '#2a2350', '#625c88', '#ff4f8b', '#ffb81f', '#ffffff', '#f1e4c4']],
  [0.36, ['#d9dbd3', '#2b2a2a', '#6c6a66', '#4a4746', '#a59d96', '#eceae4', '#c9c6be']],
  [0.50, ['#1b2118', '#c8d1b8', '#7d8a6c', '#58722c', '#9fb55a', '#242b20', '#34402d']],
  [0.66, ['#0d0908', '#c7b4a2', '#6e5b50', '#7d1513', '#b3221c', '#160e0c', '#2a1a16']],
  [1,    ['#030202', '#b8a597', '#4f3f38', '#8e0f0c', '#c4140e', '#070404', '#150b09']],
];

const KEYS = ['--bg', '--fg', '--mu', '--ac', '--hi', '--cd', '--ln'];
const hex = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));

type PalStopRGB = [number, number[][]];
const PALRGB: PalStopRGB[] = PAL.map(([q, c]) => [q, c.map(hex)]);

export function palette(q: number): void {
  let i = 1;
  while (i < PALRGB.length - 1 && q > PALRGB[i][0]) i++;
  const [a, ca] = PALRGB[i - 1];
  const [b, cb] = PALRGB[i];
  const t = clamp((q - a) / (b - a));
  KEYS.forEach((k, j) => {
    const c = ca[j].map((v, n) => Math.round(lerp(v, cb[j][n], t)));
    root.style.setProperty(k, `rgb(${c})`);
  });
}
