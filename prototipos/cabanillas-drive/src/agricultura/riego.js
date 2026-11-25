// Riego a manta (PLAN_AGRICULTURA.md §5.5, fase A7).
//
// El agua sale de la acequia por la boquera al abrir la tajadera y avanza sobre la parcela siguiendo
// el relieve real (el terreno del juego, del LiDAR). Simulación en la CPU sobre una rejilla de 1 m
// (2 m en las parcelas grandes), igual que tools/52_riego.py:
//   - lámina de agua por celda; el agua pasa a las cuatro vecinas según la diferencia de cota +
//     lámina, con la ecuación «inercial local» (Bates y otros, 2010) y el rozamiento de Manning;
//   - caudal de cada boquera abierta; infiltración que baja según se llena el suelo (agua útil);
//   - las celdas fuera de la linde son pared (el ribazo de la linde se queda seco por su altura).
// El tiempo del agua es el agrícola (un día de cultivo por hora de juego: 24 veces más rápido).
//
// Lo que empapa pasa a la máscara de cultivo (canal R, humedad: 0…1 de agua útil) y se seca con los
// días (evapotranspiración). Cada día, lo sembrado que está creciendo apunta en la máscara «agua»
// cuánta agua ha tenido (media pesada por lo que crece cada día): con riego crece más, con sed menos,
// y con agua encharcada todo el día, menos.
//
// Se dibuja con una malla que sigue el terreno y sube con la lámina (transparente donde no hay
// agua), la acequia y las tajaderas (acequia.js).
import * as THREE from 'three';
import { AGRICULTURA } from '../config/agricultura.js';
import { CULTIVOS } from '../config/cultivos.js';
import { alturaPorEdad, edadDe } from './crecimiento.js';
import { creaGeometria } from './parcela.js';
import { creaAcequia } from './acequia.js';

const G = 9.81;

export async function cargaDatosRiego(ruta = AGRICULTURA.riego.ruta) {
  try {
    const r = await fetch(ruta);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn(`Riego: no se pudo leer ${ruta} (ejecuta tools/52_riego.py):`, e.message);
    return null;
  }
}

const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- simulación de una parcela
export function creaSimulacion(parcela, datos, modelo, terreno) {
  const M = modelo;
  const c = datos.celda_m ?? M.celda_m;
  const [x0, z0, x1, z1] = parcela.info.caja;
  const ox = x0 - c;
  const oz = z0 - c;
  const nx = Math.ceil((x1 - x0) / c) + 2;
  const nz = Math.ceil((z1 - z0) / c) + 2;
  const N = nx * nz;
  const cota = new Float32Array(N);
  const dentro = new Uint8Array(N);
  const regable = new Uint8Array(N);
  // Dentro: el píxel de máscara del centro de la celda
  const pixelDe = (x, z) => {
    const i = Math.floor((x - parcela.ox) / parcela.mpp);
    const j = Math.floor((z - parcela.oz) / parcela.mpp);
    return i < 0 || j < 0 || i >= parcela.ancho || j >= parcela.alto ? -1 : j * parcela.ancho + i;
  };
  // Plano de la parcela (para el ribazo de las lindes)
  let sxx = 0; let sxz = 0; let szz = 0; let sx = 0; let sz = 0; let sxy = 0; let szy = 0; let sy = 0; let n = 0;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = ox + (i + 0.5) * c;
      const z = oz + (j + 0.5) * c;
      const k = j * nx + i;
      cota[k] = terreno.alturaEn(x, z);
      const p = pixelDe(x, z);
      if (p >= 0 && parcela.interior[p]) {
        dentro[k] = 1;
        const y = cota[k];
        sxx += x * x; sxz += x * z; szz += z * z; sx += x; sz += z; sxy += x * y; szy += z * y; sy += y; n++;
      }
    }
  }
  const m = new THREE.Matrix3().set(sxx, sxz, sx, sxz, szz, sz, sx, sz, n);
  const coef = new THREE.Vector3(sxy, szy, sy).applyMatrix3(m.invert());
  let celdasRegables = 0;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (!dentro[k]) continue;
      const plano = coef.x * (ox + (i + 0.5) * c) + coef.y * (oz + (j + 0.5) * c) + coef.z;
      if (cota[k] - plano <= M.ribazo_cm / 100) { regable[k] = 1; celdasRegables++; }
    }
  }
  // Caras abiertas (entre dos celdas de dentro)
  const abreX = new Uint8Array(nz * (nx - 1));
  const abreZ = new Uint8Array((nz - 1) * nx);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx - 1; i++) abreX[j * (nx - 1) + i] = dentro[j * nx + i] & dentro[j * nx + i + 1];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx; i++) abreZ[j * nx + i] = dentro[j * nx + i] & dentro[(j + 1) * nx + i];
  // Boqueras: la celda de dentro más cercana
  const boqueras = datos.boqueras.map(({ x, z }, indice) => {
    let mejor = -1;
    let d2 = Infinity;
    for (let k = 0; k < N; k++) {
      if (!dentro[k]) continue;
      const dx = ox + ((k % nx) + 0.5) * c - x;
      const dz = oz + (Math.floor(k / nx) + 0.5) * c - z;
      if (dx * dx + dz * dz < d2) { d2 = dx * dx + dz * dz; mejor = k; }
    }
    return { indice, x, z, celda: mejor, abierta: false };
  });
  // Cada píxel de la máscara → su celda (−1 fuera)
  const celdaPixel = new Int32Array(parcela.ancho * parcela.alto).fill(-1);
  for (let pj = 0; pj < parcela.alto; pj++) {
    const z = parcela.oz + (pj + 0.5) * parcela.mpp;
    const j = Math.floor((z - oz) / c);
    if (j < 0 || j >= nz) continue;
    for (let pi = 0; pi < parcela.ancho; pi++) {
      const p = pj * parcela.ancho + pi;
      if (!parcela.interior[p]) continue;
      const i = Math.floor((parcela.ox + (pi + 0.5) * parcela.mpp - ox) / c);
      if (i >= 0 && i < nx && dentro[j * nx + i]) celdaPixel[p] = j * nx + i;
    }
  }

  const h = new Float32Array(N);
  const qx = new Float32Array(nz * (nx - 1));
  const qz = new Float32Array((nz - 1) * nx);
  const sale = new Float32Array(N);
  const W = new Float32Array(N);            // agua del suelo (mm)
  const tocada = new Uint8Array(N);         // le ha entrado agua (su humedad se pasa a la máscara)
  const llegada = new Float32Array(N).fill(-1);   // segundos de riego hasta que la lámina se ve
  const n2 = M.manning_n ** 2;
  const f0 = M.infiltracion_inicial_mmh / 3.6e6;
  const fb = M.infiltracion_basica_mmh / 3.6e6;
  const caudal = M.caudal_boquera_ls / 1000;
  const Wmax = M.agua_util_mm;
  const visible = M.lamina_visible_mm / 1000;

  // El agua del suelo sale de la humedad de la máscara (y, como poco, la de la lluvia)
  function leeSuelo() {
    const suma = new Float32Array(N);
    const cuenta = new Uint16Array(N);
    for (let p = 0; p < celdaPixel.length; p++) {
      const k = celdaPixel[p];
      if (k < 0) continue;
      suma[k] += parcela.cultivo[p * 4];
      cuenta[k]++;
    }
    for (let k = 0; k < N; k++) W[k] = dentro[k] ? Math.max(cuenta[k] ? suma[k] / cuenta[k] / 255 : 0, M.humedad_lluvia) * Wmax : 0;
  }
  leeSuelo();

  let t = 0;                 // segundos de riego (tiempo agrícola)
  let hMax = 0;
  let entradaM3 = 0;
  let cubiertas = 0;

  function paso(dt) {
    // Caras entre columnas
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const f = j * (nx - 1) + i;
        if (!abreX[f]) continue;
        const a = j * nx + i;
        const b = a + 1;
        const ea = cota[a] + h[a];
        const eb = cota[b] + h[b];
        const hf = Math.max(ea, eb) - Math.max(cota[a], cota[b]);
        if (hf <= 1e-4) { qx[f] = 0; continue; }
        const q = qx[f];
        qx[f] = (q - G * hf * dt * ((eb - ea) / c)) / (1 + (G * dt * n2 * Math.abs(q)) / hf ** (7 / 3));
      }
    }
    // Caras entre filas
    for (let j = 0; j < nz - 1; j++) {
      for (let i = 0; i < nx; i++) {
        const f = j * nx + i;
        if (!abreZ[f]) continue;
        const a = f;
        const b = f + nx;
        const ea = cota[a] + h[a];
        const eb = cota[b] + h[b];
        const hf = Math.max(ea, eb) - Math.max(cota[a], cota[b]);
        if (hf <= 1e-4) { qz[f] = 0; continue; }
        const q = qz[f];
        qz[f] = (q - G * hf * dt * ((eb - ea) / c)) / (1 + (G * dt * n2 * Math.abs(q)) / hf ** (7 / 3));
      }
    }
    // Limitador: ninguna celda da más agua de la que tiene
    sale.fill(0);
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const q = qx[j * (nx - 1) + i];
        if (q > 0) sale[j * nx + i] += q; else if (q < 0) sale[j * nx + i + 1] -= q;
      }
    }
    for (let f = 0; f < qz.length; f++) {
      const q = qz[f];
      if (q > 0) sale[f] += q; else if (q < 0) sale[f + nx] -= q;
    }
    for (let k = 0; k < N; k++) {
      const s = (sale[k] * dt) / c;
      sale[k] = s > h[k] ? h[k] / Math.max(s, 1e-12) : 1;
    }
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const f = j * (nx - 1) + i;
        const q = qx[f];
        if (q === 0) continue;
        const a = j * nx + i;
        const qq = q * (q > 0 ? sale[a] : sale[a + 1]);
        qx[f] = qq;
        h[a] -= (qq * dt) / c;
        h[a + 1] += (qq * dt) / c;
      }
    }
    for (let f = 0; f < qz.length; f++) {
      const q = qz[f];
      if (q === 0) continue;
      const qq = q * (q > 0 ? sale[f] : sale[f + nx]);
      qz[f] = qq;
      h[f] -= (qq * dt) / c;
      h[f + nx] += (qq * dt) / c;
    }
    for (const b of boqueras) {
      if (!b.abierta || b.celda < 0) continue;
      h[b.celda] += (caudal * dt) / (c * c);
      entradaM3 += caudal * dt;
    }
    // Infiltración y llegada
    t += dt;
    hMax = 0;
    for (let k = 0; k < N; k++) {
      let hk = h[k];
      if (hk <= 0) { h[k] = 0; continue; }
      const w = W[k];
      const inf = Math.min(hk, (fb + (f0 - fb) * (1 - Math.min(w, Wmax) / Wmax)) * dt);
      hk -= inf;
      W[k] = Math.min(Wmax, w + inf * 1000);
      tocada[k] = 1;
      h[k] = hk;
      if (hk > hMax) hMax = hk;
      if (hk > visible && llegada[k] < 0) { llegada[k] = t; if (regable[k]) cubiertas++; }
    }
  }

  const dtMax = () => Math.min(2, (0.7 * c) / Math.sqrt(G * Math.max(hMax, 0.01)));
  const algunaAbierta = () => boqueras.some((b) => b.abierta);

  const sim = {
    parcela, datos, nx, nz, celda: c, ox, oz, h, W, cota, dentro, regable, llegada, boqueras, celdaPixel,
    get t() { return t; },
    get entradaM3() { return entradaM3; },
    get hMax() { return hMax; },
    get activa() { return algunaAbierta() || hMax > 1e-4; },
    get abiertas() { return boqueras.filter((b) => b.abierta).length; },
    // Parte de la parcela (sin el ribazo) a la que ha llegado el agua en este riego
    get cubierto() { return celdasRegables ? cubiertas / celdasRegables : 0; },
    // Lámina media (m) donde hay agua
    get laminaMedia() {
      let s = 0; let k2 = 0;
      for (let k = 0; k < N; k++) if (h[k] > visible) { s += h[k]; k2++; }
      return k2 ? s / k2 : 0;
    },
    // Avanza «segundos» de riego en pasos estables; como mucho «maxPasos» (devuelve los segundos hechos)
    avanza(segundos, maxPasos = Infinity) {
      let hecho = 0;
      let pasos = 0;
      while (hecho < segundos - 1e-9 && pasos < maxPasos) {
        const dt = Math.min(dtMax(), segundos - hecho);
        paso(dt);
        hecho += dt;
        pasos++;
      }
      return hecho;
    },
    abre(indice, abierta = true) {
      const b = boqueras[indice];
      if (!b) return;
      // Riego nuevo: se vuelve a contar dónde llega
      if (abierta && !sim.activa) { llegada.fill(-1); cubiertas = 0; t = 0; entradaM3 = 0; leeSuelo(); }
      b.abierta = abierta;
    },
    // Lámina (m) en un punto
    laminaEn(x, z) {
      const i = Math.floor((x - ox) / c);
      const j = Math.floor((z - oz) / c);
      return i < 0 || j < 0 || i >= nx || j >= nz ? 0 : h[j * nx + i];
    },
    // Lo empapado pasa a la humedad de la máscara (canal R)
    escribeSuelo() {
      let cambia = false;
      for (let p = 0; p < celdaPixel.length; p++) {
        const k = celdaPixel[p];
        if (k < 0 || !tocada[k]) continue;
        const v = Math.min(250, Math.round((W[k] / Wmax) * 255));
        if (v > parcela.cultivo[p * 4]) { parcela.cultivo[p * 4] = v; cambia = true; }
      }
      if (cambia) parcela.marcaCambio(0, 0, parcela.ancho - 1, parcela.alto - 1);
    },
    // Al pasar días de golpe: se cierran las tajaderas y el agua que queda se mete en el suelo
    resuelve() {
      for (const b of boqueras) b.abierta = false;
      for (let k = 0; k < N; k++) {
        if (h[k] > 0) { W[k] = Math.min(Wmax, W[k] + h[k] * 1000); tocada[k] = 1; }
        h[k] = 0;
      }
      qx.fill(0); qz.fill(0); hMax = 0;
      sim.escribeSuelo();
    },
    // Al cambiar el día el suelo se ha secado (lo hace pasaDiasAgua en la máscara): se vuelve a leer
    releeSuelo() { leeSuelo(); tocada.fill(0); },
  };
  return sim;
}

// ---------------------------------------------------------------- días: secado y agua del cultivo
// Para cada día que pasa: lo sembrado que crece apunta el agua que ha tenido (máscara «agua», media
// pesada por lo que crece ese día) y el suelo se seca (evapotranspiración). sim: la simulación de la
// parcela, si la tiene (para el encharcamiento).
export function pasaDiasAgua(parcela, dia, pasados, modelo, sim = null) {
  const M = modelo;
  const secaByte = (M.evapotranspiracion_mm_dia / M.agua_util_mm) * 255;
  const { cultivo, agua, interior } = parcela;
  const id = parcela.siembra?.cultivo;
  const crece = id ? alturaPorEdad(id) : null;
  const madura = id ? CULTIVOS[id].madura : 0;
  const encharcado = M.encharcado_mm / 1000;
  const lluvia = M.humedad_lluvia;
  const dias = Math.min(pasados, 260);
  let cambia = false;
  for (let d = 0; d < dias; d++) {
    const hoy = dia - (dias - 1 - d);       // el día que acaba (el agua de ese día)
    const primero = d === 0;                // el encharcado solo cuenta el primer día (luego no queda)
    for (let p = 0; p < interior.length; p++) {
      if (!interior[p]) continue;
      const l = p * 4;
      const b = cultivo[l + 1];
      if (crece && b) {
        const edad = edadDe(b, hoy);
        if (edad > 0 && edad <= madura) {
          const antes = crece[edad - 1];
          const ahora = crece[edad];
          if (ahora > antes) {
            let sat = suave(0.1, 0.5, Math.max(cultivo[l] / 255, lluvia));
            if (primero && sim) {
              const k = sim.celdaPixel[p];
              if (k >= 0 && sim.h[k] > encharcado) sat *= 0.3;
            }
            const s = agua[p] / 255;
            const nuevo = antes > 1e-4 ? (s * antes + sat * (ahora - antes)) / ahora : sat;
            const v = Math.round(nuevo * 255);
            if (v !== agua[p]) { agua[p] = v; cambia = true; }
          }
        }
      }
      if (cultivo[l] > 0) { cultivo[l] = Math.max(0, cultivo[l] - secaByte); cambia = true; }
    }
  }
  if (cambia) parcela.marcaCambio(0, 0, parcela.ancho - 1, parcela.alto - 1);
  sim?.releeSuelo();
}

// ---------------------------------------------------------------- lámina de agua (dibujo)
export function creaLamina(sim, terreno, visibleM = 0.005) {
  const { parcela, nx, nz, celda, ox, oz } = sim;
  const datos = new Uint8Array(nx * nz);
  const textura = new THREE.DataTexture(datos, nx, nz, THREE.RedFormat, THREE.UnsignedByteType);
  textura.magFilter = THREE.LinearFilter;
  textura.minFilter = THREE.LinearFilter;
  textura.wrapS = textura.wrapT = THREE.ClampToEdgeWrapping;
  textura.flipY = false;
  textura.unpackAlignment = 1;
  textura.needsUpdate = true;
  const { geo } = creaGeometria(parcela.info, terreno, parcela.mascara, celda);
  const u = {
    uLamina: { value: textura },
    uRejilla: { value: new THREE.Vector4(ox, oz, nx * celda, nz * celda) },
    uVisible: { value: visibleM },
    uTiempoL: { value: 0 },
  };
  const material = new THREE.MeshStandardMaterial({
    color: 0x6f5b3f, roughness: 0.08, metalness: 0, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, envMapIntensity: 1.1, name: 'lamina_riego',
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uLamina;
        uniform vec4 uRejilla;
        varying vec2 vUvL;
        varying vec3 vMundoL;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vUvL = (position.xz - uRejilla.xy) / uRejilla.zw;
        transformed.y += texture2D(uLamina, vUvL).r * 0.255 + 0.006;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vMundoL = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uLamina;
        uniform float uVisible, uTiempoL;
        varying vec2 vUvL;
        varying vec3 vMundoL;
        float azarL(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float ruidoL(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(azarL(i), azarL(i + vec2(1, 0)), f.x), mix(azarL(i + vec2(0, 1)), azarL(i + vec2(1, 1)), f.x), f.y);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float hL = texture2D(uLamina, vUvL).r * 0.255;
        // Borde irregular y espuma sucia en el frente (donde el agua es poca)
        float borde = hL + (ruidoL(vMundoL.xz * 2.3) - 0.5) * 0.004;
        if (borde < uVisible * 0.6) discard;
        float frente = 1.0 - smoothstep(uVisible, uVisible * 4.0, hL);
        float espuma = frente * smoothstep(0.45, 0.8, ruidoL(vMundoL.xz * 6.0 + uTiempoL * 0.3));
        diffuseColor.rgb = mix(diffuseColor.rgb * mix(1.25, 0.75, smoothstep(0.01, 0.1, hL)), vec3(0.62, 0.55, 0.43), espuma * 0.7);
        diffuseColor.a = smoothstep(uVisible * 0.6, uVisible * 2.0, borde) * mix(0.72, 0.95, smoothstep(0.008, 0.08, hL));`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // Rizos lentos del agua que corre
          vec2 q = vMundoL.xz * 1.7;
          float e = 0.05;
          float r0 = ruidoL(q + uTiempoL * 0.5);
          vec2 g = vec2(ruidoL(q + vec2(e, 0.0) + uTiempoL * 0.5) - r0, ruidoL(q + vec2(0.0, e) + uTiempoL * 0.5) - r0) / e;
          vec3 nM = normalize(vec3(-g.x * 0.035, 1.0, -g.y * 0.035));
          normal = normalize((viewMatrix * vec4(nM, 0.0)).xyz);
        }`);
  };
  material.customProgramCacheKey = () => 'lamina_riego_v1';
  const malla = new THREE.Mesh(geo, material);
  malla.name = `lamina_${parcela.ref}`;
  malla.renderOrder = 4;
  malla.frustumCulled = false;
  malla.visible = false;
  let reloj = 0;
  return {
    malla,
    actualiza(dt, forzar = false) {
      u.uTiempoL.value += dt;
      reloj += dt;
      if (!forzar && reloj < AGRICULTURA.riego.refrescoLaminaS) return;
      reloj = 0;
      let hay = false;
      const { h } = sim;
      for (let k = 0; k < datos.length; k++) {
        const v = Math.min(255, Math.round(h[k] * 1000));
        datos[k] = v;
        if (v > 2) hay = true;
      }
      textura.needsUpdate = true;
      malla.visible = hay;
    },
    libera() {
      malla.removeFromParent();
      geo.dispose();
      material.dispose();
      textura.dispose();
    },
  };
}

// ---------------------------------------------------------------- riego del modo agricultura
// Acequias y tajaderas de las parcelas de riego.json; la simulación y la lámina de cada parcela se
// crean al abrir su primera tajadera (y la parcela se activa, como al labrarla).
export function creaRiegoModo({ datos, terreno, labranza, registro, raiz }) {
  const R = AGRICULTURA.riego;
  const M = datos?.modelo ?? null;
  const aceleracion = 86400 / AGRICULTURA.reloj.segundosPorDia;     // segundos de riego por segundo de juego
  const sitios = new Map();
  for (const [ref, d] of Object.entries(datos?.parcelas ?? {})) {
    if (!registro.porRef(ref)) { console.warn(`Riego: la parcela ${ref} no está en el registro`); continue; }
    const acequia = creaAcequia(d, terreno);
    raiz.add(acequia.raiz);
    sitios.set(ref, { ref, datos: d, acequia, sim: null, lamina: null });
  }
  let relojSuelo = 0;
  let pendiente = 0;          // segundos de riego que no dio tiempo a simular

  function simDe(s) {
    if (!s.sim) {
      const parcela = labranza.activa(registro.porRef(s.ref));
      s.sim = creaSimulacion(parcela, s.datos, M, terreno);
      s.lamina = creaLamina(s.sim, terreno, M.lamina_visible_mm / 1000);
      raiz.add(s.lamina.malla);
    }
    return s.sim;
  }

  const riego = {
    sitios, modelo: M, aceleracion,
    get hay() { return sitios.size > 0; },
    // La tajadera más cercana a (x, z) dentro del radio: { ref, indice, nombre, abierta, distancia }
    tajaderaCerca(x, z, radio = R.radioTajaderaM) {
      let mejor = null;
      for (const s of sitios.values()) {
        for (const t of s.acequia.tajaderas) {
          const d = Math.hypot(t.x - x, t.z - z);
          if (d <= radio && (!mejor || d < mejor.distancia)) {
            mejor = { ref: s.ref, indice: t.indice, nombre: t.nombre, distancia: d,
              abierta: Boolean(s.sim?.boqueras[t.indice].abierta) };
          }
        }
      }
      return mejor;
    },
    // Abre o cierra una tajadera; devuelve si queda abierta
    alterna(ref, indice, abierta = null) {
      const s = sitios.get(ref);
      if (!s || !M) return false;
      const sim = simDe(s);
      const nueva = abierta ?? !sim.boqueras[indice].abierta;
      sim.abre(indice, nueva);
      s.acequia.pon(indice, nueva);
      return nueva;
    },
    // Estado del riego de una parcela (o null si no tiene)
    estado(ref) {
      const s = sitios.get(ref);
      if (!s) return null;
      const sim = s.sim;
      return {
        ref, tajaderas: s.acequia.tajaderas.map((t) => ({ nombre: t.nombre, abierta: Boolean(sim?.boqueras[t.indice].abierta) })),
        regando: Boolean(sim?.activa), abiertas: sim?.abiertas ?? 0, cubierto: sim?.cubierto ?? 0,
        minutos: sim ? sim.t / 60 : 0, mm: sim ? (sim.entradaM3 / (registro.porRef(ref).superficie_m2 || 1)) * 1000 : 0,
        caudalLs: (sim?.abiertas ?? 0) * (M?.caudal_boquera_ls ?? 0),
      };
    },
    laminaEn(x, z) {
      for (const s of sitios.values()) if (s.sim) { const h = s.sim.laminaEn(x, z); if (h > 0) return h; }
      return 0;
    },
    // Cada fotograma (dt de juego)
    actualiza(dt) {
      for (const s of sitios.values()) s.acequia.actualiza(dt);
      if (!M) return;
      relojSuelo += dt;
      const escribe = relojSuelo >= R.refrescoHumedadS;
      if (escribe) relojSuelo = 0;
      for (const s of sitios.values()) {
        if (!s.sim) continue;
        if (s.sim.activa) {
          const quiero = dt * aceleracion + pendiente;
          const hecho = s.sim.avanza(quiero, R.maxPasosPorFotograma);
          pendiente = Math.min(quiero - hecho, 5);     // si no da tiempo, el agua va algo más lenta
          if (escribe) s.sim.escribeSuelo();
          s.lamina.actualiza(dt);
        } else if (s.lamina.malla.visible) {
          s.sim.escribeSuelo();
          s.lamina.actualiza(dt, true);
        }
      }
    },
    // Para las pruebas y para pasar días: simula «segundos» de riego de golpe
    simula(segundos) {
      for (const s of sitios.values()) {
        if (!s.sim?.activa) continue;
        s.sim.avanza(segundos);
        s.sim.escribeSuelo();
        s.lamina.actualiza(0, true);
      }
    },
    // Antes de pasar días: se cierran las tajaderas y el agua se mete en el suelo
    resuelve() {
      for (const s of sitios.values()) {
        if (!s.sim) continue;
        const habia = s.sim.activa;
        s.sim.resuelve();
        s.lamina.actualiza(0, true);
        for (const t of s.acequia.tajaderas) s.acequia.pon(t.indice, false);
        if (habia) s.sim.parcela.sube(performance.now(), true);
      }
    },
    // Cada vez que cambia el día: secado del suelo y agua de lo que crece en todas las parcelas activas
    alCambiarDia(dia, pasados) {
      if (!M || pasados <= 0) return;
      for (const p of labranza.parcelas.values()) pasaDiasAgua(p, dia, pasados, M, sitios.get(p.ref)?.sim ?? null);
    },
    libera() {
      for (const s of sitios.values()) { s.acequia.libera(); s.lamina?.libera(); }
      sitios.clear();
    },
  };
  return riego;
}
