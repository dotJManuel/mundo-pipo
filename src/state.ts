// Estado global del juego. Un solo objeto mutable que el loop y los sistemas comparten.

export interface GameState {
  p: number;        // progreso de scroll 0..1
  q: number;        // progreso de historia mapeado 0..1
  qs: number;       // q suavizado
  s2: number;       // "algo no está bien"
  s3: number;       // "inquietante"
  s4: number;       // "terror"
  mx: number; my: number;   // puntero
  cx: number; cy: number;   // cursor suavizado
  px: number;               // posición X de Pipo
  lastY: number;
  lastScrollT: number;
  start: number;
  scared: boolean;
  name: string;
  fl: number;       // ticks restantes de parpadeo
  flA: number;      // amplitud de parpadeo
  anchors: number[];
  lairT: number;
  others: number;
  haunted: boolean;
  playing: boolean;
  vel: number;
  beat: number;
  hearts: number;
  lostAt: boolean[];
  banners: boolean[];
}

export const S: GameState = {
  p: 0, q: 0, qs: 0, s2: 0, s3: 0, s4: 0,
  mx: innerWidth / 2, my: innerHeight * 0.45,
  cx: innerWidth / 2, cy: innerHeight * 0.45, px: innerWidth / 2,
  lastY: 0, lastScrollT: performance.now(), start: Date.now(),
  scared: false, name: '', fl: 0, flA: 0,
  anchors: [0.15, 0.4, 0.7], lairT: 0,
  others: 1, haunted: false, playing: false,
  vel: 0, beat: 0, hearts: 3, lostAt: [], banners: [],
};
