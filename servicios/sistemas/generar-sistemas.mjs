/**
 * Genera, a partir de sistemas-datos.mjs:
 *   - las tarjetas del catalogo de servicios/sistemas-de-diseno.html
 *     (la vitrina 3D y el mezclador leen el catalogo en vivo de tema-datos.js)
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

/* ---------- catalogo: cada tarjeta ES su sistema ----------
   El <li> lleva los tres ejes como atributos, asi que tema.css pone dentro
   los tokens de ese sistema y la tarjeta se pinta con ellos. La firma de cada
   uno (filamento, relieve, sombra dura...) va en la portada, por data-sistema.
   Las piezas de muestra son controles de verdad: se pueden pulsar. */
const dos = n => String(n).padStart(2, '0');
const tarjeta = (s, i) => `        <li data-sistema="${s.id}" data-paleta="${s.paleta.id}" data-tipo="${s.tipografia.id}" data-elem="${s.elementos.id}" style="--i:${i}">
          <article class="esp" aria-labelledby="esp-${s.id}">
            <span class="esp-deco" aria-hidden="true"></span>${s.id === 'industrial' ? '\n            <span class="esp-cota" aria-hidden="true"><span data-cota>—</span></span>' : ''}
            <div class="esp-cab"><span>${dos(i + 1)} / ${dos(sistemas.length)}</span><span>${s.paleta.banda === 'oscura' ? 'Oscuro' : 'Claro'}</span></div>
            <h3 class="esp-nombre" id="esp-${s.id}">${esc(s.nombre)}</h3>
            <p class="esp-titular">${esc(s.titular)}</p>
            <div class="esp-ui">
              <button class="sd-btn" type="button">Aceptar</button>
              <button class="sd-btn sd-btn--linea" type="button">Ver</button>
              <label class="sd-interruptor"><input type="checkbox" checked><span class="sr">Interruptor de ${esc(s.nombre)}</span></label>
              <label class="sd-check"><input type="checkbox" checked><span class="sr">Casilla de ${esc(s.nombre)}</span></label>
            </div>
            <div class="esp-colores" aria-hidden="true">${s.acentos.map(c => `<span style="background:${c}"></span>`).join('')}</div>
            <div class="esp-pie"><span>${esc(s.rasgo)}</span><a class="esp-ir" href="sistemas/${s.ficha}">Ficha<span class="sr"> de ${esc(s.nombre)}</span> ↗</a></div>
          </article>
        </li>`;

/* ---------- escribir la portada ---------- */
let html = readFileSync(PORTADA, 'utf8');
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
