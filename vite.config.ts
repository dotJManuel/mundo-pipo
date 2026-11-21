import { defineConfig } from 'vite';

// Juego 100% cliente, salida estática. base relativa para poder servirlo
// desde cualquier subcarpeta (GitHub Pages, itch.io, etc.).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
