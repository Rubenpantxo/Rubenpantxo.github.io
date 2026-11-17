// Mozos (F6): gente del pueblo que está en el ruedo o en la calle con el jugador. Pasean, citan a
// la vaca agitando el brazo, corren cuando se les arranca (quiebran o se suben a la valla), y en
// el encierro corren delante de la manada y se apartan a la valla cuando se les echa encima.
// La vaca también se les arranca a ellos (eligeObjetivos) y los puede coger.
// La lógica no necesita el navegador: sin «personas» no se crean figuras (tools/prueba_mozos.mjs).
import * as THREE from 'three';
import { clone as clonaConEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { FIESTAS } from '../config/fiestas.js';
import { POSTURAS, creaCapa, sienta } from './pose.js';
import { bordesDelRecinto } from './vaca.js';
import { azarCon } from './vallado.js';

const limita = (v, a, b) => Math.min(b, Math.max(a, v));
const anguloCorto = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const SUELTA = (v) => !['corral', 'saliendo', 'entrando'].includes(v.estado) && !v.guardada;
const EN_ALTO = new Set(['subiendo', 'subido', 'bajando']);

function proyecta(a, b, x, z, margen) {
  const dx = b[0] - a[0]; const dz = b[1] - a[1];
  const largo = Math.hypot(dx, dz);
  const m = Math.min(margen, largo / 2);
  const t = limita(((x - a[0]) * dx + (z - a[1]) * dz) / (largo * largo), m / largo, 1 - m / largo);
  return [a[0] + dx * t, a[1] + dz * t];
}
function cruza(ax, az, bx, bz, [c, d]) {
  const o = (px, pz, qx, qz, rx, rz) => Math.sign((qx - px) * (rz - pz) - (qz - pz) * (rx - px));
  return o(ax, az, bx, bz, c[0], c[1]) !== o(ax, az, bx, bz, d[0], d[1]) && o(c[0], c[1], d[0], d[1], ax, az) !== o(c[0], c[1], d[0], d[1], bx, bz);
}

// Para cada vaca, a quién va: el jugador o un mozo (el más cercano que vea, con preferencias).
// Mientras se fija, embiste o frena, sigue con el mismo. Devuelve Map(vaca → objetivo)
export function eligeObjetivos(vacas, jugador, candidatos, anteriores = new Map()) {
  const M = FIESTAS.mozos;
  const todos = [jugador, ...candidatos];
  const elegidos = new Map();
  for (const v of vacas) {
    const antes = anteriores.get(v);
    if (antes && ['fija', 'embiste', 'frena', 'derrote'].includes(v.estado)) {
      const sigue = todos.find((o) => o.id === antes);
      if (sigue) { elegidos.set(v, sigue); continue; }
    }
    const q = v.posicion();
    let mejor = jugador; let nota = Infinity;
    for (const o of todos) {
      if (o.seguro) continue;
      const d = Math.hypot(o.x - q.x, o.z - q.z);
      if (o !== jugador && !(v.ve?.(o.x, o.z) ?? true)) continue;
      const n = d * (o === jugador ? 1 : M.preferenciaMozo * (o.citando ? M.preferenciaCitando : 1));
      if (n < nota) { nota = n; mejor = o; }
    }
    elegidos.set(v, mejor);
  }
  return elegidos;
}

// modo: plaza | calle | encierro. alturaSuelo(x, z): donde pisan
export function creaMozos({ recinto, modo, puertaAbierta, camino, alturaSuelo, personas = null, cantidad = null,
  semilla = 1, sombras = true, excluye = null, nivel = 'medio' }) {
  const M = FIESTAS.mozos;
  const azar = azarCon(semilla);
  const entre = ([a, b]) => a + (b - a) * azar();
  const limites = bordesDelRecinto(recinto, puertaAbierta);
  const altoValla = FIESTAS.valla.tablones.alturasM.at(-1) + FIESTAS.valla.tablones.tablonAltoM;
  const vallas = recinto.tramos.filter((t) => t.tipo === 'tablones' && t.clase !== 'gradas' && t.largo > 1.2);
  const seVe = (ax, az, bx, bz) => !limites.bordes.some((b) => cruza(ax, az, bx, bz, b));
  const sPuerta = camino.s(recinto.puerta.a[0], recinto.puerta.a[1]);
  const enPlaza = (x, z) => camino.s(x, z) > sPuerta;

  // La valla de tablones más cercana a la que se llega andando: el punto de la valla, el de
  // delante (donde se sube) y hacia dónde queda el recinto
  function vallaCercana(x, z, lejos = false) {
    let mejor = null;
    for (const t of vallas) {
      const p = proyecta(t.a, t.b, x, z, 0.45);
      const d = Math.hypot(x - p[0], z - p[1]);
      if (d < 0.05 || (!lejos && d > 14) || (mejor && d >= mejor.d)) continue;
      const n = [(x - p[0]) / d, (z - p[1]) / d];
      const ap = [p[0] + n[0] * 0.5, p[1] + n[1] * 0.5];
      if (!limites.dentro(ap[0], ap[1]) || !seVe(x, z, ap[0], ap[1])) continue;
      mejor = { p, ap, n, d };
    }
    return mejor;
  }
  function puntoCerca(x, z, radio) {
    for (let i = 0; i < 14; i++) {
      const a = azar() * Math.PI * 2; const r = radio * (0.3 + 0.7 * azar());
      const px = x + Math.cos(a) * r; const pz = z + Math.sin(a) * r;
      if (limites.dentro(px, pz) && seVe(x, z, px, pz) && lejosDeBordes(px, pz, 1.0)) return [px, pz];
    }
    return [x, z];
  }
  function lejosDeBordes(px, pz, m) {
    return limites.bordes.every(([p, q]) => {
      const ex = q[0] - p[0]; const ez = q[1] - p[1];
      const t = limita(((px - p[0]) * ex + (pz - p[1]) * ez) / (ex * ex + ez * ez), 0, 1);
      return Math.hypot(px - p[0] - ex * t, pz - p[1] - ez * t) > m;
    });
  }
  // Un sitio del recinto donde empezar
  function sitioInicial() {
    const largo = camino.largo;
    for (let i = 0; i < 40; i++) {
      let s;
      if (modo === 'plaza') s = sPuerta + 4 + azar() * (largo - sPuerta - 6);
      else if (modo === 'encierro') s = sPuerta - 75 + azar() * 66;
      else s = 10 + azar() * (largo - 14);
      const p = camino.punto(s); const d = camino.direccion(s);
      const lado = (azar() * 2 - 1) * (modo === 'encierro' ? 1.6 : 3.5);
      const x = p[0] - d[1] * lado; const z = p[1] + d[0] * lado;
      if (limites.dentro(x, z) && lejosDeBordes(x, z, 0.6)) return [x, z];
    }
    return camino.punto(modo === 'plaza' ? camino.largo - 8 : sPuerta - 20);
  }

  // --- Las figuras
  const variantes = (personas?.modelos ?? []).filter((v) => v.id !== excluye);
  const total = cantidad ?? 0;
  const grupo = new THREE.Group();
  grupo.name = 'fiestas_mozos';
  const mozos = [];
  for (let i = 0; i < total; i++) {
    const [x, z] = sitioInicial();
    const m = {
      id: `mozo${i}`, i, x, z, y: 0, rumbo: azar() * Math.PI * 2, v: 0, estado: 'espera', t: 0, dura: entre([0.5, 3]),
      habilidad: entre(M.habilidad), destino: null, valla: null, dir: null, lado: (azar() * 2 - 1) * 1.3,
      colchon: entre(M.encierro.delanteM), corriendo: 0, aguanta: 6 + azar() * 10, desde: { x: 0, y: 0, z: 0 },
      dirCogida: [1, 0], cogidas: 0, sentado: null, proximaCita: entre(M.citaCadaS), citaPunto: null, citaVaca: null,
      objeto: null, mezclador: null, andar: null, quieto: null, capa: null, metros: 0, tAlto: 0,
    };
    m.reaccionaM = M.reaccionaM[0] + (M.reaccionaM[1] - M.reaccionaM[0]) * m.habilidad;
    if (modo === 'encierro') m.rumbo = Math.atan2(camino.direccion(camino.s(x, z))[0], camino.direccion(camino.s(x, z))[1]);
    // En la plaza y la calle, algunos empiezan subidos a la valla
    if (modo !== 'encierro' && azar() < 0.3) {
      const vc = vallaCercana(x, z, true);
      if (vc) { m.valla = vc; m.x = vc.ap[0]; m.z = vc.ap[1]; m.estado = 'subido'; m.t = 0; m.rumbo = Math.atan2(vc.n[0], vc.n[1]); }
    }
    if (variantes.length) {
      const vr = variantes[i % variantes.length];
      const objeto = clonaConEsqueleto(vr.escena);
      objeto.traverse((o) => { if (o.isMesh) { o.castShadow = sombras; o.frustumCulled = false; } });
      const mezclador = new THREE.AnimationMixer(objeto);
      m.andar = mezclador.clipAction(vr.andar); m.quieto = mezclador.clipAction(vr.quieto);
      m.andar.play(); m.quieto.play();
      m.andar.time = azar() * vr.andar.duration; m.quieto.time = azar() * vr.quieto.duration;
      m.duracionPaso = vr.andar.duration;
      m.objeto = objeto; m.mezclador = mezclador;
      mezclador.update(0);
      m.capa = creaCapa(objeto);
      grupo.add(objeto);
    }
    mozos.push(m);
  }
  const metrosPorCiclo = personas?.metrosPorCiclo ?? 1.39;

  function cambia(m, estado, dura = 0) { m.estado = estado; m.t = 0; m.dura = dura; }

  // Anda hacia (tx, tz) a «quiere» m/s. Si una valla tapa el camino, va por el eje del recorrido
  function mueve(m, tx, tz, quiere, dt, jugador) {
    let hx = tx; let hz = tz;
    if (!seVe(m.x, m.z, tx, tz)) {
      const s = camino.s(m.x, m.z);
      const sentido = Math.sign(camino.s(tx, tz) - s) || 1;
      [hx, hz] = camino.punto(s + sentido * 4);
    }
    const dx = hx - m.x; const dz = hz - m.z; const d = Math.hypot(dx, dz);
    if (d > 0.05) {
      const giro = anguloCorto(Math.atan2(dx, dz) - m.rumbo);
      m.rumbo += limita(giro, -M.giroRad * dt, M.giroRad * dt);
      if (Math.abs(giro) > 1.4) quiere *= 0.3;
    } else quiere = 0;
    if (d < 0.6) quiere = Math.min(quiere, d * 2.5);
    m.v += limita(quiere - m.v, -12 * dt, 8 * dt);
    let nx = m.x + Math.sin(m.rumbo) * m.v * dt;
    let nz = m.z + Math.cos(m.rumbo) * m.v * dt;
    // Que no se meta en el jugador
    if (jugador && !jugador.seguro) {
      const jx = nx - jugador.x; const jz = nz - jugador.z; const jd = Math.hypot(jx, jz);
      if (jd < 0.75 && jd > 1e-3) { nx += (jx / jd) * (0.75 - jd); nz += (jz / jd) * (0.75 - jd); }
    }
    // Ni en las vallas
    for (let vuelta = 0; vuelta < 2; vuelta++) {
      for (const [a, b] of limites.bordes) {
        const ex = b[0] - a[0]; const ez = b[1] - a[1];
        const t = limita(((nx - a[0]) * ex + (nz - a[1]) * ez) / (ex * ex + ez * ez), 0, 1);
        const px = a[0] + ex * t; const pz = a[1] + ez * t;
        const dd = Math.hypot(nx - px, nz - pz);
        if (dd < M.radioM && dd > 1e-4) { nx += ((nx - px) / dd) * (M.radioM - dd); nz += ((nz - pz) / dd) * (M.radioM - dd); }
      }
    }
    if (limites.dentro(nx, nz)) { m.metros += Math.hypot(nx - m.x, nz - m.z); m.x = nx; m.z = nz; } else m.v = 0;
  }
  function encara(m, x, z, dt) {
    const giro = anguloCorto(Math.atan2(x - m.x, z - m.z) - m.rumbo);
    m.rumbo += limita(giro, -M.giroRad * 0.5 * dt, M.giroRad * 0.5 * dt);
    m.v = Math.max(0, m.v - 10 * dt);
  }

  // La vaca suelta más cercana y si viene a por él
  function amenaza(m, vacas) {
    let r = null;
    for (const v of vacas) {
      if (!SUELTA(v)) continue;
      const q = v.posicion();
      const dx = m.x - q.x; const dz = m.z - q.z; const d = Math.hypot(dx, dz);
      const frente = d > 0.01 ? (Math.sin(v.rumbo) * dx + Math.cos(v.rumbo) * dz) / d : 1;
      const viene = (v.persigue === m.id && v.estado === 'embiste') || (v.velocidad > 3 && frente > 0.75 && d < 7);
      if (!r || d < r.d) r = { vaca: v, q, d, viene, frente };
    }
    return r;
  }
  function aLaValla(m, lejos = false) {
    const vc = vallaCercana(m.x, m.z, lejos);
    if (!vc) return false;
    m.valla = vc;
    cambia(m, 'aValla', 6);
    return true;
  }
  function huye(m, a) {
    const vc = vallaCercana(m.x, m.z);
    if (vc && vc.d < M.vallaCercaM && (a.d > 2.2 || vc.d < 1.2)) { m.valla = vc; cambia(m, 'aValla', 4); return; }
    // De lado, respecto a por donde viene la vaca, hacia el lado que tiene más sitio
    const hx = Math.sin(a.vaca.rumbo); const hz = Math.cos(a.vaca.rumbo);
    const lado = Math.sign(hx * (m.z - a.q.z) - hz * (m.x - a.q.x)) || 1;
    let dir = [-hz * lado, hx * lado];
    if (!limites.dentro(m.x + dir[0] * 3, m.z + dir[1] * 3)) dir = [-dir[0], -dir[1]];
    m.dir = dir;
    cambia(m, 'huye', M.huyeS);
  }

  let citando = 0;
  // Un paso: vacas (las de vaca.js), jugador ({ x, z, seguro }), manada (encierro) o null
  function paso(dt, { vacas, jugador, manada = null }) {
    citando = mozos.filter((m) => m.estado === 'cita').length;
    const frente = manada?.frente() ?? null;
    for (const m of mozos) {
      m.t += dt;
      m.proximaCita -= dt;
      const a = amenaza(m, vacas);
      // --- Por los aires (lo ha cogido una vaca) y en el suelo
      if (m.estado === 'cogido') {
        const G = FIESTAS.cogida;
        const t = Math.min(1, m.t / G.vueloS);
        let nx = m.desde.x + m.dirCogida[0] * G.lejosM * t; let nz = m.desde.z + m.dirCogida[1] * G.lejosM * t;
        if (!limites.dentro(nx, nz)) { nx = m.x; nz = m.z; }
        m.x = nx; m.z = nz; m.y = Math.sin(Math.PI * t) * G.altoM;
        if (t >= 1) { m.y = 0; cambia(m, 'tendido', M.tendidoS); }
        continue;
      }
      if (m.estado === 'tendido') {
        if (m.t >= m.dura && !aLaValla(m, true)) cambia(m, 'espera', 1);
        continue;
      }
      // --- Subir, estar arriba y bajar
      if (m.estado === 'subiendo' || m.estado === 'bajando') {
        const sube = m.estado === 'subiendo';
        const dura = sube ? 0.45 : 0.35;
        const k = Math.min(1, m.t / dura);
        const de = sube ? m.valla.ap : m.valla.p; const a2 = sube ? m.valla.p : m.valla.ap;
        m.x = de[0] + (a2[0] - de[0]) * k; m.z = de[1] + (a2[1] - de[1]) * k;
        m.tAlto = sube ? k : 1 - k;
        if (k >= 1) {
          if (sube) cambia(m, 'subido');
          else { m.x = m.valla.ap[0]; m.z = m.valla.ap[1]; m.sentado = null; cambia(m, 'espera', 0.6 + azar()); }
        }
        continue;
      }
      if (m.estado === 'subido') {
        m.x = m.valla.p[0]; m.z = m.valla.p[1]; m.tAlto = 1;
        m.rumbo = Math.atan2(m.valla.n[0], m.valla.n[1]);
        const libre = !a || a.d > M.bajaSiVacaLejosM;
        let baja = m.t > M.subidoMinS + m.habilidad * 2 && libre;
        if (modo === 'encierro') {
          // Baja cuando la manada ya ha pasado lejos, o antes de que salga
          const gap = frente ? (camino.s(m.x, m.z) - frente.s) * frente.sentido : null;
          baja = libre && m.t > M.subidoMinS && (gap === null ? !manada?.terminada || true : gap < -M.encierro.bajanTrasM || gap > M.encierro.empiezanM + 10);
        }
        if (baja) { m.x = m.valla.p[0]; m.z = m.valla.p[1]; cambia(m, 'bajando'); }
        continue;
      }
      // --- En el suelo
      if (m.estado === 'aValla') {
        mueve(m, m.valla.ap[0], m.valla.ap[1], M.correrMs, dt, jugador);
        if (Math.hypot(m.x - m.valla.ap[0], m.z - m.valla.ap[1]) < 0.4) { m.v = 0; m.x = m.valla.ap[0]; m.z = m.valla.ap[1]; cambia(m, 'subiendo'); }
        else if (m.t > m.dura) cambia(m, 'espera', 0.3);
        continue;
      }
      if (modo === 'encierro') { pasoEncierro(m, dt, a, frente, jugador); continue; }
      // Plaza y calle: si se le arranca, a correr
      if (a?.viene && a.d < m.reaccionaM && m.estado !== 'huye') { huye(m, a); continue; }
      if (m.estado === 'huye') {
        mueve(m, m.x + m.dir[0] * 3, m.z + m.dir[1] * 3, M.correrMs, dt, jugador);
        if (m.t > m.dura) cambia(m, 'espera', 0.8 + azar());
        continue;
      }
      if (m.estado === 'cita') {
        const v = m.citaVaca;
        if (!v || !SUELTA(v) || m.t > m.dura) { cambia(m, 'espera', 1 + azar()); m.proximaCita = entre(M.citaCadaS); continue; }
        const q = v.posicion();
        if (Math.hypot(m.x - m.citaPunto[0], m.z - m.citaPunto[1]) > 0.5 && m.t < m.dura * 0.5) mueve(m, m.citaPunto[0], m.citaPunto[1], M.troteMs, dt, jugador);
        else encara(m, q.x, q.z, dt);
        continue;
      }
      if (m.estado === 'pasea') {
        mueve(m, m.destino[0], m.destino[1], M.andarMs, dt, jugador);
        if (Math.hypot(m.x - m.destino[0], m.z - m.destino[1]) < 0.4 || m.t > 12) cambia(m, 'espera', 1 + azar() * 3);
        continue;
      }
      // Esperando: mira a la vaca; luego cita, pasea o se queda
      if (a) encara(m, a.q.x, a.q.z, dt); else m.v = Math.max(0, m.v - 10 * dt);
      if (m.t < m.dura) continue;
      if (a && a.d < M.citaHastaM && ['reconoce', 'frena'].includes(a.vaca.estado) && citando < M.citandoMax
        && m.proximaCita <= 0 && azar() < 0.4 + m.habilidad * 0.5 && a.vaca.ve(m.x, m.z)) {
        // A citarla: a unos metros de ella, en la línea que los une
        const dist = entre(M.citaDistanciaM);
        const ux = (m.x - a.q.x) / a.d; const uz = (m.z - a.q.z) / a.d;
        let cp = [a.q.x + ux * dist, a.q.z + uz * dist];
        if (!limites.dentro(cp[0], cp[1])) cp = [m.x, m.z];
        m.citaPunto = cp; m.citaVaca = a.vaca;
        cambia(m, 'cita', entre(M.citaS));
        citando++;
      } else if (azar() < 0.5) {
        m.destino = puntoCerca(m.x, m.z, 9);
        cambia(m, 'pasea');
      } else cambia(m, 'espera', 1 + azar() * 3);
    }
  }

  // Encierro: delante de la manada mientras se puede; a la valla cuando se echa encima
  function pasoEncierro(m, dt, a, frente, jugador) {
    const E = M.encierro;
    if (!frente) {
      // Antes de que salga la manada (o ya acabado): esperan, mirando hacia la plaza
      if (a) encara(m, a.q.x, a.q.z, dt); else m.v = Math.max(0, m.v - 10 * dt);
      if (m.estado !== 'espera') cambia(m, 'espera');
      return;
    }
    const s = camino.s(m.x, m.z);
    const gap = (s - frente.s) * frente.sentido;           // > 0: la manada viene hacia él
    const cerca = a && a.d < 1.8 && a.frente > 0.3;
    if ((gap > 0 && gap < E.apartarseM) || cerca || (m.estado === 'corre' && m.corriendo > m.aguanta)) {
      if (aLaValla(m)) { m.corriendo = 0; m.aguanta = 5 + azar() * 12; return; }
    }
    if (gap > 0 && gap < E.empiezanM) {
      if (m.estado !== 'corre') { cambia(m, 'corre'); m.corriendo = 0; }
      m.corriendo += dt;
      // Delante de la manada, por su lado de la calle: más deprisa si la tiene cerca de lo que
      // quiere, más despacio si le sobra distancia (sin darse la vuelta)
      const rapidez = limita(FIESTAS.partida.encierro.velocidadMs * (1 + (m.colchon - gap) * 0.18), 1.2, M.correrMs);
      const p = camino.punto(s + frente.sentido * 3); const d = camino.direccion(s);
      mueve(m, p[0] - d[1] * m.lado, p[1] + d[0] * m.lado, rapidez, dt, jugador);
      return;
    }
    if (gap <= 0) {
      // Por detrás: la sigue de lejos (así, cuando la manada se da la vuelta, vuelve a tenerla delante)
      const objetivoS = frente.s - frente.sentido * (E.detrasM + m.colchon);
      if ((s - objetivoS) * frente.sentido < -2) {
        if (m.estado !== 'sigue') cambia(m, 'sigue');
        const p = camino.punto(objetivoS); const d = camino.direccion(objetivoS);
        mueve(m, p[0] - d[1] * m.lado, p[1] + d[0] * m.lado, M.troteMs, dt, jugador);
        return;
      }
    }
    // Lejos por delante o ya por detrás: espera mirando a las vacas
    if (m.estado !== 'espera') cambia(m, 'espera');
    if (a) encara(m, a.q.x, a.q.z, dt); else m.v = Math.max(0, m.v - 10 * dt);
  }

  // --- Lo que se ve
  function anima(dt, camara) {
    for (const m of mozos) {
      if (!m.objeto) continue;
      const o = m.objeto;
      const lejos = camara ? Math.hypot(camara.position.x - m.x, camara.position.z - m.z) : 0;
      o.visible = lejos < 95;
      if (!o.visible) continue;
      const sombra = sombras && lejos < (FIESTAS.publico.sombraHastaM[nivel] ?? 28);
      if (sombra !== m.conSombra) { m.conSombra = sombra; o.traverse((x) => { if (x.isMesh) x.castShadow = sombra; }); }
      let y = alturaSuelo(m.x, m.z);
      if (EN_ALTO.has(m.estado)) {
        const pie = alturaSuelo(m.valla.ap[0], m.valla.ap[1]);
        y = pie + (alturaSuelo(m.valla.p[0], m.valla.p[1]) - FIESTAS.arena.gruesoM * 0 + altoValla - pie) * m.tAlto
          + Math.sin(Math.PI * m.tAlto) * 0.25 * (m.estado === 'subido' ? 0 : 1);
      }
      o.position.set(m.x, y + m.y, m.z);
      let vuelta = 0; let tumbado = 0;
      if (m.estado === 'cogido') vuelta = Math.min(1, m.t / FIESTAS.cogida.vueloS) * Math.PI * 2;
      if (m.estado === 'tendido') tumbado = -Math.PI / 2 * Math.min(1, (m.dura - m.t) / 0.4, m.t / 0.15);
      o.rotation.set(vuelta + tumbado, m.rumbo, 0, 'YXZ');
      if (vuelta) o.position.y += 0.9 * Math.sin(vuelta / 2);
      if (tumbado) o.position.y += 0.18;
      // Animación: andar al ritmo de lo que avanza; quieto al pararse
      const k = limita(m.v / 1.2, 0, 1);
      m.andar.setEffectiveWeight(k);
      m.quieto.setEffectiveWeight(1 - k);
      m.andar.timeScale = Math.min(FIESTAS.personaje.correr.zancadaMax, Math.max(0.4, m.v) / (metrosPorCiclo / m.duracionPaso));
      o.updateMatrixWorld(true);
      m.capa.antes();
      m.mezclador.update(dt);
      m.capa.despues();
      if (m.estado === 'subido' || (m.estado === 'subiendo' && m.tAlto > 0.6)) {
        if (!m.sentado) { m.capa.pon(null); m.sentado = sienta(o); }
        if (m.sentado) {
          m.capa.pon(null, m.sentado.fijados);
          o.position.y = alturaSuelo(m.valla.p[0], m.valla.p[1]) + altoValla + FIESTAS.publico.sentado.caderaSobreAsientoM - m.sentado.cadera;
        }
      } else if (m.estado === 'cita' && m.t > m.dura * 0.3) {
        m.capa.pon(POSTURAS.cita(m.t));
      } else if (m.v > FIESTAS.personaje.andarMs + 0.3) {
        m.capa.pon(POSTURAS.corre(limita((m.v - 2.5) / 3.5, 0, 1), m.andar.time / m.duracionPaso));
      } else m.capa.pon(null);
    }
  }

  return {
    grupo,
    mozos,
    paso,
    anima,
    // Los que la vaca puede elegir
    objetivos() {
      return mozos.filter((m) => !EN_ALTO.has(m.estado) && m.estado !== 'cogido' && m.estado !== 'tendido')
        .map((m) => ({ id: m.id, x: m.x, z: m.z, seguro: false, alto: 0, citando: m.estado === 'cita', mozo: m }));
    },
    // Objetivo de un mozo por su id (aunque esté a salvo: así la vaca deja de ir a por él)
    objetivo(id) {
      const m = mozos.find((x) => x.id === id);
      if (!m) return null;
      return { id, x: m.x, z: m.z, seguro: EN_ALTO.has(m.estado) || m.estado === 'cogido' || m.estado === 'tendido', alto: m.y, citando: false, mozo: m };
    },
    // La vaca lo coge: por los aires hacia (dx, dz)
    cogida(m, dx, dz) {
      if (m.estado === 'cogido' || m.estado === 'tendido' || EN_ALTO.has(m.estado)) return false;
      m.dirCogida = [dx, dz];
      Object.assign(m.desde, { x: m.x, y: 0, z: m.z });
      m.v = 0; m.cogidas++;
      cambia(m, 'cogido');
      return true;
    },
    libera() {
      for (const m of mozos) m.mezclador?.stopAllAction();
      grupo.removeFromParent();
    },
  };
}
