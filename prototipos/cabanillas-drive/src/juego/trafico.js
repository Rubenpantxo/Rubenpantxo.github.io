// Tráfico simple por las calles OSM (src/datos/grafoCalles.js): coches que circulan por la
// derecha a la velocidad de cada tipo de vía, frenan antes de girar y guardan distancia con
// quien tengan delante (otros coches y el jugador). Aparecen lejos del jugador y se recolocan
// cuando se alejan demasiado. Cada uno es un cuerpo cinemático de Rapier: el jugador choca
// con ellos (y ellos se paran si lo tienen delante).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CALIDAD } from '../config/calidad.js';
import { TRAFICO } from '../config/trafico.js';
import { siguienteArista } from '../datos/grafoCalles.js';
import { geometriaFlotante } from '../escena/geometria.js';

const KMH = 1 / 3.6;

function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Plantilla de un modelo: todas sus piezas unidas por material (pocas llamadas de dibujo por coche)
function plantilla(escena) {
  escena.updateMatrixWorld(true);
  const porMaterial = new Map();
  escena.traverse((o) => {
    if (!o.isMesh) return;
    if (!porMaterial.has(o.material)) porMaterial.set(o.material, []);
    porMaterial.get(o.material).push(geometriaFlotante(o.geometry, o.matrixWorld, ['position', 'normal', 'uv']));
  });
  const grupo = new THREE.Group();
  for (const [material, geos] of porMaterial) {
    // Solo se unen las que tienen los mismos atributos (con y sin UV por separado)
    const conUv = geos.filter((g) => g.attributes.uv);
    const sinUv = geos.filter((g) => !g.attributes.uv);
    for (const lote of [conUv, sinUv]) {
      if (!lote.length) continue;
      const unida = lote.length === 1 ? lote[0] : mergeGeometries(lote, false);
      if (unida) grupo.add(new THREE.Mesh(unida, material));
    }
  }
  return grupo;
}

export function creaTrafico({ escena, fisica, modelos, grafo, terreno, excluirModelo }) {
  const { RAPIER, mundo } = fisica;
  const cantidad = TRAFICO.cantidad[CALIDAD.nivel] ?? 8;
  const r = azar(20261005);
  const disponibles = Object.values(modelos).filter((m) => m.id !== excluirModelo);
  const plantillas = new Map(disponibles.map((m) => [m.id, {
    cerca: plantilla(m.escena),
    lejos: m.lejos ? plantilla(m.lejos) : null,
  }]));
  const aristas = grafo.aristas;
  const raiz = new THREE.Group();
  raiz.name = 'trafico';
  escena.add(raiz);

  const q = new THREE.Quaternion();
  const qInclina = new THREE.Quaternion();
  const eje = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();

  function creaAgente(id) {
    const modelo = disponibles[Math.floor(r() * disponibles.length)];
    const p = plantillas.get(modelo.id);
    const color = new THREE.Color(TRAFICO.colores[Math.floor(r() * TRAFICO.colores.length)]);
    const viste = (g) => {
      const copia = g.clone();
      copia.traverse((o) => {
        if (o.isMesh && o.material.name === 'pintura') {
          o.material = o.material.clone();
          o.material.color.copy(color);
        }
      });
      return copia;
    };
    const grupo = new THREE.Group();
    grupo.name = `trafico_${id}`;
    const cerca = viste(p.cerca);
    const lejos = p.lejos ? viste(p.lejos) : null;
    grupo.add(cerca);
    if (lejos) grupo.add(lejos);
    raiz.add(grupo);
    const { largo, ancho, alto } = modelo.info;
    const cuerpo = mundo.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -100, 0));
    mundo.createCollider(RAPIER.ColliderDesc.cuboid(Math.min(ancho, 2.0) / 2, alto / 2, largo / 2)
      .setTranslation(0, alto / 2, 0).setFriction(0.5), cuerpo);
    return {
      id, modelo, grupo, cerca, lejos, cuerpo, largo, ancho, alto,
      arista: null, siguiente: null, s: 0, v: 0, parado: 0,
      pos: new THREE.Vector3(), rumbo: 0, delante: new THREE.Vector3(0, 0, 1), listo: false,
    };
  }

  const desplazamiento = (a) => (a.sentidoUnico ? TRAFICO.desplazamientoM.unico : TRAFICO.desplazamientoM.doble);
  const puntoEn = (a, s, destino) => {
    const d = desplazamiento(a);
    return destino.set(a.desde.x + a.dx * s - a.dz * d, 0, a.desde.z + a.dz * s + a.dx * d);
  };

  // Coloca un agente en una arista al azar a la distancia adecuada del jugador, lejos de otros
  const tmp = new THREE.Vector3();
  function recoloca(agente, jugador, camara) {
    const [dMin, dMax] = TRAFICO.apareceEntreM;
    const delanteCamara = new THREE.Vector3();
    camara?.getWorldDirection(delanteCamara);
    for (let intento = 0; intento < 60; intento++) {
      const a = aristas[Math.floor(r() * aristas.length)];
      const s = r() * a.largo;
      puntoEn(a, s, tmp);
      const dx = tmp.x - jugador.x;
      const dz = tmp.z - jugador.z;
      const d = Math.hypot(dx, dz);
      if (d < dMin || d > dMax) continue;
      // Que no aparezca a la vista si está cerca
      if (camara && d < 200 && (dx * delanteCamara.x + dz * delanteCamara.z) / d > 0.3) continue;
      if (agentes.some((o) => o !== agente && o.listo && o.pos.distanceTo(tmp) < 18)) continue;
      agente.arista = a;
      agente.s = s;
      agente.siguiente = siguienteArista(a, r);
      agente.v = TRAFICO.velocidadKmh[a.tipo] * KMH * 0.6;
      agente.pos.copy(tmp);
      agente.rumbo = Math.atan2(a.dx, a.dz);
      agente.parado = 0;
      agente.listo = true;
      return true;
    }
    agente.listo = false;
    agente.grupo.visible = false;
    agente.cuerpo.setNextKinematicTranslation({ x: 0, y: -100, z: 0 });
    return false;
  }

  const agentes = [];
  for (let i = 0; i < cantidad; i++) agentes.push(creaAgente(i));

  // Velocidad que permite frenar a tiempo hasta «vFinal» en «distancia» metros
  const vFrenando = (vFinal, distancia) => Math.sqrt(Math.max(0, vFinal * vFinal + 2 * TRAFICO.frenada * 0.55 * Math.max(0, distancia)));

  const objetivo = new THREE.Vector3();
  function actualiza(dt, { jugador, camara, otros = [] }) {
    // Obstáculos: los demás coches del tráfico, el coche del jugador y quien camine
    const obstaculos = [
      ...agentes.filter((a) => a.listo).map((a) => ({ x: a.pos.x, z: a.pos.z, radio: a.largo / 2, agente: a })),
      ...otros,
    ];
    for (const a of agentes) {
      if (!a.listo || Math.hypot(a.pos.x - jugador.x, a.pos.z - jugador.z) > TRAFICO.desapareceM || a.parado > 12) {
        if (!recoloca(a, jugador, camara)) continue;
      }
      const ar = a.arista;
      const crucero = TRAFICO.velocidadKmh[ar.tipo] * KMH;
      let meta = crucero;
      // Giro al final del tramo: frena según lo cerrado que sea
      if (a.siguiente && a.siguiente !== ar) {
        const coseno = THREE.MathUtils.clamp(ar.dx * a.siguiente.dx + ar.dz * a.siguiente.dz, -1, 1);
        const angulo = THREE.MathUtils.radToDeg(Math.acos(coseno));
        if (angulo > 25) {
          const vGiro = THREE.MathUtils.lerp(crucero, TRAFICO.velocidadGiroKmh * KMH, Math.min(1, (angulo - 25) / 65));
          meta = Math.min(meta, vFrenando(vGiro, ar.largo - a.s - 2));
        }
      } else if (!a.siguiente) {
        meta = Math.min(meta, vFrenando(0, ar.largo - a.s - 3));
      }
      // Alguien delante: guarda la distancia
      const fx = Math.sin(a.rumbo);
      const fz = Math.cos(a.rumbo);
      for (const o of obstaculos) {
        if (o.agente === a) continue;
        const rx = o.x - a.pos.x;
        const rz = o.z - a.pos.z;
        const adelante = rx * fx + rz * fz;
        if (adelante <= 0 || adelante > TRAFICO.vistaDelanteM) continue;
        const lado = Math.abs(rx * fz - rz * fx);
        if (lado > 2.3) continue;
        if (o.agente) {
          const otroF = o.agente.delante;
          const cruce = fx * otroF.x + fz * otroF.z;
          if (cruce < -0.5 && lado > 1.1) continue;          // viene de frente por su carril
          if (Math.abs(cruce) < 0.5 && a.id < o.agente.id) continue;   // cruce: pasa el de menor número
        }
        const hueco = adelante - a.largo / 2 - o.radio;
        meta = Math.min(meta, vFrenando(0, hueco - TRAFICO.distanciaSeguridadM));
      }
      const dv = meta - a.v;
      a.v = Math.max(0, a.v + THREE.MathUtils.clamp(dv, -TRAFICO.frenada * dt, TRAFICO.aceleracion * dt));
      a.parado = a.v < 0.3 ? a.parado + dt : 0;

      // Avance por el grafo
      a.s += a.v * dt;
      while (a.s > a.arista.largo) {
        a.s -= a.arista.largo;
        if (!a.siguiente) { a.listo = false; break; }
        a.arista = a.siguiente;
        a.siguiente = siguienteArista(a.arista, r);
      }
      if (!a.listo) continue;

      // Posición y rumbo, suavizados (los cambios de tramo no dan saltos)
      puntoEn(a.arista, a.s, objetivo);
      const quedan = a.arista.largo - a.s;
      let rumboObjetivo = Math.atan2(a.arista.dx, a.arista.dz);
      if (a.siguiente && quedan < 4) {
        const siguiente = Math.atan2(a.siguiente.dx, a.siguiente.dz);
        let diferencia = siguiente - rumboObjetivo;
        diferencia = Math.atan2(Math.sin(diferencia), Math.cos(diferencia));
        rumboObjetivo += diferencia * (1 - quedan / 4) * 0.5;
      }
      const k = 1 - Math.exp(-dt * 7);
      a.pos.x += (objetivo.x - a.pos.x) * k;
      a.pos.z += (objetivo.z - a.pos.z) * k;
      let giro = rumboObjetivo - a.rumbo;
      giro = Math.atan2(Math.sin(giro), Math.cos(giro));
      a.rumbo += giro * k;
      a.delante.set(Math.sin(a.rumbo), 0, Math.cos(a.rumbo));

      // Apoyo en el terreno: altura e inclinación según la pendiente
      const y = terreno.alturaEn(a.pos.x, a.pos.z);
      const d = 1.2;
      normal.set(terreno.alturaEn(a.pos.x - d, a.pos.z) - terreno.alturaEn(a.pos.x + d, a.pos.z), 2 * d,
        terreno.alturaEn(a.pos.x, a.pos.z - d) - terreno.alturaEn(a.pos.x, a.pos.z + d)).normalize();
      qInclina.setFromUnitVectors(eje, normal);
      q.setFromAxisAngle(eje, a.rumbo).premultiply(qInclina);
      a.grupo.position.set(a.pos.x, y, a.pos.z);
      a.grupo.quaternion.copy(q);
      a.grupo.visible = true;
      const ref = camara?.position ?? jugador;
      const lejos = Math.hypot(a.pos.x - ref.x, a.pos.z - ref.z) > CALIDAD.distanciaCochesDetalle * 1.5;
      a.cerca.visible = !lejos || !a.lejos;
      if (a.lejos) a.lejos.visible = lejos;
      a.cuerpo.setNextKinematicTranslation({ x: a.pos.x, y, z: a.pos.z });
      a.cuerpo.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    }
  }

  return {
    raiz,
    agentes,
    actualiza,
    // Para el minimapa
    posiciones() { return agentes.filter((a) => a.listo).map((a) => ({ x: a.pos.x, z: a.pos.z })); },
  };
}
