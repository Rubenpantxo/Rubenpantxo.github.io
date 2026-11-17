// La vaca del modo fiestas: modelo propio hecho con primitivas (vaquilla de 1,15 m a la cruz),
// animación por código y comportamiento. No usa Rapier: se mueve en el plano y no sale del
// recinto porque se la mantiene a un radio de sus bordes (los polígonos de src/datos/fiestas.js).
//
// Comportamiento: sale del corral → reconoce (trota a su aire) → se fija en el jugador → embiste
// → pasa de largo o remata en la valla → frena y vuelve a mirar. Corre más que el jugador pero
// gira peor cuanto más deprisa va: de ahí sale el quiebro. No se arranca a quien está a salvo.
// El modelo y las animaciones de Blender que preveía el plan (tools/build_vaca.py) quedan para
// cuando haya Blender; esta vaca es de primitivas, como el coche del principio.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FIESTAS } from '../config/fiestas.js';
import { azarCon } from './vallado.js';

const limita = THREE.MathUtils.clamp;
const anguloCorto = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------------------------------------------------------------- modelo

function pinta(geometria, color) {
  const c = new THREE.Color(color);
  const n = geometria.attributes.position.count;
  const colores = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colores.set([c.r, c.g, c.b], i * 3);
  geometria.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  return geometria.index ? geometria.toNonIndexed() : geometria;
}

// Manchas de la berrenda: color por vértice según dónde cae
function mancha(geometria, claro, oscuro, azar) {
  const a = new THREE.Color(claro); const b = new THREE.Color(oscuro);
  const centros = Array.from({ length: 7 }, () => [azar() * 1.9 - 0.95, azar() * 0.7 + 0.6, azar() * 0.7 - 0.35, 0.22 + azar() * 0.22]);
  const pos = geometria.attributes.position;
  const col = geometria.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const oscura = centros.some(([x, y, z, r]) => Math.hypot(pos.getX(i) - x, pos.getY(i) - y, pos.getZ(i) - z) < r);
    const c = oscura ? b : a;
    col.setXYZ(i, c.r, c.g, c.b);
  }
}

// Modelo: el morro mira a +X. Devuelve el grupo y las partes que se animan
function creaModelo(capa, azar, sombras) {
  const C = FIESTAS.vaca.colores;
  const pelo = capa === 'negra' ? C.negra : capa === 'berrenda' ? C.berrendaClaro : C.colorada;
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const malla = (geometrias) => {
    const m = new THREE.Mesh(mergeGeometries(geometrias), material);
    geometrias.forEach((g) => g.dispose());
    m.castShadow = sombras;
    return m;
  };
  const esfera = (rx, ry, rz, x, y, z, color = pelo) => pinta(new THREE.SphereGeometry(1, 14, 10).scale(rx, ry, rz).translate(x, y, z), color);
  const caja = (sx, sy, sz, x, y, z, color = pelo) => pinta(new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z), color);

  const grupo = new THREE.Group();
  grupo.name = 'fiestas_vaca';
  // Cuerpo: tronco, cruz, grupa
  const tronco = [
    esfera(0.78, 0.36, 0.3, 0, 0.86, 0), esfera(0.34, 0.4, 0.3, 0.5, 0.9, 0), esfera(0.36, 0.38, 0.31, -0.52, 0.88, 0),
    esfera(0.2, 0.16, 0.2, 0.62, 1.12, 0),                                  // morrillo
  ];
  if (capa === 'berrenda') tronco.forEach((g) => mancha(g, C.berrendaClaro, C.berrendaOscuro, azar));
  const cuerpo = malla(tronco);
  grupo.add(cuerpo);
  // Cuello y cabeza: giran en la cruz (bajan al embestir, suben en el derrote)
  const cabeza = new THREE.Group();
  cabeza.position.set(0.72, 0.98, 0);
  const cuerno = (lado) => {
    const g = new THREE.ConeGeometry(0.035, 0.34, 8).translate(0, 0.17, 0);
    g.rotateZ(-0.5).rotateX(lado * 1.05).translate(0.44, 0.2, lado * 0.11);
    return pinta(g, C.cuerno);
  };
  const piezasCabeza = [
    pinta(new THREE.CylinderGeometry(0.15, 0.2, 0.42, 10).rotateZ(-1.15).translate(0.16, 0.04, 0), pelo),   // cuello
    esfera(0.2, 0.15, 0.14, 0.44, 0.08, 0), caja(0.2, 0.15, 0.15, 0.6, 0.01, 0), esfera(0.07, 0.06, 0.09, 0.71, -0.01, 0, C.morro),
    cuerno(1), cuerno(-1),
    esfera(0.03, 0.07, 0.1, 0.36, 0.14, 0.17), esfera(0.03, 0.07, 0.1, 0.36, 0.14, -0.17),                  // orejas
  ];
  if (capa === 'berrenda') mancha(piezasCabeza[1], C.berrendaClaro, C.berrendaOscuro, azar);
  cabeza.add(malla(piezasCabeza));
  grupo.add(cabeza);
  // Patas: giran en su arranque
  const patas = [[0.5, 0.17], [0.5, -0.17], [-0.52, 0.17], [-0.52, -0.17]].map(([x, z]) => {
    const pata = new THREE.Group();
    pata.position.set(x, 0.66, z);
    pata.add(malla([
      pinta(new THREE.CylinderGeometry(0.085, 0.055, 0.42, 8).translate(0, -0.2, 0), capa === 'berrenda' ? C.berrendaClaro : pelo),
      pinta(new THREE.CylinderGeometry(0.05, 0.045, 0.24, 8).translate(0, -0.5, 0), capa === 'berrenda' ? C.berrendaClaro : pelo),
      pinta(new THREE.CylinderGeometry(0.055, 0.06, 0.07, 8).translate(0, -0.63, 0), C.pezuna),
    ]));
    grupo.add(pata);
    return pata;
  });
  // Rabo
  const rabo = new THREE.Group();
  rabo.position.set(-0.86, 0.98, 0);
  rabo.add(malla([pinta(new THREE.CylinderGeometry(0.022, 0.014, 0.62, 6).translate(0, -0.31, 0), pelo),
    esfera(0.035, 0.08, 0.035, 0, -0.66, 0, C.pezuna)]));
  rabo.rotation.z = -0.25;
  grupo.add(rabo);
  return { grupo, cabeza, patas, rabo, cuerpo, material };
}

// ---------------------------------------------------------------- recinto en el plano

function dentroDe(poligono, x, z) {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, zi] = poligono[i]; const [xj, zj] = poligono[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

// Bordes que la vaca no puede cruzar: los del ruedo y, con la puerta abierta, también los de la
// calle menos el tramo de la puerta. Además, los burladeros (un tramo corto cada uno).
export function bordesDelRecinto(recinto, puertaAbierta) {
  const puerta = recinto.puerta;
  const mp = [(puerta.a[0] + puerta.b[0]) / 2, (puerta.a[1] + puerta.b[1]) / 2];
  const esPuerta = (a, b) => Math.hypot((a[0] + b[0]) / 2 - mp[0], (a[1] + b[1]) / 2 - mp[1]) < 0.4;
  const zonas = puertaAbierta ? [recinto.plaza.ruedo, recinto.calle.recorrido] : [recinto.plaza.ruedo];
  const bordes = [];
  for (const pol of zonas) {
    for (let i = 0; i < pol.length; i++) {
      const a = pol[i]; const b = pol[(i + 1) % pol.length];
      if (puertaAbierta && esPuerta(a, b)) continue;
      bordes.push([a, b]);
    }
  }
  for (const b of recinto.burladeros) {
    const t = recinto.tramos.find((x) => x.zona === b.zona && x.lado === b.lado && x.clase === 'fachada');
    const l = Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1]);
    const d = [(t.b[0] - t.a[0]) / l * 0.65, (t.b[1] - t.a[1]) / l * 0.65];
    bordes.push([[b.en[0] - d[0], b.en[1] - d[1]], [b.en[0] + d[0], b.en[1] + d[1]]]);
  }
  return { bordes, zonas, dentro: (x, z) => zonas.some((p) => dentroDe(p, x, z)) };
}

// Eje de todo el recorrido: del final de la calle (s = 0) a la puerta y de la puerta al fondo de
// la plaza. s: metros a lo largo del eje del punto más cercano a (x, z); punto(s) y direccion(s).
export function creaCamino(recinto) {
  const camino = [...recinto.calle.eje.slice().reverse(), ...recinto.plaza.eje.slice(1)];
  const largos = camino.slice(1).map((p, i) => Math.hypot(p[0] - camino[i][0], p[1] - camino[i][1]));
  const largo = largos.reduce((a, b) => a + b, 0);
  function tramoEn(sBuscado) {
    let resto = limita(sBuscado, 0, largo);
    for (let i = 0; i < largos.length; i++) {
      if (resto <= largos[i] || i === largos.length - 1) return { i, t: Math.min(1, resto / largos[i]) };
      resto -= largos[i];
    }
    return { i: largos.length - 1, t: 1 };
  }
  return {
    largo,
    s(px, pz) {
      let mejor = { d: Infinity, s: 0 }; let acumulado = 0;
      for (let i = 0; i < largos.length; i++) {
        const a = camino[i]; const b = camino[i + 1];
        const t = limita(((px - a[0]) * (b[0] - a[0]) + (pz - a[1]) * (b[1] - a[1])) / (largos[i] ** 2), 0, 1);
        const d = Math.hypot(px - a[0] - (b[0] - a[0]) * t, pz - a[1] - (b[1] - a[1]) * t);
        if (d < mejor.d) mejor = { d, s: acumulado + largos[i] * t };
        acumulado += largos[i];
      }
      return mejor.s;
    },
    punto(sBuscado) {
      const { i, t } = tramoEn(sBuscado);
      return [camino[i][0] + (camino[i + 1][0] - camino[i][0]) * t, camino[i][1] + (camino[i + 1][1] - camino[i][1]) * t];
    },
    direccion(sBuscado) {
      const { i } = tramoEn(sBuscado);
      return [(camino[i + 1][0] - camino[i][0]) / largos[i], (camino[i + 1][1] - camino[i][1]) / largos[i]];
    },
  };
}

// ---------------------------------------------------------------- la vaca

export function creaVaca({ recinto, terreno, puertaAbierta, capa = 'colorada', semilla = 7, sombras = true, alturaSuelo = null, esperaS = null }) {
  const V = FIESTAS.vaca;
  const azar = azarCon(semilla);
  const entre = ([a, b]) => a + (b - a) * azar();
  const modelo = creaModelo(capa, azar, sombras);
  const limites = bordesDelRecinto(recinto, puertaAbierta);
  const ruedo = recinto.plaza.ruedo;
  const centroRuedo = [ruedo.reduce((s, p) => s + p[0], 0) / ruedo.length, ruedo.reduce((s, p) => s + p[1], 0) / ruedo.length];
  const corral = recinto.corral;
  // De la manga hacia el ruedo
  const dirSalida = (() => {
    const [f0, , , s0] = corral.manga;
    const l = Math.hypot(s0[0] - f0[0], s0[1] - f0[1]);
    return [(s0[0] - f0[0]) / l, (s0[1] - f0[1]) / l];
  })();
  const suelo = alturaSuelo ?? ((x, z) => terreno.alturaEn(x, z) + (dentroDe(ruedo, x, z) ? FIESTAS.arena.gruesoM : 0));

  let x = corral.salida[0] - dirSalida[0] * 1.2;
  let z = corral.salida[1] - dirSalida[1] * 1.2;
  let rumbo = Math.atan2(dirSalida[0], dirSalida[1]);     // (sin, cos) en (x, z), como las personas
  let v = 0;
  let estado = 'corral';
  let tEstado = 0;
  let dura = esperaS ?? V.salidaS;
  let guia = null;                  // { x, z, velocidad }: la lleva la manada (F5)
  let guardada = false;             // ha vuelto al corral
  let fuerza = 1;
  let reloj = 0;
  let destino = null;               // adonde trota al reconocer
  let cruzado = false;              // ya ha pasado al jugador en esta embestida
  let metrosTrasCruce = 0;
  let golpe = 0;                    // sacudida del derrote (se va apagando)
  let fase = 0;                     // ciclo de las patas
  let embestidas = 0;
  let ultimaCogida = -10;
  const historia = [];              // posiciones del jugador (para el tiempo de reacción)
  const sucesos = [];
  const anota = (tipo, datos = {}) => { sucesos.push({ tipo, t: reloj, ...datos }); if (sucesos.length > 20) sucesos.shift(); };
  function cambia(nuevo, segundos = 0) { estado = nuevo; tEstado = 0; dura = segundos; }

  const giroMax = () => V.giroParado / (1 + (v / V.giroVelRef) ** 2);
  const velocidadTope = () => V.galopeMs * (0.55 + 0.45 * fuerza);

  function giraHacia(objetivoRumbo, dt, factor = 1) {
    const giro = anguloCorto(objetivoRumbo - rumbo);
    const tope = giroMax() * factor * dt;
    rumbo += limita(giro, -tope, tope);
    return Math.abs(giro);
  }

  // Avanza y se mantiene dentro: devuelve cuánto la han empujado los bordes (m)
  function avanza(dt) {
    x += Math.sin(rumbo) * v * dt;
    z += Math.cos(rumbo) * v * dt;
    let empuje = 0;
    for (let vuelta = 0; vuelta < 2; vuelta++) {
      for (const [a, b] of limites.bordes) {
        const ex = b[0] - a[0]; const ez = b[1] - a[1];
        const t = limita(((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez), 0, 1);
        const px = a[0] + ex * t; const pz = a[1] + ez * t;
        const d = Math.hypot(x - px, z - pz);
        if (d < V.radioM && d > 1e-4) {
          const falta = V.radioM - d;
          x += ((x - px) / d) * falta;
          z += ((z - pz) / d) * falta;
          empuje += falta;
        }
      }
    }
    return empuje;
  }

  // --- Orientarse en la calle: si entre la vaca y adonde va hay una valla, sigue el eje del recorrido
  const cruza = (ax, az, bx, bz, [c, d]) => {
    const o = (px, pz, qx, qz, rx, rz) => Math.sign((qx - px) * (rz - pz) - (qz - pz) * (rx - px));
    return o(ax, az, bx, bz, c[0], c[1]) !== o(ax, az, bx, bz, d[0], d[1]) && o(c[0], c[1], d[0], d[1], ax, az) !== o(c[0], c[1], d[0], d[1], bx, bz);
  };
  const seVe = (tx, tz) => !limites.bordes.some((borde) => cruza(x, z, tx, tz, borde));
  const { s: enCamino, punto: puntoDelCamino } = creaCamino(recinto);
  // Hacia dónde tirar para llegar a (tx, tz): derecho si se ve; si no, por el eje hacia allí
  function rumboA(tx, tz) {
    if (seVe(tx, tz)) return [tx, tz];
    const sVaca = enCamino(x, z);
    const sentido = Math.sign(enCamino(tx, tz) - sVaca) || 1;
    for (const adelante of [7, 4, 2, 0]) {
      const p = puntoDelCamino(sVaca + sentido * adelante);
      if (seVe(p[0], p[1])) return p;
    }
    return puntoDelCamino(sVaca);
  }

  function puntoLibre() {
    // Un punto del recinto lejos de los bordes, para trotar hacia él
    for (let i = 0; i < 20; i++) {
      const zona = limites.zonas[Math.floor(azar() * limites.zonas.length)];
      const a = zona[Math.floor(azar() * zona.length)];
      const b = zona[Math.floor(azar() * zona.length)];
      const c = zona[Math.floor(azar() * zona.length)];
      const px = (a[0] + b[0] + c[0]) / 3; const pz = (a[1] + b[1] + c[1]) / 3;
      if (!limites.dentro(px, pz)) continue;
      if (limites.bordes.every(([p, q]) => {
        const ex = q[0] - p[0]; const ez = q[1] - p[1];
        const t = limita(((px - p[0]) * ex + (pz - p[1]) * ez) / (ex * ex + ez * ez), 0, 1);
        return Math.hypot(px - p[0] - ex * t, pz - p[1] - ez * t) > 1.6;
      })) return [px, pz];
    }
    return centroRuedo;
  }

  // «objetivo»: { x, z, seguro, alto } del jugador (alto: pies sobre el suelo). Devuelve un suceso
  // si pasa algo que le importa al juego: { tipo: 'cogida', dx, dz } o { tipo: 'golpe' }
  function paso(objetivo, dt) {
    reloj += dt;
    tEstado += dt;
    golpe = Math.max(0, golpe - dt * 2.2);
    fuerza = Math.max(V.cansancio.minimo, fuerza - V.cansancio.porS * dt);
    historia.push({ t: reloj, x: objetivo.x, z: objetivo.z });
    while (historia.length > 2 && historia[1].t <= reloj - V.reaccionS) historia.shift();
    const visto = historia[0];
    const dx = objetivo.x - x; const dz = objetivo.z - z;
    const distancia = Math.hypot(dx, dz);
    const alcanzable = !objetivo.seguro && distancia < V.veHastaM && limites.dentro(objetivo.x, objetivo.z);
    const aLaVista = alcanzable && seVe(objetivo.x, objetivo.z);
    let suceso = null;

    if (estado === 'corral') {
      v = 0;
      if (tEstado >= dura) { cambia('saliendo'); anota('sale'); }
      return null;
    }
    if (estado === 'saliendo') {
      // Sale por la manga, recta, hasta estar bien dentro del ruedo
      v = Math.min(V.galopeMs * 0.7, v + V.aceleracion * dt);
      x += dirSalida[0] * v * dt;
      z += dirSalida[1] * v * dt;
      if (Math.hypot(x - corral.salida[0], z - corral.salida[1]) > 3 && dentroDe(ruedo, x, z)) cambia('reconoce', entre(V.reconoceS));
      fase += v * dt;
      return null;
    }

    if (estado === 'recogiendo') {
      // De vuelta: hasta delante de la manga y, de ahí, adentro
      const m = [corral.salida[0] + dirSalida[0] * 1.6, corral.salida[1] + dirSalida[1] * 1.6];
      const hacia = rumboA(m[0], m[1]);
      const giro = giraHacia(Math.atan2(hacia[0] - x, hacia[1] - z), dt, 1.6);
      v += limita((giro > 1.2 ? 0.8 : V.recogeMs) - v, -V.frenada * dt, V.aceleracion * dt);
      avanza(dt);
      if (Math.hypot(x - m[0], z - m[1]) < 1.1 || tEstado > 60) cambia('entrando');
      fase += v * dt;
      return null;
    }
    if (estado === 'entrando') {
      rumbo += limita(anguloCorto(Math.atan2(-dirSalida[0], -dirSalida[1]) - rumbo), -5 * dt, 5 * dt);
      v = V.troteMs;
      const lejos = Math.hypot(x - corral.salida[0], z - corral.salida[1]);
      // Se centra en la manga mientras entra
      const k = Math.min(1, dt * 3);
      const dentro = (x - corral.salida[0]) * dirSalida[0] + (z - corral.salida[1]) * dirSalida[1] - v * dt;
      x += (corral.salida[0] + dirSalida[0] * dentro - x) * k + 0 * lejos;
      z += (corral.salida[1] + dirSalida[1] * dentro - z) * k;
      if (dentro < -1.8 || tEstado > 6) { guardada = true; v = 0; cambia('corral', Infinity); anota('guardada'); }
      fase += v * dt;
      return null;
    }
    if (guia) {
      // En manada: va adonde le dicen, a la velocidad que le dicen, y se lleva por delante a quien pille
      if (estado !== 'guiada') cambia('guiada');
      const hacia = rumboA(guia.x, guia.z);
      const giro = giraHacia(Math.atan2(hacia[0] - x, hacia[1] - z), dt, 1.6);
      const quiere = Math.hypot(guia.x - x, guia.z - z) < 0.6 ? 0 : giro > 1.2 ? 1 : guia.velocidad;
      v += limita(quiere - v, -V.frenada * dt, V.aceleracion * dt);
      avanza(dt);
      const delante = dx * Math.sin(rumbo) + dz * Math.cos(rumbo);
      if (!objetivo.seguro && distancia < V.cogidaM && delante > -0.2 && objetivo.alto < V.saltoLibraM && v > 2 && reloj - ultimaCogida > 1.5) {
        suceso = { tipo: 'cogida', dx: Math.sin(rumbo), dz: Math.cos(rumbo), velocidad: v };
        ultimaCogida = reloj;
        anota('cogida');
      }
      fase += v * dt;
      return suceso;
    }

    if (estado === 'reconoce') {
      // A su aire; si hay alguien en el recinto pero no lo ve (una esquina de la calle), va a buscarlo
      if (alcanzable && !aLaVista) destino = [objetivo.x, objetivo.z];
      else if (!destino || Math.hypot(destino[0] - x, destino[1] - z) < 1.5) destino = puntoLibre();
      const hacia = rumboA(destino[0], destino[1]);
      const giro = giraHacia(Math.atan2(hacia[0] - x, hacia[1] - z), dt);
      const quiere = giro > 1.2 ? 0.6 : V.troteMs;
      v += limita(quiere - v, -V.frenada * dt, V.aceleracion * 0.5 * dt);
      if (avanza(dt) > 0.02) destino = puntoLibre();
      if (tEstado >= dura && aLaVista) cambia('fija', entre(V.fijaS));
      else if (tEstado >= dura) dura = tEstado + 1.5;      // nadie a quien ir: sigue a lo suyo
    } else if (estado === 'fija') {
      // Parada, encarando al jugador (lo sigue con la cabeza: aquí gira rápido)
      v = Math.max(0, v - V.frenada * dt);
      giraHacia(Math.atan2(dx, dz), dt, 1);
      if (!aLaVista) cambia('reconoce', entre(V.reconoceS));
      else if (tEstado >= dura && Math.abs(anguloCorto(Math.atan2(dx, dz) - rumbo)) < 0.25) {
        cambia('embiste');
        cruzado = false;
        metrosTrasCruce = 0;
        embestidas++;
        fuerza = Math.max(V.cansancio.minimo, fuerza - V.cansancio.porEmbestida);
        anota('embiste', { distancia });
      }
    } else if (estado === 'embiste') {
      v = Math.min(velocidadTope(), v + V.aceleracion * dt);
      // Va adonde vio al jugador hace un instante, y gira lo que su velocidad le deja
      if (!cruzado) {
        giraHacia(Math.atan2(visto.x - x, visto.z - z), dt);
        if (dx * Math.sin(rumbo) + dz * Math.cos(rumbo) < 0 || objetivo.seguro) cruzado = true;
      } else {
        metrosTrasCruce += v * dt;
      }
      const empuje = avanza(dt);
      // Cogida: lo alcanza de frente, en el suelo o saltando bajo
      const delante = dx * Math.sin(rumbo) + dz * Math.cos(rumbo);
      if (!objetivo.seguro && distancia < V.cogidaM && delante > -0.2 && objetivo.alto < V.saltoLibraM && v > 2) {
        suceso = { tipo: 'cogida', dx: Math.sin(rumbo), dz: Math.cos(rumbo), velocidad: v };
        anota('cogida');
        cambia('frena', 1.2);
      } else if (empuje > 0.05 && v > 3.5) {
        // Remata en la valla
        suceso = { tipo: 'golpe', x, z, velocidad: v };
        anota('golpe');
        golpe = 1;
        v = 0;
        cambia('derrote', V.derroteS);
      } else if (metrosTrasCruce > V.pasaDeLargoM || tEstado > V.embisteMaxS) {
        cambia('frena', 0.9);
        anota(cruzado ? 'pasa' : 'desiste');
      }
    } else if (estado === 'frena') {
      v = Math.max(0, v - V.frenada * dt);
      avanza(dt);
      if (v <= 0.05 && tEstado >= dura * 0.4) cambia(aLaVista ? 'fija' : 'reconoce', entre(aLaVista ? V.fijaS : V.reconoceS));
    } else if (estado === 'derrote') {
      v = 0;
      if (tEstado >= dura) {
        // Se da la vuelta hacia dentro antes de seguir
        destino = puntoLibre();
        cambia('reconoce', entre(V.reconoceS) * 0.5);
      }
    }
    fase += v * dt;
    return suceso;
  }

  // Lo que se ve
  function anima(dt) {
    const g = modelo.grupo;
    const y = suelo(x, z);
    g.visible = !guardada;
    g.position.set(x, y, z);
    // El modelo mira a +X: rumbo (sin, cos) → giro en Y
    g.rotation.set(0, rumbo - Math.PI / 2, 0);
    const galope = limita((v - V.troteMs) / (V.galopeMs - V.troteMs), 0, 1);
    const paso = fase * (2.6 - 1.1 * galope);          // zancada más larga al galope
    const amplitud = Math.min(1, v / 1.2) * (0.42 + 0.38 * galope);
    // Trote: diagonales a la vez. Galope: las manos juntas y los pies juntos
    const desfases = [0, Math.PI * (1 - galope), Math.PI * (1 - 0.15 * galope), Math.PI * 0.15 * galope + Math.PI * galope];
    modelo.patas.forEach((pata, i) => { pata.rotation.z = Math.sin(paso + desfases[i]) * amplitud; });
    modelo.cuerpo.position.y = Math.abs(Math.sin(paso)) * 0.05 * galope;
    // Cabeza: baja al embestir, sube de golpe al rematar, tranquila al trote
    let cabeza = 0.05 + Math.sin(reloj * 1.3) * 0.04;
    if (estado === 'embiste') cabeza = -0.55 * Math.min(1, tEstado * 3);
    else if (estado === 'fija') cabeza = -0.2 + Math.sin(reloj * 9) * 0.03;     // escarba y amaga
    else if (estado === 'derrote') cabeza = 0.55 * golpe - 0.2;
    modelo.cabeza.rotation.z += (cabeza - modelo.cabeza.rotation.z) * Math.min(1, dt * 12);
    modelo.rabo.rotation.z = -0.25 - galope * 0.9 + Math.sin(reloj * 5) * 0.12;
    modelo.rabo.rotation.x = Math.sin(reloj * 3.1) * 0.25;
  }

  return {
    objeto: modelo.grupo,
    capa,
    numero: semilla,
    // A quién va (lo pone quien elige el objetivo: «jugador» o el id de un mozo)
    persigue: 'jugador',
    // ¿Ve ese punto? (ninguna valla en medio)
    ve: (tx, tz) => seVe(tx, tz),
    paso,
    anima,
    get estado() { return estado; },
    get fuerza() { return fuerza; },
    get velocidad() { return v; },
    get rumbo() { return rumbo; },
    get embestidas() { return embestidas; },
    get cruzado() { return cruzado; },
    get guardada() { return guardada; },
    // La manada la lleva a un punto (null: la suelta y vuelve a ir a su aire)
    guia(objetivo) {
      guia = objetivo;
      if (!objetivo && estado === 'guiada') cambia('reconoce', entre(V.reconoceS));
    },
    // Al corral: va hasta la manga y entra
    recoge() { guia = null; if (!guardada && estado !== 'entrando') cambia('recogiendo'); },
    // Punta de los cuernos (para medir lo ceñido de un pase)
    cuernos() { return { x: x + Math.sin(rumbo) * 0.95, z: z + Math.cos(rumbo) * 0.95 }; },
    get sucesos() { return sucesos; },
    get dentro() { return limites.dentro(x, z); },
    posicion() { return { x, z }; },
    // Para pruebas: colocarla en un sitio mirando a un rumbo y en un estado
    pon(nx, nz, nuevoRumbo = rumbo, nuevoEstado = 'fija', segundos = 0.3) {
      x = nx; z = nz; rumbo = nuevoRumbo; v = 0; historia.length = 0;
      cambia(nuevoEstado, segundos);
    },
    libera() {
      modelo.grupo.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      modelo.material.dispose();
      modelo.grupo.removeFromParent();
    },
  };
}
