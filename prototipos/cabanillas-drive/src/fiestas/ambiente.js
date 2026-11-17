// Ambiente del modo fiestas: arena en el ruedo de la plaza, banderines de fachada a fachada,
// la ambulancia y el público (personas de MakeHuman en postura de quieto) en las aceras de
// detrás de las vallas, en el tablado, en las gradas y en los balcones.
import * as THREE from 'three';
import { clone as clonaConEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CALIDAD } from '../config/calidad.js';
import { FIESTAS } from '../config/fiestas.js';
import { FILAS_AYUNTAMIENTO } from '../datos/casasAyuntamiento.js';
import { FILAS_PLAZA } from '../datos/casasPlaza.js';
import { POSTURAS, POSTURA_NULA, creaCapa, mezclaPosturas, sienta } from './pose.js';
import { Lote, azarCon } from './vallado.js';

export { sienta };
const largoDe = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

// ---------------------------------------------------------------- arena

function texturaArena() {
  const lado = 256;
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  const c = lienzo.getContext('2d');
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, lado, lado);
  const azar = azarCon(77);
  for (let i = 0; i < 9000; i++) {
    const v = 150 + Math.floor(azar() * 105);
    c.fillStyle = `rgba(${v},${v - 8},${v - 22},${0.25 + azar() * 0.4})`;
    c.fillRect(azar() * lado, azar() * lado, 1 + azar() * 2, 1 + azar() * 2);
  }
  // Rodadas y pisadas: manchas alargadas más oscuras
  for (let i = 0; i < 70; i++) {
    c.fillStyle = `rgba(120,95,60,${0.05 + azar() * 0.07})`;
    c.beginPath();
    c.ellipse(azar() * lado, azar() * lado, 6 + azar() * 22, 2 + azar() * 5, azar() * Math.PI, 0, Math.PI * 2);
    c.fill();
  }
  const textura = new THREE.CanvasTexture(lienzo);
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}

// Capa de arena sobre el polígono del ruedo, siguiendo el terreno, con su colisión
function creaArena(poligono, terreno, fisica, sombras) {
  const grueso = FIESTAS.arena.gruesoM;
  const contorno = poligono.map(([x, z]) => new THREE.Vector2(x, z));
  if (THREE.ShapeUtils.isClockWise(contorno)) contorno.reverse();
  let triangulos = THREE.ShapeUtils.triangulateShape(contorno, []).map((t) => t.map((i) => contorno[i]));
  // Cinco subdivisiones (triángulos de ~1 m): con menos, los bultos del terreno asoman por la arena
  for (let paso = 0; paso < 5; paso++) {
    const nuevos = [];
    for (const [a, b, c] of triangulos) {
      const ab = a.clone().add(b).multiplyScalar(0.5);
      const bc = b.clone().add(c).multiplyScalar(0.5);
      const ca = c.clone().add(a).multiplyScalar(0.5);
      nuevos.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
    }
    triangulos = nuevos;
  }
  const posiciones = [];
  const uvs = [];
  for (const t of triangulos) {
    // De cara hacia arriba (x, z con z hacia el sur: se invierte el orden)
    for (const p of [t[0], t[2], t[1]]) {
      posiciones.push(p.x, terreno.alturaEn(p.x, p.y) + grueso, p.y);
      uvs.push(p.x / 2.4, p.y / 2.4);
    }
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geometria.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometria.computeVertexNormals();
  if (geometria.attributes.normal.getY(0) < 0) {
    geometria.index = null;
    const p = geometria.attributes.position.array;
    for (let i = 0; i < p.length; i += 9) {
      for (let k = 0; k < 3; k++) { const v = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = v; }
    }
    const u = geometria.attributes.uv.array;
    for (let i = 0; i < u.length; i += 6) {
      for (let k = 0; k < 2; k++) { const v = u[i + 2 + k]; u[i + 2 + k] = u[i + 4 + k]; u[i + 4 + k] = v; }
    }
    geometria.computeVertexNormals();
  }
  const material = new THREE.MeshStandardMaterial({ color: FIESTAS.arena.color, map: texturaArena(), roughness: 1, metalness: 0 });
  const malla = new THREE.Mesh(geometria, material);
  malla.name = 'fiestas_arena';
  malla.receiveShadow = sombras;
  malla.userData.sinSombra = true;
  // Colisión: se pisa la arena, no el asfalto de debajo
  const { RAPIER, mundo } = fisica;
  const n = geometria.attributes.position.count;
  const indices = new Uint32Array(n);
  for (let i = 0; i < n; i++) indices[i] = i;
  const collider = mundo.createCollider(
    RAPIER.ColliderDesc.trimesh(new Float32Array(geometria.attributes.position.array), indices).setFriction(0.9));
  return { malla, collider };
}

// ---------------------------------------------------------------- banderines

// Corte de la recta p + t·n con un segmento; devuelve t (> 0) o null
function corte(p, n, a, b) {
  const ex = b[0] - a[0]; const ez = b[1] - a[1];
  const den = n[0] * ez - n[1] * ex;
  if (Math.abs(den) < 1e-6) return null;
  const t = ((a[0] - p[0]) * ez - (a[1] - p[1]) * ex) / den;
  const s = ((a[0] - p[0]) * n[1] - (a[1] - p[1]) * n[0]) / den;
  return t > 0.5 && s >= 0 && s <= 1 ? t : null;
}

function creaBanderines(recinto, terreno) {
  const B = FIESTAS.banderines;
  const azar = azarCon(4242);
  const fachadas = recinto.tramos.filter((t) => t.clase === 'fachada' || t.clase === 'bocacalle').map((t) => t.fachada);
  const ristras = [];
  for (const zona of ['plaza', 'calle']) {
    const eje = recinto[zona].eje;
    let resto = B.cadaM / 2;
    for (let i = 0; i + 1 < eje.length; i++) {
      const largo = largoDe(eje[i], eje[i + 1]);
      const d = [(eje[i + 1][0] - eje[i][0]) / largo, (eje[i + 1][1] - eje[i][1]) / largo];
      for (let s = resto; s < largo; s += B.cadaM) {
        const p = [eje[i][0] + d[0] * s, eje[i][1] + d[1] * s];
        const extremos = [];
        for (const n of [[d[1], -d[0]], [-d[1], d[0]]]) {
          let mejor = null;
          for (const [a, b] of fachadas) {
            const t = corte(p, n, a, b);
            if (t !== null && (mejor === null || t < mejor)) mejor = t;
          }
          if (mejor !== null && mejor < 14) extremos.push([p[0] + n[0] * mejor, p[1] + n[1] * mejor]);
        }
        if (extremos.length === 2) ristras.push(extremos);
      }
      resto = (resto - largo % B.cadaM + B.cadaM) % B.cadaM;
    }
  }
  // Triángulo con la base arriba (cuelga de la cuerda)
  const triangulo = new THREE.BufferGeometry();
  triangulo.setAttribute('position', new THREE.Float32BufferAttribute(
    [-B.anchoM / 2, 0, 0, B.anchoM / 2, 0, 0, 0, -B.largoM, 0], 3));
  triangulo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  const total = ristras.reduce((n, [a, b]) => n + Math.max(1, Math.floor(largoDe(a, b) / B.pasoM)), 0);
  const tiempo = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempo = tiempo;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTiempo;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float fase = instanceMatrix[3][0] * 1.7 + instanceMatrix[3][2] * 0.9;
          float vaiven = sin(uTiempo * 2.3 + fase) * 0.6 + sin(uTiempo * 5.1 + fase * 1.9) * 0.4;
          transformed.z += -transformed.y * ${B.vaivenRad.toFixed(2)} * vaiven;
        #endif`);
  };
  const mallas = new THREE.InstancedMesh(triangulo, material, total);
  mallas.name = 'fiestas_banderines';
  mallas.userData.sinSombra = true;
  mallas.frustumCulled = false;
  const cuerda = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const arriba = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  let k = 0;
  for (const [a, b] of ristras) {
    const n = Math.max(1, Math.floor(largoDe(a, b) / B.pasoM));
    const ya = terreno.alturaEn(a[0], a[1]) + B.altoM;
    const yb = terreno.alturaEn(b[0], b[1]) + B.altoM;
    q.setFromAxisAngle(arriba, Math.atan2(-(b[1] - a[1]), b[0] - a[0]));
    const en = (t) => new THREE.Vector3(a[0] + (b[0] - a[0]) * t, ya + (yb - ya) * t - B.flechaM * 4 * t * (1 - t), a[1] + (b[1] - a[1]) * t);
    const desfase = Math.floor(azar() * B.colores.length);
    for (let i = 0; i < n; i++) {
      m.compose(en((i + 0.5) / n), q, new THREE.Vector3(1, 1, 1));
      mallas.setMatrixAt(k, m);
      mallas.setColorAt(k, color.setHex(B.colores[(i + desfase) % B.colores.length]));
      k++;
    }
    const pasos = 12;
    for (let i = 0; i < pasos; i++) cuerda.push(en(i / pasos), en((i + 1) / pasos));
  }
  mallas.instanceMatrix.needsUpdate = true;
  if (mallas.instanceColor) mallas.instanceColor.needsUpdate = true;
  const lineas = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cuerda),
    new THREE.LineBasicMaterial({ color: 0x2a2a2a }));
  lineas.name = 'fiestas_cuerdas';
  lineas.userData.sinSombra = true;
  const grupo = new THREE.Group();
  grupo.add(mallas, lineas);
  return { grupo, ristras: ristras.length, banderines: total, avanza(dt) { tiempo.value += dt; } };
}

// ---------------------------------------------------------------- ambulancia

function creaAmbulancia(datos, terreno, fisica, materiales, sombras) {
  const A = FIESTAS.ambulancia;
  const lote = new Lote(azarCon(5));
  const { largo, ancho } = datos;
  const caja = largo * 0.66;                    // parte sanitaria, detrás
  const cabina = largo - caja;
  // Local: +X hacia delante desde la trasera, Z a lo ancho
  lote.caja(materiales.blanco, caja / 2, 0.45 + (A.altoM - 0.45) / 2, 0, caja, A.altoM - 0.45, ancho);
  lote.caja(materiales.blanco, caja + cabina / 2, 0.45 + 0.75, 0, cabina, 1.5, ancho * 0.96);
  lote.caja(materiales.negro, caja + cabina * 0.72, 1.55, 0, cabina * 0.5, 0.62, ancho * 0.97);     // lunas
  for (const z of [-1, 1]) {
    lote.caja(materiales.naranja, caja / 2, 1.25, z * (ancho / 2 + 0.005), caja * 0.96, 0.32, 0.02);
    for (const x of [largo * 0.17, largo * 0.8]) lote.caja(materiales.negro, x, 0.36, z * (ancho / 2 - 0.12), 0.72, 0.72, 0.26);
  }
  lote.caja(materiales.naranja, -0.005, 1.25, 0, 0.02, 0.32, ancho * 0.9);
  lote.caja(materiales.azul, caja + cabina * 0.35, 0.45 + 1.5 + 0.07, 0, 0.3, 0.14, ancho * 0.7);   // rotativos
  const grupo = new THREE.Group();
  grupo.name = 'fiestas_ambulancia';
  grupo.add(...lote.mallas(sombras));
  const n = Math.hypot(datos.direccion[0], datos.direccion[1]);
  const dx = datos.direccion[0] / n; const dz = datos.direccion[1] / n;
  const giro = Math.atan2(-dz, dx);
  const cx = datos.en[0] + dx * largo / 2; const cz = datos.en[1] + dz * largo / 2;
  const y = terreno.alturaEn(cx, cz);
  grupo.position.set(datos.en[0], y, datos.en[1]);
  grupo.rotation.y = giro;
  const { RAPIER, mundo } = fisica;
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), giro);
  const collider = mundo.createCollider(RAPIER.ColliderDesc.cuboid(largo / 2, A.altoM / 2, ancho / 2)
    .setTranslation(cx, y + A.altoM / 2, cz).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }));
  return { grupo, collider };
}

// ---------------------------------------------------------------- público

// Sitios de pie detrás de las vallas: una o dos filas en la acera de cada tramo
function sitiosAceras(recinto) {
  const P = FIESTAS.publico;
  const sitios = [];
  const manga = recinto.corral.salida;
  for (const zona of recinto.publico) {
    if (zona.clase === 'paso') continue;
    const [f0, f1, b, a] = zona.esquinas;
    const tramo = recinto.tramos.find((t) => t.id === zona.tramo);
    const largo = largoDe(a, b);
    if (largo < 1) continue;
    // Hacia la fachada desde la valla
    const fondo = [(f0[0] + f1[0] - a[0] - b[0]) / 2, (f0[1] + f1[1] - a[1] - b[1]) / 2];
    const sep = Math.hypot(fondo[0], fondo[1]);
    const n = [fondo[0] / sep, fondo[1] / sep];
    const rumbo = Math.atan2(-n[0], -n[1]);              // mirando al recorrido
    const peso = tramo.zona === 'plaza' ? 1 : 0.5;
    for (const d of sep >= 1.4 ? [0.42, 1.02] : [0.42]) {
      const cuantos = Math.floor(largo / P.separacionM);
      for (let i = 0; i < cuantos; i++) {
        const t = (i + 0.5) / cuantos;
        const x = a[0] + (b[0] - a[0]) * t + n[0] * d;
        const z = a[1] + (b[1] - a[1]) * t + n[1] * d;
        if (Math.hypot(x - manga[0], z - manga[1]) < 2.4) continue;          // la manga del corral
        sitios.push({ x, z, y: null, rumbo, peso: peso * (d < 0.5 ? 1 : 0.55) });
      }
    }
  }
  return sitios;
}

// Sitios en los balcones de las casas de la plaza y de San Roque 50-54 (casasPlaza.js) y en el
// balcón del Ayuntamiento que da a la plaza (casasAyuntamiento.js)
function sitiosBalcones(terreno) {
  const sitios = [];
  for (const fila of [...FILAS_PLAZA, FILAS_AYUNTAMIENTO[0]]) {
    const { origen: O, eje: [ex, ez] } = fila;
    const enMundo = (u, w) => [O[0] + u * ex + w * ez, O[1] + u * ez - w * ex];
    for (const casa of fila.casas) {
      const [xa, za] = enMundo((casa.u[0] + casa.u[1]) / 2, -1.2);
      const y0 = fila.nivel ?? terreno.alturaEn(xa, za);
      for (const b of casa.balcones ?? []) {
        if (b.vuelo < 0.45) continue;
        const largo = b.u[1] - b.u[0];
        const cuantos = Math.max(1, Math.floor((largo - 0.4) / 0.8));
        for (let i = 0; i < cuantos; i++) {
          const [x, z] = enMundo(b.u[0] + 0.2 + (largo - 0.4) * (i + 0.5) / cuantos, b.w - b.vuelo * 0.45);
          sitios.push({ x, z, y: y0 + b.y, rumbo: Math.atan2(-ez, ex), peso: 1 });
        }
      }
    }
  }
  return sitios;
}

function elige(sitios, cuantos, azar) {
  const lista = sitios.map((s) => ({ s, clave: Math.pow(azar(), 1 / (s.peso ?? 1)) }));
  lista.sort((a, b) => b.clave - a.clave);
  return lista.slice(0, cuantos).map((e) => e.s);
}

// Sitios encima de la valla de tablones de la plaza: gente sentada en el tablón de arriba,
// mirando al ruedo (F6). Lejos de la manga del corral y de la puerta
function sitiosValla(recinto, terreno) {
  const sitios = [];
  const alto = FIESTAS.valla.tablones.alturasM.at(-1) + FIESTAS.valla.tablones.tablonAltoM;
  const manga = recinto.corral.salida;
  for (const t of recinto.tramos) {
    if (t.zona !== 'plaza' || t.clase !== 'fachada' || t.tipo !== 'tablones' || t.largo < 2) continue;
    const fondo = [(t.fachada[0][0] + t.fachada[1][0] - t.a[0] - t.b[0]) / 2, (t.fachada[0][1] + t.fachada[1][1] - t.a[1] - t.b[1]) / 2];
    const l = Math.hypot(fondo[0], fondo[1]);
    const rumbo = Math.atan2(-fondo[0] / l, -fondo[1] / l);
    const cuantos = Math.floor((t.largo - 0.8) / 0.9);
    for (let i = 0; i < cuantos; i++) {
      const k = (0.4 + (i + 0.5) * (t.largo - 0.8) / cuantos) / t.largo;
      const x = t.a[0] + (t.b[0] - t.a[0]) * k; const z = t.a[1] + (t.b[1] - t.a[1]) * k;
      if (Math.hypot(x - manga[0], z - manga[1]) < 3) continue;
      sitios.push({ x, z, y: terreno.alturaEn(x, z) + alto, rumbo, sentado: true, enValla: true, peso: 1 });
    }
  }
  return sitios;
}

function creaPublico(recinto, terreno, personas, sitiosGradas, sombras) {
  const P = FIESTAS.publico;
  const RE = P.reaccion;
  const grupo = new THREE.Group();
  grupo.name = 'fiestas_publico';
  const variantes = personas?.modelos ?? [];
  const total = variantes.length ? (P.cantidad[CALIDAD.nivel] ?? P.cantidad.medio) : 0;
  const azar = azarCon(P.semilla);
  const entre = ([a, b]) => a + (b - a) * azar();
  const enGradas = Math.min(sitiosGradas.length, Math.round(total * P.enGradas));
  const balcones = sitiosBalcones(terreno);
  const enBalcones = Math.min(balcones.length, Math.round(total * P.enBalcones));
  const valla = sitiosValla(recinto, terreno);
  const enValla = Math.min(valla.length, Math.round(total * P.enValla));
  const sitios = [
    ...elige(sitiosGradas.map((s) => ({ ...s, peso: 1 })), enGradas, azar),
    ...elige(balcones, enBalcones, azar).map((s) => ({ ...s, balcon: true })),
    ...elige(valla, enValla, azar),
    ...elige(sitiosAceras(recinto), total - enGradas - enBalcones - enValla, azar),
  ];
  const gente = sitios.map((s, i) => {
    const v = variantes[Math.floor(azar() * variantes.length)];
    const objeto = clonaConEsqueleto(v.escena);
    const mezclador = new THREE.AnimationMixer(objeto);
    const quieto = mezclador.clipAction(v.quieto);
    quieto.play();
    quieto.time = azar() * v.quieto.duration;
    mezclador.update(0);
    objeto.position.set(s.x, s.y ?? terreno.alturaEn(s.x, s.z), s.z);
    objeto.rotation.y = s.rumbo + (azar() - 0.5) * (s.sentado ? 0.3 : 0.7);
    objeto.scale.setScalar(0.94 + azar() * 0.1);
    objeto.updateMatrixWorld(true);
    const capa = creaCapa(objeto);
    let fijados = null;
    if (s.sentado) {
      const sentado = sienta(objeto);
      if (sentado) {
        fijados = sentado.fijados;
        objeto.position.y = s.y + P.sentado.caderaSobreAsientoM - sentado.cadera;
      }
    }
    objeto.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = sombras;
      o.receiveShadow = false;
      o.frustumCulled = true;
    });
    grupo.add(objeto);
    // Los de la primera fila de la acera se apoyan en la valla; el resto, de pie o sentados
    const apoyado = !s.sentado && !s.balcon && s.peso >= 1 && azar() < P.apoyados;
    if (apoyado) {
      // Pegado a la valla
      const n = [Math.sin(s.rumbo), Math.cos(s.rumbo)];
      objeto.position.x += n[0] * 0.15; objeto.position.z += n[1] * 0.15;
      objeto.rotation.y = s.rumbo + (azar() - 0.5) * 0.25;
    }
    if (apoyado) capa.pon(POSTURAS.apoyado());
    return { objeto, mezclador, capa, fijados, apoyado, enValla: Boolean(s.enValla), turno: i % 4, pendiente: 0,
      reaccion: null, ritmo: 2.6 + azar() * 1.4, base: apoyado ? POSTURAS.apoyado() : POSTURA_NULA, movido: true };
  });
  const visibleM = P.visibleHastaM[CALIDAD.nivel] ?? 75;
  const animadosM = Math.min(visibleM, P.animadosHastaM);
  let contador = 0;
  let reloj = 0;
  const postura = { brazoX: [0, 0], brazoY: [0, 0], antebrazoX: [0, 0], antebrazoY: [0, 0] };

  function empieza(g, tipo, fuerza, retraso = 0) {
    const dura = tipo === 'ole' ? entre(RE.oleS) : tipo === 'uy' ? entre(RE.uyS) : entre(RE.aplausoS);
    g.reaccion = { tipo, t: -retraso, dura, fuerza };
  }

  return {
    grupo,
    cantidad: gente.length,
    reparto: { gradas: enGradas, balcones: enBalcones, valla: enValla, aceras: gente.length - enGradas - enBalcones - enValla,
      apoyados: gente.filter((g) => g.apoyado).length },
    // Reacción a lo que pasa en (x, z): «aplauso», «ole» o «uy»; «fuerza» de 0 a 1. Reaccionan
    // más cuanto más cerca, cada uno con su pequeño retraso
    reacciona(tipo, fuerza, x, z) {
      let n = 0;
      for (const g of gente) {
        const d = Math.hypot(g.objeto.position.x - x, g.objeto.position.z - z);
        const p = fuerza * (1.15 - d / RE.alcanceM);
        if (azar() > p) continue;
        // Tras el olé, aplauden
        empieza(g, tipo, fuerza, azar() * RE.retrasoS + d / 90);
        if (tipo === 'ole') g.luego = 'aplauso';
        n++;
      }
      return n;
    },
    get reaccionando() { return gente.filter((g) => g.reaccion && g.reaccion.t >= 0).length; },
    actualiza(dt, camara) {
      contador++;
      reloj += dt;
      for (const g of gente) {
        const d = g.objeto.position.distanceTo(camara.position);
        g.objeto.visible = d < visibleM;
        g.pendiente += dt;
        // Reacción en curso (también fuera de la vista: así no se queda a medias)
        let k = 0; let pose = null;
        if (g.reaccion) {
          const r = g.reaccion;
          r.t += dt;
          if (r.t >= r.dura) {
            g.reaccion = null;
            if (g.luego) { empieza(g, g.luego, r.fuerza); g.reaccion.t = 0; g.luego = null; }
          } else if (r.t >= 0) {
            k = Math.min(1, r.t / RE.entraS, (r.dura - r.t) / RE.saleS);
            pose = r.tipo === 'ole' ? POSTURAS.ole(r.t) : r.tipo === 'uy' ? POSTURAS.uy(r.t) : POSTURAS.aplauso(r.t, g.ritmo);
          }
        } else if (azar() < RE.espontaneo * dt) {
          empieza(g, 'aplauso', 0.5, 0);
        }
        if (!g.objeto.visible) continue;
        const cerca = d < animadosM;
        // La respiración de la postura de quieto, solo cerca y un fotograma de cada cuatro
        const toca = d < 30 && (contador + g.turno) % 4 === 0;
        if (toca) {
          g.capa.antes();
          g.mezclador.update(g.pendiente);
          g.capa.despues();
          g.pendiente = 0;
        }
        if (k > 0 && cerca) {
          g.capa.pon(mezclaPosturas(g.base, pose, k, postura), g.fijados);
          g.movido = true;
        } else if (toca || g.movido) {
          // Sin reacción: su postura de siempre (apoyado, sentado o la de la animación)
          g.capa.pon(g.apoyado ? g.base : null, g.fijados);
          g.movido = false;
        }
      }
    },
  };
}

// ---------------------------------------------------------------- todo junto

export function creaAmbiente(recinto, { terreno, fisica, personas, sitiosGradas, materiales, sombras = true }) {
  const raiz = new THREE.Group();
  raiz.name = 'fiestas_ambiente';
  const { mundo } = fisica;
  const arena = creaArena(recinto.plaza.ruedo, terreno, fisica, sombras);
  const banderines = creaBanderines(recinto, terreno);
  const ambulancia = creaAmbulancia(recinto.ambulancia, terreno, fisica, materiales, sombras);
  const publico = creaPublico(recinto, terreno, personas, sitiosGradas, sombras);
  raiz.add(arena.malla, banderines.grupo, ambulancia.grupo, publico.grupo);
  return {
    raiz,
    publico,
    resumen: { ristras: banderines.ristras, banderines: banderines.banderines, publico: publico.cantidad, reparto: publico.reparto },
    actualiza(dt, camara) {
      banderines.avanza(dt);
      publico.actualiza(dt, camara);
    },
    libera() {
      mundo.removeCollider(arena.collider, false);
      mundo.removeCollider(ambulancia.collider, false);
      // El público comparte geometría y materiales con los peatones del pueblo: no se liberan
      for (const parte of [arena.malla, banderines.grupo, ambulancia.grupo]) {
        parte.traverse((o) => { if (o.isMesh || o.isLineSegments) o.geometry.dispose(); });
      }
      arena.malla.material.map.dispose();
      arena.malla.material.dispose();
      raiz.removeFromParent();
    },
  };
}
