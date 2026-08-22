/**
 * Genera, a partir de sistemas-datos.mjs:
 *   - los tres carruseles de servicios/sistemas-de-diseno.html
 *     (paletas y tipografias, componentes, y el catalogo final)
 *   - el numero de sistemas escrito en la prosa de esa pagina
 *   - una redireccion por cada URL de ficha antigua
 *
 * Los bloques generados van entre marcas <!--@bloque x--> ... <!--/@bloque x-->.
 * Todo lo de fuera es a mano: esto no reescribe la pagina entera.
 *
 *   node servicios/sistemas/generar-sistemas.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sistemas, renombrados } from './sistemas-datos.mjs';
import { capturas } from './paletas-datos.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PORTADA = join(AQUI, '..', 'sistemas-de-diseno.html');
const INDICE = join(AQUI, '..', '..', 'index.html');

const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const NUMEROS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis',
  'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];

/* ---------- sustitucion entre marcas ---------- */
function reemplazar(html, bloque, contenido, { enLinea = false } = {}) {
  const abre = `<!--@bloque ${bloque}-->`;
  const cierra = `<!--/@bloque ${bloque}-->`;
  const i = html.indexOf(abre);
  const j = html.indexOf(cierra);
  if (i === -1 || j === -1) throw new Error(`Falta la marca "${bloque}"`);
  const dentro = enLinea ? contenido : `\n${contenido}\n        `;
  return html.slice(0, i + abre.length) + dentro + html.slice(j);
}

// Los dos numeros que se escriben en prosa, para que no se queden en "seis".
function numerar(html) {
  const palabra = NUMEROS[sistemas.length] || String(sistemas.length);
  return html
    .replace(/<!--@n-->.*?<!--\/@n-->/gs, `<!--@n-->${palabra}<!--/@n-->`)
    .replace(/<!--@N-->.*?<!--\/@N-->/gs,
      `<!--@N-->${palabra[0].toUpperCase()}${palabra.slice(1)}<!--/@N-->`);
}

/* ---------- carrusel A: paleta y tipografia ---------- */
const railA = s => `        <li>
          <a class="sd-mini" href="sistemas/${s.ficha}" style="--m-fondo:${s.tipo.fondo};--m-tinta:${s.tipo.tinta};--m-acento:${s.tipo.acento}" aria-label="${esc(s.nombre)}: paleta y tipografía">
            <span class="sd-mini-nombre">${esc(s.nombre)}</span>
            <span class="sd-mini-colores" aria-hidden="true">${s.acentos.map(c => `<span style="background:${c}"></span>`).join('')}</span>
            <span><span class="sd-mini-display" style="${s.tipo.estilo}">${esc(s.tipo.muestra)}</span><span class="sd-mini-pie">${esc(s.tipo.pie)}</span></span>
          </a>
        </li>`;

/* ---------- carrusel B: componentes ----------
   Las piezas de dentro son muestras, no controles: van aria-hidden y lo
   pulsable es la tarjeta entera. */
function railB(s) {
  const p = s.piezas;
  // El boton de linea hereda --m-acento; solo se escribe color cuando difiere.
  const lineaEstilo = p.linea.color === s.tipo.acento
    ? ''
    : ` style="border-color:${p.linea.color};color:${p.linea.color}"`;
  const radioCheck = p.check.radio ? `;border-radius:${p.check.radio}` : '';
  const radioVacio = p.check.radio ? ` style="border-radius:${p.check.radio}"` : '';
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${d}</svg>`;

  return `        <li>
          <a class="sd-mini" href="sistemas/${s.ficha}" style="--m-fondo:${s.tipo.fondo};--m-tinta:${s.tipo.tinta};--m-acento:${s.tipo.acento};--m-radio:${p.radio}" aria-label="${esc(s.nombre)}: botones, casillas e iconos">
            <span class="sd-mini-nombre">${esc(s.nombre)}</span>
            <span class="sd-m-fila" aria-hidden="true">
              <span class="sd-m-btn" style="background:${p.solido.fondo};color:${p.solido.tinta}">${esc(p.solido.texto)}</span>
              <span class="sd-m-btn sd-m-btn--linea"${lineaEstilo}>${esc(p.linea.texto)}</span>
            </span>
            <span class="sd-m-fila" aria-hidden="true">
              <span class="sd-m-check" style="background:${p.check.fondo};color:${p.check.tinta}${radioCheck}">&#10003;</span>
              <span class="sd-m-check sd-m-check--vacio"${radioVacio}></span>
              <span class="sd-m-toggle" style="background:${p.toggle}"><i></i></span>
              <span class="sd-m-iconos">
                ${p.iconos.map(svg).join('\n                ')}
              </span>
            </span>
          </a>
        </li>`;
}

/* ---------- catalogo final ---------- */
const tarjeta = s => `        <li>
          <a class="cine-tarjeta sd-tarjeta" href="sistemas/${s.ficha}" style="--acento:${s.tokens.acento}">
            <span class="sd-muestras" aria-hidden="true">
              ${s.acentos.map(c => `<span style="background:${c}"></span>`).join('')}
            </span>
            <h3>${esc(s.nombre)}</h3>
            <p>${esc(s.titular)}</p>
            <span class="sd-rasgo">${esc(s.rasgo)}</span>
          </a>
        </li>`;

/* ---------- escribir la portada ---------- */
let html = readFileSync(PORTADA, 'utf8');
html = reemplazar(html, 'railA', sistemas.map(railA).join('\n'));
html = reemplazar(html, 'railB', sistemas.map(railB).join('\n'));
html = reemplazar(html, 'catalogo', sistemas.map(tarjeta).join('\n'));

html = numerar(html);

// Cuantos colores hay en el muestrario, contados y no recordados.
const totalColores = sistemas.reduce((n, s) => n + s.colores.length, 0)
  + capturas.reduce((n, c) => n + c.colores.length, 0);
html = html.replace(/<!--@colores-->.*?<!--\/@colores-->/gs,
  `<!--@colores-->${totalColores}<!--/@colores-->`);

writeFileSync(PORTADA, html);

/* ---------- el enlace del hero de #servicios en la home ---------- */
// Una muestra por sistema y el numero escrito: si el catalogo crece, crece
// solo, en vez de quedarse con seis puntitos y la palabra equivocada.
let indice = readFileSync(INDICE, 'utf8');
indice = reemplazar(indice, 'muestras',
  sistemas.map(s => `<span style="background:${s.tokens.acento}"></span>`).join(''),
  { enLinea: true });
indice = numerar(indice);
writeFileSync(INDICE, indice);

/* ---------- redirecciones de las URLs antiguas ---------- */
// Las fichas cambiaron de nombre al quitarles la relacion con un negocio.
// Sin esto, cualquier enlace de fuera se comeria un 404.
const redireccion = (viejo, nuevo, nombre) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Este sistema ahora se llama ${esc(nombre)}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${nuevo}">
<meta http-equiv="refresh" content="0; url=${nuevo}">
</head>
<body>
<p>Este sistema se llama ahora <a href="${nuevo}">${esc(nombre)}</a>.</p>
</body>
</html>
`;

for (const [viejo, nuevo] of Object.entries(renombrados)) {
  const s = sistemas.find(x => x.ficha === nuevo);
  writeFileSync(join(AQUI, viejo), redireccion(viejo, nuevo, s.nombre));
}

console.log(`Portada regenerada con ${sistemas.length} sistemas.`);
console.log(`Redirecciones escritas: ${Object.keys(renombrados).join(', ')}`);
