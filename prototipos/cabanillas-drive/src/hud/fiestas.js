// Marcador del modo fiestas (PLAN_FIESTAS.md §4b, F4). Arriba, el panel del jugador (puntos,
// tiempo, pases, vida y energía) y el de la vaquilla (fuerza, lo que hace y a cuántos metros
// está); debajo, el aviso grande de los momentos clave; abajo, el consejo o el refugio al
// alcance y, con teclado, las teclas de las suertes, que se encienden cuando la vaca está a
// distancia buena (en táctil se encienden los propios botones).
const ESTILO = `
#hud-fiestas { position: fixed; inset: 0; z-index: 5; pointer-events: none; font: 600 13px system-ui, sans-serif; color: #fff; }
#hud-fiestas .paneles { position: absolute; top: max(10px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%);
  display: flex; gap: 8px; align-items: stretch; }
#hud-fiestas .panel { background: rgba(16, 22, 30, .8); border-radius: 10px; padding: 6px 10px; display: grid; gap: 4px; min-width: 150px; }
#hud-fiestas .cifras { display: flex; gap: 12px; justify-content: space-between; }
#hud-fiestas .cifra { display: grid; justify-items: center; line-height: 1.1; }
#hud-fiestas .cifra b { font-size: 18px; font-variant-numeric: tabular-nums; }
#hud-fiestas .cifra span, #hud-fiestas .fila span { font-size: 10px; font-weight: 600; opacity: .75; text-transform: uppercase; letter-spacing: .04em; }
#hud-fiestas .fila { display: grid; grid-template-columns: 50px 1fr; align-items: center; gap: 6px; }
#hud-fiestas .barra { height: 8px; border-radius: 4px; background: rgba(255, 255, 255, .2); overflow: hidden; }
#hud-fiestas .barra i { display: block; height: 100%; width: 100%; border-radius: 4px; }
#hud-fiestas .vaca-titulo { display: flex; justify-content: space-between; gap: 10px; }
#hud-fiestas .vaca-hace { font-size: 15px; min-height: 1.2em; }
#hud-fiestas .aviso { position: absolute; top: calc(max(10px, env(safe-area-inset-top)) + 96px); left: 50%; transform: translateX(-50%);
  padding: 6px 16px; border-radius: 10px; background: rgba(16, 22, 30, .82); font-size: clamp(17px, 3.4vw, 26px); font-weight: 800;
  white-space: nowrap; text-shadow: 0 1px 3px rgba(0, 0, 0, .8); }
#hud-fiestas .aviso.ole { color: #ffd54a; }
#hud-fiestas .aviso.cogida { color: #ff7a66; }
#hud-fiestas .aviso.fin { color: #7fe0d0; }
#hud-fiestas .abajo { position: absolute; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%);
  display: grid; gap: 6px; justify-items: center; text-shadow: 0 1px 3px rgba(0, 0, 0, .8); }
#hud-fiestas .pista { padding: 4px 10px; border-radius: 8px; background: rgba(16, 22, 30, .78); max-width: 46vw; text-align: center; }
#hud-fiestas .teclas { display: flex; gap: 6px; }
#hud-fiestas .tecla { padding: 3px 8px; border-radius: 7px; background: rgba(16, 22, 30, .78); border: 1px solid rgba(255, 255, 255, .25); opacity: .7; }
#hud-fiestas .tecla.listo { opacity: 1; border-color: #ffd54a; box-shadow: 0 0 9px #ffd54a; }
@media (max-height: 480px) {
  #hud-fiestas .panel { padding: 4px 8px; min-width: 132px; }
  #hud-fiestas .cifra b { font-size: 15px; }
  #hud-fiestas .aviso { top: calc(max(10px, env(safe-area-inset-top)) + 82px); }
}`;
const HACE = { corral: 'En el corral', saliendo: '¡Sale!', reconoce: 'A su aire', fija: 'Te mira', embiste: 'Embestida', frena: 'Pasa de largo', derrote: 'Remata en la valla' };
const SUERTES = [['quiebro', 'Q', 'Quiebro'], ['recorte', 'E', 'Recorte'], ['salto', 'Espacio', 'Salto'], ['especial', 'E+Espacio', 'Especial']];

export function creaHudFiestas() {
  const tactil = matchMedia('(pointer: coarse)').matches;
  const crea = (etiqueta, clase, padre, texto = '') => {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    e.textContent = texto;
    padre?.append(e);
    return e;
  };
  const raiz = crea('div', '', document.body);
  raiz.id = 'hud-fiestas';
  crea('style', '', raiz, ESTILO);
  const paneles = crea('div', 'paneles', raiz);

  // Panel del jugador
  const jugador = crea('div', 'panel', paneles);
  const cifras = crea('div', 'cifras', jugador);
  const cifra = (rotulo) => { const c = crea('div', 'cifra', cifras); const b = crea('b', '', c, '0'); crea('span', '', c, rotulo); return b; };
  const puntos = cifra('Puntos'); const tiempo = cifra('Tiempo'); const pases = cifra('Pases');
  const barra = (padre, rotulo, color) => {
    const fila = crea('div', 'fila', padre);
    crea('span', '', fila, rotulo);
    const relleno = crea('i', '', crea('div', 'barra', fila));
    relleno.style.background = color;
    return relleno;
  };
  const vida = barra(jugador, 'Vida', '#5fd068');
  const energia = barra(jugador, 'Energía', '#ffd54a');

  // Panel de la vaquilla
  const panelVaca = crea('div', 'panel', paneles);
  const titulo = crea('div', 'vaca-titulo', panelVaca);
  crea('span', '', titulo, 'Vaquilla').style.cssText = 'font-size:10px;opacity:.75;text-transform:uppercase;letter-spacing:.04em';
  const metros = crea('b', '', titulo, '');
  const hace = crea('div', 'vaca-hace', panelVaca);
  const fuerza = barra(panelVaca, 'Fuerza', '#e2553f');
  const estadoFuerza = crea('div', '', panelVaca);
  estadoFuerza.style.cssText = 'font-size:11px;opacity:.85';

  const aviso = crea('div', 'aviso', raiz);
  aviso.hidden = true;
  const abajo = crea('div', 'abajo', raiz);
  const pista = crea('div', 'pista', abajo);
  const teclas = {};
  if (!tactil) {
    const fila = crea('div', 'teclas', abajo);
    for (const [id, tecla, nombre] of SUERTES) teclas[id] = crea('div', 'tecla', fila, `${tecla} · ${nombre}`);
  }
  const botones = Object.fromEntries(SUERTES.map(([id]) => [id, document.querySelector(`.botones-fiestas [data-pulsar="${id}"]`)]));
  const botonRefugio = document.querySelector('[data-pulsar="refugio"]');
  const puesto = new Map();      // lo último escrito en cada elemento, para no tocar el DOM sin cambios
  const pon = (e, texto) => { if (puesto.get(e) !== texto) { puesto.set(e, texto); e.textContent = texto; } };
  const ancho = (e, valor) => { const t = `${Math.round(valor * 100)}%`; if (puesto.get(e) !== t) { puesto.set(e, t); e.style.width = t; } };

  return {
    // marcador: el de recortes.js (o null); vaca: { estado, fuerza, distancia } (o null); listos: suertes a distancia buena
    actualiza({ energia: e, agotado, pista: p, marcador = null, vaca = null, listos = {} }) {
      ancho(energia, e);
      energia.style.background = agotado ? '#e2553f' : e < 0.3 ? '#f0a23a' : '#ffd54a';
      if (marcador) {
        pon(puntos, String(marcador.puntos));
        pon(tiempo, String(Math.ceil(marcador.tiempo)));
        pon(pases, String(marcador.pases));
        ancho(vida, marcador.vida);
        vida.style.background = marcador.vida < 0.36 ? '#e2553f' : '#5fd068';
      }
      panelVaca.style.display = vaca ? 'grid' : 'none';
      if (vaca) {
        pon(hace, HACE[vaca.estado] ?? '');
        pon(metros, vaca.estado === 'corral' ? '' : `${Math.round(vaca.distancia)} m`);
        ancho(fuerza, vaca.fuerza);
        pon(estadoFuerza, marcador?.textoFuerza(vaca.fuerza) ?? '');
      }
      const a = marcador?.aviso ?? null;
      aviso.hidden = !a;
      if (a) { pon(aviso, a.texto); aviso.className = `aviso ${a.clase}`; }
      const texto = p ? (tactil ? '' : `F: ${p.texto}`) : (marcador && vaca ? marcador.consejo : '');
      pon(pista, texto);
      pista.style.visibility = texto ? 'visible' : 'hidden';
      for (const [id] of SUERTES) {
        const listo = Boolean(listos[id]);
        teclas[id]?.classList.toggle('listo', listo);
        botones[id]?.classList.toggle('listo', listo);
      }
      if (botonRefugio) {
        botonRefugio.hidden = !p;
        botonRefugio.textContent = p?.bajar ? 'Bajar' : 'Subir';
        botonRefugio.classList.toggle('listo', Boolean(p));
      }
    },
    mostrar(visible) { raiz.style.display = visible ? 'block' : 'none'; },
    quita() {
      raiz.remove();
      for (const b of Object.values(botones)) b?.classList.remove('listo');
      if (botonRefugio) botonRefugio.hidden = true;
    },
  };
}
