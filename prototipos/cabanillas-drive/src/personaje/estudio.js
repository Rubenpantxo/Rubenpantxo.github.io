// Estudio del editor: escena con luz de tres puntos (principal cálida con sombra, recortes fríos
// para el pelo y relleno), reflejos de una sala neutra, suelo con sombra de contacto y fondo en
// degradado. La cámara gira alrededor del personaje con suavizado y encuadra cada zona (cuerpo,
// cara, torso, piernas, pies) dejando sitio al panel de la interfaz.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PERSONAJE } from '../config/personaje.js';

function fondoDegradado() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 512;
  const g = c.getContext('2d');
  const d = g.createLinearGradient(0, 0, 0, 512);
  d.addColorStop(0, '#2b3441');
  d.addColorStop(0.55, '#4b5563');
  d.addColorStop(0.78, '#6b6a68');
  d.addColorStop(1, '#3a3733');
  g.fillStyle = d;
  g.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function creaEstudio(renderer, { sombras = true } = {}) {
  const escena = new THREE.Scene();
  escena.name = 'estudio_personaje';
  escena.background = fondoDegradado();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  escena.environment = entorno;
  escena.environmentIntensity = 0.55;

  const principal = new THREE.DirectionalLight(0xfff1e0, 2.6);
  principal.position.set(2.2, 3.4, 3.0);
  principal.castShadow = sombras;
  if (sombras) {
    principal.shadow.mapSize.set(2048, 2048);
    Object.assign(principal.shadow.camera, { left: -1.3, right: 1.3, top: 2.2, bottom: -0.2, near: 0.5, far: 10 });
    principal.shadow.camera.updateProjectionMatrix();
    principal.shadow.bias = -0.0002;
    principal.shadow.normalBias = 0.012;
    principal.shadow.radius = 3;
  }
  const recorteIzq = new THREE.DirectionalLight(0xb9d4ff, 1.4);
  recorteIzq.position.set(-3, 2.6, -2.4);
  const recorteDer = new THREE.DirectionalLight(0xd7e6ff, 0.9);
  recorteDer.position.set(3, 1.8, -2.8);
  const relleno = new THREE.HemisphereLight(0xdfe8f5, 0x5a4a3c, 0.55);
  const objetivoLuz = new THREE.Object3D();
  objetivoLuz.position.set(0, 1, 0);
  for (const l of [principal, recorteIzq, recorteDer]) l.target = objetivoLuz;
  escena.add(principal, recorteIzq, recorteDer, relleno, objetivoLuz);

  // Suelo: disco que se funde con el fondo y recoge la sombra
  const suelo = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 64).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x5b5753, roughness: 0.92, metalness: 0 }),
  );
  suelo.receiveShadow = sombras;
  suelo.material.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      float r = length( vUvSuelo - 0.5 ) * 2.0;
      gl_FragColor.a = smoothstep( 1.0, 0.55, r );`)
      .replace('#include <common>', '#include <common>\nvarying vec2 vUvSuelo;');
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vUvSuelo;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvUvSuelo = uv;');
  };
  suelo.material.transparent = true;
  suelo.material.depthWrite = false;
  escena.add(suelo);
  // Anillo tenue alrededor de los pies (como una peana)
  const anillo = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.64, 96).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.25 }));
  anillo.position.y = 0.002;
  escena.add(anillo);

  // --- Cámara orbital con encuadre por zonas
  const C = PERSONAJE.camara;
  const camara = new THREE.PerspectiveCamera(C.fov, 1, 0.05, 60);
  const estado = {
    yaw: 0.35, pitch: 0.04, distancia: C.zonas.cuerpo.distancia, objetivo: new THREE.Vector3(0, C.zonas.cuerpo.alto, 0),
  };
  const meta = { yaw: estado.yaw, pitch: estado.pitch, distancia: estado.distancia, objetivo: estado.objetivo.clone() };
  let zona = 'cuerpo';
  let personaje = null;
  let hueco = { izquierda: 0, abajo: 0 };     // espacio que tapa la interfaz (en fracción de pantalla)

  function objetivoZona(z) {
    const def = C.zonas[z] ?? C.zonas.cuerpo;
    const v = new THREE.Vector3(0, def.alto, 0);
    if (def.hueso && personaje) {
      const h = personaje.huesos.get(def.hueso);
      if (h) {
        h.getWorldPosition(v);
        v.y += def.alto;
        if (def.centrado) v.x = 0;
        personaje.raiz.worldToLocal(v);
        v.x = def.centrado ? 0 : v.x;
        personaje.raiz.localToWorld(v);
      }
    }
    return v;
  }

  return {
    escena, camara, suelo,
    ponPersonaje(p) { personaje = p; escena.add(p.raiz); },
    ponHueco(h) { hueco = h; },
    get zona() { return zona; },
    enfoca(z, { distancia } = {}) {
      zona = z;
      const def = C.zonas[z] ?? C.zonas.cuerpo;
      meta.distancia = distancia ?? def.distancia;
      meta.objetivo.copy(objetivoZona(z));
      meta.pitch = def.alturaOjo ?? 0.04;
    },
    gira(dx, dy) {
      meta.yaw -= dx * 0.008;
      meta.pitch = THREE.MathUtils.clamp(meta.pitch + dy * 0.005, -0.5, 0.9);
    },
    acerca(factor) {
      meta.distancia = THREE.MathUtils.clamp(meta.distancia * factor, C.distanciaMin, C.distanciaMax);
    },
    giraA(yaw) { meta.yaw = yaw; },
    actualiza(dt, ancho, alto) {
      const k = 1 - Math.exp(-C.suavizado * dt);
      // La cara puede moverse (animación): el objetivo sigue al hueso
      if (zona !== 'cuerpo') meta.objetivo.lerp(objetivoZona(zona), 0.2);
      estado.yaw += (meta.yaw - estado.yaw) * k;
      estado.pitch += (meta.pitch - estado.pitch) * k;
      estado.distancia += (meta.distancia - estado.distancia) * k;
      estado.objetivo.lerp(meta.objetivo, k);
      const cp = Math.cos(estado.pitch);
      camara.position.set(
        estado.objetivo.x + Math.sin(estado.yaw) * cp * estado.distancia,
        estado.objetivo.y + Math.sin(estado.pitch) * estado.distancia,
        estado.objetivo.z + Math.cos(estado.yaw) * cp * estado.distancia,
      );
      camara.lookAt(estado.objetivo);
      // Desplaza la imagen para centrar al personaje en el hueco libre de la interfaz
      camara.aspect = ancho / alto;
      const dx = hueco.izquierda * ancho * 0.5;
      const dy = hueco.abajo * alto * 0.5;
      if (dx || dy) camara.setViewOffset(ancho, alto, -dx, dy, ancho, alto);
      else camara.clearViewOffset();
      camara.updateProjectionMatrix();
      anillo.material.opacity = 0.12 + 0.1 * Math.sin(performance.now() / 900);
    },
    libera() {
      entorno.dispose();
      escena.background.dispose();
      escena.traverse((o) => { if (o.isMesh && o !== personaje?.cuerpo) { o.geometry.dispose(); o.material.dispose?.(); } });
    },
  };
}
