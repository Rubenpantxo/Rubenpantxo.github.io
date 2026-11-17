// Saca a archivos WAV los sonidos que sintetiza el modo fiestas (src/fiestas/sonido.js), para
// escucharlos sin entrar al juego.
// Hace falta el servidor de desarrollo (npm run dev) y Playwright.
// Uso: node tools/escucha_sonidos.mjs <carpeta de salida>
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
await p.goto('http://localhost:5173/');
const sonidos = await p.evaluate(async () => {
  const { creaSonido } = await import('/src/fiestas/sonido.js');
  const s = creaSonido();
  await s.listo;
  const salida = {};
  for (const [nombre, v] of Object.entries(s.buffers)) {
    for (const [i, buffer] of (Array.isArray(v) ? v : [v]).entries()) {
      const canal = buffer.getChannelData(0);
      salida[Array.isArray(v) ? `${nombre}_${i + 1}` : nombre] = { tasa: buffer.sampleRate, datos: Array.from(canal) };
    }
  }
  s.libera();
  return salida;
});
// WAV de 16 bits, mono
for (const [nombre, { tasa, datos }] of Object.entries(sonidos)) {
  const n = datos.length;
  const wav = Buffer.alloc(44 + n * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(tasa, 24);
  wav.writeUInt32LE(tasa * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 2, 40);
  let pico = 0; let suma = 0;
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, datos[i]));
    wav.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
    pico = Math.max(pico, Math.abs(v)); suma += v * v;
  }
  writeFileSync(`${S}/${nombre}.wav`, wav);
  console.log(`${nombre.padEnd(12)} ${(n / tasa).toFixed(2)} s  pico ${pico.toFixed(2)}  eficaz ${Math.sqrt(suma / n).toFixed(3)}`);
}
await b.close();
