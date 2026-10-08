/**
 * Escribe las fichas de sistema a partir de sistemas-datos.mjs (color, letra y
 * forma), fichas-datos.mjs (lo que se dice) y componentes.mjs (el kit).
 *
 *   - Las ocho fichas de fichas-datos.mjs se escriben enteras.
 *   - La de Halogeno es a mano, porque ensena las piezas de produccion de
 *     halogen.css; de ella solo se rellena el bloque <!--@bloque kit-->.
 *
 * Los componentes que se ven en cada ficha no son una imitacion: son las
 * mismas clases de sistema.css con la piel de tema.css, que es lo que usaria
 * una web hecha con el sistema.
 *
 *   node servicios/sistemas/generar-fichas.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sistemas } from './sistemas-datos.mjs';
import { fichas } from './fichas-datos.mjs';
import { KIT } from './componentes.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));

const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- contraste, para el texto de cada muestra de color ---------- */
const canal = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = hex => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
};
const ratio = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
const tintaSobre = hex => ratio('#ffffff', hex) >= ratio('#101010', hex) ? '#ffffff' : '#101010';

/* ---------- bloques ---------- */
const muestra = ([nombre, hex, rol]) => {
  const H = hex.toUpperCase();
  return `      <li>
        <button class="pl-color" type="button" data-hex="${H}" style="--c:${hex};--t:${tintaSobre(hex)}"
                aria-label="Copiar ${H}, ${esc(nombre)}">
          <span class="pl-color__nombre">${esc(nombre)}</span>
          <span class="pl-color__hex"><span>HEX</span> <b>${H}</b></span>
          <span class="pl-color__rol">${esc(rol)}</span>
        </button>
      </li>`;
};

const CLASE_TIPO = {
  display: 'sd-muestra-display',
  titulo: 'sd-muestra-titulo',
  cuerpo: 'sd-muestra-cuerpo',
  pie: 'sd-muestra-pie',
  dato: 'sd-muestra-pie sd-muestra-dato'
};

const lineaTipo = ([meta, texto, rol]) =>
  `      <li><span class="sd-tipo-meta">${esc(meta)}</span><span class="${CLASE_TIPO[rol]}">${esc(texto)}</span></li>`;

// El kit: los ocho componentes, cada uno en su escena.
export const bloqueKit = s => `<ul class="sd-kit-rejilla">
${KIT.map(c => `      <li class="sd-kit-pieza">
        <h3>${esc(c.nombre)}</h3>
        <div class="sd-escena">
${c.html(s.id).split('\n').map(l => '          ' + l).join('\n')}
        </div>
      </li>`).join('\n')}
    </ul>`;

const ICONOS = [
  ['Inicio', '<path d="M3 10 12 4l9 6v10H3V10Z"/><path d="M9 20v-6h6v6"/>'],
  ['Buscar', '<circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/>'],
  ['Ajustes', '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>'],
  ['Aviso', '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'],
  ['Progreso', '<path d="M3 17l5-6 4 4 5-8 4 5"/>']
];

const iconos = () => ICONOS.map(([n, d]) =>
  `      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${n}">${d}</svg>`
).join('\n');

// Si la paleta trae segundo tema, se ensenan tres piezas del kit con el.
const reverso = s => !s.paleta.reverso ? '' : `

  <section class="sd-seccion">
    <h2>El segundo tema: el reverso</h2>
    <p>La misma estructura y la misma piel sobre fondo oscuro. Cambian los tokens, no el marcado: eso es lo que hace que esto sea un sistema y no dos diseños parecidos.</p>
    <div class="sd-reverso">
      <ul class="sd-kit-rejilla">
${KIT.filter(c => ['tarjeta', 'seleccion', 'dato'].includes(c.id)).map(c => `        <li class="sd-kit-pieza">
          <div class="sd-escena">
${c.html(s.id + '-rev').split('\n').map(l => '            ' + l).join('\n')}
          </div>
        </li>`).join('\n')}
      </ul>
    </div>
  </section>`;

/* ---------- la ficha entera ---------- */
function ficha(s, f) {
  const google = s.fuentes.google
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${s.fuentes.google}&display=swap" rel="stylesheet">
`
    : '';
  const ejemplo = f.ejemplo
    ? `    <a class="sd-enlace" href="${f.ejemplo}">Ver la paleta en una web &#8599;</a>\n`
    : '';

  return `<!DOCTYPE html>
<!-- Generado por generar-fichas.mjs desde sistemas-datos.mjs y fichas-datos.mjs. No editar a mano. -->
<html lang="es" data-paleta="${s.paleta.id}" data-tipo="${s.tipografia.id}" data-elem="${s.elementos.id}" data-preset="${s.id}" data-tema-memoria="no">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(s.nombre)} — Sistema de diseño</title>
<meta name="description" content="${esc(f.descripcion)}">
${google}<link rel="stylesheet" href="tema.css">
<link rel="stylesheet" href="sistema.css">
<script src="copiar-color.js" defer></script>
<script src="tema-datos.js"></script>
<script src="../../js/selector-sistema.js" defer></script>
</head>
<body>
<div class="sd-contenedor">

  <header class="sd-cabecera">
    <a class="sd-migas" href="../sistemas-de-diseno.html">&#8592; Todos los sistemas</a>
    <span class="sd-etiqueta">${esc(f.etiqueta)}</span>
    <h1 class="sd-titulo">${esc(s.nombre)}</h1>
    <p class="sd-bajada">${esc(f.bajada)}</p>
  </header>

  <section class="sd-seccion">
    <h2>Paleta</h2>
    <p>${esc(f.paleta)}</p>
    <ul class="pl-rejilla">
${s.paleta.colores.map(muestra).join('\n')}
    </ul>
  </section>

  <section class="sd-seccion">
    <h2>Tipografía</h2>
    <p>${esc(f.tipografia)}</p>
    <ul class="sd-tipo">
${f.tipo.map(lineaTipo).join('\n')}
    </ul>
  </section>

  <section class="sd-seccion" id="componentes">
    <h2>Componentes</h2>
    <p>${esc(f.componentes)}</p>
    ${bloqueKit(s)}

    <h3>Iconos</h3>
    <div class="sd-lienzo sd-iconos">
${iconos()}
    </div>
  </section>${reverso(s)}

  <nav class="sd-pie" aria-label="Enlaces relacionados">
${ejemplo}    <a class="sd-enlace" href="configurador.html">Montar el tuyo &#8599;</a>
    <a class="sd-enlace" href="elementos.html#sistemas">Biblioteca de elementos &#8599;</a>
    <a class="sd-enlace" href="paletas.html">Muestrario de color completo</a>
    <a class="sd-enlace" href="../sistemas-de-diseno.html">&#8592; Todos los sistemas</a>
  </nav>

</div>
<p class="cine-sr" role="status" aria-live="polite" data-copiar-estado></p>
</body>
</html>
`;
}

let escritas = 0;
for (const s of sistemas) {
  const f = fichas[s.id];
  const ruta = join(AQUI, s.ficha);
  if (f) {
    writeFileSync(ruta, ficha(s, f).replace(/\n/g, '\r\n'), 'utf8');
    escritas++;
    continue;
  }
  // Ficha a mano: solo se rellena el kit entre sus marcas.
  let html = readFileSync(ruta, 'utf8');
  const crlf = html.includes('\r\n');
  html = html.replace(/\r\n/g, '\n');
  const abre = '<!--@bloque kit-->';
  const cierra = '<!--/@bloque kit-->';
  const a = html.indexOf(abre);
  const b = html.indexOf(cierra);
  if (a === -1 || b === -1) throw new Error(`${s.ficha} no tiene ficha en fichas-datos.mjs ni marcas de kit`);
  html = html.slice(0, a + abre.length) + '\n    ' + bloqueKit(s) + '\n    ' + html.slice(b);
  writeFileSync(ruta, crlf ? html.replace(/\n/g, '\r\n') : html, 'utf8');
  console.log(`${s.ficha}: kit rellenado entre marcas`);
}
console.log(`${escritas} fichas escritas enteras`);
