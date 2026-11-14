// Vida de la ciudad: tráfico, peatones y policía.
//  · Calles: tramos de la red (citynet.js) con su anchura y carriles; los extremos de los tramos
//    forman los cruces. Se circula por la derecha.
//  · Tráfico: siguen su carril al límite de velocidad, frenan tras el de delante y en las curvas,
//    respetan un semáforo lógico en los cruces y ceden si su trayectoria se cruza con la de otro.
//    Van «sobre raíles» (baratos); al recibir un golpe pasan a la física completa y quedan parados.
//  · Peatones: por las aceras; si un coche se les echa encima, saltan a un lado.
//  · Policía: esperan aparcados; si el jugador pasa muy rápido o choca cerca, lo persiguen por las
//    calles. Si lo alcanzan parado, queda detenido.
const THREE = window.THREE;
import { Vehicle } from './vehicle.js';
import { stopInput } from './physics.js';
import { AIDriver } from './ai.js';
import { densifyPath } from './citynet.js';
import { loadPedKinds, PedModel, WALK, DIVE } from './peds.js';
import { buildTrafficMesh, buildCopMesh } from './models.js';
import { NPC_TUNES } from './tuning.js';

const MPH = 0.447;
const TRAFFIC_KINDS = ['sedan', 'sedan', 'taxi', 'sedan', 'van', 'taxi', 'sedan', 'sedan', 'van', 'bus'];
const TRAFFIC_NEAR = 80, TRAFFIC_FAR = 240, TRAFFIC_DROP = 300;
const PED_NEAR = 25, PED_FAR = 110, PED_DROP = 150;
const angleDiff = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const detach = (obj) => obj.parent?.remove(obj);

// ---------- Calles: cruces y carriles ----------
function prepareRoads(net) {
  if (net.junctions) return;
  const clusters = [];
  const grid = new Map();
  const key = (x, z) => `${Math.floor(x / 14)},${Math.floor(z / 14)}`;
  const find = (p) => {
    const cx = Math.floor(p[0] / 14), cz = Math.floor(p[2] / 14);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const c of grid.get(`${cx + dx},${cz + dz}`) ?? []) {
        if (Math.hypot(c.x - p[0], c.z - p[2]) < 14 && Math.abs(c.y - p[1]) < 3) return c;
      }
    }
    return null;
  };
  for (const r of net.roads) {
    r.length = 0;
    for (let i = 1; i < r.pts.length; i++) r.length += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][2] - r.pts[i - 1][2]);
    r.mid = r.pts[Math.floor(r.pts.length / 2)];
    r.span = r.span ?? [-r.width / 2, r.width / 2];
    r.ends = [0, r.pts.length - 1].map((k, e) => {
      const p = r.pts[k];
      let c = find(p);
      if (!c) {
        c = { x: p[0], y: p[1], z: p[2], ends: [] };
        clusters.push(c);
        const kk = key(p[0], p[2]);
        if (!grid.has(kk)) grid.set(kk, []);
        grid.get(kk).push(c);
      }
      c.ends.push({ road: r, atStart: e === 0 });
      return c;
    });
  }
  // Radio del cruce (los extremos de los tramos están en su centro): la línea de parada va fuera.
  for (const c of clusters) {
    const w = Math.max(...c.ends.map((e) => e.road.span[1] - e.road.span[0]));
    c.radius = Math.max(6, Math.min(16, w / 2 + 2));
  }
  net.junctions = clusters;
}

// Puntos de un tramo recorrido en el sentido dir, desplazados offset metros a la derecha.
function legPoints(road, dir, offset) {
  const src = dir > 0 ? road.pts : [...road.pts].reverse();
  return src.map((p, i) => {
    const a = src[Math.max(0, i - 1)], b = src[Math.min(src.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[2] - a[2];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    return { x: p[0] - dz * offset, y: p[1], z: p[2] + dx * offset };
  });
}

// Carril k (0 = el de la derecha) en el sentido dir, en metros a la derecha del eje recorrido en ese
// sentido. Los carriles de los vértices van a la derecha de la calzada; los contrarios, a la izquierda.
function laneOffset(road, dir, k) {
  const [L, R] = road.span;
  const n = road.fwd + road.back;
  const w = (R - L) / n;
  if (dir > 0) return R - w * (Math.min(k, road.fwd - 1) + 0.5);
  return -(L + w * (Math.min(k, Math.max(1, road.back) - 1) + 0.5));
}
const lanesOf = (road, dir) => (dir > 0 ? road.fwd : Math.max(1, road.back));
// Acera a la derecha (side 1) o a la izquierda (−1) del eje, recorrida en el sentido dir.
function sidewalkOffset(road, dir, side) {
  const o = side > 0 ? road.span[1] + 2.5 : road.span[0] - 2.5;
  return o * dir;
}

// Recorrido por las calles: lista de puntos que se alarga eligiendo un tramo en cada cruce.
class Mover {
  // kind: 'car' (respeta el sentido único y va por su carril) o 'ped' (por la acera).
  constructor(road, dir, kind, lane, s0) {
    this.kind = kind;
    this.lane = lane;
    this.side = Math.random() < 0.5 ? 1 : -1;   // acera de los peatones
    this.road = road;
    this.dir = dir;
    this.pts = [];
    this.cum = [];
    this.crossings = [];   // cruces por delante: { s (centro del cruce), junction, heading de llegada }
    this.s = 0;
    this.append(road, dir);
    this.s = Math.min(s0, this.cum[this.cum.length - 1] - 1);
  }

  offsetFor(road, dir) {
    return this.kind === 'ped' ? sidewalkOffset(road, dir, this.side * dir) : laneOffset(road, dir, this.lane);
  }

  push(p) {
    const n = this.pts.length;
    const d = n ? Math.hypot(p.x - this.pts[n - 1].x, p.z - this.pts[n - 1].z) : 0;
    if (n && d < 0.5) return;
    this.pts.push(p);
    this.cum.push(n ? this.cum[n - 1] + d : 0);
  }

  append(road, dir) {
    const q = legPoints(road, dir, this.offsetFor(road, dir));
    if (this.pts.length < 2) { q.forEach((p) => this.push(p)); return; }
    // Unión en el cruce: se recortan 7 m a cada lado y se une con una curva.
    const cut = 7;
    const endS = this.cum[this.cum.length - 1];
    const orig = this.pts[this.pts.length - 1];
    const before = this.pts[Math.max(0, this.pts.length - 3)];
    this.crossings.push({ s: endS, junction: this.road.ends[this.dir > 0 ? 1 : 0], heading: Math.atan2(orig.x - before.x, orig.z - before.z) });
    const a = this.at(Math.max(this.s + 0.5, endS - cut));
    while (this.pts.length > 1 && this.cum[this.cum.length - 1] > endS - cut) { this.pts.pop(); this.cum.pop(); }
    let k = 0, acc = 0;
    while (k < q.length - 2 && acc < cut) { acc += Math.hypot(q[k + 1].x - q[k].x, q[k + 1].z - q[k].z); k++; }
    const b = q[k];
    const c = { x: (orig.x + q[0].x) / 2, z: (orig.z + q[0].z) / 2 };
    this.push({ x: a.x, y: a.y, z: a.z });
    for (let t = 0.2; t < 1; t += 0.2) {
      const u = 1 - t;
      this.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: a.y + (b.y - a.y) * t, z: u * u * a.z + 2 * u * t * c.z + t * t * b.z });
    }
    q.slice(k).forEach((p) => this.push(p));
  }

  // Elige el tramo siguiente en el cruce del final del tramo actual.
  extend() {
    const end = this.road.ends[this.dir > 0 ? 1 : 0];
    const last = this.pts[this.pts.length - 1], prev = this.pts[Math.max(0, this.pts.length - 3)];
    const heading = Math.atan2(last.x - prev.x, last.z - prev.z);
    const options = [];
    for (const e of end.ends) {
      if (e.road === this.road) continue;
      if (this.kind === 'car' && !e.road.twoWay && !e.atStart) continue;
      const dir = e.atStart ? 1 : -1;
      const p = dir > 0 ? e.road.pts : [...e.road.pts].reverse();
      const h = Math.atan2(p[1][0] - p[0][0], p[1][2] - p[0][2]);
      if (Math.abs(angleDiff(h - heading)) > 2.3) continue;   // sin cambios de sentido
      options.push({ road: e.road, dir });
    }
    let next = options[(Math.random() * options.length) | 0];
    if (!next) next = { road: this.road, dir: -this.dir };     // calle sin salida: media vuelta
    this.append(next.road, next.dir);
    this.road = next.road;
    this.dir = next.dir;
  }

  // Punto y rumbo a s metros del inicio de la lista.
  at(s) {
    const cum = this.cum;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const a = this.pts[i - 1], b = this.pts[i];
    const len = cum[i] - cum[i - 1] || 1;
    const t = Math.max(0, Math.min(1, (s - cum[i - 1]) / len));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, yaw: Math.atan2(b.x - a.x, b.z - a.z) };
  }

  advance(ds) {
    this.s += ds;
    while (this.cum[this.cum.length - 1] - this.s < 60) this.extend();
    // Se olvidan los puntos ya recorridos.
    let k = 0;
    while (k < this.cum.length - 2 && this.cum[k + 1] < this.s - 10) k++;
    if (k > 8) {
      const base = this.cum[k];
      this.pts = this.pts.slice(k);
      this.cum = this.cum.slice(k).map((c) => c - base);
      this.s -= base;
      this.crossings.forEach((c) => { c.s -= base; });
    }
    this.crossings = this.crossings.filter((c) => c.s > this.s - 15);
  }
}

// ---------- Gestor ----------
export class Ambient {
  // cfg: { traffic (nº de coches), peds (nº de peatones), speedLimit (m/s), cops: [{ x, z, yaw }], winter }
  constructor({ scene, world, heightAt, net }, cfg) {
    Object.assign(this, { scene, world, heightAt, net, bangers: null });
    this.data = { exceptions: new Map() };
    this.speedLimit = cfg.speedLimit ?? 13.5;
    this.trafficTarget = cfg.traffic ?? 16;
    this.pedTarget = cfg.peds ?? 20;
    this.traffic = [];
    this.peds = [];
    this.cops = [];
    this.busted = false;
    this.spawnIn = 0;
    this.clock = 0;
    this.load(cfg);
  }

  load(cfg) {
    prepareRoads(this.net);
    // Coches del tráfico (se reutilizan al salir del radio de visión).
    for (let k = 0; k < this.trafficTarget + 3; k++) {
      const kind = TRAFFIC_KINDS[(Math.random() * TRAFFIC_KINDS.length) | 0];
      const tune = kind === 'bus' ? NPC_TUNES.bus : kind === 'van' ? NPC_TUNES.van : NPC_TUNES.sedan;
      this.traffic.push({ v: new Vehicle(tune, buildTrafficMesh(kind), kind), active: false });
    }
    const kinds = loadPedKinds(cfg.winter);
    for (let k = 0; k < this.pedTarget; k++) this.peds.push({ m: new PedModel(kinds[k % kinds.length]), active: false });
    for (const p of cfg.cops ?? []) {
      const v = new Vehicle(NPC_TUNES.cop, buildCopMesh(), 'policía');
      v.place(p.x, p.z, p.yaw, this.heightAt, 0);
      this.scene.add(v.group);
      const at = { x: p.x, y: 0, z: p.z, side: 0, target: -1, brake: 0 };
      const driver = new AIDriver(v, [at, { ...at }], false, 1);
      Object.assign(driver, { world: this.world, bangers: this.world });
      this.cops.push({ v, driver, state: 'parked', replanIn: 0, lost: 0, bust: 0, home: p, siren: v.parts.siren });
    }
  }

  // session: la carrera (racers y lista viva de vehículos para choques y para la IA de los rivales).
  attach(session) {
    this.session = session;
    this.all = session.all;
    for (const c of this.cops) { this.all.push(c.v); c.driver.others = this.all; }
  }

  get player() { return this.session.racers[0].vehicle; }

  update(dt, running) {
    const me = this.player.car;
    this.clock += dt;
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnIn = 0.3;
      this.manageTraffic(me);
      this.managePeds(me);
    }
    for (const t of this.traffic) if (t.active) this.driveTraffic(t, dt);
    for (const p of this.peds) if (p.active) this.movePed(p, dt);
    if (running) for (const c of this.cops) this.driveCop(c, dt);
    else for (const c of this.cops) c.v.step(dt, stopInput(c.v.car), this.world, this.bangers, this.heightAt);
  }

  // Tras los choques entre coches: el que se ha movido de su raíl ha recibido un golpe.
  afterCollisions() {
    for (const t of this.traffic) {
      if (!t.active || t.mode !== 'drive') continue;
      const c = t.v.car;
      // Un roce leve no lo saca de su carril; un golpe de verdad sí.
      if (Math.hypot(c.x - t.ex, c.z - t.ez) > 0.25 || Math.hypot(c.vx - t.evx, c.vz - t.evz) > 2) t.mode = 'hit';
    }
  }

  sync(dt) {
    for (const t of this.traffic) if (t.active) t.v.sync(dt);
    for (const c of this.cops) {
      c.v.sync(dt);
      if (c.siren) {
        const on = c.state === 'chase';
        const ph = Math.floor(performance.now() / 180) % 2;
        c.siren[0].visible = on && ph === 0;
        c.siren[1].visible = on && ph === 1;
      }
    }
  }

  // ---------- Tráfico ----------
  // Semáforo lógico del cruce: tiene paso un eje (calles alineadas, en los dos sentidos) durante 9 s;
  // al cambiar, 2 s en rojo para todos. Solo cambia si alguien espera en el otro eje.
  green(j, heading) {
    const axis = ((heading % Math.PI) + Math.PI) % Math.PI;
    const same = (x) => Math.abs(angleDiff(2 * (x - axis))) < 1;
    if (j.axis === undefined) { j.axis = axis; j.since = -1e9; j.until = this.clock + 9; }
    if (this.clock > j.until && j.waiting !== undefined) {
      j.axis = j.waiting;
      j.waiting = undefined;
      j.since = this.clock;
      j.until = this.clock + 11;
    }
    if (same(j.axis)) return this.clock - j.since > 2;
    j.waiting = axis;
    return false;
  }

  manageTraffic(me) {
    for (const t of this.traffic) {
      if (t.active && Math.hypot(t.v.car.x - me.x, t.v.car.z - me.z) > TRAFFIC_DROP) this.drop(t);
    }
    const active = this.traffic.filter((t) => t.active).length;
    if (active >= this.trafficTarget) return;
    const free = this.traffic.find((t) => !t.active);
    if (free) this.spawnTraffic(free, me, active === 0 ? 30 : TRAFFIC_NEAR);
  }

  pickRoad(me, near, far, car) {
    for (let tries = 0; tries < 30; tries++) {
      const r = this.net.roads[(Math.random() * this.net.roads.length) | 0];
      const d = Math.hypot(r.mid[0] - me.x, r.mid[2] - me.z);
      if (d < near || d > far || r.length < 20) continue;
      if (car && this.data.exceptions.get(r.id)?.density === 0) continue;   // calles reservadas a la carrera
      return r;
    }
    return null;
  }

  spawnTraffic(t, me, near) {
    const r = this.pickRoad(me, near, TRAFFIC_FAR, true);
    if (!r) return;
    const dir = r.twoWay && Math.random() < 0.5 ? -1 : 1;
    const mover = new Mover(r, dir, 'car', (Math.random() * lanesOf(r, dir)) | 0, Math.random() * r.length * 0.8);
    const p = mover.at(mover.s);
    if (this.all.some((v) => Math.hypot(v.car.x - p.x, v.car.z - p.z) < 18)) return;
    const limit = this.data.exceptions.get(r.id)?.speed;
    Object.assign(t, { active: true, mode: 'drive', mover, speed: (limit ? limit * MPH : this.speedLimit) * 0.8, ex: p.x, ez: p.z, evx: 0, evz: 0 });
    t.v.place(p.x, p.z, p.yaw, this.heightAt, p.y + 1.5);
    t.v.car.noWreck = true;
    this.scene.add(t.v.group);
    this.all.push(t.v);
  }

  drop(t) {
    t.active = false;
    detach(t.v.group);
    const k = this.all.indexOf(t.v);
    if (k >= 0) this.all.splice(k, 1);
  }

  driveTraffic(t, dt) {
    const v = t.v, car = v.car;
    if (t.mode === 'hit') {
      v.step(dt, stopInput(car), this.world, this.bangers, this.heightAt);
      return;
    }
    const m = t.mover;
    const here = m.at(m.s);
    const limit = (this.data.exceptions.get(m.road.id)?.speed || 0) * MPH || this.speedLimit;
    // Curvas: cuánto gira la calle en los próximos 20 m.
    const ahead = m.at(m.s + 20);
    const turn = Math.abs(angleDiff(ahead.yaw - here.yaw));
    let want = limit * Math.max(0.35, 1 - turn / 1.8);
    // Coche (o lo que sea) delante en su carril.
    const fx = Math.sin(here.yaw), fz = Math.cos(here.yaw);
    for (const o of this.all) {
      if (o === v) continue;
      const dx = o.car.x - car.x, dz = o.car.z - car.z;
      const along = dx * fx + dz * fz;
      if (along <= 0 || along > 35 || Math.abs(o.y - v.y) > 3) continue;
      // Distancia a su propia trayectoria a esa altura (en las curvas no vale la recta).
      const onPath = m.at(m.s + along);
      if (Math.hypot(o.car.x - onPath.x, o.car.z - onPath.z) > 2.2 + o.car.size.length / 5) continue;
      const gap = along - (car.size.length + o.car.size.length) / 2 - 2.5;
      const vo = Math.max(0, o.car.vx * fx + o.car.vz * fz);
      want = Math.min(want, gap <= 0 ? 0 : vo + Math.sqrt(2 * 4 * gap));
    }
    // Trayectorias que se cruzan (uniones a mitad de tramo, coches que giran, el jugador): con la
    // velocidad actual de los dos, ¿se acercan a menos de 3 m en los próximos 3 s? Cede quien tiene
    // al otro más por delante; a los corredores y a la policía siempre se les cede el paso.
    for (const o of this.all) {
      if (o === v) continue;
      const rx = o.car.x - car.x, rz = o.car.z - car.z;
      if (rx * rx + rz * rz > 1600 || Math.abs(o.y - v.y) > 3) continue;
      const vx = o.car.vx - fx * t.speed, vz = o.car.vz - fz * t.speed;
      const vv = vx * vx + vz * vz;
      if (vv < 1) continue;
      const tc = -(rx * vx + rz * vz) / vv;
      if (tc <= 0 || tc > 3) continue;
      const reach = (car.size.length + o.car.size.length) / 4 + 1.8;   // los autobuses ocupan más
      if (Math.hypot(rx + vx * tc, rz + vz * tc) > reach) continue;
      const [ofx, ofz] = o.car.forward;
      const other = this.traffic.find((x) => x.v === o);
      const yields = !other || (rx * fx + rz * fz) > (-rx * ofx - rz * ofz);
      if (yields && !(t.pushOn > 0)) want = Math.min(want, tc < 1.5 ? 0 : t.speed * 0.5);
    }
    // Cruce por delante: espera en la línea si no tiene paso (si ya está dentro, sigue).
    const cross = m.crossings.find((c) => c.s > m.s - 2);
    if (cross) {
      const dist = cross.s - m.s;
      const r = cross.junction.radius;
      if (dist > r - 1 && dist < r + 18 && !(t.pushOn > 0) && !this.green(cross.junction, cross.heading)) {
        want = Math.min(want, Math.sqrt(2 * 4 * Math.max(0, dist - r - 1)));
      }
    }
    // Peatón cruzando delante.
    for (const p of this.peds) {
      if (!p.active) continue;
      const dx = p.x - car.x, dz = p.z - car.z;
      const along = dx * fx + dz * fz;
      if (along > 0 && along < 15 && Math.abs(dx * fz - dz * fx) < 2) want = Math.min(want, Math.max(0, along - 5));
    }
    // Desbloqueo: tras 20 s parado (dos que se ceden el paso, un cruce atascado) sigue 3 s sin ceder.
    t.wait = t.speed < 0.3 ? (t.wait ?? 0) + dt : 0;
    if (t.wait > 20) { t.pushOn = 3; t.wait = 0; }
    if (t.pushOn > 0) t.pushOn -= dt;
    t.speed += Math.max(-7 * dt, Math.min(2.5 * dt, want - t.speed));
    m.advance(t.speed * dt);
    const p = m.at(m.s);
    const yaw = car.yaw + angleDiff(p.yaw - car.yaw) * Math.min(1, dt * 8);
    car.w = angleDiff(yaw - car.yaw) / dt;
    car.yaw = yaw;
    car.x = p.x;
    car.z = p.z;
    car.vx = Math.sin(yaw) * t.speed;
    car.vz = Math.cos(yaw) * t.speed;
    const h = this.heightAt(p.x, p.z, p.y + 1.5);
    v.y += ((h ?? p.y) - v.y) * 0.5;
    Object.assign(t, { ex: car.x, ez: car.z, evx: car.vx, evz: car.vz });
  }

  // ---------- Peatones ----------
  managePeds(me) {
    for (const p of this.peds) {
      if (p.active && Math.hypot(p.x - me.x, p.z - me.z) > PED_DROP) { p.active = false; detach(p.m.group); }
    }
    const free = this.peds.find((p) => !p.active);
    if (!free) return;
    const r = this.pickRoad(me, PED_NEAR, PED_FAR, false);
    if (!r) return;
    const mover = new Mover(r, Math.random() < 0.5 ? 1 : -1, 'ped', 0, Math.random() * r.length * 0.8);
    const p = mover.at(mover.s);
    const h = this.heightAt(p.x, p.z, p.y + 1.5);
    if (h === null) return;
    Object.assign(free, { active: true, mover, mode: 'walk', phase: Math.random() * 10, speed: 1.2 + Math.random() * 0.4,
      x: p.x, z: p.z, y: h, yaw: p.yaw, side: 0, sideV: 0 });
    this.scene.add(free.m.group);
  }

  movePed(p, dt) {
    const m = p.mover;
    if (p.mode === 'walk') {
      m.advance(p.speed * dt);
      p.phase += (p.speed * dt) / WALK.stride;
      p.m.pose('walk', WALK.from + (p.phase % 1) * (WALK.to - WALK.from));
      this.dodge(p);
    } else {
      p.t += dt;
      const f = DIVE.from + p.t * DIVE.fps;
      if (f >= DIVE.to) { p.mode = 'walk'; p.sideV = 0; }
      else {
        p.m.pose(p.anim, f);
        // Salto: se aparta de la trayectoria del coche durante la primera mitad.
        if (f < DIVE.from + 16) p.side += p.sideV * dt;
      }
    }
    // Vuelve poco a poco a la acera después de un salto.
    if (p.mode === 'walk') p.side *= Math.max(0, 1 - dt * 0.6);
    const q = m.at(m.s);
    const rx = -Math.cos(q.yaw), rz = Math.sin(q.yaw);     // derecha del peatón
    p.x = q.x + rx * p.side;
    p.z = q.z + rz * p.side;
    if (p.mode === 'walk') p.yaw = q.yaw;
    const h = this.heightAt(p.x, p.z, p.y + 1.2);
    if (h !== null) p.y += (h - p.y) * 0.3;
    p.m.group.position.set(p.x, p.y, p.z);
    p.m.group.rotation.y = p.yaw + Math.PI;
  }

  // Si un coche viene hacia él, salta hacia el lado contrario a su trayectoria.
  dodge(p) {
    for (const v of this.all) {
      const c = v.car;
      const sp = Math.hypot(c.vx, c.vz);
      if (sp < 3 || Math.abs(v.y - p.y) > 2.5) continue;
      const dx = p.x - c.x, dz = p.z - c.z;
      if (dx * dx + dz * dz > 900) continue;
      const ux = c.vx / sp, uz = c.vz / sp;
      const along = dx * ux + dz * uz, lat = dx * uz - dz * ux;
      if (along < -1 || along > sp * 1.3 + 4 || Math.abs(lat) > 2.2) continue;
      // Dirección del salto (perpendicular a la del coche, hacia donde ya está el peatón).
      const s = lat === 0 ? (Math.random() < 0.5 ? 1 : -1) : Math.sign(lat);
      const jx = uz * s, jz = -ux * s;
      const rx = -Math.cos(p.yaw), rz = Math.sin(p.yaw);
      const toRight = jx * rx + jz * rz;
      p.anim = toRight > 0 ? 'right' : 'left';
      p.sideV = Math.sign(toRight || 1) * (DIVE.side / (16 / DIVE.fps));
      p.mode = 'dive';
      p.t = 0;
      return;
    }
  }

  // ---------- Policía ----------
  driveCop(c, dt) {
    const me = this.player, mc = me.car, car = c.v.car;
    const d = Math.hypot(mc.x - car.x, mc.z - car.z);
    if (c.state !== 'chase') {
      // Le llama la atención el jugador que pasa muy rápido cerca o que choca a su lado.
      const hitNear = me.car.damage > (c.lastDamage ?? me.car.damage) && d < 50;
      c.lastDamage = me.car.damage;
      if (d < 45 && Math.abs(me.y - c.v.y) < 4 && (Math.abs(mc.speed) > 22 || hitNear)) { c.state = 'chase'; c.replanIn = 0; c.lost = 0; }
      c.v.step(dt, stopInput(car), this.world, this.bangers, this.heightAt);
      return;
    }
    c.replanIn -= dt;
    if (c.replanIn <= 0) {
      c.replanIn = 1;
      const from = { x: car.x, y: c.v.y, z: car.z, side: 0, target: -1, brake: 0 };
      const lead = Math.min(1, d / 30);
      const to = { x: mc.x + mc.vx * 0.6 * lead, y: me.y, z: mc.z + mc.vz * 0.6 * lead, side: 0, target: -1, brake: 0 };
      const direct = d < 60 && !this.world.blocks(car.x, car.z, to.x, to.z, c.v.y);
      const path = direct ? [from, to] : densifyPath(this.net, [from, to], false);
      Object.assign(c.driver, { path, i: 1, startI: 0, finished: false, offset: 0 });
    }
    const input = c.driver.update(dt);
    // Al acercarse, no más rápido de lo que le deja parar junto al jugador (antes se pasaba de largo).
    const vmax = Math.abs(mc.speed) + Math.sqrt(2 * 5 * Math.max(0, d - 7));
    if (car.speed > vmax + 1) { input.throttle = 0; input.brake = Math.min(1, (car.speed - vmax) / 6); }
    else if (d < 25 && Math.abs(mc.speed) > 5) input.throttle = Math.max(input.throttle, 0.8);   // empuja
    c.v.step(dt, input, this.world, this.bangers, this.heightAt);
    // Rescate (si se atasca) solo lejos del jugador, para que no aparezca de golpe a su lado.
    if (d > 120) c.driver.rescueIfNeeded(this.session.time, this.heightAt);
    // Detenido: parado junto al coche patrulla un par de segundos.
    if (d < 11 && Math.abs(mc.speed) < 2.5) c.bust += dt; else c.bust = Math.max(0, c.bust - dt);
    if (c.bust > 2.5) this.busted = true;
    // Se escapa: lejos durante 8 s.
    if (d > 220) c.lost += dt; else c.lost = 0;
    if (c.lost > 8) c.state = 'gaveup';
  }

  get chasing() { return this.cops.some((c) => c.state === 'chase'); }

  dispose() {
    for (const t of this.traffic) t.v.dispose();
    for (const p of this.peds) detach(p.m.group);
    for (const c of this.cops) c.v.dispose();
  }
}
