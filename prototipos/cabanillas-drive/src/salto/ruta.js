// Ruta del avión: una recta al azar que cruza el pueblo pasando cerca del centro del casco.
// Con semilla (?salto=123) sale siempre la misma, para repetir pruebas.
import { SALTO } from '../config/salto.js';

// Generador pequeño con semilla (mulberry32)
export function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// «centro»: punto del casco ({x, z}); «alturaSuelo»: cota del suelo allí (m, sistema local)
export function creaRuta({ semilla, centro, alturaSuelo }) {
  const A = SALTO.avion;
  const r = azar(semilla);
  const angulo = r() * Math.PI * 2;
  const dx = Math.sin(angulo);
  const dz = -Math.cos(angulo);
  // El punto por el que pasa, desplazado de lado respecto al centro
  const desvio = (r() * 2 - 1) * A.desvioCentroM;
  const cx = centro.x + dz * desvio;
  const cz = centro.z - dx * desvio;
  const y = alturaSuelo + A.alturaM;
  // Posición a «s» metros del punto central (negativo: antes de llegar)
  const punto = (s, destino = { x: 0, y: 0, z: 0 }) => {
    destino.x = cx + dx * s;
    destino.y = y;
    destino.z = cz + dz * s;
    return destino;
  };
  return {
    semilla, dx, dz, y, punto,
    inicio: -A.inicioM,
    saltoForzoso: A.saltoForzosoM,
    fin: A.finM,
    rumbo: Math.atan2(-dx, -dz),        // guiñada de three.js (0 = mirando al norte, −Z)
  };
}
