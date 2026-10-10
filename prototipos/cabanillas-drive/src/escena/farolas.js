// Farolas del alumbrado (tools/17_farolas.py → assets/farolas.json): báculo con brazo hacia la
// calle y luminaria. De noche la luminaria brilla, lleva un halo y deja un charco de luz cálida
// en el suelo (todo instanciado: cuesta lo mismo con 400 que con 10); además las más cercanas a
// la cámara llevan una luz de verdad que ilumina coches, peatones y fachadas.
// Las luces existen siempre (a 0 de día) para no recompilar los materiales al anochecer.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { registraEstatico } from '../fisica/fisica.js';

const FAROLA = {
  brazo: 0.9,                 // vuelo del brazo sobre la calle (m)
  colorLuz: 0xffc98a,         // vapor de sodio / LED cálido
  intensidad: 30,             // luz de verdad (candelas)
  alcance: 20,
  charcoRadio: 7.5,
  charcoFuerza: 0.5,
  halo: 2.2,                  // tamaño del halo (m)
};

export async function cargaFarolas(ruta) {
  return fetch(ruta).then((r) => (r.ok ? r.json() : null)).catch(() => null);
}

function texturaRadial(paradas) {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 128;
  const ctx = lienzo.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [t, c] of paradas) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(lienzo);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function creaFarolas(datos, { terreno, fisica, luces = 6 }) {
  const raiz = new THREE.Group();
  raiz.name = 'farolas';
  const lista = datos?.farolas ?? [];
  if (!lista.length) return { raiz, actualiza() {} };
  const n = lista.length;

  // Báculo de altura 1 (se escala en Y por farola) y brazo + luminaria aparte (no se deforman)
  const poste = new THREE.CylinderGeometry(0.06, 0.09, 1, 8).translate(0, 0.5, 0);
  const base = new THREE.CylinderGeometry(0.16, 0.18, 0.5, 8).translate(0, 0.25, 0);
  const metal = new THREE.MeshStandardMaterial({ color: 0x2d3133, roughness: 0.55, metalness: 0.6 });
  const postes = new THREE.InstancedMesh(poste, metal, n);
  const bases = new THREE.InstancedMesh(base, metal, n);
  const brazoGeo = mergeGeometries([
    new THREE.CylinderGeometry(0.035, 0.035, FAROLA.brazo, 6).rotateX(Math.PI / 2).translate(0, 0, FAROLA.brazo / 2),
    new THREE.BoxGeometry(0.3, 0.1, 0.5).translate(0, -0.02, FAROLA.brazo),
  ]);
  const brazos = new THREE.InstancedMesh(brazoGeo, metal, n);
  const vidrio = new THREE.MeshStandardMaterial({ color: 0xd9d4c4, emissive: FAROLA.colorLuz, emissiveIntensity: 0, roughness: 0.3 });
  const lampara = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.04, 0.44).translate(0, -0.085, FAROLA.brazo), vidrio, n);

  // Charco de luz en el suelo (aditivo) y halo de la luminaria
  const charcoMat = new THREE.MeshBasicMaterial({
    map: texturaRadial([[0, 'rgba(255,214,160,1)'], [0.35, 'rgba(255,190,120,0.55)'], [1, 'rgba(255,170,90,0)']]),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
  });
  charcoMat.userData.luzPropia = true;     // no la apaga el ciclo de día (es luz)
  const charcos = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), charcoMat, n);
  const posHalo = new Float32Array(n * 3);
  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.BufferAttribute(posHalo, 3));
  const haloMat = new THREE.PointsMaterial({
    size: FAROLA.halo, map: texturaRadial([[0, 'rgba(255,240,215,1)'], [0.2, 'rgba(255,210,150,0.6)'], [1, 'rgba(255,190,120,0)']]),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff,
  });
  haloMat.userData.luzPropia = true;
  const halos = new THREE.Points(haloGeo, haloMat);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0);
  const cabezas = [];
  lista.forEach((f, i) => {
    const y = terreno.alturaEn(f.x, f.z);
    const h = Math.max(3, f.h);
    q.setFromAxisAngle(Y, f.rumbo);
    postes.setMatrixAt(i, m4.compose(new THREE.Vector3(f.x, y, f.z), q, new THREE.Vector3(1, h, 1)));
    bases.setMatrixAt(i, m4.compose(new THREE.Vector3(f.x, y, f.z), q, new THREE.Vector3(1, 1, 1)));
    const arriba = new THREE.Vector3(f.x, y + h - 0.05, f.z);
    brazos.setMatrixAt(i, m4.compose(arriba, q, new THREE.Vector3(1, 1, 1)));
    lampara.setMatrixAt(i, m4);
    const cx = f.x + Math.sin(f.rumbo) * FAROLA.brazo;
    const cz = f.z + Math.cos(f.rumbo) * FAROLA.brazo;
    const cabeza = new THREE.Vector3(cx, arriba.y - 0.12, cz);
    cabezas.push(cabeza);
    posHalo.set([cabeza.x, cabeza.y, cabeza.z], i * 3);
    const r = FAROLA.charcoRadio * Math.min(1.4, h / 5);
    charcos.setMatrixAt(i, m4.compose(new THREE.Vector3(cx, terreno.alturaEn(cx, cz) + 0.06, cz), q.identity(), new THREE.Vector3(r * 2, 1, r * 2)));
    // Choque: el poste es un obstáculo fino
    if (fisica?.mundo) {
      const { RAPIER, mundo } = fisica;
      const c = mundo.createCollider(RAPIER.ColliderDesc.cuboid(0.12, h / 2, 0.12).setTranslation(f.x, y + h / 2, f.z));
      registraEstatico(fisica, c, f.x, f.z, 0.2);
    }
  });
  for (const m of [postes, bases, brazos, lampara]) {
    m.castShadow = true;
    m.computeBoundingSphere();
    raiz.add(m);
  }
  charcos.computeBoundingSphere();
  charcos.userData.sinSombra = true;
  charcos.renderOrder = 2;
  halos.userData.sinSombra = true;
  halos.renderOrder = 3;
  halos.frustumCulled = false;
  raiz.add(charcos, halos);
  postes.name = 'farolas_postes';
  charcos.name = 'farolas_charcos';
  halos.name = 'farolas_halos';

  // Luces de verdad: las «luces» farolas más cercanas a la cámara
  const reales = Array.from({ length: luces }, () => {
    const l = new THREE.PointLight(FAROLA.colorLuz, 0, FAROLA.alcance, 1.8);
    l.castShadow = false;
    raiz.add(l);
    return l;
  });
  let esperaReparto = 0;
  const orden = cabezas.map((_, i) => i);

  return {
    raiz,
    cantidad: n,
    actualiza(oscuridad, camara, dt) {
      const on = THREE.MathUtils.smoothstep(oscuridad, 0.25, 0.7);
      vidrio.emissiveIntensity = 3.5 * on;
      charcoMat.opacity = FAROLA.charcoFuerza * on;
      haloMat.opacity = 0.9 * on;
      charcos.visible = halos.visible = on > 0.01;
      for (const l of reales) l.intensity = 0;
      if (on <= 0.01 || !reales.length) return;
      esperaReparto -= dt;
      if (esperaReparto <= 0) {
        esperaReparto = 0.4;
        const p = camara.position;
        orden.sort((a, b) => cabezas[a].distanceToSquared(p) - cabezas[b].distanceToSquared(p));
      }
      reales.forEach((l, k) => {
        const c = cabezas[orden[k]];
        if (!c) return;
        l.position.set(c.x, c.y - 0.3, c.z);
        l.intensity = FAROLA.intensidad * on;
      });
    },
  };
}
