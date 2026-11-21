# Mundo Pipo

Juego de scroll narrativo tipo *creepypasta*: empieza como un juego infantil alegre
(Pipo, el personaje, cae por el mundo y lo guías hacia las estrellas) y se va
corrompiendo con la profundidad hasta volverse terror, con un *jump scare* final.

## Stack

Migrado a **Vite + TypeScript**, manteniéndolo **vanilla** (sin framework de UI).
La arquitectura original se conserva intacta: un solo loop `requestAnimationFrame`
lee `scrollY`, calcula el nivel de "corrupción" (`--q`, `--s2`, `--s3`, `--s4`) y
**escribe variables CSS**; todo lo visual reacciona a esas variables. El audio es
100% sintetizado en vivo con la Web Audio API (sin archivos). Cero dependencias en
runtime.

## Cómo correrlo

```powershell
npm install
npm run dev
```

Scripts:

- `npm run dev` — servidor de desarrollo con hot reload (Vite).
- `npm run build` — build de producción a `dist/` (estático; deploy en cualquier host).
- `npm run preview` — sirve el build de producción.
- `npm run typecheck` — revisa tipos con `tsc` sin emitir.

## Estructura

```
index.html        Markup + SVGs; carga /src/main.ts como módulo.
src/
  styles.css      Todo el CSS (paletas, overlays, niveles, animaciones).
  util.ts         Helpers ($, clamp, lerp, sstep, rnd) y flags de entorno (rm, fine).
  state.ts        El objeto de estado global S (tipado con GameState).
  palette.ts      Interpolación de paleta a lo largo de la historia.
  sprites.ts      SVGs por código: Pipo, estrellas, corazones, la criatura.
  audio.ts        Motor de audio Web Audio (música, drones, susurros, scare).
  dialogue.ts     Caja de diálogo RPG con máquina de escribir y disparadores.
  main.ts         Motor: measure/mapQ, HUD, estrellas, niveles, guarida y loop rAF.
```

## Notas de diseño

- No migrar a React/Next: el *virtual DOM* pelearía con el loop que escribe variables
  CSS a 60 fps. Si algún día se convierte en un juego "de verdad" con físicas y más
  mecánicas, considerar PixiJS o Phaser (implica reescribir el sistema visual CSS).
- Respeta `prefers-reduced-motion` y usa `aria-label` para accesibilidad.
- El audio arranca muteado y se enciende con el primer gesto del usuario (requisito
  de los navegadores).
