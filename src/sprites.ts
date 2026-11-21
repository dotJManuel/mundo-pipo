// SVG dibujados por código: Pipo, estrellas, corazones y los dientes/costillas de la criatura.
import { $ } from './util';

// Pipo (se usa en la pantalla de título y como sprite que cae).
export function pipoSVG(): string {
  let teeth = '';
  for (let x = 172; x <= 228; x += 7) {
    const u = (x - 200) / 32, yt = 240 + 9 * (1 - u * u), yb = 240 + 22 * (1 - u * u), h = (yb - yt) * 0.62;
    teeth += `<path d="M${x - 3} ${yt.toFixed(1)}h6l-3 ${h.toFixed(1)}z" fill="#efe6cf"/><path d="M${x} ${yb.toFixed(1)}h6l-3 ${(-h * 0.8).toFixed(1)}z" fill="#dcd2b8"/>`;
  }
  return `<svg viewBox="0 0 400 420"><defs><radialGradient id="pipoB" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#fff0a8"/><stop offset=".6" stop-color="#ffcf3f"/><stop offset="1" stop-color="#f5a623"/></radialGradient></defs>
  <g class="body">
   <g class="ear"><ellipse cx="118" cy="92" rx="34" ry="64" fill="#ffcf3f" transform="rotate(-18 118 92)"/><ellipse cx="118" cy="98" rx="17" ry="40" fill="#ff9fc0" transform="rotate(-18 118 98)"/></g>
   <g class="ear"><ellipse cx="282" cy="92" rx="34" ry="64" fill="#ffcf3f" transform="rotate(18 282 92)"/><ellipse cx="282" cy="98" rx="17" ry="40" fill="#ff9fc0" transform="rotate(18 282 98)"/></g>
   <circle cx="200" cy="225" r="155" fill="url(#pipoB)"/><ellipse cx="200" cy="305" rx="92" ry="62" fill="#fff3c4"/>
   <ellipse cx="150" cy="185" rx="36" ry="42" fill="#fff"/><ellipse cx="250" cy="185" rx="36" ry="42" fill="#fff"/>
   <g class="pipoEye"><circle cx="150" cy="190" r="17" fill="#2a2350"/><circle class="phl" cx="156" cy="183" r="5.5" fill="#fff"/></g>
   <g class="pipoEye"><circle cx="250" cy="190" r="17" fill="#2a2350"/><circle class="phl" cx="256" cy="183" r="5.5" fill="#fff"/></g>
   <ellipse class="peb" cx="150" cy="185" rx="38" ry="44" fill="#050303"/><ellipse class="peb" cx="250" cy="185" rx="38" ry="44" fill="#050303"/>
   <g class="pipoEye"><circle class="ppk" cx="150" cy="190" r="3.5" fill="#f2ecdc"/></g><g class="pipoEye"><circle class="ppk" cx="250" cy="190" r="3.5" fill="#f2ecdc"/></g>
   <ellipse class="chk" cx="104" cy="242" rx="22" ry="13" fill="#ff8fb3" opacity=".75"/><ellipse class="chk" cx="296" cy="242" rx="22" ry="13" fill="#ff8fb3" opacity=".75"/>
   <g class="pmouth"><path d="M168 240 Q200 284 232 240 Q200 258 168 240Z" fill="#8a2a4a"/><path d="M185 252 Q200 262 215 252 Q200 270 185 252Z" fill="#ff7aa0"/><g class="pteeth">${teeth}</g></g>
   <ellipse cx="80" cy="300" rx="26" ry="20" fill="#ffcf3f" transform="rotate(30 80 300)"/><ellipse cx="320" cy="300" rx="26" ry="20" fill="#ffcf3f" transform="rotate(-30 320 300)"/>
  </g></svg>`;
}

export const HEART =
  '<svg viewBox="0 0 24 22"><path d="M12 21C5 15 1 11.5 1 7a5.5 5.5 0 0 1 11-1 5.5 5.5 0 0 1 11 1c0 4.5-4 8-11 14z"/></svg>';

export const STAR_SVG =
  '<svg class="st" viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="#ffc93c" stroke="#e59a00" stroke-width="1"/></svg>' +
  '<svg class="eye" viewBox="-12 -12 24 24"><path d="M-11 0Q0 -9 11 0Q0 9 -11 0Z" fill="#e6dcc8" stroke="#3a0505"/><circle r="4" fill="#6b1d12"/><circle r="2" fill="#000"/></svg>';

// Inyecta el SVG de Pipo en el título y en el sprite.
export function injectPipo(): void {
  $('#tPipo').innerHTML = pipoSVG();
  $('#spriteArt').innerHTML = pipoSVG();
}

// Dientes del "Pipo malo" del nivel 3.
export function injectBadpipoTeeth(): void {
  let h = '';
  for (let x = 126; x <= 274; x += 9) {
    const u = (x - 200) / 80, yt = 245 + 23.5 * (1 - u * u), yb = 245 + 45 * (1 - u * u), hh = (yb - yt) * 0.55;
    h += `<path d="M${x - 4} ${yt.toFixed(1)} L${x + 4} ${yt.toFixed(1)} L${x} ${(yt + hh).toFixed(1)}Z" fill="#cfc3a2"/><path d="M${x} ${yb.toFixed(1)} L${x + 8} ${yb.toFixed(1)} L${x + 4} ${(yb - hh * 0.8).toFixed(1)}Z" fill="#b9ad8c"/>`;
  }
  $('#bpTeeth').innerHTML = h;
}

// Dientes y costillas de la criatura del nivel 4.
export function injectCreature(): void {
  let html = '';
  for (let x = 234; x <= 366; x += 6.2) {
    const u = (x - 300) / 74, yt = 272 - 40 * u * u, yb = 294 - 62 * u * u, h = Math.max(3, (yb - yt) * 0.44);
    html += `<path d="M${x - 2.6} ${yt} h5.2 l-.6 ${h.toFixed(1)} q-2 2.2 -4 0z" fill="#ddd3bd"/><path d="M${x + 0.5} ${yb} h5 l-.6 ${(-h * 0.9).toFixed(1)} q-1.9 -2 -3.8 0z" fill="#cfc4ac"/>`;
  }
  $('#teeth').innerHTML = html;
  let r = '';
  for (let i = 0; i < 6; i++) {
    const y = 452 + i * 28, w = 62 - i * 3;
    r += `<path d="M${300 - w} ${y} Q300 ${y + 16} ${300 + w} ${y}"/>`;
  }
  $('#ribs').innerHTML = r;
}
