// Piloto automático de los rivales (y de la policía): sigue una trazada por las calles con la
// misma física que el jugador.
//  · Dirección: apunta a un punto que va por delante sobre la ruta (distancia según la velocidad).
//  · Velocidad: para cada curva próxima calcula la velocidad que aguanta y frena con tiempo.
import { stopInput } from './physics.js';

const MPH = 0.447;
const BRAKE = 3.0;       // m/s²: deceleración con la que planifica (frena antes y más suave)
const MAX_OFFSET = 4;    // m: lo más que se separa de su trazada para adelantar o esquivar
const PLAN_EVERY = 0.1;  // s entre decisiones de carril
const angleDiff = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class AIDriver {
  // loop: la ruta es una vuelta cerrada (circuitos) y se repite.
  // level: nivel del rival (0,3–1): más nivel, más velocidad y más agarre en curva.
  constructor(vehicle, path, loop = false, level = 0.5) {
    this.v = vehicle;
    this.path = path;
    this.loop = loop;
    this.top = 26 + 20 * level;        // 0,3 → 115 km/h · 0,9 → 159 km/h
    this.lateral = 6.2 + 1.8 * level;
    this.i = Math.min(1, path.length - 1);
    this.stuck = 0;
    this.reverse = 0;
    this.finished = false;
    this.stats = { reverses: 0, rescues: 0, stuckAt: [] };
    this.lane = 0;          // carril propio (m a la derecha de la trazada); lo asigna la carrera
    this.offset = null;     // separación lateral actual; arranca donde esté el coche
    this.want = 0;          // separación buscada (carril, adelantamiento o esquiva)
    this.planIn = 0;
    // Los rivales no quedan destrozados: el daño no los deja fuera de carrera.
    vehicle.car.noWreck = true;
  }

  point(i) {
    const n = this.path.length;
    return this.loop ? this.path[((i % n) + n) % n] : this.path[Math.max(0, Math.min(i, n - 1))];
  }

  // Punto de la ruta desplazado a un lado según la columna «side offset» más el carril actual.
  target(i, extra = this.offset ?? 0) {
    const p = this.point(i);
    let q = this.point(i - 1);
    // Puntos repetidos: la dirección se toma del anterior distinto.
    for (let k = 2; k < 4 && q.x === p.x && q.z === p.z; k++) q = this.point(i - k);
    let dx = p.x - q.x, dz = p.z - q.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const side = p.side + extra;
    return { x: p.x + dz * side, z: p.z - dx * side, p };
  }

  // Posición de un punto respecto a la trazada (sin carril) en los próximos tramos:
  // s = metros por delante del coche a lo largo de la ruta, lat = metros a la derecha.
  onPath(x, z) {
    const car = this.v.car;
    let best = null, acc = 0, carS = null;
    for (let k = this.i; k < this.i + 6; k++) {
      if (!this.loop && k > this.path.length - 1) break;
      const a = this.target(k - 1, 0), b = this.target(k, 0);
      const sx = b.x - a.x, sz = b.z - a.z;
      const len = Math.hypot(sx, sz);
      if (len < 0.01) continue;
      const ux = sx / len, uz = sz / len;
      if (carS === null) carS = (car.x - a.x) * ux + (car.z - a.z) * uz;
      const t = Math.max(0, Math.min(len, (x - a.x) * ux + (z - a.z) * uz));
      const px = a.x + ux * t, pz = a.z + uz * t;
      const d = Math.hypot(x - px, z - pz);
      if (!best || d < best.d) best = { d, s: acc + t - carS, lat: (x - a.x) * uz - (z - a.z) * ux, ux, uz, px, pz };
      acc += len;
    }
    return best;
  }

  // Punto a s metros por delante del coche sobre la trazada, desplazado lat metros.
  pathPoint(s, lat) {
    const car = this.v.car;
    let carS = null;
    for (let k = this.i; k < this.i + 8; k++) {
      const a = this.target(k - 1, 0), b = this.target(k, 0);
      const sx = b.x - a.x, sz = b.z - a.z;
      const len = Math.hypot(sx, sz);
      if (len < 0.01) continue;
      const ux = sx / len, uz = sz / len;
      if (carS === null) { carS = (car.x - a.x) * ux + (car.z - a.z) * uz; s += carS; }
      if (s <= len || (!this.loop && k >= this.path.length - 1)) {
        const t = Math.max(0, Math.min(len, s));
        return { x: a.x + ux * t + uz * lat, z: a.z + uz * t - ux * lat };
      }
      s -= len;
    }
    return null;
  }

  // ¿Cabe el coche a lat metros de la trazada en los próximos metros (sin paredes)?
  laneClear(lat, speed) {
    if (!this.world) return true;
    const r = this.v.car.size.width / 2 + 0.4;
    for (const s of [4, 10, 10 + speed * 0.8]) {
      const p = this.pathPoint(s, lat);
      if (p && this.world.contacts(p.x, p.z, r, this.v.y).length) return false;
    }
    return true;
  }

  // Elige la separación lateral: su carril si está libre; si no, el hueco más cercano que deje
  // pasar al coche de delante o a un objeto de la calle (farolas, bocas de riego…).
  planLane(speed) {
    const car = this.v.car;
    const half = car.size.width / 2;
    const look = 12 + Math.max(0, speed) * 1.5;
    const busy = [];   // tramos laterales ocupados [desde, hasta]
    for (const o of this.others ?? []) {
      if (o === this.v || Math.abs(o.y - this.v.y) > 3) continue;
      if (Math.hypot(o.car.x - car.x, o.car.z - car.z) > look + 10) continue;
      const q = this.onPath(o.car.x, o.car.z);
      if (!q || q.s < -3 || q.s > look || q.d > 8) continue;
      // Uno que va más rápido y por delante no estorba.
      if (q.s > 6 && o.car.speed > speed + 1) continue;
      const w = o.car.size.width / 2 + half + 0.8;
      busy.push([q.lat - w, q.lat + w]);
    }
    if (this.bangers) {
      for (const it of this.bangers.around(car.x, car.z, look, this.v.y)) {
        const q = this.onPath(it.pos.x, it.pos.z);
        if (!q || q.s < 0 || q.s > look || Math.abs(q.lat) > MAX_OFFSET + 3) continue;
        const w = it.type.radius + half + 0.6;
        busy.push([q.lat - w, q.lat + w]);
      }
    }
    const free = (c) => busy.every(([lo, hi]) => c <= lo || c >= hi);
    const options = [this.lane, this.lane / 2, 0];
    for (const [lo, hi] of busy) options.push(lo - 0.1, hi + 0.1);
    let best = null, bestCost = Infinity;
    for (const c of options) {
      if (Math.abs(c) > MAX_OFFSET || !free(c)) continue;
      const cost = Math.abs(c - this.offset) + 0.5 * Math.abs(c - this.lane);
      if (cost >= bestCost || !this.laneClear(c, speed)) continue;
      best = c; bestCost = cost;
    }
    this.want = best ?? 0;
  }

  // Velocidad máxima al pasar por el vértice i según lo cerrado del giro. El giro se mide entre
  // puntos a unos 12 m antes y después: en los cruces la trazada densa reparte un giro de 90°
  // entre varios vértices muy juntos y cada uno por separado parecía suave.
  cornerSpeed(i) {
    if (!this.loop && i >= this.path.length - 1) return this.top;
    const b = this.target(i);
    const reach = (dir) => {
      let k = i, p = b;
      for (let g = 0; g < 8; g++) {
        k += dir;
        if (!this.loop && (k < 0 || k > this.path.length - 1)) break;
        p = this.target(k);
        if (Math.hypot(p.x - b.x, p.z - b.z) >= 12) break;
      }
      return p;
    };
    const a = reach(-1), c = reach(1);
    const turn = Math.abs(angleDiff(Math.atan2(c.x - b.x, c.z - b.z) - Math.atan2(b.x - a.x, b.z - a.z)));
    const radius = 24 / Math.max(turn, 0.02);           // radio aproximado de la trazada
    let v = Math.min(this.top, Math.sqrt(this.lateral * radius));
    if (b.p.target > 0) v = Math.min(v, b.p.target * MPH);
    return v;
  }

  update(dt) {
    const car = this.v.car;
    if (this.finished || car.wrecked) return stopInput(car);
    const n = this.path.length;

    // Avanza de tramo cuando la proyección del coche rebasa el final del tramo actual.
    for (let guard = 0; guard < n && (this.loop || this.i < n - 1); guard++) {
      const a = this.target(this.i - 1), b = this.target(this.i);
      const sx = b.x - a.x, sz = b.z - a.z;
      const len2 = sx * sx + sz * sz || 1;
      const t = ((car.x - a.x) * sx + (car.z - a.z) * sz) / len2;
      if (t >= 1 || Math.hypot(b.x - car.x, b.z - car.z) < 8) this.i++; else break;
    }

    // Carril: arranca donde esté el coche y se desplaza poco a poco hacia el elegido.
    const speed = car.speed;
    if (this.offset === null) {
      const q = this.onPath(car.x, car.z);
      this.offset = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, q ? q.lat : 0));
    }
    this.planIn -= dt;
    if (this.planIn <= 0) { this.planIn = PLAN_EVERY; this.planLane(speed); }
    const shift = (1.5 + Math.max(0, speed) * 0.08) * dt;
    this.offset += Math.max(-shift, Math.min(shift, this.want - this.offset));

    // Punto de mira: desde la proyección del coche sobre su tramo, recorre la trazada una
    // distancia L (persecución pura). En un giro cerrado se apunta al vértice hasta estar cerca:
    // así no corta la esquina del edificio.
    const sa = this.target(this.i - 1), sb = this.target(this.i);
    const segLen = Math.hypot(sb.x - sa.x, sb.z - sa.z) || 1;
    const ux = (sb.x - sa.x) / segLen, uz = (sb.z - sa.z) / segLen;
    const along = Math.max(0, Math.min(segLen, (car.x - sa.x) * ux + (car.z - sa.z) * uz));
    let from = { x: sa.x + ux * along, z: sa.z + uz * along };
    let L = 8 + Math.max(0, speed) * 0.6;
    let aim = sb;
    for (let k = this.i; k < this.i + 10; k++) {
      const p = this.target(k), q = this.target(k + 1), o = this.target(k - 1);
      const d = Math.hypot(p.x - from.x, p.z - from.z);
      if (d >= L) {
        aim = { x: from.x + ((p.x - from.x) * L) / d, z: from.z + ((p.z - from.z) * L) / d };
        break;
      }
      aim = p;
      const sharp = Math.abs(angleDiff(Math.atan2(q.x - p.x, q.z - p.z) - Math.atan2(p.x - o.x, p.z - o.z))) > 0.6;
      if ((!this.loop && k >= n - 1) || (sharp && Math.hypot(p.x - car.x, p.z - car.z) > 7)) break;
      L -= d;
      from = p;
    }
    // Corrección lateral (controlador tipo Stanley): rumbo del tramo menos un ángulo según lo
    // lejos que esté el coche de la línea; se mezcla con la mira adelantada.
    const cross = (car.x - sa.x) * uz - (car.z - sa.z) * ux;     // > 0: coche a la derecha (+x) de la línea
    const stanley = Math.atan2(ux, uz) - Math.atan2(1.5 * cross, Math.max(Math.abs(speed), 2) + 2);
    const errAim = angleDiff(Math.atan2(aim.x - car.x, aim.z - car.z) - car.yaw);
    const errLine = angleDiff(stanley - car.yaw);
    const err = Math.abs(cross) > 0.5 && Math.abs(errLine) < 1.2 ? 0.5 * errAim + 0.5 * errLine : errAim;

    // Velocidad permitida ahora: la que deja frenar a tiempo para cada curva próxima.
    let vAllowed = this.top;
    let dist = Math.hypot(this.target(this.i).x - car.x, this.target(this.i).z - car.z);
    for (let k = this.i; k < this.i + 6; k++) {
      if (!this.loop && k > n - 1) break;
      vAllowed = Math.min(vAllowed, Math.sqrt(this.cornerSpeed(k) ** 2 + 2 * BRAKE * dist));
      const p = this.target(k), q = this.target(k + 1);
      dist += Math.hypot(q.x - p.x, q.z - p.z);
    }
    vAllowed = Math.min(vAllowed, 8 + (this.top - 8) * Math.max(0, 1 - Math.abs(err) / 0.9));

    // Tráfico: si hay otro coche delante en su carril, no ir más rápido que él al acercarse
    // (si ya va por un lado para adelantarlo, no frena).
    const [fx, fz] = car.forward;
    for (const o of this.others ?? []) {
      if (o === this.v) continue;
      const dx = o.car.x - car.x, dz = o.car.z - car.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 30 || dist < 0.1 || Math.abs(o.y - this.v.y) > 3) continue;
      const ahead = (dx * fx + dz * fz) / dist;
      if (ahead < 0.7) continue;
      const q = this.onPath(o.car.x, o.car.z);
      if (q && Math.abs(q.lat - this.offset) > (o.car.size.width + car.size.width) / 2 + 0.3) continue;
      const gap = Math.max(0, dist - (car.size.length + o.car.size.length) / 2 - 2);
      vAllowed = Math.min(vAllowed, Math.max(0, o.car.speed) + Math.sqrt(2 * BRAKE * gap));
    }

    // Atascado: marcha atrás un momento con el volante al revés.
    if (this.reverse > 0) {
      this.reverse -= dt;
      return { throttle: 0, brake: 1, steer: -Math.sign(err), handbrake: false };
    }
    if (Math.abs(speed) < 1.5) this.stuck += dt; else this.stuck = 0;
    if (this.stuck > 2.5) { this.stuck = 0; this.reverse = 1.2; this.stats.reverses++; }

    // Frenada dosificada según el exceso de velocidad.
    let throttle = speed < vAllowed ? 1 : 0;
    let brake = speed > vAllowed + 1 ? Math.min(0.8, 0.2 + (speed - vAllowed) / 8) : 0;
    // Ángulo de rueda que pide la persecución pura, en fracción del máximo que la física deja a
    // esta velocidad (a 100 km/h ese máximo es muy pequeño: un porcentaje fijo apenas corregía).
    const ld = Math.max(4, Math.hypot(aim.x - car.x, aim.z - car.z));
    // Con el objetivo de lado o detrás (pasado de frenada, tras un trompo) se gira a tope.
    let wheel = Math.atan2(2 * car.wheelbase * (Math.abs(err) > Math.PI / 2 ? Math.sign(err) : Math.sin(err)), ld);
    // Amortiguación: corrige la diferencia entre el giro que pide la trazada y el que lleva el
    // coche (sin ella el coche ondulaba en las rectas rápidas).
    if (Math.abs(err) < Math.PI / 2 && Math.abs(speed) > 5) {
      const wantW = (Math.abs(speed) * 2 * Math.sin(err)) / ld;
      wheel += (0.5 * car.wheelbase * (wantW - car.w)) / Math.abs(speed);
    }
    let steer = Math.max(-1, Math.min(1, wheel / car.maxSteerAt(Math.abs(speed))));
    if (Math.abs(err) > 0.6) steer = Math.sign(err) * Math.max(Math.abs(steer), Math.min(1, Math.abs(err) * 2.5));

    // Control de estabilidad: si el coche va de lado (deriva > 0,15 rad), suelta el freno y gira
    // la mitad; la física ya contravolantea hacia donde va la velocidad. (Con el volante recto
    // el coche salía de la curva en línea recta.) Con mucho volante, frena menos.
    brake *= 1 - 0.4 * Math.min(1, Math.abs(steer));
    const vLat = car.vx * fz - car.vz * fx;
    const beta = Math.atan2(vLat, Math.max(Math.abs(speed), 2));
    if (Math.abs(beta) > 0.15 && Math.abs(speed) > 5) {
      brake = 0;
      throttle = Math.min(throttle, 0.3);
      steer *= 0.5;
    } else if (Math.abs(beta) > 0.06) {
      brake *= 0.3;   // empieza a irse: aflojar el freno antes de perder la trasera
      throttle = Math.min(throttle, 0.5);
    }
    // Gas dosificado en curva rápida: con el volante cerca del límite de agarre, acelerar a fondo
    // hacía derrapar la trasera (sobreviraje de potencia).
    if (Math.abs(speed) > 12) throttle *= 1 - 0.6 * Math.min(1, Math.abs(steer));
    return { throttle, brake, steer, handbrake: false };
  }

  // Si lleva 5 s atascado, reaparece en el punto siguiente de su trazada mirando al otro (como
  // un rescate de arcade). Si vuelve a atascarse en el mismo tramo, salta uno más.
  // También si lleva 4 s a más de 30 m de su ruta (se pasó un giro y sigue de largo) o en otro
  // nivel (por la calle de abajo de un tramo elevado, contra sus pilares).
  rescueIfNeeded(time, heightAt) {
    const car = this.v.car;
    const q = this.onPath(car.x, car.z);
    const a = this.point(this.i - 1), b = this.point(this.i);
    const sx = b.x - a.x, sz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((car.x - a.x) * sx + (car.z - a.z) * sz) / (sx * sx + sz * sz || 1)));
    const level = Math.abs(this.v.y - (a.y + (b.y - a.y) * t));
    if ((!q || q.d < 30) && level < 4) this.onRoute = time;
    if (this.onRoute === undefined) this.onRoute = time;
    const lost = time - this.onRoute > 4;
    if (Math.abs(car.speed) > 2 && !lost) { this.lastMove = time; return; }
    if (this.lastMove === undefined) this.lastMove = time;
    if (time - this.lastMove < 5 && !lost) return;
    this.onRoute = time;
    this.stats.rescues++;
    this.stats.stuckAt.push([Math.round(car.x), Math.round(car.z), this.i]);
    if (this.lastRescueI === this.i) this.i++;
    this.lastRescueI = this.i;
    const p = this.point(this.i), n = this.point(this.i + 1);
    const damage = car.damage;
    this.v.place(p.x, p.z, Math.atan2(n.x - p.x, n.z - p.z), heightAt, p.y + 1);
    car.damage = damage;
    this.offset = 0;
    this.i++;
    this.lastMove = time;
    this.stuck = 0;
    this.reverse = 0;
  }
}
