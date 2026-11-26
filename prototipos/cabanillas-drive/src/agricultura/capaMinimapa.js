// Capa del minimapa para el modo agricultura (PLAN_AGRICULTURA.md §5.7, A9): las parcelas que se han
// trabajado, coloreadas por su estado (rastrojo, arada, preparada, sembrada, madura, cosechada); los
// contornos de las parcelas de alrededor mientras se conduce una máquina; y la máquina con la anchura
// de su apero o su cabezal. Se engancha a hud/minimapa.js con capaMinimapa.dibuja.
import { capaMinimapa } from '../hud/minimapa.js';
import { CULTIVOS } from '../config/cultivos.js';

export const COLORES_ESTADO = {
  rastrojo: '#c9b98a', arada: '#8a5d3a', preparada: '#5e3f27', sembrada: '#6fbf5a', madura: '#e3b52f', cosechada: '#a89c78',
};
export const NOMBRE_ESTADO = {
  rastrojo: 'rastrojo', arada: 'arada', preparada: 'preparada', sembrada: 'sembrada', madura: 'madura', cosechada: 'cosechada',
};

// Estado de una parcela activa (para el mapa y para el menú)
export function estadoParcela(p, dia) {
  const r = p.recuento();
  if (p.siembra && r.sembrado + r.cosechado > 0) {
    if (r.cosechado > 50) return { id: 'cosechada', cosechado: r.cosechado };
    const c = CULTIVOS[p.siembra.cultivo];
    const edad = dia - p.siembra.ultimoDia;
    return { id: edad >= c.madura ? 'madura' : 'sembrada', edad, faltan: Math.max(0, Math.ceil(c.madura - edad)), cultivo: c.nombre };
  }
  if (r.gradeado > 50) return { id: 'preparada' };
  if (r.arado > 50) return { id: 'arada' };
  return { id: 'rastrojo' };
}

// maquina(): null o { x, z, fx, fz, ancho } de lo que se conduce (y su anchura de trabajo)
export function creaCapaMinimapa({ registro, labranza, reloj, maquina }) {
  const cache = new Map();            // ref → { t, color }
  const lista = registro.datos.parcelas;
  const colorDe = (p, ahora) => {
    let c = cache.get(p.ref);
    if (!c || ahora - c.t > 1000 || c.version !== p.version) {
      c = { t: ahora, version: p.version, color: COLORES_ESTADO[estadoParcela(p, reloj.dia).id] };
      cache.set(p.ref, c);
    }
    return c.color;
  };
  const traza = (ctx, info, aPunto) => {
    ctx.beginPath();
    for (const anillos of info.partes) {
      for (const anillo of anillos) {
        anillo.forEach((q, i) => { const [x, y] = aPunto(q[0], q[1]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
        ctx.closePath();
      }
    }
  };
  const dibuja = (ctx, aPunto, u, { pxPorM, radioM, x, z, grande }) => {
    const ahora = performance.now();
    const m = maquina();
    ctx.save();
    ctx.lineJoin = 'round';
    // Contornos de las parcelas de alrededor (con una máquina, o con el mapa grande muy acercado)
    if (m || (grande && pxPorM > 1.2)) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1 * u;
      for (const info of lista) {
        const [x0, z0, x1, z1] = info.caja;
        if (x1 < x - radioM || x0 > x + radioM || z1 < z - radioM || z0 > z + radioM) continue;
        if (labranza.parcelas.has(info.ref)) continue;
        traza(ctx, info, aPunto);
        ctx.stroke();
      }
    }
    // Parcelas trabajadas, por su estado
    for (const p of labranza.parcelas.values()) {
      const [x0, z0, x1, z1] = p.info.caja;
      if (x1 < x - radioM || x0 > x + radioM || z1 < z - radioM || z0 > z + radioM) continue;
      traza(ctx, p.info, aPunto);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = colorDe(p, ahora);
      ctx.fill('evenodd');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6 * u;
      ctx.stroke();
    }
    // La máquina con su anchura de trabajo (una barra de ancho real, y como poco visible)
    if (m) {
      const px = -m.fz; const pz = m.fx;
      const medio = Math.max(m.ancho / 2, (3 * u) / pxPorM);
      const largo = Math.max(0.9, (2 * u) / pxPorM);
      const esq = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) =>
        aPunto(m.x + px * medio * a + m.fx * largo * b, m.z + pz * medio * a + m.fz * largo * b));
      ctx.beginPath();
      esq.forEach(([cx, cy], i) => { if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy); });
      ctx.closePath();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#ffb300';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#1b2430';
      ctx.lineWidth = 1.2 * u;
      ctx.stroke();
    }
    ctx.restore();
  };
  return {
    pon() { capaMinimapa.dibuja = dibuja; },
    quita() { if (capaMinimapa.dibuja === dibuja) capaMinimapa.dibuja = null; },
  };
}
