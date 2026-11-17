// La manada del encierro (F5): lleva a las vacas juntas por el eje del recorrido. Sale del
// corral, va hasta el final de la calle y vuelve a la plaza, tantas veces como vueltas haya, y
// al acabar las manda al corral. Van de dos en fondo detrás de un punto guía que avanza por el
// eje; de vez en cuando una se descuelga unos metros y luego alcanza a las demás.
// No usa Three.js ni el navegador (tools/prueba_modos.mjs la prueba tal cual).
import { FIESTAS } from '../config/fiestas.js';

export function creaManada({ vacas, camino, corral, azar = Math.random }) {
  const E = FIESTAS.partida.encierro;
  const sCorral = camino.s(corral.salida[0], corral.salida[1]);
  // Destinos, en metros del eje (0 = final de la calle)
  const destinos = [];
  for (let i = 0; i < E.vueltas; i++) destinos.push(E.margenFinalM, sCorral);
  const entre = ([a, b]) => a + (b - a) * azar();
  let tramo = 0;
  let guia = sCorral;
  let terminada = false;
  let descolgada = null;          // { vaca, t, dura }
  let hastaDescolgar = entre(E.descuelga.cadaS);

  const sueltas = () => vacas.filter((v) => v.estado !== 'corral' && v.estado !== 'saliendo' && !v.guardada);
  const sDe = (v) => { const p = v.posicion(); return camino.s(p.x, p.z); };

  function paso(dt) {
    if (terminada) return;
    const fuera = sueltas();
    if (!fuera.length) return;
    const destino = destinos[tramo];
    const sentido = Math.sign(destino - guia) || 1;
    // La guía no se escapa de la vaca que va primera
    const primera = Math.max(...fuera.map((v) => sDe(v) * sentido));
    // ni arranca hasta que han salido todas del corral
    const todasFuera = fuera.length === vacas.filter((v) => !v.guardada).length;
    if (todasFuera && guia * sentido - primera < E.liderDelanteM) guia += sentido * E.velocidadMs * dt;
    if ((destino - guia) * sentido <= 0) {
      tramo++;
      if (tramo >= destinos.length) {
        terminada = true;
        for (const v of vacas) v.recoge();
        return;
      }
    }
    // Alguna se descuelga
    hastaDescolgar -= dt;
    if (descolgada) {
      descolgada.t += dt;
      if (descolgada.t >= descolgada.dura) descolgada = null;
    } else if (hastaDescolgar <= 0 && fuera.length > 1) {
      descolgada = { vaca: fuera[1 + Math.floor(azar() * (fuera.length - 1))], t: 0, dura: entre(E.descuelga.duraS) };
      hastaDescolgar = entre(E.descuelga.cadaS);
    }
    vacas.forEach((v, i) => {
      if (!fuera.includes(v)) return;
      let atras = Math.floor(i / 2) * E.filaM;
      if (descolgada?.vaca === v) atras += E.descuelga.metros * Math.sin(Math.PI * descolgada.t / descolgada.dura);
      const s = guia - sentido * atras;
      const p = camino.punto(s);
      const d = camino.direccion(s);
      const lado = (i % 2 ? 1 : -1) * E.ladoM;
      const x = p[0] - d[1] * lado; const z = p[1] + d[0] * lado;
      const q = v.posicion();
      const falta = Math.hypot(x - q.x, z - q.z);
      v.guia({ x, z, velocidad: E.velocidadMs * Math.min(1.35, Math.max(0.4, 0.75 + falta * 0.25)) });
    });
  }

  return {
    paso,
    get terminada() { return terminada; },
    get tramo() { return tramo; },
    get tramos() { return destinos.length; },
    // Hacia dónde va (+1: hacia la plaza; −1: hacia el final de la calle) y por dónde va la primera
    frente() {
      const fuera = sueltas();
      if (!fuera.length || terminada) return null;
      const sentido = Math.sign(destinos[tramo] - guia) || 1;
      return { sentido, s: Math.max(...fuera.map((v) => sDe(v) * sentido)) * sentido };
    },
  };
}
