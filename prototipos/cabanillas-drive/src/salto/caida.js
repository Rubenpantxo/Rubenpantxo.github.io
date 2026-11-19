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

// Peso del desvío automático a la calle según la altura: 0 arriba … 1 en los últimos metros
export function pesoDesvio(alturaSuelo) {
  const D = SALTO.planeo.desvio;
  const t = Math.max(0, Math.min(1, (D.alturaInicioM - alturaSuelo) / (D.alturaInicioM - D.alturaPlenoM)));
  return t * t * (3 - 2 * t);
}

// Desvío hacia «objetivo» ({x, z}) con peso 0…1: lleva la velocidad horizontal a la que hace
// falta para llegar justo al tocar el suelo y vuelve el rumbo hacia allí. Va después de pasoPlaneo.
export function pasoDesvio(c, objetivo, peso, dt, alturaSuelo) {
  if (peso <= 0) return;
  const D = SALTO.planeo.desvio;
  const dx = objetivo.x - c.x;
  const dz = objetivo.z - c.z;
  const d = Math.hypot(dx, dz);
  const tiempo = Math.max(0.4, alturaSuelo / Math.max(0.5, -c.vy));
  const v = Math.min(D.vMaxMs, d / tiempo);
  const vx = d > 1e-3 ? (dx / d) * v : 0;
  const vz = d > 1e-3 ? (dz / d) * v : 0;
  // Mezcla directa con lo que ha decidido el jugador: el peso ya sube poco a poco con la bajada
  const k = peso;
  const vxAntes = c.vx;
  const vzAntes = c.vz;
  c.vx = acerca(c.vx, vx, k);
  c.vz = acerca(c.vz, vz, k);
  // pasoPlaneo ya ha movido con la velocidad de antes: se añade la diferencia
  c.x += (c.vx - vxAntes) * dt;
  c.z += (c.vz - vzAntes) * dt;
  // El personaje mira hacia donde le lleva (si aún está a unos metros)
  if (d > 2) {
    const rumbo = Math.atan2(-dx, -dz);
    let giro = rumbo - c.rumbo;
    giro = Math.atan2(Math.sin(giro), Math.cos(giro));
    c.rumbo += giro * Math.min(1, peso * dt * 3);
  }
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
