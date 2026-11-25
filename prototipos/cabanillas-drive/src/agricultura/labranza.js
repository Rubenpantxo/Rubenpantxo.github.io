// Labranza con el tractor (PLAN_AGRICULTURA.md §5.2 y §5.6, fases A4–A5). Con el apero bajado,
// dentro de una parcela y en marcha, cada fotograma se pinta en sus máscaras la franja que ha
// barrido la línea de trabajo del apero (su anchura real: 12 m de reparto la abonadora) y las rodadas
// de las ruedas traseras (y las de la sembradora). La abonadora y la sembradora gastan de su tolva lo
// que toca por la superficie que cubren (dosis por hectárea) y sin carga no hacen nada; la siembra
// guarda en la máscara el día de cultivo en que se sembró. La parcela se
// activa (malla y máscaras) la primera vez que se labra; mientras dura la partida se queda (el
// guardado entre sesiones llega en A9). Además: freno de la tierra en la física, polvo, terrones,
// gaviotas y la hierba 3D quitada de lo labrado.
import * as THREE from 'three';
import { AGRICULTURA } from '../config/agricultura.js';
import { ENGANCHE, SEMILLAS } from '../config/maquinaria.js';
import { CALIDAD } from '../config/calidad.js';
import { creaParcela } from './parcela.js';
import { estadoEn, labradoEn, pinta } from './pincel.js';
import { creaParticulas } from './particulas.js';
import { creaAves } from './aves.js';

export function creaLabranza({ api, escena, camara, renderer, registro, tractor, enganche, raiz: raizDada, diaCultivo = () => AGRICULTURA.labranza.diaInicial }) {
  const L = AGRICULTURA.labranza;
  const terreno = api.mundo.terreno;
  const raiz = raizDada ?? new THREE.Group();
  raiz.name = 'raizAgricultura';
  if (!raiz.parent) escena.add(raiz);
  const parcelas = new Map();          // ref → parcela activa
  const particulas = creaParticulas(escena, { terreno, calidad: CALIDAD.nivel });
  const aves = creaAves(escena, { terreno });
  const sol = escena.getObjectByName('sol');

  // Hierba: fuera de lo labrado (y de lo que ya excluía el juego, el agua del canal)
  let excluyeBase = null;
  escena.traverse((o) => { if (!excluyeBase && o.userData?.bajoAgua) excluyeBase = o.userData.bajoAgua; });
  let hierbaPuesta = false;
  const zonaHierba = [Infinity, Infinity, -Infinity, -Infinity];
  let relojHierba = 0;
  function excluye(x, z, y) {
    if (excluyeBase?.(x, z, y)) return true;
    for (const p of parcelas.values()) {
      const [x0, z0, x1, z1] = p.info.caja;
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && labradoEn(p, x, z)) return true;
    }
    return false;
  }
  function anotaHierba(x, z, r) {
    zonaHierba[0] = Math.min(zonaHierba[0], x - r); zonaHierba[1] = Math.min(zonaHierba[1], z - r);
    zonaHierba[2] = Math.max(zonaHierba[2], x + r); zonaHierba[3] = Math.max(zonaHierba[3], z + r);
  }
  function refrescaHierba() {
    if (zonaHierba[0] === Infinity) return;
    if (!hierbaPuesta) { api.hierba.ponExclusion(excluye); hierbaPuesta = true; }
    else api.hierba.olvidaZona(...zonaHierba);
    zonaHierba.fill(Infinity, 0, 2).fill(-Infinity, 2, 4);
  }

  function activa(info) {
    let p = parcelas.get(info.ref);
    if (!p) {
      p = creaParcela(info, { terreno, nivelCalidad: CALIDAD.nivel });
      raiz.add(p.malla);
      parcelas.set(info.ref, p);
    }
    return p;
  }
  // Pinta una labor en todas las parcelas activas que toca el tramo (cada una solo dentro de su linde).
  // Devuelve los píxeles tocados (cada fotograma repasa también los extremos redondeados de la franja)
  function pintaTramo(labor, a, b, ancho, opciones) {
    let n = 0;
    const m = ancho / 2 + 1;
    for (const p of parcelas.values()) {
      const [x0, z0, x1, z1] = p.info.caja;
      if (Math.max(a.x, b.x) < x0 - m || Math.min(a.x, b.x) > x1 + m || Math.max(a.z, b.z) < z0 - m || Math.min(a.z, b.z) > z1 + m) continue;
      const k = pinta(p, labor, a.x, a.z, b.x, b.z, ancho, opciones);
      n += k;
      if (k && labor === 'sembrar') p.siembra = { cultivo: opciones.cultivo, dia: opciones.dia };
    }
    return n;
  }

  // Estado de la pasada
  const trabajo = new THREE.Vector3();
  const trabajoAntes = new THREE.Vector3();
  let hayAntes = false;
  const rodada = new THREE.Vector3();
  const rodadaAntes = new THREE.Vector3();
  let hayRodadaAntes = false;
  const adelante = new THREE.Vector3();
  const via = Math.abs(tractor.info.ruedas[2].centro[0] - tractor.info.ruedas[3].centro[0]);
  const anchoRodada = tractor.info.ruedas[2].ancho;
  const ejeTrasero = tractor.info.ruedas[2].centro[2];
  let labrando = false;
  let reloj = 0;
  let relojRecuento = 0;
  let parcelaPisada = null;
  let recuento = null;
  const motorOriginal = { velocidadMaxKmh: tractor.config.motor.velocidadMaxKmh, frenoMotor: tractor.config.motor.frenoMotor };
  const cuenta = { tramos: 0, pixeles: 0, rodadas: 0, kgGastados: 0, rodadasApero: 0 };
  let tolvaVacia = false;          // se intentó trabajar sin carga (para el aviso)
  let sinPreparar = false;         // se siembra sobre rastrojo (para el aviso)
  const ejeApero = new THREE.Vector3();
  const ejeAperoAntes = new THREE.Vector3();
  let hayEjeAntes = false;
  const salida = new THREE.Vector3();

  const conduceTractor = () => api.coche === tractor;

  return {
    raiz, parcelas, particulas, aves, cuenta,
    get labrando() { return labrando; },
    get tolvaVacia() { return tolvaVacia; },
    get sinPreparar() { return sinPreparar; },
    get parcelaPisada() { return parcelaPisada; },
    get recuento() { return recuento; },
    activa,
    // Paso de física: la tierra frena el apero clavado
    paso(dt) {
      const ap = enganche.apero;
      if (!ap || enganche.subida > 0.5 || !conduceTractor()) return;
      const v = tractor.vehiculo.currentVehicleSpeed();
      if (Math.abs(v) < 0.05) return;
      const r = tractor.cuerpo.rotation();
      adelante.set(0, 0, 1).applyQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w));
      const f = -Math.sign(v) * Math.min(1, Math.abs(v) / 0.6) * ap.config.resistenciaN * (1 - enganche.subida * 2) * dt;
      tractor.cuerpo.applyImpulse({ x: adelante.x * f, y: 0, z: adelante.z * f }, true);
    },
    actualiza(dt, { acelerador = 0 } = {}) {
      reloj += dt;
      enganche.actualiza(dt);
      const ap = enganche.apero;
      const motor = tractor.config.motor;
      const clavado = ap && enganche.subida < 0.5;
      motor.velocidadMaxKmh = clavado ? ap.config.velocidadMaxKmh : motorOriginal.velocidadMaxKmh;
      motor.frenoMotor = clavado ? ENGANCHE.frenoMotorTrabajo : motorOriginal.frenoMotor;

      const e = tractor.estado();
      const kmh = e.velocidadKmh;
      adelante.copy(e.adelante).setY(0).normalize();
      labrando = false;
      tolvaVacia = false;
      sinPreparar = false;
      const conTolva = Boolean(ap?.config.tolva);
      const dosis = !conTolva ? 0 : ap.config.tolva === 'abono' ? ap.config.dosisKgHa : (SEMILLAS[ap.contenido]?.dosisKgHa ?? 0);
      if (ap && enganche.trabajando && conduceTractor() && kmh > L.velocidadMinKmh) {
        enganche.puntoTrabajo(trabajo);
        const info = registro.parcelaEn(trabajo.x, trabajo.z);
        if (info) activa(info);
        if (conTolva && ap.carga <= 0) {
          tolvaVacia = true;
        } else if (parcelas.size) {
          const desde = hayAntes && trabajoAntes.distanceToSquared(trabajo) < 25 ? trabajoAntes : trabajo.clone().addScaledVector(adelante, -0.05);
          const labor = ap.config.labor;
          if (labor === 'sembrar' && info) {
            const est = estadoEn(parcelas.get(info.ref), trabajo.x, trabajo.z);
            sinPreparar = Boolean(est && !est.preparada);
          }
          const n = pintaTramo(labor, desde, trabajo, ap.anchoTrabajo,
            { extremosRectos: true, ...(labor === 'sembrar' ? { dia: diaCultivo(), cultivo: ap.contenido } : {}) });
          if (n > 0) {
            labrando = true;
            cuenta.tramos++;
            cuenta.pixeles += n;
            // Gasto: la superficie nueva que barre la línea de trabajo (ancho × avance) por la parte de
            // esa línea que cae dentro de alguna parcela activa (9 muestras a lo ancho)
            if (conTolva) {
              let dentro = 0;
              for (let k = 0; k < 9; k++) {
                const t = (k / 8 - 0.5) * ap.anchoTrabajo;
                const x = trabajo.x - adelante.z * t;
                const z = trabajo.z + adelante.x * t;
                for (const q of parcelas.values()) { if (estadoEn(q, x, z)) { dentro++; break; } }
              }
              const m2 = ap.anchoTrabajo * desde.distanceTo(trabajo) * (dentro / 9);
              cuenta.kgGastados += ap.gasta((m2 / 10000) * dosis);
            }
            if (labor !== 'abonar') anotaHierba(trabajo.x, trabajo.z, ap.anchoTrabajo / 2 + 0.5);
          }
        }
        trabajoAntes.copy(trabajo);
        hayAntes = true;
      } else {
        hayAntes = false;
      }
      // Rodadas de las ruedas traseras por cualquier parcela activa (también sin labrar)
      if (conduceTractor() && Math.abs(kmh) > 0.5 && parcelas.size) {
        tractor.base.updateWorldMatrix(true, false);
        rodada.set(0, 0, ejeTrasero).applyMatrix4(tractor.base.matrixWorld);
        if (hayRodadaAntes && rodadaAntes.distanceToSquared(rodada) < 25) {
          cuenta.rodadas += pintaTramo('rodar', rodadaAntes, rodada, via + anchoRodada, { fuerza: L.rodadas });
        }
        rodadaAntes.copy(rodada);
        hayRodadaAntes = true;
      } else {
        hayRodadaAntes = false;
      }
      // Y las de las ruedas del apero arrastrado
      if (ap?.arrastrado && Math.abs(kmh) > 0.5 && parcelas.size && enganche.ejeApero(ejeApero)) {
        if (hayEjeAntes && ejeAperoAntes.distanceToSquared(ejeApero) < 25) {
          cuenta.rodadasApero += pintaTramo('rodar', ejeAperoAntes, ejeApero, ap.info.via, { fuerza: L.rodadasApero, via: ap.info.via, anchoRodada: 0.3 });
        }
        ejeAperoAntes.copy(ejeApero);
        hayEjeAntes = true;
      } else {
        hayEjeAntes = false;
      }
      // Abanico de abono: los discos lo echan aunque no caiga en una parcela
      if (enganche.tdf && ap.carga > 0 && Math.abs(kmh) > L.velocidadMinKmh && enganche.subida < 0.06) {
        for (const [sx, sy, sz] of ap.info.salida_discos) {
          enganche.puntoApero(sx, sy, sz, salida);
          particulas.granos(dt, { x: salida.x, y: salida.y, z: salida.z, fx: adelante.x, fz: adelante.z, ancho: ap.anchoTrabajo,
            velocidad: kmh / 3.6, lado: Math.sign(sx) });
        }
      }
      // Polvo, terrones y gaviotas detrás del apero
      if (labrando) {
        const seco = 1;   // A7: menos polvo con la tierra mojada
        particulas.emite(dt, { x: trabajo.x, y: terreno.alturaEn(trabajo.x, trabajo.z), z: trabajo.z, fx: adelante.x, fz: adelante.z,
          ancho: ap.anchoTrabajo, velocidad: kmh / 3.6, polvo: ap.config.polvo, terrones: ap.config.terrones, seco,
          lado: ap.info.reversible ? (ap.angulo ? -1 : 1) : 0 });
        const pos = e.posicion;
        aves.atrae({ x: trabajo.x, y: trabajo.y, z: trabajo.z, fx: adelante.x, fz: adelante.z, tx: pos.x, tz: pos.z, cuantas: ap.config.aves });
      }
      // El rodillo del cultivador rueda cuando toca el suelo
      if (ap?.rodillo && enganche.subida < 0.2) ap.rodillo.rotation.x += ((kmh / 3.6) / ap.info.rodillo.radio) * dt;
      const oscuridad = api.ciclo ? api.ciclo.estado.oscuridad : 0;
      const alto = renderer.domElement.clientHeight || 600;
      particulas.actualiza(dt, { luz: 1 - 0.75 * oscuridad, escala: alto / (2 * Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2)) });
      aves.actualiza(dt);
      // Máscaras a la GPU, luz del sol en el material, hierba
      for (const p of parcelas.values()) {
        p.sube();
        if (sol) p.malla.material.userData.uniformes.uSol.value.copy(sol.position).sub(sol.target.position).normalize();
      }
      relojHierba += dt;
      if (relojHierba >= L.refrescoHierbaS || (!labrando && zonaHierba[0] !== Infinity)) { relojHierba = 0; refrescaHierba(); }
      // Parcela bajo el tractor y su recuento (para el panel)
      relojRecuento += dt;
      if (relojRecuento >= L.recuentoS) {
        relojRecuento = 0;
        parcelaPisada = conduceTractor() ? registro.parcelaEn(e.posicion.x, e.posicion.z) : null;
        const activaPisada = parcelaPisada ? parcelas.get(parcelaPisada.ref) : null;
        recuento = activaPisada ? activaPisada.recuento() : parcelaPisada ? { arado: 0, gradeado: 0 } : null;
      }
      return { labrando, kmh, acelerador };
    },
  };
}
