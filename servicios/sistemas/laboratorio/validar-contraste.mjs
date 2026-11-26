#!/usr/bin/env node
// Valida el contraste (WCAG 2.x, nivel AA = 4,5:1) de cada kit del laboratorio,
// en modo claro y oscuro, leyendo directamente su kit.css.
//
//   node servicios/sistemas/laboratorio/validar-contraste.mjs
//
// Sale con código 1 si algún par no llega a AA, para poder usarlo en CI.
// Los colores translúcidos (Glass) se componen sobre --color-fondo-solido,
// igual que hace la ficha en vivo de la página.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const indice = JSON.parse(fs.readFileSync(path.join(DIR, 'kits/index.json'), 'utf8'));
const base = fs.readFileSync(path.join(DIR, 'tokens-base.css'), 'utf8');

const MINIMO = 4.5;
const PARES = [
  ['Texto sobre fondo', '--color-texto', '--color-fondo-solido', 'fondo'],
  ['Texto sobre tarjeta', '--color-texto', '--color-superficie', 'superficie'],
  ['Texto secundario sobre tarjeta', '--color-texto-suave', '--color-superficie', 'superficie'],
  ['Botón principal', '--color-sobre-accion', '--color-accion', 'superficie'],
  ['Etiqueta', '--color-sobre-acento', '--color-acento', 'superficie'],
];

function declaraciones(css, selector) {
  const out = {};
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(sinComentarios))) {
    if (m[1].trim() !== selector) continue;
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      const k = d.slice(0, i).trim();
      if (k.startsWith('--')) out[k] = d.slice(i + 1).trim();
    }
  }
  return out;
}

function resolver(vars, valor, prof = 0) {
  if (prof > 20) return valor;
  return valor.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/g, (_, n, defecto) =>
    vars[n] !== undefined ? resolver(vars, vars[n], prof + 1) : (defecto || ''));
}

function color(texto) {
  const t = texto.trim().toLowerCase();
  let m = t.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (m) {
    const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
    return { rgb: [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)), a: 1 };
  }
  m = t.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/);
  if (m) return { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : (m[5] ? +m[4] / 100 : +m[4]) };
  return null; // color-mix u otros: no se valida aquí
}
const sobre = (c, b) => c.rgb.map((v, i) => v * c.a + b[i] * (1 - c.a));
function lum(rgb) {
  const c = rgb.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

const defectos = declaraciones(base, ':where([data-kit])');
let fallos = 0;
let revisados = 0;

for (const kit of indice.kits) {
  const archivo = path.join(DIR, 'kits', kit.css);
  if (!fs.existsSync(archivo)) { console.error(`✗ ${kit.id}: no existe ${kit.css}`); fallos++; continue; }
  const css = fs.readFileSync(archivo, 'utf8');
  const claro = declaraciones(css, `[data-kit="${kit.id}"]`);
  const oscuro = declaraciones(css, `[data-kit="${kit.id}"][data-modo="oscuro"]`);
  const modos = { claro: { ...defectos, ...claro } };
  if (Object.keys(oscuro).length) modos.oscuro = { ...defectos, ...claro, ...oscuro };
  else console.warn(`! ${kit.id}: no declara modo oscuro`);

  for (const [modo, vars] of Object.entries(modos)) {
    const leer = n => color(resolver(vars, `var(${n})`));
    const fondo = leer('--color-fondo-solido');
    if (!fondo || fondo.a < 1) { console.error(`✗ ${kit.id} (${modo}): --color-fondo-solido debe ser un color opaco`); fallos++; continue; }
    const supC = leer('--color-superficie');
    const sup = supC ? sobre(supC, fondo.rgb) : fondo.rgb;
    const bases = { fondo: fondo.rgb, superficie: sup };
    for (const [nombre, primero, segundo, sobreQue] of PARES) {
      const a = leer(primero), b = leer(segundo);
      if (!a || !b) { console.warn(`! ${kit.id} (${modo}) ${nombre}: valor no literal, se omite`); continue; }
      const fondoPar = sobre(b, bases[sobreQue]);
      const r = ratio(sobre(a, fondoPar), fondoPar);
      revisados++;
      const ok = r >= MINIMO;
      if (!ok) fallos++;
      console.log(`${ok ? '✓' : '✗'} ${kit.id.padEnd(9)} ${modo.padEnd(7)} ${nombre.padEnd(31)} ${r.toFixed(2)}:1`);
    }
  }
}

console.log(`\n${revisados} pares revisados, ${fallos} por debajo de ${MINIMO}:1.`);
process.exit(fallos ? 1 : 0);
