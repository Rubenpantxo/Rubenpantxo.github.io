/**
 * Escribe las fichas de sistema a partir de sistemas-datos.mjs (color, letra y
 * forma), fichas-datos.mjs (lo que se dice) y componentes.mjs (el kit).
 *
 *   - Las nueve fichas se escriben enteras con la misma plantilla: cabecera
 *     con el objeto 3D del sistema (js/sistemas-ficha.js), los tres ejes,
 *     paleta, tipografía con probador, kit, reverso si lo hay, demos donde
 *     probarlo y el sistema anterior y el siguiente.
 *   - Halógeno añade sus piezas de producción (halogen.css), que vienen en
 *     el campo `produccion` de fichas-datos.mjs.
 *   - Después hay que pasar generar-paletas.mjs, que repinta la paleta.
 *
 * Los componentes que se ven en cada ficha no son una imitacion: son las
 * mismas clases de sistema.css con la piel de tema.css, que es lo que usaria
 * una web hecha con el sistema.
 *
 *   node servicios/sistemas/generar-fichas.mjs
 */
import { writeFileSync } from 'node:fs';
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

/* ---------- la ficha entera ---------- */
const dos = n => String(n).padStart(2, '0');
// La demo donde mejor luce cada sistema (la misma que en la portada)
const DEMO_SUYA = {
  halogeno: 'logistica', terracota: 'bar-restaurante', editorial: 'tienda-ropa', carmin: 'carniceria',
  neon: 'gimnasio', savia: 'supermercado', organico: 'granja', clasico: 'bar-restaurante', industrial: 'industria'
};
const DEMOS = [
  ['bar-restaurante', 'Bar & Restaurante', 'La mesa en 3D'],
  ['tienda-ropa', 'Tienda de ropa', 'La prenda colgada'],
  ['carniceria', 'Carnicería', 'La báscula'],
  ['gimnasio', 'Gimnasio', 'El cuerpo'],
  ['supermercado', 'Supermercado', 'La cesta'],
  ['granja', 'Granja', 'La finca'],
  ['industria', 'Industria', 'La pieza'],
  ['logistica', 'Logística', 'El mapa y la caja']
];
const ejes = s => `?paleta=${s.paleta.id}&amp;tipo=${s.tipografia.id}&amp;elem=${s.elementos.id}`;
// Cada letra en su span para que entren una a una; el h1 lleva el nombre entero
const letras = t => [...t].map((c, i) => c === ' ' ? ' ' : `<span style="--i:${i}">${esc(c)}</span>`).join('');

function ficha(s, f, k) {
  const N = sistemas.length;
  const ant = sistemas[(k - 1 + N) % N];
  const sig = sistemas[(k + 1) % N];
  const google = s.fuentes.google
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${s.fuentes.google}&display=swap" rel="stylesheet">
`
    : '';
  const extraCss = f.css ? `<link rel="stylesheet" href="${f.css}">\n` : '';
  const estilo = f.estilo ? `<style>\n${f.estilo}\n</style>\n` : '';
  const suya = DEMO_SUYA[s.id] || 'bar-restaurante';
  const produccion = !f.produccion ? '' : `

  <section class="fx-seccion" id="produccion">
    <header class="fx-sec-cab"><span class="fx-sec-num fx-disp">+</span><h2 class="fx-disp">${esc(f.produccion.titulo)}</h2></header>
${f.produccion.html}
  </section>`;
  const reverso = !s.paleta.reverso ? '' : `

  <section class="fx-seccion" id="reverso">
    <header class="fx-sec-cab"><span class="fx-sec-num fx-disp">↺</span><h2 class="fx-disp">El reverso</h2>
      <p>La misma estructura y la misma piel sobre fondo oscuro. Cambian los tokens, no el marcado: eso es lo que hace que esto sea un sistema y no dos diseños parecidos.</p></header>
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

  return `<!DOCTYPE html>
<!-- Generado por generar-fichas.mjs desde sistemas-datos.mjs y fichas-datos.mjs. No editar a mano. -->
<html lang="es" data-paleta="${s.paleta.id}" data-tipo="${s.tipografia.id}" data-elem="${s.elementos.id}" data-preset="${s.id}" data-tema-memoria="no">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(s.nombre)} — Sistema de diseño</title>
<meta name="description" content="${esc(f.descripcion)}">
${google}${extraCss}<link rel="stylesheet" href="tema.css">
<link rel="stylesheet" href="sistema.css">
<link rel="stylesheet" href="ficha.css">
${estilo}<script src="copiar-color.js" defer></script>
<script src="tema-datos.js"></script>
<script src="../../js/selector-sistema.js" defer></script>
<script type="module" src="../../js/sistemas-ficha.js"></script>
</head>
<body>

<header class="fx-hero">
  <nav class="fx-barra" aria-label="Sistemas">
    <a class="fx-volver" href="../sistemas-de-diseno.html"><span aria-hidden="true">&#8592;</span> Todos los sistemas</a>
    <span class="fx-mono">${dos(k + 1)} / ${dos(N)}</span>
    <div class="fx-vecinos">
      <a href="${ant.ficha}" aria-label="Sistema anterior: ${esc(ant.nombre)}">&#8592;</a>
      <a href="${sig.ficha}" aria-label="Sistema siguiente: ${esc(sig.nombre)}">&#8594;</a>
    </div>
  </nav>

  <div class="fx-hero-cuerpo">
    <div class="fx-hero-texto">
      <p class="fx-etiqueta fx-mono">${esc(f.etiqueta)}</p>
      <h1 class="fx-nombre fx-disp" aria-label="${esc(s.nombre)}"><span aria-hidden="true">${letras(s.nombre)}</span></h1>
      <p class="fx-bajada">${esc(f.bajada)}</p>
      <div class="fx-acciones">
        <a class="sd-btn" href="../${suya}.html${ejes(s)}">Pruébalo en una app &#8599;</a>
        <button class="sd-btn sd-btn--linea fx-copiado" type="button" data-copiar-tokens>Copiar los tokens</button>
      </div>
    </div>
    <figure class="fx-objeto" id="fx-objeto" aria-hidden="true">
      <div class="fx-reserva"></div>
      <canvas id="fx-lienzo"></canvas>
      <figcaption class="fx-pista fx-mono">Arrastra para girarlo</figcaption>
    </figure>
  </div>

  <ul class="fx-ejes">
    <li><a href="#paleta"><small class="fx-mono">Paleta</small><b>${esc(s.paleta.nombre)}</b><span class="fx-eje-muestra fx-bolas" aria-hidden="true">${s.acentos.map(c => `<i style="background:${c}"></i>`).join('')}</span></a></li>
    <li><a href="#tipografia"><small class="fx-mono">Tipografía</small><b>${esc(s.tipografia.nombre)}</b><span class="fx-eje-muestra fx-aa fx-disp" aria-hidden="true">Aa</span></a></li>
    <li><a href="#componentes"><small class="fx-mono">Elementos</small><b>${esc(s.elementos.nombre)}</b><span class="fx-eje-muestra fx-forma" aria-hidden="true"></span></a></li>
  </ul>
</header>

<main class="fx-main">

  <section class="fx-seccion" id="paleta">
    <header class="fx-sec-cab"><span class="fx-sec-num fx-disp">01</span><h2 class="fx-disp">Paleta</h2><p>${esc(f.paleta)} Toca un color para copiarlo.</p></header>
    <ul class="pl-rejilla">
${s.paleta.colores.map(muestra).join('\n')}
    </ul>
  </section>

  <section class="fx-seccion" id="tipografia">
    <header class="fx-sec-cab"><span class="fx-sec-num fx-disp">02</span><h2 class="fx-disp">Tipografía</h2><p>${esc(f.tipografia)}</p></header>
    <div class="fx-probar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
      <input type="text" id="fx-texto" placeholder="Escribe aquí el nombre de tu negocio" aria-label="Texto de prueba para la tipografía" maxlength="60">
      <label class="fx-tamano fx-mono">Tamaño <input type="range" id="fx-escala" min="0.6" max="1.6" step="0.05" value="1"></label>
    </div>
    <ul class="sd-tipo">
${f.tipo.map(lineaTipo).join('\n')}
    </ul>
  </section>

  <section class="fx-seccion" id="componentes">
    <header class="fx-sec-cab"><span class="fx-sec-num fx-disp">03</span><h2 class="fx-disp">Componentes</h2><p>${esc(f.componentes)}</p></header>
    ${bloqueKit(s)}

    <h3>Iconos</h3>
    <div class="sd-lienzo sd-iconos">
${iconos()}
    </div>
  </section>${produccion}${reverso}

  <section class="fx-seccion" id="apps">
    <header class="fx-sec-cab"><span class="fx-sec-num fx-disp">04</span><h2 class="fx-disp">Pruébalo en una app</h2><p>Las ocho demos se abren vestidas con ${esc(s.nombre)}. El selector de abajo a la derecha deja cambiarlo en vivo.</p></header>
    <ul class="fx-demos">
${DEMOS.map(([id, nombre, objeto]) => `      <li><a href="../${id}.html${ejes(s)}"${id === suya ? ' class="es-suya"' : ''}><span><b>${esc(nombre)}</b><small>${esc(objeto)}${id === suya ? ' · la que mejor le va' : ''}</small></span><span aria-hidden="true">&#8599;</span></a></li>`).join('\n')}
    </ul>
  </section>

</main>

<footer class="fx-pie">
  <nav class="fx-siguientes" aria-label="Otros sistemas">
    <a href="${ant.ficha}"><small class="fx-mono">&#8592; Anterior</small><b class="fx-disp">${esc(ant.nombre)}</b></a>
    <a href="${sig.ficha}"><small class="fx-mono">Siguiente &#8594;</small><b class="fx-disp">${esc(sig.nombre)}</b></a>
  </nav>
  <nav class="fx-enlaces" aria-label="Enlaces relacionados">
    <a href="configurador.html${ejes(s)}">Montar el tuyo &#8599;</a>
    <a href="elementos.html#sistemas">Biblioteca de elementos &#8599;</a>
    <a href="paletas.html">Muestrario de color completo</a>
    <a href="../sistemas-de-diseno.html">&#8592; Todos los sistemas</a>
  </nav>
</footer>

<p class="cine-sr" role="status" aria-live="polite" data-copiar-estado></p>
</body>
</html>
`;
}

let escritas = 0;
sistemas.forEach((s, k) => {
  const f = fichas[s.id];
  if (!f) throw new Error(`${s.id} no tiene ficha en fichas-datos.mjs`);
  writeFileSync(join(AQUI, s.ficha), ficha(s, f, k).replace(/\n/g, '\r\n'), 'utf8');
  escritas++;
});
console.log(`${escritas} fichas escritas enteras`);
