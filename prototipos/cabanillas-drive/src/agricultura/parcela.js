// Parcela activa (PLAN_AGRICULTURA.md §5.2): una malla que se apoya en el terreno y las máscaras
// de estado que dicen qué le ha pasado a cada trozo de tierra. Solo se crea para las parcelas que
// se están trabajando; las demás son solo su contorno en el registro.
//
// Máscaras (en memoria, Uint8Array, y en la GPU, DataTexture), un píxel cada mpp metros:
//   laboreo  R arado · G gradeado (tierra preparada) · B abono · A dirección de la pasada (0…π)
//   cultivo  R humedad · G día de siembra (0 = sin sembrar) · B cosechado · A rodadas
//   dentro   R: 0 fuera, sube hasta 255 a fundidoLindeM de la linde (para fundir con la ortofoto)
// El píxel (i, j) cubre x = ox + (i + ½)·mpp, z = oz + (j + ½)·mpp.
import * as THREE from 'three';
import { AGRICULTURA } from '../config/agricultura.js';
import { creaMaterialParcela } from './sueloParcela.js';

export const CANAL = {
  arado: 0, gradeado: 1, abono: 2, direccion: 3,     // laboreo
  humedad: 0, siembra: 1, cosechado: 2, rodadas: 3,  // cultivo
};

function texturaMascara(datos, ancho, alto, formato) {
  const t = new THREE.DataTexture(datos, ancho, alto, formato, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.flipY = false;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}

// Interior (regla par-impar por filas) y distancia a la linde solo cerca de ella
function calculaDentro(info, ox, oz, mpp, ancho, alto, fundido) {
  const interior = new Uint8Array(ancho * alto);
  const anillos = info.partes.flat();
  const cruces = [];
  for (let j = 0; j < alto; j++) {
    const z = oz + (j + 0.5) * mpp;
    cruces.length = 0;
    for (const anillo of anillos) {
      for (let a = 0, b = anillo.length - 1; a < anillo.length; b = a++) {
        const [xa, za] = anillo[a];
        const [xb, zb] = anillo[b];
        if ((za > z) !== (zb > z)) cruces.push(xa + ((z - za) / (zb - za)) * (xb - xa));
      }
    }
    cruces.sort((p, q) => p - q);
    for (let k = 0; k + 1 < cruces.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((cruces[k] - ox) / mpp - 0.5));
      const i1 = Math.min(ancho - 1, Math.floor((cruces[k + 1] - ox) / mpp - 0.5));
      for (let i = i0; i <= i1; i++) interior[j * ancho + i] = 1;
    }
  }
  // Distancia a la linde (solo hasta «fundido» metros): banda alrededor de cada lado
  const distancia = new Float32Array(ancho * alto).fill(fundido);
  const banda = Math.ceil(fundido / mpp) + 1;
  for (const anillo of anillos) {
    for (let a = 0, b = anillo.length - 1; a < anillo.length; b = a++) {
      const [xa, za] = anillo[b];
      const [xb, zb] = anillo[a];
      const dx = xb - xa;
      const dz = zb - za;
      const l2 = dx * dx + dz * dz || 1e-9;
      const i0 = Math.max(0, Math.floor((Math.min(xa, xb) - ox) / mpp) - banda);
      const i1 = Math.min(ancho - 1, Math.ceil((Math.max(xa, xb) - ox) / mpp) + banda);
      const j0 = Math.max(0, Math.floor((Math.min(za, zb) - oz) / mpp) - banda);
      const j1 = Math.min(alto - 1, Math.ceil((Math.max(za, zb) - oz) / mpp) + banda);
      for (let j = j0; j <= j1; j++) {
        const z = oz + (j + 0.5) * mpp;
        for (let i = i0; i <= i1; i++) {
          const x = ox + (i + 0.5) * mpp;
          const t = Math.min(1, Math.max(0, ((x - xa) * dx + (z - za) * dz) / l2));
          const d = Math.hypot(x - xa - t * dx, z - za - t * dz);
          const k = j * ancho + i;
          if (d < distancia[k]) distancia[k] = d;
        }
      }
    }
  }
  const dentro = new Uint8Array(ancho * alto);
  for (let k = 0; k < dentro.length; k++) {
    if (interior[k]) dentro[k] = Math.max(1, Math.round((distancia[k] / fundido) * 255));
  }
  return { interior, dentro };
}

// Rejilla que se apoya en el terreno, solo en las celdas que tocan la parcela
function creaGeometria(info, terreno, mascara) {
  const { ox, oz, mpp, ancho, alto, interior } = mascara;
  const lado = Math.max(info.caja[2] - info.caja[0], info.caja[3] - info.caja[1]);
  const M = AGRICULTURA.malla;
  const paso = lado > M.pasoGrandeDesdeM ? M.pasoGrandeM : M.pasoM;
  const anchoM = ancho * mpp;
  const altoM = alto * mpp;
  const nx = Math.ceil(anchoM / paso);
  const nz = Math.ceil(altoM / paso);
  const dentroEn = (x, z) => {
    const i = Math.floor((x - ox) / mpp);
    const j = Math.floor((z - oz) / mpp);
    return i >= 0 && j >= 0 && i < ancho && j < alto && interior[j * ancho + i] === 1;
  };
  const indiceVertice = new Int32Array((nx + 1) * (nz + 1)).fill(-1);
  const posiciones = [];
  const indices = [];
  const vertice = (ci, cj) => {
    const k = cj * (nx + 1) + ci;
    if (indiceVertice[k] < 0) {
      const x = ox + Math.min(ci * paso, anchoM);
      const z = oz + Math.min(cj * paso, altoM);
      indiceVertice[k] = posiciones.length / 3;
      posiciones.push(x, terreno.alturaEn(x, z) + M.alturaSobreSueloM, z);
    }
    return indiceVertice[k];
  };
  for (let cj = 0; cj < nz; cj++) {
    for (let ci = 0; ci < nx; ci++) {
      const x0 = ox + ci * paso;
      const z0 = oz + cj * paso;
      const x1 = Math.min(x0 + paso, ox + anchoM);
      const z1 = Math.min(z0 + paso, oz + altoM);
      const xm = (x0 + x1) / 2;
      const zm = (z0 + z1) / 2;
      // La celda entra si algún punto de muestra cae dentro (bordes incluidos)
      if (!(dentroEn(xm, zm) || dentroEn(x0 + 0.01, z0 + 0.01) || dentroEn(x1 - 0.01, z0 + 0.01)
        || dentroEn(x0 + 0.01, z1 - 0.01) || dentroEn(x1 - 0.01, z1 - 0.01))) continue;
      const a = vertice(ci, cj);
      const b = vertice(ci + 1, cj);
      const c = vertice(ci, cj + 1);
      const d = vertice(ci + 1, cj + 1);
      indices.push(a, c, b, b, c, d);      // hacia arriba (+Y)
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();      // sin normales, la luz de la noche (Lambert) da NaN y sale negro
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return { geo, paso, triangulos: indices.length / 3 };
}

export function creaParcela(info, { terreno, nivelCalidad = 'alto' }) {
  const C = AGRICULTURA.mascara;
  const [x0, z0, x1, z1] = info.caja;
  let mpp = C.metrosPorPixel[nivelCalidad] ?? C.metrosPorPixel.alto;
  const ladoM = Math.max(x1 - x0, z1 - z0) + 2 * C.margenM;
  const ladoMax = C.ladoMax[nivelCalidad] ?? C.ladoMax.alto;
  if (ladoM / mpp > ladoMax) mpp = ladoM / ladoMax;          // parcelas muy grandes: píxel mayor
  const ox = x0 - C.margenM;
  const oz = z0 - C.margenM;
  const ancho = Math.ceil((x1 - x0 + 2 * C.margenM) / mpp);
  const alto = Math.ceil((z1 - z0 + 2 * C.margenM) / mpp);
  const { interior, dentro } = calculaDentro(info, ox, oz, mpp, ancho, alto, AGRICULTURA.fundidoLindeM);
  const laboreo = new Uint8Array(ancho * alto * 4);
  const cultivo = new Uint8Array(ancho * alto * 4);
  const texturas = {
    laboreo: texturaMascara(laboreo, ancho, alto, THREE.RGBAFormat),
    cultivo: texturaMascara(cultivo, ancho, alto, THREE.RGBAFormat),
    dentro: texturaMascara(dentro, ancho, alto, THREE.RedFormat),
  };
  const mascara = { ox, oz, mpp, ancho, alto, interior };
  const { geo, paso, triangulos } = creaGeometria(info, terreno, mascara);
  const material = creaMaterialParcela({ texturas, ox, oz, anchoM: ancho * mpp, altoM: alto * mpp, ancho, alto });
  const malla = new THREE.Mesh(geo, material);
  malla.name = `parcela_${info.ref}`;
  malla.renderOrder = 2;
  malla.receiveShadow = true;
  malla.userData.sombrasPropias = true;      // recibe sombras, no las proyecta (configuraSombras no la toca)

  let sucio = null;              // rectángulo de píxeles cambiados desde la última subida
  let ultimaSubida = -Infinity;
  let recuentoCache = null;
  const pixelesDentro = interior.reduce((s, v) => s + v, 0);

  const parcela = {
    info, ref: info.ref, malla, laboreo, cultivo, dentro, interior, texturas,
    ox, oz, mpp, ancho, alto, pasoMalla: paso, triangulos, pixelesDentro,
    // Píxel de un punto (puede caer fuera de la máscara)
    aPixel: (x, z) => [(x - ox) / mpp - 0.5, (z - oz) / mpp - 0.5],
    // Anota los píxeles cambiados (para subir solo cuando toca y rehacer el recuento)
    marcaCambio(i0, j0, i1, j1) {
      recuentoCache = null;
      if (!sucio) sucio = [i0, j0, i1, j1];
      else sucio = [Math.min(sucio[0], i0), Math.min(sucio[1], j0), Math.max(sucio[2], i1), Math.max(sucio[3], j1)];
    },
    // Sube las máscaras a la GPU si han cambiado (como mucho subidasPorSegundo veces)
    sube(ahora = performance.now(), forzar = false) {
      if (!sucio) return false;
      if (!forzar && ahora - ultimaSubida < 1000 / AGRICULTURA.subidasPorSegundo) return false;
      texturas.laboreo.needsUpdate = true;
      texturas.cultivo.needsUpdate = true;
      sucio = null;
      ultimaSubida = ahora;
      return true;
    },
    // Porcentaje de la parcela (solo lo de dentro de la linde) en cada estado
    recuento() {
      if (recuentoCache) return recuentoCache;
      const n = { arado: 0, gradeado: 0, abonado: 0, sembrado: 0, regado: 0, cosechado: 0, rodadas: 0, rastrojo: 0 };
      for (let k = 0; k < interior.length; k++) {
        if (!interior[k]) continue;
        const l = k * 4;
        const labrado = laboreo[l] > 127 || laboreo[l + 1] > 127;
        if (laboreo[l + 1] > 127) n.gradeado++;
        else if (laboreo[l] > 127) n.arado++;
        if (laboreo[l + 2] > 127) n.abonado++;
        if (cultivo[l + 1] > 0) n.sembrado++;
        if (cultivo[l] > 127) n.regado++;
        if (cultivo[l + 2] > 127) n.cosechado++;
        if (cultivo[l + 3] > 127) n.rodadas++;
        if (!labrado && cultivo[l + 1] === 0 && cultivo[l + 2] <= 127) n.rastrojo++;
      }
      const total = Math.max(pixelesDentro, 1);
      recuentoCache = Object.fromEntries(Object.entries(n).map(([k, v]) => [k, Math.round((v / total) * 1000) / 10]));
      return recuentoCache;
    },
    libera() {
      malla.removeFromParent();
      geo.dispose();
      material.dispose();
      for (const t of Object.values(texturas)) t.dispose();
    },
  };
  return parcela;
}
