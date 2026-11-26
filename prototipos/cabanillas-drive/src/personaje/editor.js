// Editor de personaje de Cabanillas (PLAN_PERSONAJE.md). Se abre al empezar la partida, mientras
// el pueblo sigue cargando detrás, y usa el mismo WebGLRenderer que el juego (no abre otro
// contexto WebGL, que en móviles es caro).
//
// Pestañas: Básico (sexo, edad, origen y herencia de dos padres), Cuerpo (macros de MakeHuman y
// detalle por zonas), Cara (200 rasgos), Piel y ojos, Pelo, Ropa. En Cara y Cuerpo se puede
// esculpir arrastrando directamente sobre el personaje (escultura.js). Deshacer y rehacer,
// personaje al azar, cámara por zonas y guardado en el navegador.
import * as THREE from 'three';
import { PERSONAJE } from '../config/personaje.js';
import { creaEscultura } from './escultura.js';
import { creaEstudio } from './estudio.js';
import { cargaGuardada, guarda, mezclaHerencia, normaliza, personajeAlAzar } from './estado.js';
import { creaFabricaPersonajes } from './modelo.js';
import './editor.css';

const PESTANAS = [
  { id: 'basico', icono: '🧬', nombre: 'Básico' },
  { id: 'cuerpo', icono: '💪', nombre: 'Cuerpo' },
  { id: 'cara', icono: '🙂', nombre: 'Cara' },
  { id: 'piel', icono: '🎨', nombre: 'Piel y ojos' },
  { id: 'pelo', icono: '💇', nombre: 'Pelo' },
  { id: 'ropa', icono: '👕', nombre: 'Ropa' },
];
const PERSONAJE_PANEL = 372 + 74 + 24;    // ancho del raíl y el panel (editor.css)
const ZONAS = [['cuerpo', 'Cuerpo'], ['cara', 'Cara'], ['torso', 'Torso'], ['piernas', 'Piernas'], ['pies', 'Pies']];
const HUECOS = [
  { id: 'conjunto', nombre: 'Conjuntos' }, { id: 'arriba', nombre: 'Parte de arriba' }, { id: 'abajo', nombre: 'Parte de abajo' },
  { id: 'calzado', nombre: 'Calzado' }, { id: 'sombrero', nombre: 'Sombrero' },
];
// Lo que se pone al cambiar de sexo si lo que lleva es del otro
const POR_SEXO = {
  h: { pelo: 'short02', cejas: 'eyebrow001', arriba: 'namuhekam_male_polo_shirt', abajo: 'cortu_cargo_pants', calzado: 'shoes01' },
  m: { pelo: 'long01', cejas: 'eyebrow006', arriba: 'toigo_basic_tucked_t-shirt', abajo: 'toigo_wool_pants', calzado: 'toigo_ballet_flats' },
};

const el = (etiqueta, atributos = {}, ...hijos) => {
  const e = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'texto') e.textContent = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h !== null && h !== undefined && h !== false) e.append(h);
  return e;
};

// volverAlJuego: abierto desde un sitio del mapa, en mitad de la partida; «Guardar» o «Cancelar» lo cierran
export async function abreEditor({ renderer, apariencia: inicial, alTerminar, progresoJuego = null, volverAlJuego = false, calidad = {} }) {
  // --- Marco
  const raiz = el('section', { id: 'editor-personaje', 'aria-label': 'Editor de personaje' });
  const capa = el('div', { class: 'ep-capa' });
  const espera = el('div', { class: 'ep-espera', texto: 'Preparando el estudio…' });
  raiz.append(capa, espera);
  document.body.append(raiz);

  let fabrica;
  try {
    fabrica = await creaFabricaPersonajes();
  } catch (error) {
    espera.textContent = `No se ha podido abrir el editor: ${error.message}`;
    console.error(error);
    throw error;
  }
  const sombras = calidad.sombras !== false;
  const msaa = Boolean(renderer.getContext().getContextAttributes()?.antialias);
  const personaje = fabrica.crea({ sombras, texturaMax: calidad.texturaMax ?? 2048, msaa });
  const estudio = creaEstudio(renderer, { sombras });
  estudio.ponPersonaje(personaje);
  const motor = fabrica.motor;
  const cat = fabrica.catalogo;

  let ap = normaliza(inicial ?? cargaGuardada() ?? undefined);
  ap.piel.auto ??= true;
  ap.herencia ??= { madre: PERSONAJE.padres.madres[0], padre: PERSONAJE.padres.padres[0], parecido: 0.5 };
  await personaje.aplica(ap);
  espera.hidden = true;
  if (import.meta.env.DEV) window.__editorPersonaje = { personaje, estudio, fabrica, renderer, get ap() { return ap; } };

  // --- Animación de reposo, parpadeo y gestos
  const mezclador = new THREE.AnimationMixer(personaje.raiz);
  let accion = null;
  function ponReposo() {
    const t = accion?.time ?? 0;
    accion?.stop();
    const clip = personaje.animacion('quieto');
    if (!clip) return;
    accion = mezclador.clipAction(clip);
    accion.play();
    accion.time = t;
  }
  ponReposo();
  let tParpadeo = 2;
  let parpadeo = 0;
  let sonrisa = 0;
  let sonrisaMeta = 0.15;

  // --- Historial (deshacer / rehacer)
  const historial = [JSON.stringify(ap)];
  let posHist = 0;
  function apunta() {
    const s = JSON.stringify(ap);
    if (s === historial[posHist]) return;
    historial.splice(posHist + 1);
    historial.push(s);
    if (historial.length > 80) historial.shift();
    posHist = historial.length - 1;
    pintaHistorial();
  }
  function vuelve(paso) {
    const n = posHist + paso;
    if (n < 0 || n >= historial.length) return;
    posHist = n;
    ap = JSON.parse(historial[n]);
    cambiaTodo();
    pintaPestana();
    pintaHistorial();
  }

  // --- Cambios: forma (rápido, cada fotograma como mucho) y todo (carga prendas)
  let formaPendiente = false;
  let reposoPendiente = 0;
  const cambiaForma = () => { formaPendiente = true; reposoPendiente = 0.4; };
  const cambiaTodo = () => { personaje.aplica(ap).then(() => { reposoPendiente = 0.1; pintaMedidas(); }); };

  // ================================================================ interfaz
  const rail = el('nav', { class: 'ep-rail', role: 'tablist', 'aria-label': 'Partes del personaje' });
  const panel = el('div', { class: 'ep-panel' });
  const cabeceraPanel = el('header');
  const chips = el('div', { class: 'ep-chips' });
  const contenido = el('div', { class: 'ep-contenido' });
  panel.append(cabeceraPanel, chips, contenido);
  const medidas = el('div', { class: 'ep-medidas' });
  const cabecera = el('div', { class: 'ep-cabecera' },
    el('h2', { texto: 'Crea tu personaje' }),
    el('p', { texto: 'Así te verán en Cabanillas. Cuando empieces ya no se puede cambiar (más adelante: gimnasio, peluquería y tienda).' }),
    medidas);
  const zonas = el('div', { class: 'ep-zonas', role: 'group', 'aria-label': 'Cámara' });
  for (const [id, nombre] of ZONAS) {
    zonas.append(el('button', { type: 'button', 'data-zona': id, 'aria-pressed': String(id === 'cuerpo'), texto: nombre, onclick: () => enfoca(id) }));
  }
  const botonDeshacer = el('button', { class: 'ep-boton', type: 'button', title: 'Deshacer (Ctrl+Z)', texto: '↶', onclick: () => vuelve(-1) });
  const botonRehacer = el('button', { class: 'ep-boton', type: 'button', title: 'Rehacer (Ctrl+Y)', texto: '↷', onclick: () => vuelve(1) });
  const botonAzar = el('button', {
    class: 'ep-boton', type: 'button', title: 'Personaje al azar', texto: '🎲 Al azar',
    onclick: () => {
      const nombre = ap.nombre;
      ap = personajeAlAzar(fabrica, Math.floor(Math.random() * 1e9));
      ap.nombre = nombre;
      ap.piel.auto = true;
      ap.herencia = { madre: PERSONAJE.padres.madres[0], padre: PERSONAJE.padres.padres[0], parecido: 0.5 };
      cambiaTodo(); apunta(); pintaPestana();
    },
  });
  const botonFin = el('button', { class: 'ep-boton ep-principal', type: 'button', texto: progresoJuego ? '¡A Cabanillas!' : 'Guardar' });
  const botonCancelar = volverAlJuego ? el('button', { class: 'ep-boton', type: 'button', texto: 'Cancelar' }) : null;
  const acciones = el('div', { class: 'ep-acciones' }, botonDeshacer, botonRehacer, botonAzar, ...(botonCancelar ? [botonCancelar] : []), botonFin);
  const carga = el('div', { class: 'ep-carga', hidden: !progresoJuego }, el('span', { texto: 'Cargando el pueblo…' }), el('div', { class: 'ep-barra' }, el('span')));
  const pista = el('div', { class: 'ep-pista', texto: 'Arrastra para girar · rueda o pellizco para acercar · en Cara y Cuerpo, arrastra sobre el personaje para esculpir' });
  raiz.append(cabecera, rail, panel, zonas, acciones, carga, pista);

  function pintaHistorial() {
    botonDeshacer.disabled = posHist <= 0;
    botonRehacer.disabled = posHist >= historial.length - 1;
  }
  pintaHistorial();

  function pintaMedidas() {
    const m = personaje.medidas();
    medidas.replaceChildren(
      el('span', { texto: `${Math.round(m.altura * 100)} cm` }),
      el('span', { texto: `${Math.round(ap.macro.edad)} años` }),
      el('span', { texto: ap.macro.sexo >= 0.5 ? (ap.macro.sexo > 0.85 ? 'Hombre' : 'Más masculino') : (ap.macro.sexo < 0.15 ? 'Mujer' : 'Más femenino') }),
    );
  }
  pintaMedidas();

  let pestana = 'basico';
  let grupoAbierto = null;
  for (const p of PESTANAS) {
    rail.append(el('button', {
      class: 'ep-pestana', type: 'button', role: 'tab', 'aria-selected': String(p.id === pestana), 'data-pestana': p.id,
      onclick: () => { pestana = p.id; grupoAbierto = null; pintaPestana(); },
    }, el('i', { texto: p.icono }), p.nombre));
  }

  function enfoca(z) {
    estudio.enfoca(z);
    zonas.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.zona === z)));
  }

  // --- Piezas de la interfaz
  function deslizador({ nombre, valor, min = 0, max = 1, paso = 0.01, formato, alCambiar, alSoltar, id, porDefecto = 0 }) {
    const salida = el('output');
    const entrada = el('input', { type: 'range', min, max, step: paso, value: valor, 'aria-label': nombre });
    const caja = el('div', { class: `ep-deslizador${Math.abs(valor - porDefecto) > 1e-3 ? ' ep-tocado' : ''}`, 'data-id': id },
      el('label', { texto: nombre }), salida, entrada);
    const pinta = (v) => {
      salida.textContent = formato ? formato(v) : `${v > 0 ? '+' : ''}${Math.round(v * 100)}`;
      const f = (v - min) / (max - min);
      const c = min < 0 ? 0.5 : 0;
      const a = Math.min(c, f) * 100; const b = Math.max(c, f) * 100;
      entrada.style.setProperty('--ep-pista', `linear-gradient(90deg, rgba(255,255,255,.16) ${a}%, #ffd54a ${a}%, #ffd54a ${b}%, rgba(255,255,255,.16) ${b}%)`);
      caja.classList.toggle('ep-tocado', Math.abs(v - porDefecto) > 1e-3);
    };
    pinta(valor);
    entrada.addEventListener('input', () => { const v = Number(entrada.value); pinta(v); alCambiar(v); });
    entrada.addEventListener('change', () => { alSoltar?.(); apunta(); });
    // Doble clic: vuelve al valor neutro
    entrada.addEventListener('dblclick', () => { entrada.value = porDefecto; pinta(porDefecto); alCambiar(porDefecto); apunta(); });
    caja.actualiza = (v) => { entrada.value = v; pinta(v); };
    return caja;
  }
  const seccion = (titulo, ...hijos) => el('div', { class: 'ep-seccion' }, titulo ? el('h4', { texto: titulo }) : null, ...hijos);
  function opcion({ imagen, nombre, elegido, onclick, nada }) {
    return el('button', { class: 'ep-opcion', type: 'button', 'aria-pressed': String(elegido), onclick, title: nombre },
      nada ? el('span', { class: 'ep-nada', texto: '∅' }) : el('img', { src: imagen, alt: '', loading: 'lazy', draggable: 'false' }),
      nombre);
  }
  function colores(lista, actual, alElegir, { quitar = false } = {}) {
    const fila = el('div', { class: 'ep-colores' });
    if (quitar) fila.append(el('button', { class: 'ep-color ep-quita', type: 'button', title: 'Color original', 'aria-pressed': String(!actual), onclick: () => alElegir(null) }));
    for (const c of lista) {
      fila.append(el('button', { class: 'ep-color', type: 'button', style: `background:${c}`, title: c, 'aria-pressed': String(actual === c), onclick: () => alElegir(c) }));
    }
    const libre = el('input', { type: 'color', value: actual ?? '#888888', 'aria-label': 'Otro color' });
    libre.addEventListener('input', () => alElegir(libre.value, true));
    libre.addEventListener('change', () => apunta());
    fila.append(el('label', { class: 'ep-color ep-libre', title: 'Otro color' }, libre));
    return fila;
  }
  const mini = (nombre) => `${PERSONAJE.ruta}tex/${nombre}`;
  const sexoActual = () => (ap.macro.sexo >= 0.5 ? 'h' : 'm');

  function cabeceraDe(titulo, texto) {
    cabeceraPanel.replaceChildren(el('h3', { texto: titulo }), el('p', { texto }));
  }

  // Piel automática según sexo, edad y origen (hasta que se elige una a mano)
  function pielAutomatica() {
    if (!ap.piel.auto) return;
    const e = ap.macro.edad < 34 ? 'young' : ap.macro.edad < 58 ? 'middleage' : 'old';
    const o = ap.macro.origen;
    const r = o.africano >= o.europeo && o.africano >= o.asiatico ? 'african' : o.asiatico > o.europeo ? 'asian' : 'caucasian';
    const id = `${e}_${r}_${ap.macro.sexo >= 0.5 ? 'male' : 'female'}`;
    if (cat.pieles.some((p) => p.id === id)) ap.piel.id = id;
  }
  // Si lo que lleva es del otro sexo, se cambia por lo de su sexo
  function ajustaASexo() {
    const s = sexoActual();
    const otro = (id) => cat.prendas.find((p) => p.id === id)?.sexo === (s === 'h' ? 'm' : 'h');
    const d = POR_SEXO[s];
    if (ap.pelo.id && otro(ap.pelo.id)) ap.pelo.id = d.pelo;
    if (otro(ap.cejas.id)) ap.cejas.id = d.cejas;
    if (ap.ropa.conjunto && otro(ap.ropa.conjunto)) { ap.ropa.conjunto = null; ap.ropa.arriba = d.arriba; ap.ropa.abajo = d.abajo; }
    for (const h of ['arriba', 'abajo', 'calzado']) if (ap.ropa[h] && otro(ap.ropa[h])) ap.ropa[h] = d[h];
  }

  // --- Pestañas
  function pintaPestana() {
    rail.querySelectorAll('.ep-pestana').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.pestana === pestana)));
    contenido.replaceChildren();
    chips.replaceChildren();
    contenido.scrollTop = 0;
    if (pestana === 'basico') pintaBasico();
    else if (pestana === 'cuerpo') pintaDetalle('cuerpo');
    else if (pestana === 'cara') pintaDetalle('cara');
    else if (pestana === 'piel') pintaPiel();
    else if (pestana === 'pelo') pintaPelo();
    else pintaRopa();
  }

  function macro(nombre, clave, opciones = {}) {
    return deslizador({
      nombre, valor: ap.macro[clave], porDefecto: opciones.porDefecto ?? 0.5, formato: opciones.formato ?? ((v) => `${Math.round(v * 100)} %`),
      min: opciones.min ?? 0, max: opciones.max ?? 1, paso: opciones.paso ?? 0.005,
      alCambiar: (v) => { ap.macro[clave] = v; opciones.alCambiar?.(v); cambiaForma(); },
      alSoltar: opciones.alSoltar,
    });
  }

  function pintaBasico() {
    cabeceraDe('Lo básico', 'Sexo, edad, origen y de quién te vienen los rasgos.');
    enfoca('cuerpo');
    const nombre = el('input', { class: 'ep-nombre', type: 'text', maxlength: 24, placeholder: 'Tu nombre en el pueblo', value: ap.nombre ?? '' });
    nombre.addEventListener('change', () => { ap.nombre = nombre.value.trim(); apunta(); });
    const segSexo = el('div', { class: 'ep-segmento' });
    const marcaSexo = () => segSexo.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === ap.macro.sexo)));
    for (const [v, t] of [[0, 'Mujer'], [1, 'Hombre']]) {
      segSexo.append(el('button', {
        type: 'button', 'data-v': v, texto: t,
        onclick: () => { ap.macro.sexo = v; ajustaASexo(); pielAutomatica(); cambiaTodo(); apunta(); pintaPestana(); },
      }));
    }
    marcaSexo();
    const sexo = macro('Rasgos (femenino ↔ masculino)', 'sexo', {
      formato: (v) => `${Math.round(v * 100)}`, alCambiar: () => marcaSexo(), alSoltar: () => { ajustaASexo(); pielAutomatica(); cambiaTodo(); },
    });
    const edad = deslizador({
      nombre: 'Edad', valor: ap.macro.edad, min: PERSONAJE.edad.min, max: PERSONAJE.edad.max, paso: 1, porDefecto: 30,
      formato: (v) => `${Math.round(v)} años`,
      alCambiar: (v) => { ap.macro.edad = v; cambiaForma(); },
      alSoltar: () => { pielAutomatica(); cambiaTodo(); pintaMedidas(); },
    });
    // Origen: tres deslizadores que siempre suman 100 %
    const claves = [['europeo', 'Europeo'], ['africano', 'Africano'], ['asiatico', 'Asiático']];
    const cajas = {};
    const reparte = (clave, v) => {
      const o = ap.macro.origen;
      const otros = claves.map(([k]) => k).filter((k) => k !== clave);
      const resto = otros.reduce((s, k) => s + o[k], 0);
      o[clave] = v;
      for (const k of otros) o[k] = resto > 1e-6 ? (o[k] / resto) * (1 - v) : (1 - v) / 2;
      for (const [k] of claves) cajas[k].actualiza(o[k]);
      cambiaForma();
    };
    for (const [k, n] of claves) {
      cajas[k] = deslizador({
        nombre: n, valor: ap.macro.origen[k], porDefecto: -1, formato: (v) => `${Math.round(v * 100)} %`,
        alCambiar: (v) => reparte(k, v), alSoltar: () => { pielAutomatica(); cambiaTodo(); },
      });
    }
    // Herencia
    const H = ap.herencia;
    const tarjeta = (titulo, lista, clave) => {
      const nombreP = el('strong', { texto: H[clave] });
      const mueve = (paso) => {
        const i = (lista.indexOf(H[clave]) + paso + lista.length) % lista.length;
        H[clave] = lista[i]; nombreP.textContent = H[clave]; aplicaHerencia(); apunta();
      };
      return el('div', { class: 'ep-padre' }, el('small', { texto: titulo }),
        el('div', { class: 'ep-fila' },
          el('button', { class: 'ep-boton', type: 'button', texto: '‹', 'aria-label': `${titulo} anterior`, onclick: () => mueve(-1) }), nombreP,
          el('button', { class: 'ep-boton', type: 'button', texto: '›', 'aria-label': `${titulo} siguiente`, onclick: () => mueve(1) })));
    };
    const aplicaHerencia = () => {
      const caraSet = new Set(PERSONAJE.gruposCara.flatMap((g) => g.categorias));
      for (const id of Object.keys(ap.detalle)) if (caraSet.has(motor.deslizadores.get(id)?.grupo)) delete ap.detalle[id];
      Object.assign(ap.detalle, mezclaHerencia(motor, H.madre, H.padre, H.parecido));
      cambiaForma();
    };
    const parecido = deslizador({
      nombre: 'Te pareces a… (madre ↔ padre)', valor: H.parecido, porDefecto: 0.5, formato: (v) => (v < 0.45 ? 'a tu madre' : v > 0.55 ? 'a tu padre' : 'a los dos'),
      alCambiar: (v) => { H.parecido = v; aplicaHerencia(); },
    });
    contenido.append(
      seccion('Nombre', nombre),
      seccion('Sexo', segSexo, sexo),
      seccion('Edad', edad),
      seccion('Origen', ...claves.map(([k]) => cajas[k])),
      seccion('Herencia', el('div', { class: 'ep-padres' }, tarjeta('Madre', PERSONAJE.padres.madres, 'madre'), tarjeta('Padre', PERSONAJE.padres.padres, 'padre')), parecido,
        el('div', { class: 'ep-fila' }, el('button', { class: 'ep-boton', type: 'button', texto: 'Aplicar herencia a la cara', onclick: () => { aplicaHerencia(); apunta(); } }))),
    );
  }

  // Cuerpo o Cara: chips de zona, macros (en cuerpo) y deslizadores de detalle
  function pintaDetalle(tipo) {
    const grupos = tipo === 'cara' ? PERSONAJE.gruposCara : PERSONAJE.gruposCuerpo;
    cabeceraDe(tipo === 'cara' ? 'Cara' : 'Cuerpo', 'Mueve los deslizadores o arrastra directamente sobre el personaje.');
    grupoAbierto ??= tipo === 'cara' ? grupos[0].id : 'general';
    const listaChips = tipo === 'cuerpo' ? [{ id: 'general', nombre: 'Complexión', zona: 'cuerpo' }, ...grupos] : grupos;
    for (const g of listaChips) {
      if (g.id === 'pecho' && ap.macro.sexo > 0.75) continue;
      chips.append(el('button', {
        class: 'ep-chip', type: 'button', 'aria-pressed': String(g.id === grupoAbierto), texto: g.nombre,
        onclick: () => { grupoAbierto = g.id; pintaPestana(); },
      }));
    }
    const g = listaChips.find((x) => x.id === grupoAbierto) ?? listaChips[0];
    enfoca(g.zona ?? (tipo === 'cara' ? 'cara' : 'cuerpo'));
    if (g.id === 'general') {
      contenido.append(
        seccion('Complexión',
          macro('Musculatura', 'musculo'), macro('Peso', 'peso'), macro('Altura', 'altura', { min: PERSONAJE.altura.min, max: PERSONAJE.altura.max, alSoltar: pintaMedidas, formato: () => `${Math.round(personaje.medidas().altura * 100)} cm` }),
          macro('Proporciones', 'proporciones')),
        ap.macro.sexo < 0.75 ? seccion('Pecho', macro('Talla', 'pecho'), macro('Firmeza', 'firmeza')) : null,
      );
      return;
    }
    const buscar = el('input', { class: 'ep-buscar', type: 'search', placeholder: 'Buscar rasgo…' });
    const lista = el('div');
    const items = [];
    for (const [id, s] of motor.deslizadores) {
      if (!g.categorias.includes(s.grupo) || !PERSONAJE.nombres[id]) continue;
      const caja = deslizador({
        id, nombre: PERSONAJE.nombres[id], valor: ap.detalle[id] ?? 0, min: s.neg ? -1 : 0, max: 1,
        alCambiar: (v) => { if (Math.abs(v) < 1e-3) delete ap.detalle[id]; else ap.detalle[id] = v; cambiaForma(); },
      });
      items.push({ caja, texto: PERSONAJE.nombres[id].toLowerCase() });
      lista.append(caja);
    }
    buscar.addEventListener('input', () => {
      const q = buscar.value.trim().toLowerCase();
      for (const it of items) it.caja.hidden = q && !it.texto.includes(q);
    });
    const restablece = el('button', {
      class: 'ep-boton', type: 'button', texto: 'Restablecer esta zona',
      onclick: () => { for (const it of items) { delete ap.detalle[it.caja.dataset.id]; it.caja.actualiza(0); } cambiaForma(); apunta(); },
    });
    contenido.append(seccion(null, buscar, lista, el('div', { class: 'ep-fila' }, restablece)));
  }

  function pintaPiel() {
    cabeceraDe('Piel y ojos', 'Textura de piel, tono, rubor y color de ojos.');
    enfoca('cara');
    const rej = el('div', { class: 'ep-rejilla' });
    rej.append(opcion({
      nada: true, nombre: 'Automática', elegido: ap.piel.auto,
      onclick: () => { ap.piel.auto = true; pielAutomatica(); cambiaTodo(); apunta(); pintaPestana(); },
    }));
    for (const p of cat.pieles) {
      rej.append(opcion({
        imagen: mini(`mini_piel_${p.id}.webp`), nombre: `${p.nombre}${p.sexo === 'h' ? ' ♂' : ' ♀'}`, elegido: !ap.piel.auto && ap.piel.id === p.id,
        onclick: () => { ap.piel.id = p.id; ap.piel.auto = false; cambiaTodo(); apunta(); pintaPestana(); },
      }));
    }
    const ojos = el('div', { class: 'ep-rejilla' });
    for (const o of cat.iris) {
      ojos.append(opcion({
        imagen: mini(`mini_iris_${o.id}.webp`), nombre: o.nombre, elegido: ap.ojos.iris === o.id,
        onclick: () => { ap.ojos.iris = o.id; cambiaTodo(); apunta(); pintaPestana(); },
      }));
    }
    const ajuste = (nombre, clave, min, max, def) => deslizador({
      nombre, valor: ap.piel[clave] ?? def, min, max, porDefecto: def,
      alCambiar: (v) => { ap.piel[clave] = v; cambiaForma(); },
    });
    contenido.append(
      seccion('Tono', ajuste('Más clara ↔ más oscura', 'tono', -1, 1, 0), ajuste('Rubor', 'rubor', 0, 1, 0.3), ajuste('Brillo de la piel', 'brillo', 0, 1, 0.5)),
      seccion('Piel', rej),
      seccion('Ojos', ojos),
    );
  }

  function pintaPelo() {
    cabeceraDe('Pelo', 'Peinado, color, canas y cejas.');
    enfoca('cara');
    estudio.enfoca('cara', { distancia: 1.25 });
    const s = sexoActual();
    const de = (hueco) => cat.prendas.filter((p) => p.hueco === hueco).sort((a, b) => (a.sexo === s ? -1 : 0) - (b.sexo === s ? -1 : 0));
    const rej = el('div', { class: 'ep-rejilla' });
    rej.append(opcion({ nada: true, nombre: 'Sin pelo', elegido: !ap.pelo.id, onclick: () => { ap.pelo.id = null; cambiaTodo(); apunta(); pintaPestana(); } }));
    for (const p of de('pelo')) {
      rej.append(opcion({ imagen: mini(`mini_${p.id}.webp`), nombre: p.nombre, elegido: ap.pelo.id === p.id, onclick: () => { ap.pelo.id = p.id; cambiaTodo(); apunta(); pintaPestana(); } }));
    }
    const color = colores(PERSONAJE.coloresPelo, ap.pelo.color, (c, vivo) => {
      ap.pelo.color = c; cambiaForma(); if (!vivo) { apunta(); pintaPestana(); }
    });
    const canas = deslizador({ nombre: 'Canas', valor: ap.pelo.canas ?? 0, porDefecto: 0, formato: (v) => `${Math.round(v * 100)} %`, alCambiar: (v) => { ap.pelo.canas = v; cambiaForma(); } });
    const cejas = el('div', { class: 'ep-rejilla' });
    cejas.append(opcion({ nada: true, nombre: 'Sin cejas', elegido: !ap.cejas.id, onclick: () => { ap.cejas.id = null; cambiaTodo(); apunta(); pintaPestana(); } }));
    for (const p of de('cejas')) {
      cejas.append(opcion({ imagen: mini(`mini_${p.id}.webp`), nombre: p.nombre, elegido: ap.cejas.id === p.id, onclick: () => { ap.cejas.id = p.id; cambiaTodo(); apunta(); pintaPestana(); } }));
    }
    const colorCejas = colores(PERSONAJE.coloresPelo, ap.cejas.color, (c, vivo) => {
      ap.cejas.color = c; cambiaForma(); if (!vivo) { apunta(); pintaPestana(); }
    }, { quitar: true });
    const pestanas = el('div', { class: 'ep-rejilla' });
    for (const p of de('pestanas')) {
      pestanas.append(opcion({ imagen: mini(`mini_${p.id}.webp`), nombre: p.nombre, elegido: ap.pestanas.id === p.id, onclick: () => { ap.pestanas.id = p.id; cambiaTodo(); apunta(); pintaPestana(); } }));
    }
    contenido.append(seccion('Peinado', rej), seccion('Color del pelo', color, canas), seccion('Cejas', cejas),
      seccion('Color de las cejas (∅: como el pelo)', colorCejas), seccion('Pestañas', pestanas));
  }

  let huecoRopa = 'arriba';
  function pintaRopa() {
    cabeceraDe('Ropa', 'Lo que llevas puesto el primer día. En el pueblo habrá tienda de ropa.');
    enfoca('cuerpo');
    for (const h of HUECOS) {
      chips.append(el('button', { class: 'ep-chip', type: 'button', 'aria-pressed': String(h.id === huecoRopa), texto: h.nombre, onclick: () => { huecoRopa = h.id; pintaPestana(); } }));
    }
    const s = sexoActual();
    const lista = cat.prendas.filter((p) => p.hueco === huecoRopa).sort((a, b) => (a.sexo === s ? -1 : 0) - (b.sexo === s ? -1 : 0));
    const rej = el('div', { class: 'ep-rejilla' });
    const elige = (id) => {
      ap.ropa[huecoRopa] = id;
      if (huecoRopa === 'conjunto' && id) { ap.ropa.arriba = null; ap.ropa.abajo = null; }
      if ((huecoRopa === 'arriba' || huecoRopa === 'abajo') && id) ap.ropa.conjunto = null;
      cambiaTodo(); apunta(); pintaPestana();
    };
    rej.append(opcion({ nada: true, nombre: 'Nada', elegido: !ap.ropa[huecoRopa], onclick: () => elige(null) }));
    for (const p of lista) rej.append(opcion({ imagen: mini(`mini_${p.id}.webp`), nombre: p.nombre, elegido: ap.ropa[huecoRopa] === p.id, onclick: () => elige(p.id) }));
    const puesto = ap.ropa[huecoRopa];
    contenido.append(seccion(HUECOS.find((h) => h.id === huecoRopa).nombre, rej));
    if (puesto) {
      contenido.append(seccion('Color', colores(PERSONAJE.coloresRopa, ap.colores[puesto] ?? null, (c, vivo) => {
        if (c) ap.colores[puesto] = c; else delete ap.colores[puesto];
        cambiaForma(); if (!vivo) { apunta(); pintaPestana(); }
      }, { quitar: true })));
    }
    if (huecoRopa === 'calzado') estudio.enfoca('pies');
  }
  pintaPestana();

  // ================================================================ cámara, giro y escultura
  const escultura = creaEscultura({
    motor,
    categorias: () => {
      if (pestana === 'cara') {
        const g = PERSONAJE.gruposCara.find((x) => x.id === grupoAbierto);
        return new Set(g ? g.categorias : PERSONAJE.gruposCara.flatMap((x) => x.categorias));
      }
      if (pestana === 'cuerpo') {
        const g = PERSONAJE.gruposCuerpo.find((x) => x.id === grupoAbierto);
        return new Set(g ? g.categorias : PERSONAJE.gruposCuerpo.flatMap((x) => x.categorias));
      }
      return null;
    },
  });
  const rayo = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  const punteros = new Map();
  let arrastre = null;     // { tipo: 'giro' | 'esculpe', x, y }
  let distanciaPellizco = 0;
  const uResalta = personaje.cuerpo.material.userData.uniformes;
  const tamano = () => renderer.domElement.getBoundingClientRect();

  function tocaCuerpo(x, y) {
    const r = tamano();
    puntero.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, estudio.camara);
    const golpe = rayo.intersectObject(personaje.cuerpo, false)[0];
    if (!golpe) return null;
    // El vértice de la cara tocada más cercano al punto
    const ind = personaje.cuerpo.geometry.index.array;
    const pos = personaje.posicionCuerpo;
    const mapaDib = personaje.cuerpo.geometry.userData.mapa;
    const f = golpe.face;
    const local = personaje.raiz.worldToLocal(golpe.point.clone());
    let mejor = -1; let dMejor = Infinity;
    for (const vi of [f.a, f.b, f.c]) {
      const v = mapaDib ? mapaDib[vi] : vi;
      const d = (pos[v * 3] - local.x) ** 2 + (pos[v * 3 + 1] - local.y) ** 2 + (pos[v * 3 + 2] - local.z) ** 2;
      if (d < dMejor) { dMejor = d; mejor = v; }
    }
    return { v: mejor, punto: golpe.point, ind };
  }
  const aPantalla = (local) => {
    const r = tamano();
    personaje.raiz.localToWorld(local).project(estudio.camara);
    return { x: (local.x * 0.5 + 0.5) * r.width, y: (-local.y * 0.5 + 0.5) * r.height };
  };
  const marcaEsculpidos = () => {
    const ids = new Set(escultura.deslizadores);
    contenido.querySelectorAll('.ep-deslizador').forEach((c) => c.classList.toggle('ep-esculpe', ids.has(c.dataset.id)));
  };

  if (import.meta.env.DEV) Object.assign(window.__editorPersonaje, { tocaCuerpo, escultura, aPantalla });
  capa.addEventListener('pointerdown', (e) => {
    capa.setPointerCapture(e.pointerId);
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      distanciaPellizco = Math.hypot(a.x - b.x, a.y - b.y);
      escultura.termina(); arrastre = null;
      return;
    }
    if (pestana === 'cara' || pestana === 'cuerpo') {
      const t = tocaCuerpo(e.clientX, e.clientY);
      if (t && escultura.empieza(t.v, ap)) {
        arrastre = { tipo: 'esculpe', x: e.clientX, y: e.clientY };
        marcaEsculpidos();
        return;
      }
    }
    arrastre = { tipo: 'giro', x: e.clientX, y: e.clientY };
  });
  capa.addEventListener('pointermove', (e) => {
    if (punteros.has(e.pointerId)) punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (distanciaPellizco > 0) estudio.acerca(distanciaPellizco / d);
      distanciaPellizco = d;
      return;
    }
    if (!arrastre) {
      // Resaltado al pasar por encima (solo ratón)
      if (e.pointerType === 'mouse' && (pestana === 'cara' || pestana === 'cuerpo')) {
        const t = tocaCuerpo(e.clientX, e.clientY);
        if (t) {
          uResalta.uResaltaCentro.value.copy(t.punto);
          uResalta.uResaltaRadio.value = pestana === 'cara' ? 0.035 : 0.09;
          capa.style.cursor = 'grab';
        } else { uResalta.uResaltaRadio.value = 0; capa.style.cursor = ''; }
      }
      return;
    }
    const dx = e.clientX - arrastre.x; const dy = e.clientY - arrastre.y;
    arrastre.x = e.clientX; arrastre.y = e.clientY;
    if (arrastre.tipo === 'giro') estudio.gira(dx, dy);
    else if (escultura.mueve(dx, dy, ap, personaje.posicionCuerpo, aPantalla)) {
      cambiaForma();
      for (const id of escultura.deslizadores) contenido.querySelector(`.ep-deslizador[data-id="${CSS.escape(id)}"]`)?.actualiza(ap.detalle[id] ?? 0);
    }
  });
  const suelta = (e) => {
    punteros.delete(e.pointerId);
    if (arrastre?.tipo === 'esculpe') { escultura.termina(); apunta(); setTimeout(marcaEsculpidos, 600); }
    if (punteros.size < 2) distanciaPellizco = 0;
    arrastre = null;
  };
  capa.addEventListener('pointerup', suelta);
  capa.addEventListener('pointercancel', suelta);
  capa.addEventListener('pointerleave', () => { uResalta.uResaltaRadio.value = 0; });
  capa.addEventListener('wheel', (e) => { e.preventDefault(); estudio.acerca(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
  const teclas = (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); vuelve(e.shiftKey ? 1 : -1); }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') { e.preventDefault(); vuelve(1); }
  };
  window.addEventListener('keydown', teclas);

  // --- Terminar
  let cerrado = false;
  let resuelve;
  const terminado = new Promise((r) => { resuelve = r; });
  botonFin.addEventListener('click', () => {
    if (progresoJuego && !progresoJuego().listo) return;
    delete ap.piel.auto;
    const final = normaliza(ap);
    final.herencia = ap.herencia;
    guarda(final);
    alTerminar?.(final);
    resuelve(final);
    if (progresoJuego || volverAlJuego) cierra();
  });
  botonCancelar?.addEventListener('click', () => { resuelve(null); cierra(); });

  function cierra() {
    if (cerrado) return;
    cerrado = true;
    window.removeEventListener('keydown', teclas);
    mezclador.stopAllAction();
    personaje.libera();
    estudio.libera();
    raiz.remove();
  }

  // ================================================================ bucle
  const exposicionJuego = renderer.toneMappingExposure;
  const api = {
    terminado,
    cierra,
    get abierto() { return !cerrado; },
    actualiza(dt) {
      if (cerrado) return;
      if (formaPendiente) { formaPendiente = false; personaje.actualizaForma(ap); pintaMedidas(); }
      if (reposoPendiente > 0) { reposoPendiente -= dt; if (reposoPendiente <= 0) ponReposo(); }
      mezclador.update(dt);
      // Parpadeo cada 2–6 s y una sonrisa suave que va y viene
      tParpadeo -= dt;
      if (tParpadeo <= 0) { parpadeo = 1; tParpadeo = 2 + Math.random() * 4; }
      parpadeo = Math.max(0, parpadeo - dt * 7);
      const cierre = parpadeo > 0.5 ? (1 - parpadeo) * 2 : parpadeo * 2;
      personaje.expresion('parpadeo', Math.min(1, cierre * 1.1));
      if (Math.random() < dt * 0.15) sonrisaMeta = Math.random() < 0.5 ? 0.05 : 0.45;
      sonrisa += (sonrisaMeta - sonrisa) * Math.min(1, dt * 1.5);
      personaje.expresion('sonrisa', sonrisa);
      const r = tamano();
      const movil = r.width <= 820;
      estudio.ponHueco(movil ? { izquierda: 0, abajo: 0.46 } : { izquierda: Math.min(0.45, (PERSONAJE_PANEL + 100) / r.width), abajo: 0 });
      estudio.actualiza(dt, r.width, r.height);
      if (progresoJuego) {
        const p = progresoJuego();
        carga.hidden = p.listo;
        carga.querySelector('.ep-barra span').style.width = `${Math.round(p.fraccion * 100)}%`;
        carga.querySelector('span').textContent = p.texto || 'Cargando el pueblo…';
        botonFin.disabled = !p.listo;
        botonFin.textContent = p.listo ? '¡A Cabanillas!' : `Cargando el pueblo… ${Math.round(p.fraccion * 100)} %`;
      }
    },
    render() {
      if (cerrado) return;
      const exp = renderer.toneMappingExposure;
      renderer.toneMappingExposure = 1.0;
      renderer.render(estudio.escena, estudio.camara);
      renderer.toneMappingExposure = exp ?? exposicionJuego;
    },
  };
  // En desarrollo: avanzar el editor a mano (el panel oculto del navegador no da fotogramas)
  if (import.meta.env.DEV) window.__editorPersonaje.avanza = (s = 1) => { for (let t = 0; t < s; t += 1 / 30) api.actualiza(1 / 30); api.render(); };
  return api;
}
