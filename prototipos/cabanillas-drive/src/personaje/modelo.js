// Personaje en three.js a partir de una apariencia (estado.js): cuerpo de MakeHuman con su
// esqueleto «game_engine» (53 huesos, los mismos nombres que las personas del pueblo, así que
// valen sus animaciones «andar» y «quieto») y las prendas ajustadas al cuerpo con su .mhclo.
//
// Cada cambio de apariencia recalcula el cuerpo (motor.js), recoloca los huesos en los cubos
// «joint-*» del cuerpo nuevo, vuelve a calcular las matrices de reposo y reajusta las prendas.
// El giro de reposo de cada hueso es el de la plantilla (h_joven.glb): así sus animaciones, que
// guardan giros locales, se aplican tal cual.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { PERSONAJE } from '../config/personaje.js';
import { corrigePersona } from '../juego/corrigePersonas.js';
import { cargaBase, cargaPrenda, vista } from './datos.js';
import { creaMotor } from './motor.js';
import { creaMaterialOjos, creaMaterialPiel, creaMaterialPrenda, ponColor, textura } from './materiales.js';

const HUECOS_ROPA = ['conjunto', 'arriba', 'abajo', 'calzado', 'sombrero'];
// Metros hacia fuera de cada capa de ropa (la parte de arriba va por encima del pantalón)
const HINCHADO = { abajo: 0.003, conjunto: 0.004, arriba: 0.006, calzado: 0.002 };
// Ropa que tapa la piel que tiene debajo (el pelo y el sombrero no: dejan huecos)
const TAPAN = new Set(['arriba', 'abajo', 'conjunto']);
const CERCA_PIEL_M = 0.025;         // tela a menos de esto de la piel: la piel de debajo no se dibuja
const ANILLOS_BORDE = 4;            // anillos de la prenda junto a sus bordes que no ocultan piel
const DENTRO_DE_ARRIBA = -0.008;     // el pantalón bajo la camiseta: hacia dentro (m)
const SECTORES = 48;                 // sectores alrededor del cuerpo para medir el bajo de la camiseta
const RADIO_TRONCO_M = 0.24;         // lo que queda más lejos del eje de la pelvis son las mangas

// Normales por vértice original (sin costuras) a partir de triángulos en índices originales
function normales(pos, tris, salida) {
  salida.fill(0);
  for (let i = 0; i < tris.length; i += 3) {
    const a = tris[i] * 3; const b = tris[i + 1] * 3; const c = tris[i + 2] * 3;
    const ux = pos[b] - pos[a]; const uy = pos[b + 1] - pos[a + 1]; const uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a]; const vy = pos[c + 1] - pos[a + 1]; const vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
    salida[a] += nx; salida[a + 1] += ny; salida[a + 2] += nz;
    salida[b] += nx; salida[b + 1] += ny; salida[b + 2] += nz;
    salida[c] += nx; salida[c + 1] += ny; salida[c + 2] += nz;
  }
  for (let i = 0; i < salida.length; i += 3) {
    const l = Math.hypot(salida[i], salida[i + 1], salida[i + 2]) || 1;
    salida[i] /= l; salida[i + 1] /= l; salida[i + 2] /= l;
  }
}

// Copia de valores por vértice original a vértices de dibujo
function esparce(origen, mapa, destino) {
  for (let i = 0; i < mapa.length; i++) {
    const o = mapa[i] * 3; const d = i * 3;
    destino[d] = origen[o]; destino[d + 1] = origen[o + 1]; destino[d + 2] = origen[o + 2];
  }
}

// Plantilla: giros de reposo de cada hueso y animaciones (corregidas como las del pueblo)
let promesaPlantilla = null;
function cargaPlantilla() {
  promesaPlantilla ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(PERSONAJE.rutaPlantilla)
    .then((gltf) => {
      corrigePersona(gltf.scene, gltf.animations);
      let esqueleto = null;
      gltf.scene.traverse((o) => { if (o.isSkinnedMesh && !esqueleto) esqueleto = o.skeleton; });
      const reposo = new Map();
      const m = new THREE.Matrix4();
      const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3();
      esqueleto.bones.forEach((b, i) => {
        m.copy(esqueleto.boneInverses[i]).invert().decompose(p, q, s);
        reposo.set(b.name, { mundo: q.clone(), posicion: p.clone(), local: b.position.clone() });
      });
      const clip = (n) => gltf.animations.find((a) => a.name === n);
      // Altura de la cadera en la escena (las matrices de reposo están en el espacio de la malla, que
      // en el GLB va girado: no valen para medir alturas)
      gltf.scene.updateMatrixWorld(true);
      const pelvis = gltf.scene.getObjectByName('pelvis');
      const alturaCadera = pelvis ? gltf.scene.worldToLocal(pelvis.getWorldPosition(new THREE.Vector3())).y : 1;
      return { reposo, alturaCadera, clips: { andar: clip('andar'), quieto: clip('quieto') } };
    });
  return promesaPlantilla;
}

// Prepara una animación de la plantilla para este cuerpo: giros tal cual; de las traslaciones solo
// la de la pelvis (el vaivén al andar), escalada a la altura de su cadera; fuera escalas
export function adaptaClip(clip, plantilla, restoNuevo, proporcion) {
  if (!clip) return null;
  const pistas = [];
  for (const t of clip.tracks) {
    const [hueso, prop] = t.name.split('.');
    if (prop === 'quaternion') { pistas.push(t.clone()); continue; }
    if (prop !== 'position' || hueso !== 'pelvis') continue;
    const viejo = plantilla.reposo.get(hueso)?.local;
    const nuevo = restoNuevo.get(hueso);
    if (!viejo || !nuevo) continue;
    const v = Float32Array.from(t.values);
    for (let i = 0; i < v.length; i += 3) {
      v[i] = nuevo.x + (v[i] - viejo.x) * proporcion;
      v[i + 1] = nuevo.y + (v[i + 1] - viejo.y) * proporcion;
      v[i + 2] = nuevo.z + (v[i + 2] - viejo.z) * proporcion;
    }
    pistas.push(new THREE.VectorKeyframeTrack(t.name, t.times, v));
  }
  return new THREE.AnimationClip(clip.name, clip.duration, pistas);
}

export async function creaFabricaPersonajes() {
  const [datos, plantilla] = await Promise.all([cargaBase(), cargaPlantilla()]);
  const motor = creaMotor(datos);
  const { meta, buffer, catalogo } = datos;
  const mapa = vista(buffer, meta.mapa);
  const uv = vista(buffer, meta.uv);
  const indices = vista(buffer, meta.indices);
  const pielI = vista(buffer, meta.pielIndices);
  const pielW = vista(buffer, meta.pielPesos);
  const trisOrig = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) trisOrig[i] = mapa[indices[i]];
  const prendasCat = new Map(catalogo.prendas.map((p) => [p.id, p]));
  const pielesCat = new Map(catalogo.pieles.map((p) => [p.id, p]));

  function crea({ sombras = true, texturaMax = 2048, msaa = false } = {}) {
    const raiz = new THREE.Group();
    raiz.name = 'personaje';
    // --- Huesos (en el orden del rig; los padres van antes)
    const huesos = motor.huesos.map((h) => { const b = new THREE.Bone(); b.name = h.nombre; return b; });
    const porNombre = new Map(huesos.map((b) => [b.name, b]));
    motor.huesos.forEach((h, i) => {
      if (h.padre) porNombre.get(h.padre).add(huesos[i]);
      else raiz.add(huesos[i]);
    });
    const esqueleto = new THREE.Skeleton(huesos);
    const restoLocal = new Map();          // posición local de reposo de cada hueso (para animar)
    const mundoReposo = huesos.map(() => new THREE.Matrix4());

    // --- Cuerpo
    const nDib = mapa.length;
    const geo = new THREE.BufferGeometry();
    const posDib = new Float32Array(nDib * 3);
    const norDib = new Float32Array(nDib * 3);
    const si = new Uint16Array(nDib * 4);
    const sw = new Float32Array(nDib * 4);
    for (let i = 0; i < nDib; i++) {
      const o = mapa[i] * 4;
      for (let k = 0; k < 4; k++) { si[i * 4 + k] = pielI[o + k]; sw[i * 4 + k] = pielW[o + k]; }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(posDib, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(norDib, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geo.userData.mapa = mapa;          // vértice de dibujo → vértice de la malla base
    // Expresiones como «morph targets»: son sumas lineales, valen para cualquier cuerpo
    geo.morphAttributes.position = motor.expresiones.map((nombre) => {
      const d = new Float32Array(nDib * 3);
      const tmp = new Float32Array(motor.n * 3);
      motor.sumaExpresion?.(tmp, nombre);
      esparce(tmp, mapa, d);
      const a = new THREE.BufferAttribute(d, 3);
      a.name = nombre;
      return a;
    });
    geo.morphTargetsRelative = true;
    const matPiel = creaMaterialPiel();
    const cuerpo = new THREE.SkinnedMesh(geo, matPiel);
    cuerpo.name = 'personaje_cuerpo';
    cuerpo.castShadow = sombras;
    cuerpo.receiveShadow = sombras;
    cuerpo.frustumCulled = false;
    cuerpo.morphTargetDictionary = Object.fromEntries(motor.expresiones.map((n, i) => [n, i]));
    cuerpo.morphTargetInfluences = motor.expresiones.map(() => 0);
    raiz.add(cuerpo);
    cuerpo.bind(esqueleto, new THREE.Matrix4());

    // --- Prendas: mallas con piel (pesos heredados de los 3 vértices del cuerpo a los que se
    // enganchan) que se recolocan con cada cuerpo
    const puestas = new Map();      // hueco → { id, malla, datos }
    const P = new Float32Array(motor.n * 3);     // última posición del cuerpo (ya en el suelo)
    const normalesCuerpo = new Float32Array(motor.n * 3);
    let apariencia = null;
    let version = 0;

    function ajustaPrenda(p) {
      const { refs, pesos, despl, escalas, n, posOrig, norOrig, tris, mapaP, pos, nor } = p;
      const esc = [1, 1, 1];
      ['x', 'y', 'z'].forEach((eje, k) => {
        const e = escalas[eje];
        if (e) esc[k] = Math.abs(P[e[0] * 3 + k] - P[e[1] * 3 + k]) / e[2];
        else esc[k] = 0.1;
      });
      for (let i = 0; i < n; i++) {
        const a = refs[i * 3] * 3; const b = refs[i * 3 + 1] * 3; const c = refs[i * 3 + 2] * 3;
        const wa = pesos[i * 3]; const wb = pesos[i * 3 + 1]; const wc = pesos[i * 3 + 2];
        for (let k = 0; k < 3; k++) {
          posOrig[i * 3 + k] = wa * P[a + k] + wb * P[b + k] + wc * P[c + k] + despl[i * 3 + k] * esc[k];
        }
      }
      normales(posOrig, tris, norOrig);
      // La ropa, unos milímetros hacia fuera: la piel y la tela no se deforman igual en las
      // articulaciones y, pegadas, la piel asoma al andar o saltar (la de encima, más fuera)
      const hinchado = HINCHADO[p.hueco] ?? 0;
      // El pantalón, por dentro de la parte de arriba donde esta lo tapa (si no, la cinturilla
      // asoma por la camiseta)
      const bajo = p.hueco === 'abajo' ? bajoDeArriba() : null;
      if (hinchado) {
        for (let i = 0; i < n; i++) {
          let h = hinchado;
          if (bajo) {
            const x = posOrig[i * 3] - bajo.cx; const z = posOrig[i * 3 + 2] - bajo.cz;
            const sector = Math.floor(((Math.atan2(x, z) / (2 * Math.PI)) + 0.5) * SECTORES) % SECTORES;
            const dentro = posOrig[i * 3 + 1] > bajo.minY[sector] + 0.004;
            if (dentro) {
              h = DENTRO_DE_ARRIBA;
              // Nunca más fuera que la camiseta a esa altura y en esa dirección (costuras y
              // trabillas de la cinturilla que, si no, la atraviesan)
              const k = sector * 1000 + Math.floor(posOrig[i * 3 + 1] / 0.02);
              const tope = Math.min(bajo.radio.get(k) ?? Infinity, bajo.radio.get(k - 1) ?? Infinity, bajo.radio.get(k + 1) ?? Infinity) - 0.008;
              const r = Math.hypot(x, z);
              if (Number.isFinite(tope) && r > tope && tope > 0.03) {
                posOrig[i * 3] = bajo.cx + (x * tope) / r;
                posOrig[i * 3 + 2] = bajo.cz + (z * tope) / r;
              }
            }
            // Bien por encima del bajo, la camiseta lo tapa: no se dibuja (trabillas y cinturillas
            // que, si no, asoman por la tela)
            // 1: bajo la camiseta; 2: bien por encima de su bajo
            p.oculto[i] = posOrig[i * 3 + 1] > bajo.minY[sector] + 0.03 ? 2 : dentro ? 1 : 0;
          }
          posOrig[i * 3] += norOrig[i * 3] * h;
          posOrig[i * 3 + 1] += norOrig[i * 3 + 1] * h;
          posOrig[i * 3 + 2] += norOrig[i * 3 + 2] * h;
        }
      }
      if (p.hueco === 'abajo') ocultaBajoArriba(p, Boolean(bajo));
      esparce(posOrig, mapaP, pos.array);
      esparce(norOrig, mapaP, nor.array);
      pos.needsUpdate = true;
      nor.needsUpdate = true;
      p.malla.geometry.computeBoundingSphere();
    }

    async function ponPrenda(hueco, id) {
      const actual = puestas.get(hueco);
      if (actual?.id === id) return;
      if (!id) {
        if (actual) { raiz.remove(actual.malla); actual.malla.geometry.dispose(); actual.malla.material.dispose(); }
        puestas.delete(hueco);
        if (actual) ocultaCuerpo();          // vuelve a verse la piel que tapaba
        if (actual && hueco === 'arriba' && puestas.get('abajo')) ajustaPrenda(puestas.get('abajo'));
        return;
      }
      const item = prendasCat.get(id);
      if (!item) return;
      const { meta: pm, buffer: pb } = await cargaPrenda(id);
      const refs = vista(pb, pm.refs);
      const pesos = vista(pb, pm.pesos);
      const mapaP = vista(pb, pm.mapa);
      const ind = vista(pb, pm.indices);
      const n = pm.vertices;
      const tris = new Uint32Array(ind.length);
      for (let i = 0; i < ind.length; i++) tris[i] = mapaP[ind[i]];
      // Pesos de piel: mezcla de los de sus 3 vértices del cuerpo, 4 huesos como mucho
      const nD = mapaP.length;
      const siP = new Uint16Array(nD * 4);
      const swP = new Float32Array(nD * 4);
      const acumula = new Map();
      const porOrig = new Uint16Array(n * 4);
      const pesoOrig = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        acumula.clear();
        for (let r = 0; r < 3; r++) {
          const v = refs[i * 3 + r]; const w = pesos[i * 3 + r];
          if (w <= 0) continue;
          for (let k = 0; k < 4; k++) {
            const pw = pielW[v * 4 + k];
            if (pw > 0) acumula.set(pielI[v * 4 + k], (acumula.get(pielI[v * 4 + k]) ?? 0) + pw * w);
          }
        }
        const orden = [...acumula].sort((x, y) => y[1] - x[1]).slice(0, 4);
        const s = orden.reduce((t, [, w]) => t + w, 0) || 1;
        orden.forEach(([h, w], k) => { porOrig[i * 4 + k] = h; pesoOrig[i * 4 + k] = w / s; });
        if (!orden.length) pesoOrig[i * 4] = 1;
      }
      for (let i = 0; i < nD; i++) {
        const o = mapaP[i] * 4;
        for (let k = 0; k < 4; k++) { siP[i * 4 + k] = porOrig[o + k]; swP[i * 4 + k] = pesoOrig[o + k]; }
      }
      const g = new THREE.BufferGeometry();
      const pos = new THREE.BufferAttribute(new Float32Array(nD * 3), 3);
      const nor = new THREE.BufferAttribute(new Float32Array(nD * 3), 3);
      g.setAttribute('position', pos);
      g.setAttribute('normal', nor);
      g.setAttribute('uv', new THREE.BufferAttribute(vista(pb, pm.uv), 2));
      g.setAttribute('skinIndex', new THREE.BufferAttribute(siP, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(swP, 4));
      g.setIndex(new THREE.BufferAttribute(new Uint32Array(ind), 1));
      // Las pestañas y las cejas parpadean con la cara: sus morphs, de los vértices del cuerpo
      if (hueco === 'pestanas' || hueco === 'cejas') {
        g.morphAttributes.position = motor.expresiones.map((nombre) => {
          const tmp = new Float32Array(motor.n * 3);
          motor.sumaExpresion?.(tmp, nombre);
          const dO = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) for (let r = 0; r < 3; r++) {
            const v = refs[i * 3 + r] * 3; const w = pesos[i * 3 + r];
            for (let k = 0; k < 3; k++) dO[i * 3 + k] += w * tmp[v + k];
          }
          const d = new Float32Array(nD * 3);
          esparce(dO, mapaP, d);
          return new THREE.BufferAttribute(d, 3);
        });
        g.morphTargetsRelative = true;
      }
      const [tc, tn] = await Promise.all([
        pm.texturas.color ? textura(pm.texturas.color) : null,
        pm.texturas.normal ? textura(pm.texturas.normal, { color: false }) : null,
      ]);
      const mat = hueco === 'ojos' ? creaMaterialOjos(null) : creaMaterialPrenda(hueco, tc, tn, { msaa });
      const malla = new THREE.SkinnedMesh(g, mat);
      malla.name = `personaje_${hueco}`;
      malla.castShadow = sombras && hueco !== 'pestanas' && hueco !== 'cejas' && hueco !== 'ojos';
      malla.receiveShadow = sombras;
      malla.frustumCulled = false;
      malla.renderOrder = pm.z ?? 50;
      if (g.morphAttributes.position) {
        malla.morphTargetDictionary = cuerpo.morphTargetDictionary;
        malla.morphTargetInfluences = cuerpo.morphTargetInfluences;   // la misma lista: se mueven juntos
      }
      // Si mientras cargaba se eligió otra cosa, esta ya no vale
      if (apariencia && idDeHueco(apariencia, hueco) !== id) { g.dispose(); mat.dispose(); return; }
      const vieja = puestas.get(hueco);
      if (vieja) { raiz.remove(vieja.malla); vieja.malla.geometry.dispose(); vieja.malla.material.dispose(); }
      const p = {
        id, hueco, malla, refs, pesos, despl: vista(pb, pm.despl), escalas: pm.escalas, n, tris, mapaP, pos, nor,
        posOrig: new Float32Array(n * 3), norOrig: new Float32Array(n * 3),
        borrar: pm.borrar ? vista(pb, pm.borrar) : null,
        cubre: TAPAN.has(hueco) ? pielCubierta(refs, pesos, vista(pb, pm.despl), tris, n) : null,
        ind, oculto: new Uint8Array(n), firmaOculto: '',
      };
      puestas.set(hueco, p);
      raiz.add(malla);
      malla.bind(esqueleto, new THREE.Matrix4());
      ajustaPrenda(p);
      if (hueco === 'arriba' && puestas.get('abajo')) ajustaPrenda(puestas.get('abajo'));
      aplicaColores();
      ocultaCuerpo();
    }

    // Piel que queda bajo una prenda ceñida: los vértices del cuerpo a los que se enganchan los de
    // la prenda que no son de su borde y van a menos de CERCA_PIEL_M (los de las mangas o el
    // bajo, que dejan ver la piel, no cuentan). Muchas prendas de MakeHuman no traen su lista de
    // «delete_verts», o la traen corta, y la piel asomaba al moverse.
    function pielCubierta(refs, pesos, despl, tris, n) {
      const aristas = new Map();
      for (let i = 0; i < tris.length; i += 3) {
        for (const [a, b] of [[tris[i], tris[i + 1]], [tris[i + 1], tris[i + 2]], [tris[i + 2], tris[i]]]) {
          const k = a < b ? a * 65536 + b : b * 65536 + a;
          aristas.set(k, (aristas.get(k) ?? 0) + 1);
        }
      }
      const borde = new Uint8Array(n);
      for (const [k, c] of aristas) if (c === 1) { borde[Math.floor(k / 65536)] = 1; borde[k % 65536] = 1; }
      // El borde se ensancha unos anillos: cerca del cuello, las mangas o el bajo la piel se queda
      // (si no, por la abertura se ve a través de la prenda)
      for (let anillo = 0; anillo < ANILLOS_BORDE; anillo++) {
        const nuevo = borde.slice();
        for (const k of aristas.keys()) {
          const a = Math.floor(k / 65536); const b = k % 65536;
          if (borde[a] || borde[b]) { nuevo[a] = 1; nuevo[b] = 1; }
        }
        borde.set(nuevo);
      }
      const cubre = new Uint8Array(motor.n);
      for (let i = 0; i < n; i++) {
        if (borde[i]) continue;
        // El desplazamiento de MakeHuman va en decímetros (más o menos: luego se escala por ejes)
        const d = Math.hypot(despl[i * 3], despl[i * 3 + 1], despl[i * 3 + 2]) * 0.1;
        if (d > CERCA_PIEL_M) continue;
        for (let r = 0; r < 3; r++) if (pesos[i * 3 + r] > 0.05 && refs[i * 3 + r] < motor.cuerpo) cubre[refs[i * 3 + r]] = 1;
      }
      return cubre;
    }

    // Triángulos del pantalón que tapa la parte de arriba: fuera
    function ocultaBajoArriba(p, hayArriba) {
      const firma = hayArriba ? p.oculto.join('') : '';
      if (firma === p.firmaOculto) return;
      p.firmaOculto = firma;
      const quedan = [];
      for (let i = 0; i < p.ind.length; i += 3) {
        const a = p.mapaP[p.ind[i]]; const b = p.mapaP[p.ind[i + 1]]; const c = p.mapaP[p.ind[i + 2]];
        // Fuera si está entero bajo la camiseta y alguno de sus vértices queda bien por encima del
        // bajo: al andar, la cinturilla (que sigue a la pelvis) atravesaría la tela
        const o = p.oculto;
        if (hayArriba && o[a] && o[b] && o[c] && (o[a] === 2 || o[b] === 2 || o[c] === 2)) continue;
        quedan.push(p.ind[i], p.ind[i + 1], p.ind[i + 2]);
      }
      p.malla.geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(quedan), 1));
    }

    // Bajo de la parte de arriba alrededor del cuerpo: por cada sector (visto desde arriba, desde
    // el eje de la pelvis) la altura más baja de la tela del tronco (sin las mangas). Lo que el
    // pantalón tenga por encima queda tapado por ella
    function bajoDeArriba() {
      const arriba = puestas.get('arriba');
      if (!arriba) return null;
      const pel = motor.huesos.findIndex((h) => h.nombre === 'pelvis');
      const { cabezas } = motor.articulaciones(P);
      const cx = cabezas[pel * 3]; const cz = cabezas[pel * 3 + 2];
      const minY = new Float32Array(SECTORES).fill(Infinity);
      const q = arriba.posOrig;
      for (let i = 0; i < arriba.n; i++) {
        const x = q[i * 3] - cx; const z = q[i * 3 + 2] - cz;
        if (Math.hypot(x, z) > RADIO_TRONCO_M) continue;
        const sector = Math.floor(((Math.atan2(x, z) / (2 * Math.PI)) + 0.5) * SECTORES) % SECTORES;
        if (q[i * 3 + 1] < minY[sector]) minY[sector] = q[i * 3 + 1];
      }
      // Sectores sin vértices del bajo (la malla es dispersa): el más bajo de los dos vecinos
      const suave = minY.map((_, k) => Math.min(minY[(k + SECTORES - 2) % SECTORES], minY[(k + SECTORES - 1) % SECTORES],
        minY[k], minY[(k + 1) % SECTORES], minY[(k + 2) % SECTORES]));
      minY.set(suave);
      // Radio de la tela por sector y por franjas de 2 cm de alto (lo más cerca del eje)
      const radio = new Map();
      for (let i = 0; i < arriba.n; i++) {
        const x = q[i * 3] - cx; const z = q[i * 3 + 2] - cz;
        const r = Math.hypot(x, z);
        if (r > RADIO_TRONCO_M) continue;
        const sector = Math.floor(((Math.atan2(x, z) / (2 * Math.PI)) + 0.5) * SECTORES) % SECTORES;
        const k = sector * 1000 + Math.floor(q[i * 3 + 1] / 0.02);
        if (!(radio.get(k) <= r)) radio.set(k, r);
      }
      return { cx, cz, minY, radio };
    }

    // Lo que tapa la ropa no se dibuja (evita que la piel atraviese la tela): lo que dice la
    // prenda (delete_verts) y los triángulos con sus tres vértices bajo tela ceñida
    function ocultaCuerpo() {
      const tapado = new Uint8Array(motor.n);
      const cubierto = new Uint8Array(motor.n);
      for (const p of puestas.values()) {
        if (p.borrar) for (const v of p.borrar) tapado[v] = 1;
        if (p.cubre) for (let v = 0; v < p.cubre.length; v++) if (p.cubre[v]) cubierto[v] = 1;
      }
      const quedan = [];
      for (let i = 0; i < indices.length; i += 3) {
        const a = trisOrig[i]; const b = trisOrig[i + 1]; const c = trisOrig[i + 2];
        if (tapado[a] || tapado[b] || tapado[c]) continue;
        if (cubierto[a] && cubierto[b] && cubierto[c]) continue;
        quedan.push(indices[i], indices[i + 1], indices[i + 2]);
      }
      geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(quedan), 1));
    }

    function idDeHueco(a, hueco) {
      if (hueco === 'pelo') return a.pelo?.id;
      if (hueco === 'cejas') return a.cejas?.id;
      if (hueco === 'pestanas') return a.pestanas?.id;
      if (hueco === 'ojos') return 'ojos';
      if (hueco === 'arriba' || hueco === 'abajo') return a.ropa?.conjunto ? null : a.ropa?.[hueco];
      return a.ropa?.[hueco];
    }

    // --- Colores y texturas de la piel y los ojos
    let pielActual = '';
    let irisActual = '';
    async function aplicaPiel() {
      const piel = pielesCat.get(apariencia.piel.id) ?? catalogo.pieles[0];
      const sufijo = texturaMax <= 1024 ? '_m' : '';
      if (pielActual !== piel.id + sufijo) {
        pielActual = piel.id + sufijo;
        const t = await textura(`piel_${piel.id}${sufijo}.webp`);
        if (pielActual === piel.id + sufijo) { matPiel.map = t; matPiel.needsUpdate = true; }
      }
      const iris = apariencia.ojos?.iris ?? 'brown';
      const ojos = puestas.get('ojos');
      if (ojos && irisActual !== iris) {
        irisActual = iris;
        const t = await textura(`iris_${iris}.webp`);
        if (irisActual === iris) { ojos.malla.material.map = t; ojos.malla.material.needsUpdate = true; }
      }
    }
    function aplicaColores() {
      if (!apariencia) return;
      const u = matPiel.userData.uniformes;
      u.uTono.value = apariencia.piel.tono ?? 0;
      u.uRubor.value = apariencia.piel.rubor ?? 0.3;
      matPiel.roughness = THREE.MathUtils.lerp(0.68, 0.38, apariencia.piel.brillo ?? 0.5);
      const pelo = apariencia.pelo?.color;
      for (const [hueco, p] of puestas) {
        const m = p.malla.material;
        if (hueco === 'pelo') { ponColor(m, pelo, 1); m.userData.uniformes.uCanas.value = apariencia.pelo.canas ?? 0; }
        else if (hueco === 'cejas') {
          ponColor(m, apariencia.cejas?.color ?? pelo, 0.85);
          m.userData.uniformes.uCanas.value = (apariencia.pelo.canas ?? 0) * 0.7;
        } else if (hueco === 'pestanas') ponColor(m, '#120d0a', 0.6);
        else if (hueco !== 'ojos') ponColor(m, apariencia.colores?.[p.id] ?? null, 0.92);
      }
    }

    // --- El cuerpo nuevo: posiciones, suelo, huesos, matrices de reposo y prendas
    const vA = new THREE.Vector3();
    const qA = new THREE.Quaternion();
    const uno = new THREE.Vector3(1, 1, 1);
    const inversa = new THREE.Matrix4();
    let alturaCadera = 1;
    function recoloca(expresion) {
      const p = motor.calcula(apariencia, expresion);
      // Al suelo: lo más bajo de los pies (o del calzado, que se mide tras ajustarlo)
      let minY = Infinity;
      for (let i = 0; i < motor.cuerpo; i++) if (p[i * 3 + 1] < minY) minY = p[i * 3 + 1];
      for (let i = 0; i < p.length; i += 3) { P[i] = p[i]; P[i + 1] = p[i + 1] - minY; P[i + 2] = p[i + 2]; }
      const calzado = puestas.get('calzado');
      if (calzado) {
        ajustaPrenda(calzado);
        let minC = 0;
        for (let i = 1; i < calzado.posOrig.length; i += 3) minC = Math.min(minC, calzado.posOrig[i]);
        if (minC < 0) for (let i = 1; i < P.length; i += 3) P[i] -= minC;
      }
      normales(P, trisOrig, normalesCuerpo);
      esparce(P, mapa, posDib);
      esparce(normalesCuerpo, mapa, norDib);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.normal.needsUpdate = true;
      geo.computeBoundingSphere();
      // Huesos: cabeza en su cubo, giro de reposo de la plantilla
      const { cabezas } = motor.articulaciones(P);
      huesos.forEach((b, i) => {
        const rep = plantilla.reposo.get(b.name);
        const q = rep?.mundo ?? qA.identity();
        vA.fromArray(cabezas, i * 3);
        mundoReposo[i].compose(vA, q, uno);
        const padre = motor.huesos[i].padre ? huesos.indexOf(porNombre.get(motor.huesos[i].padre)) : -1;
        const local = padre >= 0 ? inversa.copy(mundoReposo[padre]).invert().multiply(mundoReposo[i]) : mundoReposo[i].clone();
        const lp = new THREE.Vector3(); const lq = new THREE.Quaternion(); const ls = new THREE.Vector3();
        local.decompose(lp, lq, ls);
        b.position.copy(lp);
        b.quaternion.copy(lq);
        b.scale.set(1, 1, 1);
        restoLocal.set(b.name, lp);
        esqueleto.boneInverses[i].copy(mundoReposo[i]).invert();
      });
      const pelvis = huesos.findIndex((b) => b.name === 'pelvis');
      alturaCadera = cabezas[pelvis * 3 + 1];
      // La parte de arriba antes que el pantalón (que mira dónde acaba ella)
      const orden = [...puestas.values()].filter((pr) => pr.hueco !== 'calzado').sort((x, y) => (x.hueco === 'abajo') - (y.hueco === 'abajo'));
      for (const pr of orden) ajustaPrenda(pr);
      version++;
    }

    let colaAplica = Promise.resolve();
    // Aplica una apariencia completa (carga lo que haga falta). Devuelve cuando todo está puesto
    async function aplica(ap) {
      apariencia = structuredClone(ap);
      recoloca();
      aplicaColores();
      const tareas = [aplicaPiel()];
      tareas.push(ponPrenda('ojos', 'ojos'));
      for (const h of ['pelo', 'cejas', 'pestanas', ...HUECOS_ROPA]) tareas.push(ponPrenda(h, idDeHueco(apariencia, h)));
      colaAplica = Promise.all(tareas).then(() => { recoloca(); aplicaColores(); return aplicaPiel(); });
      return colaAplica;
    }
    // Cambio rápido (deslizadores): solo el cuerpo y los colores, sin cargar nada
    function actualizaForma(ap) {
      apariencia = structuredClone(ap);
      recoloca();
      aplicaColores();
    }

    // Altura (de la coronilla a los pies) y medidas para mostrar
    function medidas() {
      let max = 0;
      for (let i = 0; i < motor.cuerpo; i++) max = Math.max(max, P[i * 3 + 1]);
      return { altura: max, cadera: alturaCadera };
    }

    // Animaciones de la plantilla preparadas para este cuerpo
    function animacion(nombre) {
      const proporcion = alturaCadera / (plantilla.alturaCadera || alturaCadera);
      return adaptaClip(plantilla.clips[nombre], plantilla, restoLocal, proporcion);
    }

    function libera() {
      raiz.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    }

    return {
      raiz, cuerpo, esqueleto, huesos: porNombre, aplica, actualizaForma, medidas, animacion, libera,
      get version() { return version; },
      get mallas() { return [cuerpo, ...[...puestas.values()].map((p) => p.malla)]; },
      expresion(nombre, valor) {
        const i = cuerpo.morphTargetDictionary[nombre];
        if (i !== undefined) cuerpo.morphTargetInfluences[i] = valor;
      },
      posicionCuerpo: P,
      prendasPuestas: puestas,          // para pruebas (hueco → prenda ajustada)
    };
  }

  return { crea, motor, catalogo, plantilla };
}
