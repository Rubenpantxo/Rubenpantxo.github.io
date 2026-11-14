// Una partida en marcha: jugador, rivales (carrera), tráfico/peatones/policía, choques entre
// vehículos, puntos de control y posiciones. Paso de física fijo (DT).
import { AIDriver } from './ai.js';
import { stopInput } from './physics.js';
import { densifyPath } from './citynet.js';

export const DT = 1 / 120;
const GATE_R = 10;

export class Session {
  // ctx: { scene, world, heightAt, net }; player: Vehicle; rivals: [Vehicle]; gates: [{ x, z }]
  constructor(ctx, player, { rivals = [], gates = [], ambient = null } = {}) {
    Object.assign(this, ctx);
    this.time = 0;
    this.gates = gates;
    this.racers = [{ vehicle: player, player: true, done: 0, finishTime: null, name: 'Tú' }];
    const all = [player];
    this.all = all;
    // Trazada de los rivales: de la salida a cada puerta por las calles (carril derecho).
    const start = { x: player.car.x, z: player.car.z };
    const path = gates.length ? densifyPath(ctx.net, [start, ...gates], false) : [];
    const lanes = [-2, 2, -1, 1, 0, -2.5, 2.5];
    rivals.forEach((v, k) => {
      const driver = new AIDriver(v, path.map((p) => ({ ...p })), false, 0.45 + 0.1 * (k % 5));
      Object.assign(driver, { others: all, world: ctx.world, bangers: ctx.world, lane: lanes[k % lanes.length], i: 1 });
      this.racers.push({ vehicle: v, player: false, done: 0, finishTime: null, name: `Rival ${k + 1}`, driver });
      all.push(v);
      ctx.scene.add(v.group);
    });
    this.ambient = ambient;
    ambient?.attach(this);
  }

  get player() { return this.racers[0].vehicle; }

  // input del jugador ya traducido a la física: { throttle, brake, steer, handbrake }; running:
  // false en la cuenta atrás o con la partida acabada (el jugador se queda quieto).
  step(input, running) {
    const dt = DT;
    this.time += dt;
    for (const r of this.racers) {
      let inp;
      if (r.player) inp = running ? input : stopInput(r.vehicle.car);
      else inp = running && r.finishTime === null ? r.driver.update(dt) : stopInput(r.vehicle.car);
      r.vehicle.step(dt, inp, this.world, null, this.heightAt);
      if (r.driver && running) r.driver.rescueIfNeeded(this.time, this.heightAt);
    }
    this.ambient?.update(dt, running);
    this.collideCars();
    this.ambient?.afterCollisions();
    for (const r of this.racers) this.checkGates(r);
  }

  sync(dt) {
    for (const r of this.racers) r.vehicle.sync(dt);
    this.ambient?.sync(dt);
  }

  checkGates(r) {
    if (r.done >= this.gates.length) return;
    const g = this.gates[r.done], c = r.vehicle.car;
    if (Math.hypot(g.x - c.x, g.z - c.z) < GATE_R) {
      r.done++;
      if (r.done >= this.gates.length) { r.finishTime = this.time; if (r.driver) r.driver.finished = true; }
      r.justPassed = true;
    }
  }

  // Posición: primero quien ha terminado (por tiempo); después por puertas y distancia a la siguiente.
  standings() {
    const score = (r) => {
      if (r.finishTime !== null) return 1e9 - r.finishTime;
      const g = this.gates[r.done];
      const d = g ? Math.hypot(g.x - r.vehicle.car.x, g.z - r.vehicle.car.z) : 0;
      return r.done * 1e5 - d;
    };
    return [...this.racers].sort((a, b) => score(b) - score(a));
  }

  position() { return this.standings().indexOf(this.racers[0]) + 1; }

  // Choques coche-coche con los círculos de cada carrocería.
  collideCars() {
    const vs = this.all;
    for (let i = 0; i < vs.length; i++) {
      for (let j = i + 1; j < vs.length; j++) {
        const a = vs[i], b = vs[j];
        if (Math.abs(a.y - b.y) > 2.5) continue;
        const ca = a.car, cb = b.car;
        if (Math.hypot(ca.x - cb.x, ca.z - cb.z) > (ca.size.length + cb.size.length) / 2 + 1) continue;
        const [afx, afz] = ca.forward, [bfx, bfz] = cb.forward;
        for (const p of ca.hullCircles) {
          for (const q of cb.hullCircles) {
            const ax = ca.x + afx * p.s, az = ca.z + afz * p.s;
            const bx = cb.x + bfx * q.s, bz = cb.z + bfz * q.s;
            let nx = ax - bx, nz = az - bz;
            const d = Math.hypot(nx, nz);
            const depth = p.r + q.r - d;
            if (depth <= 0 || d < 1e-4) continue;
            nx /= d; nz /= d;
            const ma = ca.mass, mb = cb.mass;
            ca.x += nx * depth * mb / (ma + mb); ca.z += nz * depth * mb / (ma + mb);
            cb.x -= nx * depth * ma / (ma + mb); cb.z -= nz * depth * ma / (ma + mb);
            const vn = (ca.vx - cb.vx) * nx + (ca.vz - cb.vz) * nz;
            if (vn >= 0) continue;
            const e = 0.3;
            const imp = -(1 + e) * vn / (1 / ma + 1 / mb);
            ca.vx += imp * nx / ma; ca.vz += imp * nz / ma;
            cb.vx -= imp * nx / mb; cb.vz -= imp * nz / mb;
            if (-vn > 2.5) {
              const energy = 0.5 * (ma * mb / (ma + mb)) * vn * vn;
              const hit = { x: (ax + bx) / 2, z: (az + bz) / 2, energy, speed: -vn };
              a.hurt(hit);
              b.hurt(hit);
            }
          }
        }
      }
    }
  }

  dispose() {
    for (const r of this.racers) if (!r.player) r.vehicle.dispose();
    this.ambient?.dispose();
  }
}
