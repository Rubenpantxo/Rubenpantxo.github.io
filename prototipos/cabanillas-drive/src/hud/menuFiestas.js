// Menú de fiestas y pantalla de resultados (F5). Una sola capa por encima del juego: el menú
// (los modos, con la mejor marca de cada uno, los controles y unos consejos) o el resultado de
// la partida (con repetir, menú y volver al pueblo). Las mejores marcas se guardan en el navegador.
import { FIESTAS } from '../config/fiestas.js';

const ESTILO = `
#menu-fiestas { position: fixed; inset: 0; z-index: 8; display: grid; place-items: center; background: rgba(10, 14, 20, .72);
  font: 14px/1.4 system-ui, sans-serif; color: #fff; overflow: auto; padding: max(10px, env(safe-area-inset-top)) 12px 12px; box-sizing: border-box; }
#menu-fiestas[hidden] { display: none; }
#menu-fiestas .caja { background: rgba(16, 22, 30, .94); border-radius: 14px; padding: 16px 18px; width: min(720px, 100%); box-sizing: border-box;
  display: grid; gap: 10px; }
#menu-fiestas h2 { margin: 0; font-size: 22px; text-align: center; }
#menu-fiestas h2 small { display: block; font-size: 13px; font-weight: 500; opacity: .75; }
#menu-fiestas .modos { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
#menu-fiestas button { font: inherit; color: inherit; cursor: pointer; border-radius: 10px; border: 1px solid rgba(255, 255, 255, .25);
  background: rgba(255, 255, 255, .08); padding: 9px 10px; text-align: left; display: grid; gap: 2px; }
#menu-fiestas button:hover, #menu-fiestas button:focus-visible { border-color: #ffd54a; outline: none; }
#menu-fiestas button b { font-size: 15px; }
#menu-fiestas button span { font-size: 12px; opacity: .8; }
#menu-fiestas button i { font-style: normal; font-size: 12px; color: #ffd54a; }
#menu-fiestas button.principal { background: #ffd54a; color: #1b2430; border-color: #ffd54a; text-align: center; font-weight: 700; }
#menu-fiestas button.plano { text-align: center; }
#menu-fiestas .ayuda { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; font-size: 12.5px; opacity: .9; }
#menu-fiestas .ayuda ul { margin: 0; padding-left: 16px; }
#menu-fiestas .ayuda h3 { margin: 0 0 2px; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; opacity: .7; }
#menu-fiestas .cifras { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; text-align: center; }
#menu-fiestas .cifras div { background: rgba(255, 255, 255, .07); border-radius: 10px; padding: 8px 4px; }
#menu-fiestas .cifras b { display: block; font-size: 24px; font-variant-numeric: tabular-nums; }
#menu-fiestas .cifras span { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; opacity: .75; }
#menu-fiestas .record { text-align: center; color: #ffd54a; font-weight: 700; }
#menu-fiestas .fila { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
@media (max-height: 480px) {
  #menu-fiestas .caja { padding: 10px 12px; gap: 7px; }
  #menu-fiestas h2 { font-size: 17px; }
  #menu-fiestas h2 small, #menu-fiestas .ayuda .consejos { display: none; }
  #menu-fiestas .ayuda { grid-template-columns: 1fr; }
  #menu-fiestas .cifras b { font-size: 19px; }
}`;

export const OPCIONES = [
  { id: 'plaza', nombre: 'Recorte libre', lugar: 'Vacas en la plaza', texto: 'Una vaca y sin tiempo, para practicar' },
  { id: 'concurso', nombre: 'Concurso', lugar: 'Vacas en la plaza',
    texto: `${FIESTAS.partida.concurso.rondas} rondas de ${FIESTAS.partida.concurso.rondaS} s y nota final` },
  { id: 'calle', nombre: 'Vacas en la calle', lugar: 'Plaza y San Roque',
    texto: `${FIESTAS.partida.calle.vacas} vacas, de una en una; puntúan los recortes y correr delante` },
  { id: 'encierro', nombre: 'Encierro', lugar: 'Del corral al final de la calle y vuelta',
    texto: `${FIESTAS.partida.encierro.vacas} vacas en manada; puntúa correr delante y cerca` },
];
const CLAVE = 'cabanillas.fiestas.marcas';
const MOTIVOS = { completo: 'Festejo terminado', vida: 'Te has quedado sin vida', abandono: 'Lo has dejado' };

export function leeMarcas() {
  try { return JSON.parse(localStorage.getItem(CLAVE)) ?? {}; } catch { return {}; }
}
// Guarda la marca si mejora la que había. Devuelve { mejor, record }
export function apuntaMarca(id, puntos) {
  const marcas = leeMarcas();
  const anterior = marcas[id] ?? 0;
  const record = puntos > anterior;
  if (record) {
    marcas[id] = puntos;
    try { localStorage.setItem(CLAVE, JSON.stringify(marcas)); } catch { /* sin almacenamiento: no se guarda */ }
  }
  return { mejor: Math.max(anterior, puntos), record };
}

export function creaMenuFiestas() {
  const tactil = matchMedia('(pointer: coarse)').matches;
  const raiz = document.createElement('div');
  raiz.id = 'menu-fiestas';
  raiz.hidden = true;
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  const caja = document.createElement('div');
  caja.className = 'caja';
  raiz.append(estilo, caja);
  document.body.append(raiz);
  const crea = (etiqueta, clase, padre, texto = '') => {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    e.textContent = texto;
    padre.append(e);
    return e;
  };
  const boton = (padre, clase, alPulsar, titulo, texto = '', marca = '') => {
    const b = crea('button', clase, padre);
    b.type = 'button';
    if (texto) { crea('b', '', b, titulo); crea('span', '', b, texto); if (marca) crea('i', '', b, marca); } else b.textContent = titulo;
    b.addEventListener('click', alPulsar);
    return b;
  };
  function abre() {
    caja.replaceChildren();
    raiz.hidden = false;
    document.exitPointerLock?.();
  }

  return {
    get visible() { return !raiz.hidden; },
    oculta() { raiz.hidden = true; },
    // alElegir(id): plaza | concurso | calle | encierro | salir
    menu(alElegir) {
      abre();
      const h = crea('h2', '', caja, 'Fiestas de Cabanillas');
      crea('small', '', h, 'Elige festejo');
      const modos = crea('div', 'modos', caja);
      const marcas = leeMarcas();
      for (const o of OPCIONES) {
        boton(modos, '', () => alElegir(o.id), o.nombre, o.texto, marcas[o.id] ? `Mejor marca: ${marcas[o.id]} puntos` : '');
      }
      const ayuda = crea('div', 'ayuda', caja);
      const controles = crea('div', '', ayuda);
      crea('h3', '', controles, 'Controles');
      const lista = crea('ul', '', controles);
      const lineas = tactil
        ? ['Joystick: moverse; a fondo, esprint', 'Botones: Quiebro, Recorte, Salto y Especial', 'Quiebro dos veces seguidas: ida y vuelta',
          'Subir: aparece junto a la valla o el burladero', '👁: cámara · ☰: pausa']
        : ['WASD y ratón: moverse y mirar · Mayús: esprint', 'Q quiebro · E recorte · Espacio salto', 'E y Espacio a la vez: salto al trascuerno',
          'Q dos veces seguidas: quiebro de ida y vuelta', 'F: subir a la valla o al burladero, y bajar · V: cámara'];
      for (const l of lineas) crea('li', '', lista, l);
      const consejos = crea('div', 'consejos', ayuda);
      crea('h3', '', consejos, 'Consejos');
      const lista2 = crea('ul', '', consejos);
      for (const c of FIESTAS.recortes.consejos) crea('li', '', lista2, c);
      boton(caja, 'plano', () => alElegir('salir'), 'Volver al pueblo');
    },
    // resultado: el de partida.js más { id, mejor, record }. acciones: { repetir, menu, salir }
    resultados(resultado, acciones) {
      abre();
      const o = OPCIONES.find((x) => x.id === resultado.id);
      const h = crea('h2', '', caja, o?.nombre ?? 'Resultado');
      crea('small', '', h, MOTIVOS[resultado.motivo] ?? '');
      const cifras = crea('div', 'cifras', caja);
      const cifra = (valor, rotulo) => { const d = crea('div', '', cifras); crea('b', '', d, String(valor)); crea('span', '', d, rotulo); };
      cifra(resultado.puntos, 'Puntos');
      if (resultado.nota !== null) cifra(resultado.nota.toLocaleString('es-ES', { minimumFractionDigits: 1 }), 'Nota');
      cifra(resultado.pases, 'Pases');
      cifra(resultado.cogidas, 'Cogidas');
      if (resultado.metros !== null) cifra(`${resultado.metros} m`, 'Delante de la vaca');
      if (resultado.segundos !== null) cifra(`${resultado.segundos} s`, 'Delante de la manada');
      crea('div', 'record', caja, resultado.record ? '¡Nueva mejor marca!' : `Mejor marca: ${resultado.mejor} puntos`);
      const fila = crea('div', 'fila', caja);
      boton(fila, 'principal', acciones.repetir, 'Repetir');
      boton(fila, 'plano', acciones.menu, 'Menú de fiestas');
      boton(fila, 'plano', acciones.salir, 'Volver al pueblo');
    },
    quita() { raiz.remove(); },
  };
}
