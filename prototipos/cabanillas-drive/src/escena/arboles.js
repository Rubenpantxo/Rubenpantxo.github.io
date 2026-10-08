// Árboles reales (tools/08_arboles.py: posición, altura, copa, tipo y color medidos en el LiDAR
// y la ortofoto) con los modelos de tools/genera_arboles.mjs.
// Cerca: modelos 3D instanciados con viento. Lejos: «impostores», una tarjeta por árbol que mira
// a la cámara con la imagen del modelo renderizada al cargar.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { registraEstatico } from '../fisica/fisica.js';
import { geometriaFlotante } from './geometria.js';
import { limitaTexturas } from './texturas.js';
import { CALIDAD } from '../config/calidad.js';

const LADO_CASILLA = 256;         // px de cada impostor en el atlas
const ESCALA_COPA = [0.65, 1.5];  // límites del estiramiento horizontal respecto al modelo
const VIENTO = { amplitud: 0.012, aleteo: 0.006 };   // en alturas de árbol

function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function cargaModelosArboles(ruta) {
  const respuesta = await fetch(`${ruta}arboles_modelos.json`);
  if (!respuesta.ok) throw new Error(`No se pudo leer ${ruta}arboles_modelos.json`);
  const manifiesto = await respuesta.json();
  const cargador = new GLTFLoader();
  cargador.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await cargador.loadAsync(`${ruta}arboles.glb`);
  gltf.scene.updateMatrixWorld(true);
  limitaTexturas(gltf.scene, CALIDAD.texturaMax);
  const modelos = {};
  for (const [id, info] of Object.entries(manifiesto.variantes)) {
    const nodo = gltf.scene.getObjectByName(id);
    const malla = (sufijo) => {
      let m = null;
      nodo.getObjectByName(`${id}_${sufijo}`).traverse((o) => { if (o.isMesh) m = o; });
      return { geometry: geometriaFlotante(m.geometry, m.matrixWorld), material: m.material };
    };
    modelos[id] = { id, info, tronco: malla('tronco'), hojas: malla('hojas') };
  }
  return { modelos, manifiesto };
}

// Viento: balanceo de todo el árbol (más arriba, más) y aleteo extra en las hojas.
// Las hojas usan normales «de copa»: sin darles la vuelta en la cara trasera.
function conViento(material, uniformes, { hojas }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempo = uniformes.uTiempo;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTiempo;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 base = vec3(instanceMatrix[3]);
          float fase = base.x * 0.13 + base.z * 0.17;
          float k = transformed.y * transformed.y;
          transformed.x += sin(uTiempo * 1.3 + fase) * ${VIENTO.amplitud.toFixed(4)} * k;
          transformed.z += cos(uTiempo * 1.05 + fase * 1.3) * ${VIENTO.amplitud.toFixed(4)} * k;
          ${hojas ? `transformed += sin(uTiempo * 3.1 + fase + position.x * 9.0 + position.z * 7.0)
            * ${VIENTO.aleteo.toFixed(4)} * transformed.y * vec3(1.0, 0.4, 1.0);` : ''}
        }`);
    if (hojas) {
      shader.fragmentShader = shader.fragmentShader.replace('normal *= faceDirection;', '');
    }
  };
  material.customProgramCacheKey = () => (hojas ? 'arbol_hojas' : 'arbol_tronco');
}

// Imagen lateral de cada variante (alto 1, base abajo) en un atlas: el impostor de lejos
function creaAtlasImpostores(renderer, modelos, entorno) {
  const ids = Object.keys(modelos);
  const columnas = Math.ceil(Math.sqrt(ids.length));
  const filas = Math.ceil(ids.length / columnas);
  const destino = new THREE.WebGLRenderTarget(columnas * LADO_CASILLA, filas * LADO_CASILLA, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    colorSpace: THREE.SRGBColorSpace,
  });
  // Luz de la escena del juego (sol, cielo y reflejos), con el sol algo de frente para que la
  // tarjeta no quede en sombra cuando se mira desde el lado contrario
  const escena = new THREE.Scene();
  escena.environment = entorno.environment;
  escena.environmentIntensity = entorno.environmentIntensity;
  escena.add(new THREE.HemisphereLight(0xcfe2ff, 0x8a7a5a, 1.1));
  const sol = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sol.position.set(0.5, 1, 1.2);
  escena.add(sol);
  const casillas = {};
  const previo = { destino: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()),
    alfa: renderer.getClearAlpha(), tijera: renderer.getScissorTest() };
  renderer.setRenderTarget(destino);
  // Fondo del color medio de una copa con alfa 0: sin bordes negros al reducir (mipmaps)
  renderer.setClearColor(0x3c4a2d, 0);
  renderer.clear();
  renderer.setScissorTest(true);
  ids.forEach((id, i) => {
    const { tronco, hojas, info } = modelos[id];
    const lado = Math.max(1.04, info.radio * 2.3);   // casilla cuadrada que abarca el árbol
    const camara = new THREE.OrthographicCamera(-lado / 2, lado / 2, lado, 0, -10, 10);
    camara.position.set(0, 0, 2);
    const grupo = new THREE.Group();
    grupo.add(new THREE.Mesh(tronco.geometry, tronco.material), new THREE.Mesh(hojas.geometry, hojas.material));
    escena.add(grupo);
    const c = i % columnas;
    const f = Math.floor(i / columnas);
    const x = c * LADO_CASILLA;
    const y = f * LADO_CASILLA;
    renderer.setViewport(x, y, LADO_CASILLA, LADO_CASILLA);
    renderer.setScissor(x, y, LADO_CASILLA, LADO_CASILLA);
    renderer.render(escena, camara);
    escena.remove(grupo);
    casillas[id] = { u: c / columnas, v: f / filas, lado };
  });
  renderer.setScissorTest(previo.tijera);
  renderer.setRenderTarget(previo.destino);
  renderer.setClearColor(previo.color, previo.alfa);
  renderer.setViewport(0, 0, renderer.domElement.width / renderer.getPixelRatio(), renderer.domElement.height / renderer.getPixelRatio());
  return { textura: destino.texture, casillas, tamCasilla: new THREE.Vector2(1 / columnas, 1 / filas) };
}

// Tarjeta que gira sobre el eje vertical para mirar a la cámara (tamaño en la matriz de instancia)
function materialImpostor(atlas) {
  const material = new THREE.MeshBasicMaterial({ map: atlas.textura, alphaTest: 0.5, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTamCasilla = { value: atlas.tamCasilla };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec2 aCasilla;
        uniform vec2 uTamCasilla;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vMapUv = vMapUv * uTamCasilla + aCasilla;`)
      .replace('#include <project_vertex>', `
        vec3 centro = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
        vec3 haciaCamara = cameraPosition - centro;
        vec3 derecha = normalize(vec3(haciaCamara.z, 0.0, -haciaCamara.x));
        float anchoInst = length(instanceMatrix[0].xyz);
        float altoInst = length(instanceMatrix[1].xyz);
        vec3 mundo = centro + derecha * transformed.x * anchoInst + vec3(0.0, transformed.y * altoInst, 0.0);
        vec4 mvPosition = viewMatrix * vec4(mundo, 1.0);
        gl_Position = projectionMatrix * mvPosition;`);
  };
  material.customProgramCacheKey = () => 'arbol_impostor';
  return material;
}

function eligeVariante(tipo, altura, manifiesto, r) {
  const opciones = manifiesto.porTipo[tipo] ?? manifiesto.porTipo.frondosa;
  if (tipo === 'frondosa') {
    // Los árboles bajos suelen ser frutales, olivos o recién plantados
    if (altura < 4.5 && r() < 0.75) return 'frondosa_baja';
    const altas = opciones.filter((v) => v !== 'frondosa_baja');
    return altas[Math.floor(r() * altas.length)];
  }
  return opciones[Math.floor(r() * opciones.length)];
}

// opciones.variantes: variante fija por árbol (galería ?arboles); si no, se sortea por tipo y altura.
// opciones.entorno: la escena del juego, para iluminar los impostores con sus mismos reflejos.
export function creaArboles(renderer, { modelos, manifiesto }, datos, terreno, opciones = {}) {
  const tipos = datos.tipos;
  const uniformes = { uTiempo: { value: 0 } };
  const porVariante = new Map(Object.keys(modelos).map((id) => [id, []]));
  const colocados = [];

  // Color medio por tipo en la ortofoto: el tinte de cada árbol es su desviación respecto a él
  const medias = {};
  for (const [, , , , t, rr, gg, bb] of datos.arboles) {
    const m = (medias[t] ??= [0, 0, 0, 0]);
    m[0] += rr; m[1] += gg; m[2] += bb; m[3]++;
  }
  const lineal = (v) => new THREE.Color().setRGB(v[0] / 255, v[1] / 255, v[2] / 255, THREE.SRGBColorSpace);
  const mediaColor = Object.fromEntries(Object.entries(medias).map(([t, m]) => [t, lineal([m[0] / m[3], m[1] / m[3], m[2] / m[3]])]));

  const q = new THREE.Quaternion();
  const eje = new THREE.Vector3(0, 1, 0);
  datos.arboles.forEach(([x, z, altura, radio, t, rr, gg, bb], i) => {
    const r = azar(i * 7919 + 101);
    const tipo = tipos[t];
    const id = opciones.variantes?.[i] ?? eligeVariante(tipo, altura, manifiesto, r);
    const info = modelos[id].info;
    const natural = altura;                        // escala horizontal sin estirar
    const horizontal = THREE.MathUtils.clamp(radio / info.radio, natural * ESCALA_COPA[0], natural * ESCALA_COPA[1]);
    const y = terreno.alturaEn(x, z) - 0.05;
    q.setFromAxisAngle(eje, r() * Math.PI * 2);
    const matriz = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.clone(),
      new THREE.Vector3(horizontal, altura, horizontal));
    const color = lineal([rr, gg, bb]);
    const m = mediaColor[t];
    const tinte = new THREE.Color(
      THREE.MathUtils.clamp(color.r / m.r, 0.7, 1.35),
      THREE.MathUtils.clamp(color.g / m.g, 0.7, 1.35),
      THREE.MathUtils.clamp(color.b / m.b, 0.7, 1.35),
    ).multiplyScalar(0.9 + 0.2 * r());
    porVariante.get(id).push({ matriz, tinte, x, z });
    colocados.push({ id, x, y, z, altura, radioTronco: info.radioTronco * horizontal, info });
  });

  const raiz = new THREE.Group();
  raiz.name = 'arboles';

  // Cerca: tronco y hojas instanciados por variante
  const conjuntos = [];
  for (const [id, lista] of porVariante) {
    if (!lista.length) continue;
    const { tronco, hojas } = modelos[id];
    const crea = (malla, esHojas) => {
      const material = malla.material.clone();
      conViento(material, uniformes, { hojas: esHojas });
      const inst = new THREE.InstancedMesh(malla.geometry, material, lista.length);
      inst.name = `${id}_${esHojas ? 'hojas' : 'tronco'}`;
      inst.frustumCulled = false;
      inst.count = 0;
      raiz.add(inst);
      return inst;
    };
    conjuntos.push({ id, lista, tronco: crea(tronco, false), hojas: crea(hojas, true),
      triangulos: modelos[id].info.triangulos });
  }

  // Lejos: impostores en una sola malla instanciada
  const atlas = creaAtlasImpostores(renderer, modelos, opciones.entorno ?? {});
  const tarjeta = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  tarjeta.setAttribute('aCasilla', new THREE.InstancedBufferAttribute(new Float32Array(datos.arboles.length * 2), 2));
  const lejos = new THREE.InstancedMesh(tarjeta, materialImpostor(atlas), datos.arboles.length);
  lejos.name = 'arboles_impostores';
  lejos.frustumCulled = false;
  lejos.count = 0;
  raiz.add(lejos);

  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  let triangulos = 0;
  function actualiza(posicionCamara, distanciaCerca) {
    const d2 = distanciaCerca * distanciaCerca;
    let nLejos = 0;
    triangulos = 0;
    const casillaAttr = tarjeta.attributes.aCasilla;
    for (const c of conjuntos) {
      let n = 0;
      const casilla = atlas.casillas[c.id];
      for (const inst of c.lista) {
        p.setFromMatrixPosition(inst.matriz);
        if (p.distanceToSquared(posicionCamara) < d2) {
          c.tronco.setMatrixAt(n, inst.matriz);
          c.hojas.setMatrixAt(n, inst.matriz);
          c.hojas.setColorAt(n, inst.tinte);
          n++;
        } else {
          s.setFromMatrixScale(inst.matriz);
          m4.makeScale(s.x * casilla.lado, s.y * casilla.lado, 1).setPosition(p);
          lejos.setMatrixAt(nLejos, m4);
          lejos.setColorAt(nLejos, inst.tinte);
          casillaAttr.setXY(nLejos, casilla.u, casilla.v);
          nLejos++;
        }
      }
      for (const inst of [c.tronco, c.hojas]) {
        inst.count = n;
        inst.visible = n > 0;   // sin llamadas de dibujo vacías
        inst.instanceMatrix.needsUpdate = true;
        if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      }
      triangulos += n * c.triangulos;
    }
    lejos.count = nLejos;
    lejos.visible = nLejos > 0;
    lejos.instanceMatrix.needsUpdate = true;
    if (lejos.instanceColor) lejos.instanceColor.needsUpdate = true;
    casillaAttr.needsUpdate = true;
    triangulos += nLejos * 2;
    return triangulos;
  }

  return {
    raiz,
    colocados,
    actualiza,
    avanza(dt) { uniformes.uTiempo.value += dt; },
    get triangulos() { return triangulos; },
  };
}

// Colisión: un cilindro por tronco (los árboles son obstáculos fijos)
export function colisionaArboles(fisica, colocados) {
  const { RAPIER, mundo } = fisica;
  for (const a of colocados) {
    const radio = THREE.MathUtils.clamp(a.radioTronco, 0.1, 0.45);
    const alto = Math.min(3, a.altura * 0.5);
    const collider = mundo.createCollider(
      RAPIER.ColliderDesc.cylinder(alto / 2, radio).setTranslation(a.x, a.y + alto / 2, a.z).setFriction(0.8),
    );
    registraEstatico(fisica, collider, a.x, a.z, radio);
  }
}
