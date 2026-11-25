// Cosechadora (PLAN_AGRICULTURA.md §5.6, fase A8). Se conduce como el tractor (coche.js, con la
// dirección en las ruedas de atrás). Q (o ⬇) baja el cabezal: el molinete gira y, en marcha, la
// barra de corte siega lo sembrado que está maduro (el resto lo deja: aviso) por donde pasa; lo
// segado queda como rastrojo con la paja detrás, el cultivo se corta con su escalón (el dosel
// enseña los tallos en el borde) y el grano va a la tolva según el rendimiento de cada píxel
// (cultivo × vigor de la tierra, el abono y el agua). Con la tolva llena no siega.
// X (o el botón 🌾) saca o recoge el tubo de descarga: si cae sobre la caja de un remolque (el del
// tractor, aparcado o enganchado), el grano pasa de la tolva al remolque.
import * as THREE from 'three';
import { COSECHADORA } from '../config/maquinaria.js';
import { CULTIVOS } from '../config/cultivos.js';
import { CALIDAD } from '../config/calidad.js';
import { creaMaquina } from './maquina.js';
import { pinta } from './pincel.js';
import { edadDe, vigorMedio } from './crecimiento.js';

const suave = (t) => t * t * (3 - 2 * t);

// Chorros de partículas: paja que echa el esparcidor y grano que cae del tubo
function creaChorros(escena, terreno) {
  const NP = { alto: 700, medio: 420, bajo: 220 }[CALIDAD.nivel] ?? 420;
  const NG = { alto: 500, medio: 320, bajo: 180 }[CALIDAD.nivel] ?? 320;
  const crea = (n, color, tam) => {
    const pos = new Float32Array(n * 3).fill(-1e4);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    const puntos = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: tam, sizeAttenuation: true }));
    puntos.frustumCulled = false;
    escena.add(puntos);
    return { pos, vel: new Float32Array(n * 3), vida: new Float32Array(n), n, puntos, sig: 0, acum: 0, geo };
  };
  const paja = crea(NP, 0xd6bd78, 0.09);
  const grano = crea(NG, 0xc39a45, 0.12);
  function nace(c, x, y, z, vx, vy, vz, vida) {
    const k = c.sig;
    c.sig = (c.sig + 1) % c.n;
    c.pos[k * 3] = x; c.pos[k * 3 + 1] = y; c.pos[k * 3 + 2] = z;
    c.vel[k * 3] = vx; c.vel[k * 3 + 1] = vy; c.vel[k * 3 + 2] = vz;
    c.vida[k] = vida;
  }
  function mueve(c, dt, frena, suelo) {
    for (let k = 0; k < c.n; k++) {
      if (c.vida[k] <= 0) { c.pos[k * 3 + 1] = -1e4; continue; }
      c.vida[k] -= dt;
      c.vel[k * 3 + 1] -= 9.81 * dt * (frena ? 0.35 : 1);
      if (frena) { c.vel[k * 3] *= 1 - 1.5 * dt; c.vel[k * 3 + 2] *= 1 - 1.5 * dt; }
      c.pos[k * 3] += c.vel[k * 3] * dt;
      c.pos[k * 3 + 1] += c.vel[k * 3 + 1] * dt;
      c.pos[k * 3 + 2] += c.vel[k * 3 + 2] * dt;
      const s = suelo(k);
      if (c.pos[k * 3 + 1] < s) { c.vida[k] = 0; c.pos[k * 3 + 1] = -1e4; }
    }
    c.geo.attributes.position.needsUpdate = true;
  }
  let fondoGrano = 0;     // altura donde se para el grano (el montón del remolque o el suelo)
  return {
    // Paja del esparcidor: hacia atrás y a los lados, a lo ancho del cabezal
    paja(dt, x, y, z, fx, fz, ancho, v) {
      paja.acum += dt * 160 * (NP / 700);
      const nx = -fz; const nz = fx;
      while (paja.acum >= 1) {
        paja.acum -= 1;
        const t = (Math.random() - 0.5) * 2;
        const lat = t * ancho * 0.45;
        nace(paja, x, y, z, -fx * (1 + Math.random() * 2) + nx * lat * 0.9 + fx * v, 0.6 + Math.random() * 0.8,
          -fz * (1 + Math.random() * 2) + nz * lat * 0.9 + fz * v, 1.6 + Math.random());
      }
    },
    // Grano del tubo: cae casi recto en un chorro
    grano(dt, x, y, z, fondo) {
      fondoGrano = fondo;
      grano.acum += dt * 320 * (NG / 500);
      while (grano.acum >= 1) {
        grano.acum -= 1;
        nace(grano, x + (Math.random() - 0.5) * 0.12, y, z + (Math.random() - 0.5) * 0.12,
          (Math.random() - 0.5) * 0.3, -0.5 - Math.random(), (Math.random() - 0.5) * 0.3, 2);
      }
    },
    actualiza(dt) {
      mueve(paja, dt, true, (k) => terreno.alturaEn(paja.pos[k * 3], paja.pos[k * 3 + 2]) + 0.02);
      mueve(grano, dt, false, () => fondoGrano);
    },
    libera() { for (const c of [paja, grano]) { c.puntos.removeFromParent(); c.geo.dispose(); c.puntos.material.dispose(); } },
  };
}

export async function creaCosechadora({ fisica, escena, terreno, registro, labranza, reloj, remolques }) {
  const K = COSECHADORA.cosecha;
  const maquina = await creaMaquina(fisica, escena, { ...COSECHADORA });
  const { info, piezas } = maquina;
  const motor = maquina.config.motor;
  const velocidadMaxOriginal = motor.velocidadMaxKmh;
  const { cabezal, molinete, tubo_descarga: tubo, carga } = piezas;
  // El molinete sube con el cabezal
  maquina.base.updateMatrixWorld(true);
  if (cabezal && molinete) cabezal.attach(molinete);
  const reposo = {
    cabezal: cabezal?.rotation.x ?? 0,
    tubo: tubo?.rotation.y ?? 0,
  };
  // Salida del tubo en el sistema del propio tubo (para seguirla al girarlo)
  const salidaTubo = new THREE.Vector3();
  if (tubo) {
    maquina.base.updateMatrixWorld(true);
    salidaTubo.fromArray(info.tubo.salida);
    maquina.base.localToWorld(salidaTubo);
    tubo.worldToLocal(salidaTubo);
  }
  const chorros = creaChorros(escena, terreno);

  let cabezalBajado = false;
  let subida = 1;               // 0 segando … 1 arriba
  let tuboFuera = false;
  let giroTubo = 0;             // 0 plegado … 1 fuera
  let tolvaKg = 0;
  let contenido = null;         // cultivo que lleva la tolva
  let segando = false;
  let verdes = false;           // ha encontrado cultivo sin madurar en la barra
  let tolvaLlena = false;
  let descargando = false;
  let sinRemolque = false;
  let pajaHasta = 0;            // la paja sigue saliendo un rato después de segar
  let rendimiento = 0;          // kg/ha de lo último segado (media móvil)
  const total = { kg: 0, m2: 0 };
  const corte = new THREE.Vector3();
  const corteAntes = new THREE.Vector3();
  let hayAntes = false;
  const adelante = new THREE.Vector3();
  const rueda = new THREE.Vector3();
  const ruedaAntes = new THREE.Vector3();
  let hayRuedaAntes = false;
  const via = Math.abs(info.ruedas[0].centro[0] - info.ruedas[1].centro[0]);
  const ejeDelantero = new THREE.Vector3(0, 0, info.ruedas[0].centro[2]);
  const v = new THREE.Vector3();
  const pajaLocal = new THREE.Vector3().fromArray(info.paja);
  const corteLocal = new THREE.Vector3().fromArray(info.cabezal.corte);
  let tiempo = 0;

  const capacidadKg = () => K.tolvaL * (CULTIVOS[contenido ?? 'trigo']?.pesoLitroKg ?? 0.75);

  function pintaCarga() {
    if (!carga) return;
    const t = Math.min(1, tolvaKg / capacidadKg());
    const c = info.tolva;
    carga.visible = t > 0.005;
    carga.position.y = THREE.MathUtils.lerp(c.y_vacia, c.y_llena, t);
    const e = THREE.MathUtils.lerp(c.escala_vacia, 1, t);
    carga.scale.set(e, 1, e);
  }
  pintaCarga();

  // Siega entre dos posiciones de la barra de corte en todas las parcelas sembradas que toca
  function siega(a, b) {
    let kg = 0;
    let m2 = 0;
    const ancho = info.cabezal.ancho_corte;
    const m = ancho / 2 + 1;
    for (const p of labranza.parcelas.values()) {
      if (!p.siembra) continue;
      const [x0, z0, x1, z1] = p.info.caja;
      if (Math.max(a.x, b.x) < x0 - m || Math.min(a.x, b.x) > x1 + m || Math.max(a.z, b.z) < z0 - m || Math.min(a.z, b.z) > z1 + m) continue;
      const cultivo = CULTIVOS[p.siembra.cultivo];
      const madura = cultivo.madura;
      const kgPixel = (cultivo.rendimientoKgHa * p.mpp * p.mpp) / 10000;
      const op = {
        extremosRectos: true,
        maduro: (q, k, byte) => edadDe(byte, reloj.dia) >= madura,
        alCortar: (q, k) => {
          const l = k * 4;
          const prep = Math.max(q.laboreo[l], q.laboreo[l + 1]) / 255;
          kg += kgPixel * vigorMedio(Math.min(1, prep * 1.4), q.laboreo[l + 2] / 255, q.agua[k] / 255);
          m2 += p.mpp * p.mpp;
          if (!contenido || tolvaKg <= 0) contenido = p.siembra.cultivo;
        },
      };
      pinta(p, 'segar', a.x, a.z, b.x, b.z, ancho, op);
      if (op.verdes) verdes = true;
    }
    return { kg, m2 };
  }

  const remolqueBajo = (punto) => {
    for (const r of remolques()) {
      const caja = r.info.caja;
      if (!caja || !r.objeto.parent) continue;
      r.modelo.updateWorldMatrix(true, false);
      v.copy(punto);
      r.modelo.worldToLocal(v);
      if (Math.abs(v.x - caja.centro[0]) < caja.ancho / 2 - 0.15 && Math.abs(v.z - caja.centro[2]) < caja.largo / 2 - 0.15
        && v.y > caja.borde_y - 0.6) return r;
    }
    return null;
  };

  const cosechadora = {
    maquina,
    get cabezalBajado() { return cabezalBajado; },
    get subida() { return subida; },
    get tuboFuera() { return tuboFuera; },
    get giroTubo() { return giroTubo; },
    get tolvaKg() { return tolvaKg; },
    get capacidadKg() { return capacidadKg(); },
    get contenido() { return contenido; },
    get segando() { return segando; },
    get verdes() { return verdes; },
    get tolvaLlena() { return tolvaLlena; },
    get descargando() { return descargando; },
    get sinRemolque() { return sinRemolque; },
    get rendimiento() { return rendimiento; },
    total,
    alternaCabezal() { cabezalBajado = !cabezalBajado; return cabezalBajado; },
    ponCabezal(b) { cabezalBajado = Boolean(b); },
    alternaTubo() { tuboFuera = !tuboFuera; return tuboFuera; },
    ponTubo(b) { tuboFuera = Boolean(b); },
    // Vacía la tolva (en la COPE, hasta que en A9 se venda): devuelve los kg
    vacia() { const kg = tolvaKg; tolvaKg = 0; pintaCarga(); return kg; },
    llenaPara(kg, id = 'trigo') { contenido = id; tolvaKg = Math.min(kg, capacidadKg()); pintaCarga(); },
    // Punto de salida del grano en el mundo
    salidaTubo(salida = new THREE.Vector3()) {
      tubo.updateWorldMatrix(true, false);
      return salida.copy(salidaTubo).applyMatrix4(tubo.matrixWorld);
    },
    // Centro de la barra de corte en el suelo (mundo)
    centroCorte(salida = new THREE.Vector3()) {
      maquina.base.updateWorldMatrix(true, false);
      return salida.copy(corteLocal).applyMatrix4(maquina.base.matrixWorld);
    },
    // Cada fotograma. conduce: la lleva el jugador (si no, se queda quieta con todo parado)
    actualiza(dt, conduce) {
      tiempo += dt;
      // Cabezal y molinete
      const objetivo = cabezalBajado && conduce ? 0 : cabezalBajado ? subida : 1;
      const paso = dt / K.segundosCabezal;
      subida += Math.max(-paso, Math.min(paso, objetivo - subida));
      if (cabezal) cabezal.rotation.x = reposo.cabezal - K.subidaCabezalRad * suave(subida);
      if (molinete && cabezalBajado && subida < 0.5) molinete.rotation.x += (K.molineteRpm / 60) * 2 * Math.PI * dt;
      motor.velocidadMaxKmh = subida < 0.5 ? K.velocidadMaxKmh : velocidadMaxOriginal;
      // Tubo
      const pasoT = dt / K.segundosTubo;
      giroTubo += Math.max(-pasoT, Math.min(pasoT, (tuboFuera ? 1 : 0) - giroTubo));
      if (tubo) tubo.rotation.y = reposo.tubo - (Math.PI / 2) * suave(giroTubo);

      const e = maquina.estado();
      const kmh = e.velocidadKmh;
      adelante.copy(e.adelante).setY(0).normalize();
      segando = false;
      verdes = false;
      tolvaLlena = tolvaKg >= capacidadKg() - 1;
      // Siega
      if (conduce && subida < 0.08 && kmh > 0.5 && !tolvaLlena) {
        cosechadora.centroCorte(corte);
        const info2 = registro.parcelaEn(corte.x, corte.z);
        if (info2) labranza.activa(info2);
        if (hayAntes && corteAntes.distanceToSquared(corte) < 25) {
          const { kg, m2 } = siega(corteAntes, corte);
          if (m2 > 0) {
            segando = true;
            pajaHasta = tiempo + 1.5;
            const cabe = Math.max(0, capacidadKg() - tolvaKg);
            tolvaKg += Math.min(kg, cabe);
            total.kg += Math.min(kg, cabe);
            total.m2 += m2;
            rendimiento = rendimiento ? rendimiento * 0.85 + ((kg / m2) * 10000) * 0.15 : (kg / m2) * 10000;
            pintaCarga();
          }
        }
        corteAntes.copy(corte);
        hayAntes = true;
      } else {
        hayAntes = false;
      }
      // Rodadas de las ruedas delanteras en las parcelas activas
      if (conduce && Math.abs(kmh) > 0.5 && labranza.parcelas.size) {
        maquina.base.updateWorldMatrix(true, false);
        rueda.copy(ejeDelantero).applyMatrix4(maquina.base.matrixWorld);
        if (hayRuedaAntes && ruedaAntes.distanceToSquared(rueda) < 25) {
          for (const p of labranza.parcelas.values()) {
            const [x0, z0, x1, z1] = p.info.caja;
            if (rueda.x < x0 - 4 || rueda.x > x1 + 4 || rueda.z < z0 - 4 || rueda.z > z1 + 4) continue;
            pinta(p, 'rodar', ruedaAntes.x, ruedaAntes.z, rueda.x, rueda.z, via + 0.62,
              { fuerza: 0.5, via, anchoRodada: 0.62 });
          }
        }
        ruedaAntes.copy(rueda);
        hayRuedaAntes = true;
      } else {
        hayRuedaAntes = false;
      }
      // Polvo en la barra y paja detrás
      if (segando) {
        labranza.particulas.emite(dt, { x: corte.x, y: terreno.alturaEn(corte.x, corte.z), z: corte.z, fx: adelante.x, fz: adelante.z,
          ancho: info.cabezal.ancho_corte, velocidad: kmh / 3.6, polvo: 0.6, terrones: 0, seco: 1 - labranza.barro });
      }
      if (tiempo < pajaHasta && conduce) {
        maquina.base.updateWorldMatrix(true, false);
        v.copy(pajaLocal).applyMatrix4(maquina.base.matrixWorld);
        chorros.paja(dt, v.x, v.y, v.z, adelante.x, adelante.z, info.cabezal.ancho_corte, kmh / 3.6);
      }
      // Descarga por el tubo
      descargando = false;
      sinRemolque = false;
      if (tubo && giroTubo > 0.97 && tolvaKg > 0) {
        const s = cosechadora.salidaTubo(v);
        const r = remolqueBajo(s);
        if (r && r.carga < r.capacidad) {
          const kg = Math.min(tolvaKg, K.descargaLs * (CULTIVOS[contenido ?? 'trigo']?.pesoLitroKg ?? 0.75) * dt, r.capacidad - r.carga);
          tolvaKg -= kg;
          if (tolvaKg < 0.5) tolvaKg = 0;
          r.contenido = contenido;
          r.carga += kg;
          r.pintaCarga();
          pintaCarga();
          descargando = true;
          r.modelo.updateWorldMatrix(true, false);
          const fondo = r.modelo.localToWorld(new THREE.Vector3(0, THREE.MathUtils.lerp(r.info.carga.y_vacia + 0.1, r.info.carga.y_llena + 0.3, r.llenado), r.info.caja.centro[2])).y;
          chorros.grano(dt, s.x, s.y, s.z, fondo);
        } else {
          sinRemolque = !r;
        }
      }
      chorros.actualiza(dt);
      return { segando, kmh };
    },
    libera() { chorros.libera(); },
  };
  return cosechadora;
}
