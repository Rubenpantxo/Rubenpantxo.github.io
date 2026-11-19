// Física sencilla del salto (sin Rapier): caída libre con velocidad límite y planeo con el
// paracaídas. «c» es el cuerpo: { x, y, z, vx, vy, vz, rumbo } (rumbo: guiñada de three.js,
// 0 = mirando al norte, −Z). vy positiva hacia arriba.
import { SALTO } from '../config/salto.js';

const acerca = (actual, objetivo, k) => actual + (objetivo - actual) * k;

// Altura a la que se abre solo: antes cuanto más rápido se cae
export function alturaApertura(vy) {
  const A = SALTO.apertura;
  return A.alturaAutoBaseM + A.factorAuto * Math.max(0, Math.abs(vy) - A.vReferencia);
}

// Entrada: { avance: −1…1 (W/S), lateral: −1…1 (A/D) }
function giraYAvanza(c, entrada, dt, giroRad, bajada, avance, respuesta) {
  c.rumbo -= (entrada.lateral ?? 0) * giroRad * dt;
  const k = 1 - Math.exp(-dt * respuesta);
  c.vx = acerca(c.vx, -Math.sin(c.rumbo) * avance, k);
  c.vz = acerca(c.vz, -Math.cos(c.rumbo) * avance, k);
  // Bajada: si cae más despacio que el límite, acelera con la gravedad; si va más rápido, frena
  if (-c.vy < bajada) c.vy = Math.max(c.vy - SALTO.caida.gravedad * dt, -bajada);
  else c.vy = acerca(c.vy, -bajada, k);
  c.x += c.vx * dt;
  c.y += c.vy * dt;
  c.z += c.vz * dt;
}

export function pasoCaida(c, entrada, dt) {
  const C = SALTO.caida;
  const a = entrada.avance ?? 0;
  const bajada = a > 0 ? C.vPicado : a < 0 ? C.vAbierto : C.vLimite;
  const avance = a > 0 ? C.avancePicadoMs : a < 0 ? C.avanceAbiertoMs : C.avanceMs;
  giraYAvanza(c, entrada, dt, C.giroRad, bajada, avance, C.respuesta);
}

// «alturaSuelo»: altura sobre el suelo (m) antes del paso, para posarse al final
export function pasoPlaneo(c, entrada, dt, alturaSuelo) {
  const P = SALTO.planeo;
  const a = entrada.avance ?? 0;
  let bajada = a > 0 ? P.bajadaRapidaMs : a < 0 ? P.bajadaLentaMs : P.bajadaMs;
  const avance = a > 0 ? P.avanceRapidoMs : a < 0 ? P.avanceLentoMs : P.avanceMs;
  if (alturaSuelo < P.alturaFrenadaM) bajada = P.bajadaPosarseMs;
  giraYAvanza(c, entrada, dt, P.giroRad, bajada, avance, P.respuesta);
}

// Apertura: de la caída al planeo en «duracionS» (k: 0 → 1)
export function pasoApertura(c, entrada, dt) {
  const P = SALTO.planeo;
  const k = 1 - Math.exp(-dt * 3.2);
  c.vy = acerca(c.vy, -P.bajadaMs, k);
  c.vx = acerca(c.vx, -Math.sin(c.rumbo) * P.avanceMs, k);
  c.vz = acerca(c.vz, -Math.cos(c.rumbo) * P.avanceMs, k);
  c.rumbo -= (entrada.lateral ?? 0) * P.giroRad * 0.5 * dt;
  c.x += c.vx * dt;
  c.y += c.vy * dt;
  c.z += c.vz * dt;
}

// Que no se salga de la zona del juego: empuja hacia dentro cerca del borde
export function dentroDeZona(c, mitadAncho, mitadAlto, margen) {
  const lx = mitadAncho - margen;
  const lz = mitadAlto - margen;
  if (c.x > lx) { c.x = lx; c.vx = Math.min(c.vx, 0); }
  if (c.x < -lx) { c.x = -lx; c.vx = Math.max(c.vx, 0); }
  if (c.z > lz) { c.z = lz; c.vz = Math.min(c.vz, 0); }
  if (c.z < -lz) { c.z = -lz; c.vz = Math.max(c.vz, 0); }
}

// Punto previsto de aterrizaje: sigue en línea recta con la velocidad actual hasta el suelo
// (en caída libre, contando con que se abrirá a la altura automática y planeará después)
export function prediceAterrizaje(c, alturaSuelo, fase) {
  const P = SALTO.planeo;
  const vh = Math.hypot(c.vx, c.vz) || 1e-6;
  const ux = c.vx / vh;
  const uz = c.vz / vh;
  let distancia;
  if (fase === 'caida') {
    const hAbre = Math.min(alturaSuelo, alturaApertura(c.vy));
    distancia = vh * Math.max(0, alturaSuelo - hAbre) / Math.max(1, -c.vy) + P.avanceMs * hAbre / P.bajadaMs;
  } else {
    distancia = vh * alturaSuelo / Math.max(0.5, -c.vy);
  }
  return { x: c.x + ux * distancia, z: c.z + uz * distancia };
}
