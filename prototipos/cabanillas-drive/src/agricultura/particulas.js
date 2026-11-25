// Polvo, terrones y abono de las labores (PLAN_AGRICULTURA.md §5.6, fases A4–A5). Una nube de puntos
// para el polvo (cada partícula con su tamaño y su opacidad, sin escribir en profundidad), una malla
// instanciada para los terrones que salta la vertedera y otra nube de puntos para el granulado que
// echan los discos de la abonadora en abanico. Cantidades según la calidad.
import * as THREE from 'three';

const VERTICE = /* glsl */ `
attribute float aTam;
attribute float aAlfa;
varying float vAlfa;
uniform float uEscala;
#include <fog_pars_vertex>
void main() {
  vAlfa = aAlfa;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aTam * uEscala / max(-mvPosition.z, 0.1);
  #include <fog_vertex>
}`;
const FRAGMENTO = /* glsl */ `
uniform vec3 uColor;
uniform float uLuz;
varying float vAlfa;
#include <fog_pars_fragment>
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0;
  float a = vAlfa * smoothstep(1.0, 0.15, d);
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor * uLuz, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function creaParticulas(escena, { terreno, calidad = 'alto' }) {
  const N = { alto: 900, medio: 500, bajo: 260 }[calidad] ?? 500;
  const NT = { alto: 220, medio: 140, bajo: 70 }[calidad] ?? 140;
  const NG = { alto: 900, medio: 550, bajo: 300 }[calidad] ?? 550;
  const raiz = new THREE.Group();
  raiz.name = 'particulas_labranza';
  escena.add(raiz);

  // --- Polvo
  const pos = new Float32Array(N * 3);
  const tam = new Float32Array(N);
  const alfa = new Float32Array(N);
  const vel = new Float32Array(N * 3);
  const vida = new Float32Array(N);       // segundos que le quedan
  const vidaTotal = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aTam', new THREE.BufferAttribute(tam, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aAlfa', new THREE.BufferAttribute(alfa, 1).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uColor: { value: new THREE.Color().setRGB(0.6, 0.51, 0.4, THREE.SRGBColorSpace) },
      uLuz: { value: 1 },
      uEscala: { value: 600 },
    }]),
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const nube = new THREE.Points(geo, material);
  nube.frustumCulled = false;
  nube.renderOrder = 5;
  raiz.add(nube);
  let siguiente = 0;
  let vivas = 0;

  // --- Terrones
  const geoTerron = new THREE.IcosahedronGeometry(1, 0);
  const matTerron = new THREE.MeshLambertMaterial({ color: 0x4a3a2a });
  const terrones = new THREE.InstancedMesh(geoTerron, matTerron, NT);
  terrones.count = 0;
  terrones.frustumCulled = false;
  terrones.castShadow = false;
  raiz.add(terrones);
  const tp = new Float32Array(NT * 3);
  const tv = new Float32Array(NT * 3);
  const tr = new Float32Array(NT);          // radio
  const tg = new Float32Array(NT * 3);      // giro
  const tvida = new Float32Array(NT);
  let tSig = 0;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();

  function polvo(x, y, z, vx, vz, fuerza) {
    const k = siguiente;
    siguiente = (siguiente + 1) % N;
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
    vel[k * 3] = vx + (Math.random() - 0.5) * 0.8;
    vel[k * 3 + 1] = 0.35 + Math.random() * 0.6 * fuerza;
    vel[k * 3 + 2] = vz + (Math.random() - 0.5) * 0.8;
    vidaTotal[k] = vida[k] = 2.2 + Math.random() * 2.2 * fuerza;
    tam[k] = 1.1 + Math.random() * 1.1;
  }

  function terron(x, y, z, vx, vy, vz, radio) {
    const k = tSig;
    tSig = (tSig + 1) % NT;
    tp[k * 3] = x; tp[k * 3 + 1] = y; tp[k * 3 + 2] = z;
    tv[k * 3] = vx; tv[k * 3 + 1] = vy; tv[k * 3 + 2] = vz;
    tr[k] = radio;
    tg[k * 3] = Math.random() * 6; tg[k * 3 + 1] = Math.random() * 6; tg[k * 3 + 2] = Math.random() * 6;
    tvida[k] = 3.5 + Math.random() * 2;
    terrones.count = Math.max(terrones.count, k + 1);
  }

  // --- Granulado de la abonadora
  const gp = new Float32Array(NG * 3).fill(-1e4);
  const gv = new Float32Array(NG * 3);
  const gvivo = new Uint8Array(NG);
  const geoG = new THREE.BufferGeometry();
  geoG.setAttribute('position', new THREE.BufferAttribute(gp, 3).setUsage(THREE.DynamicDrawUsage));
  const matG = new THREE.PointsMaterial({ color: 0xf2f0e8, size: 0.13, sizeAttenuation: true });
  const granulado = new THREE.Points(geoG, matG);
  granulado.frustumCulled = false;
  raiz.add(granulado);
  let gSig = 0;
  let gVivos = 0;

  const acumulado = { polvo: 0, terrones: 0, granos: 0 };
  return {
    raiz,
    // Emite a lo largo de la línea de trabajo: centro (x, y, z), dirección de la marcha (fx, fz),
    // ancho (m), velocidad (m/s), cuánto polvo y terrones echa ese apero (de APEROS) y hacia qué
    // lado vuelca la tierra (1 derecha, −1 izquierda, 0 a los dos: el cultivador)
    emite(dt, { x, y, z, fx, fz, ancho, velocidad, polvo: fPolvo = 1, terrones: fTerrones = 1, seco = 1, lado: vuelca = 0 }) {
      const nx = -fz;
      const nz = fx;
      const rapidez = Math.min(1.6, velocidad / 2.2);
      acumulado.polvo += dt * 110 * fPolvo * rapidez * seco * Math.sqrt(N / 900);
      while (acumulado.polvo >= 1) {
        acumulado.polvo -= 1;
        const t = (Math.random() - 0.5) * ancho;
        polvo(x + nx * t - fx * Math.random() * 1.2, y + 0.15 + Math.random() * 0.3, z + nz * t - fz * Math.random() * 1.2,
          -fx * velocidad * 0.25, -fz * velocidad * 0.25, fPolvo);
      }
      acumulado.terrones += dt * 26 * fTerrones * rapidez * (NT / 220);
      while (acumulado.terrones >= 1) {
        acumulado.terrones -= 1;
        const t = (Math.random() - 0.5) * ancho;
        // La vertedera echa la tierra a un lado (n apunta a la derecha de la marcha) y algo hacia arriba
        const lado = (vuelca === 0 ? (Math.random() < 0.5 ? -0.5 : 0.5) : -vuelca) * (0.6 + Math.random() * 1.2);
        terron(x + nx * t, y + 0.05, z + nz * t, -nx * lado + fx * velocidad * 0.3, 0.9 + Math.random() * 1.4,
          -nz * lado + fz * velocidad * 0.3, 0.035 + Math.random() * 0.06);
      }
    },
    // Abanico de granulado de un disco de la abonadora en (x, y, z): hacia atrás y hacia su lado
    // (lado 1 izquierda, −1 derecha), con alcance para cubrir media anchura de reparto
    granos(dt, { x, y, z, fx, fz, ancho, velocidad, lado }) {
      acumulado.granos += dt * 260 * (NG / 900);
      const nx = -fz;                 // derecha de la marcha
      const nz = fx;
      while (acumulado.granos >= 1) {
        acumulado.granos -= 1;
        const k = gSig;
        gSig = (gSig + 1) % NG;
        // Ángulo desde «atrás» hacia su lado (−0,2…1,45 rad) y rapidez para llegar hasta ancho/2
        const a = -0.2 + Math.random() * 1.65;
        const atras = Math.cos(a);
        const lat = Math.sin(a) * -lado;     // lado izquierdo (1): −derecha
        const v = 3 + Math.random() * (ancho * 0.75);
        gp[k * 3] = x; gp[k * 3 + 1] = y; gp[k * 3 + 2] = z;
        gv[k * 3] = (-fx * atras + nx * lat) * v + fx * velocidad;
        gv[k * 3 + 1] = 1 + Math.random() * 1.4;
        gv[k * 3 + 2] = (-fz * atras + nz * lat) * v + fz * velocidad;
        gvivo[k] = 1;
      }
    },
    actualiza(dt, { luz = 1, viento = [0.4, 0.15], escala = 600 } = {}) {
      gVivos = 0;
      for (let k = 0; k < NG; k++) {
        if (!gvivo[k]) continue;
        gv[k * 3 + 1] -= 9.8 * dt;
        gv[k * 3] *= 1 - dt * 0.5; gv[k * 3 + 2] *= 1 - dt * 0.5;    // el aire los frena
        gp[k * 3] += gv[k * 3] * dt; gp[k * 3 + 1] += gv[k * 3 + 1] * dt; gp[k * 3 + 2] += gv[k * 3 + 2] * dt;
        if (gp[k * 3 + 1] < terreno.alturaEn(gp[k * 3], gp[k * 3 + 2])) { gvivo[k] = 0; gp[k * 3 + 1] = -1e4; continue; }
        gVivos++;
      }
      geoG.attributes.position.needsUpdate = true;
      matG.color.setScalar(0.95 * luz);
      material.uniforms.uLuz.value = luz;
      material.uniforms.uEscala.value = escala;     // px por metro a 1 m de la cámara
      vivas = 0;
      for (let k = 0; k < N; k++) {
        if (vida[k] <= 0) { alfa[k] = 0; continue; }
        vida[k] -= dt;
        const t = 1 - vida[k] / vidaTotal[k];       // 0 al nacer … 1 al morir
        vel[k * 3] += (viento[0] - vel[k * 3]) * dt * 0.6;
        vel[k * 3 + 1] *= 1 - dt * 0.8;
        vel[k * 3 + 2] += (viento[1] - vel[k * 3 + 2]) * dt * 0.6;
        pos[k * 3] += vel[k * 3] * dt;
        pos[k * 3 + 1] += vel[k * 3 + 1] * dt;
        pos[k * 3 + 2] += vel[k * 3 + 2] * dt;
        tam[k] += dt * 1.8;                         // la nube se abre
        alfa[k] = vida[k] > 0 ? 0.3 * Math.min(1, t * 6) * (1 - t) ** 1.5 : 0;
        vivas++;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aTam.needsUpdate = true;
      geo.attributes.aAlfa.needsUpdate = true;
      // Terrones: vuelo, rebote y se quedan; al final se hunden
      for (let k = 0; k < terrones.count; k++) {
        if (tvida[k] <= 0) { m4.makeScale(0, 0, 0); terrones.setMatrixAt(k, m4); continue; }
        tvida[k] -= dt;
        const suelo = terreno.alturaEn(tp[k * 3], tp[k * 3 + 2]) + tr[k] * 0.5;
        if (tp[k * 3 + 1] > suelo + 0.001 || tv[k * 3 + 1] > 0) {
          tv[k * 3 + 1] -= 9.8 * dt;
          for (let i = 0; i < 3; i++) tp[k * 3 + i] += tv[k * 3 + i] * dt;
          tg[k * 3] += dt * 6; tg[k * 3 + 2] += dt * 4;
          if (tp[k * 3 + 1] < suelo) {
            tp[k * 3 + 1] = suelo;
            tv[k * 3 + 1] = Math.abs(tv[k * 3 + 1]) > 1.2 ? -tv[k * 3 + 1] * 0.25 : 0;
            tv[k * 3] *= 0.3; tv[k * 3 + 2] *= 0.3;
          }
        }
        const hunde = Math.min(1, tvida[k] / 1.2);
        p.set(tp[k * 3], tp[k * 3 + 1] - (1 - hunde) * tr[k], tp[k * 3 + 2]);
        q.setFromEuler(e.set(tg[k * 3], tg[k * 3 + 1], tg[k * 3 + 2]));
        s.set(tr[k] * 1.2, tr[k] * 0.8, tr[k]);
        terrones.setMatrixAt(k, m4.compose(p, q, s));
      }
      terrones.instanceMatrix.needsUpdate = true;
    },
    get vivas() { return vivas; },
    get granosEnElAire() { return gVivos; },
    get terrones() { let n = 0; for (let k = 0; k < terrones.count; k++) if (tvida[k] > 0) n++; return n; },
    libera() {
      raiz.removeFromParent();
      geo.dispose(); material.dispose(); geoTerron.dispose(); matTerron.dispose(); geoG.dispose(); matG.dispose();
    },
  };
}
