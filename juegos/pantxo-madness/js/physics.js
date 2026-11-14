// Física del coche: modelo plano (x, z, giro) con cuatro ruedas, fuerzas de neumático con
// círculo de fricción, transferencia de peso, motor con curva de par y cambio automático.
// Los parámetros de cada coche salen de tuning.js.

const G = 9.81;
const IDLE_RPM = 800;
const WHEEL_RADIUS = 0.34;
const SHIFT_TIME = 0.25;
const MIN_IMPACT = 2.5;      // m/s de velocidad de choque por debajo de la cual no hay daño

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Ajustes globales de calibración.
export const TUNING = {
  dragScale: 0.8,      // F = Drag · dragScale · v²
  torqueFalloff: 0.8,  // caída del par lejos de OptRPM
};

// Entrada para parar y quedarse quieto: frena mientras avanza y luego freno de mano (con el freno
// a fondo y parado, la física mete marcha atrás, como con el jugador).
export function stopInput(car) {
  return Math.abs(car.speed) > 0.5 && car.gear !== 0
    ? { throttle: 0, brake: 1, steer: 0, handbrake: false }
    : { throttle: 0, brake: 0, steer: 0, handbrake: true };
}

export class Car {
  constructor(sim, name) {
    this.name = name;
    this.sim = sim;
    const box = sim.InertiaBox ?? [2, 1.5, 4.5];
    const cg = sim.BodyCG ?? [0, 0, 0];

    this.mass = sim.Mass ?? 1500;
    // Geometría de ejes deducida de la caja de inercia (se corrige con las ruedas del modelo).
    this.wheelbase = box[2] * 0.6;
    this.track = clamp(box[0] * 0.55, 1.4, 2.4);
    this.cgHeight = Math.max(0.3, 0.55 + cg[1]);
    this.cgForward = cg[2];
    this.wheelRadius = WHEEL_RADIUS;
    this.inertia = this.mass * (box[0] ** 2 + box[2] ** 2) / 12;
    this.size = { width: clamp(box[0] * 0.6, 1.6, 2.8), height: clamp(box[1], 1.1, 3.5), length: box[2] };

    const eng = sim.Engine ?? {};
    this.maxHP = eng.MaxHorsePower ?? 200;
    this.optRPM = eng.OptRPM ?? 5000;
    this.maxRPM = eng.MaxRPM ?? 7000;
    // Par máximo a partir de la potencia máxima en OptRPM.
    this.maxTorque = (this.maxHP * 745.7) / (this.optRPM * 2 * Math.PI / 60);

    const tr = sim.Trans ?? {};
    this.ratios = tr.GearRatios ?? [-10, 0, 14, 9, 6, 4];
    this.numGears = Math.min(tr.NumGears ?? this.ratios.length, this.ratios.length);
    this.upRPM = tr.UpshiftRPM ?? [];
    this.downRPM = tr.DownshiftRPM ?? [];

    // 0 = tracción trasera, 1 = delantera, 2 = total.
    this.drivetrain = sim.DrivetrainType ?? 0;
    this.drag = sim.Drag ?? 0.4;
    this.handling = sim.CarFrictionHandling ?? 1;
    this.elasticity = sim.BoundElasticity ?? 0.3;
    this.steerMul = sim.SteerMultiplier ?? 1;
    this.backDriftMul = sim.BackDriftFricMultiplier ?? 0.8;
    // Daño: MaxDamage destroza el coche; MedDamage es el umbral de daño visible y humo.
    this.maxDamage = sim.MaxDamage ?? 700000;
    this.medDamage = sim.MedDamage ?? this.maxDamage / 3;
    this.smokeOffset = sim.DamageSmokeOffset ?? [0, 0.6, -2];

    const wf = sim.FrontLeft ?? {};
    const wb = sim.BackLeft ?? {};
    this.axles = [wf, wb].map((w, i) => ({
      steer: w.SteeringRatio ?? (i === 0 ? 0.4 : 0),
      brake: w.BrakeRatio ?? 0.5,
      staticFric: w.StaticFric ?? 1.2,
      slidingFric: w.SlidingFric ?? 0.8,
      optSlip: w.OptimumSlipPercent ?? 0.1,
      spring: w.Spring ?? 40000,
    }));
    const brakeSum = this.axles[0].brake + this.axles[1].brake || 1;
    this.axles.forEach((a) => (a.brakeShare = a.brake / brakeSum));

    this.reset();
  }

  // Medidas reales tomadas de las mallas de las ruedas (sustituyen a las estimadas).
  setWheelGeometry({ wheelbase, track, radius }) {
    if (wheelbase > 0.5) this.wheelbase = wheelbase;
    if (track > 0.5) this.track = track;
    if (radius > 0.1) this.wheelRadius = radius;
  }

  reset(x = 0, z = 0, yaw = 0) {
    this.x = x; this.z = z; this.yaw = yaw;
    this.vx = 0; this.vz = 0; this.w = 0;
    this.steer = 0;
    this.gear = 2;
    this.rpm = IDLE_RPM;
    this.shiftTimer = 0;
    this.aLong = 0; this.aLat = 0;
    this.slipping = [false, false, false, false];
    this.damage = 0;
  }

  // noWreck: los rivales acumulan daño visible pero no quedan fuera de carrera.
  // Ángulo máximo de las ruedas a esa velocidad. Se deja un 10 % por debajo del límite de agarre:
  // justo en el límite, cualquier pérdida trasera acababa en trompo (decisión arcade, el original
  // es muy estable).
  maxSteerAt(speed) {
    const gripMu = Math.min(this.axles[0].staticFric, this.axles[1].staticFric) * this.handling;
    const gripSteer = 0.9 * this.wheelbase * gripMu * G / Math.max(speed * speed, 1);
    return Math.min(this.axles[0].steer * this.steerMul, gripSteer);
  }

  get wrecked() { return !this.noWreck && this.damage >= this.maxDamage; }

  // El daño se mide como energía del impacto (½·m·v² en julios); MaxDamage equivale a un choque
  // frontal a unos 110 km/h. Por debajo de MIN_IMPACT (roces) no hay daño.
  impactEnergy(speed, otherMass = Infinity) {
    if (speed < MIN_IMPACT) return 0;
    const m = otherMass === Infinity ? this.mass : (this.mass * otherMass) / (this.mass + otherMass);
    return 0.5 * m * speed * speed;
  }

  addDamage(energy) {
    this.damage = Math.min(this.maxDamage, this.damage + energy);
  }

  get forward() { return [Math.sin(this.yaw), Math.cos(this.yaw)]; }
  get speed() { const [fx, fz] = this.forward; return this.vx * fx + this.vz * fz; }

  // input: { throttle 0..1, brake 0..1, steer -1..1, handbrake bool }
  step(dt, input) {
    const [fx, fz] = this.forward;
    const rx = fz, rz = -fx;                       // derecha del coche
    const vLong = this.vx * fx + this.vz * fz;
    const vLat = this.vx * rx + this.vz * rz;
    const speed = Math.hypot(this.vx, this.vz);

    // --- Marcha: freno parado = marcha atrás; acelerador parado = primera.
    let throttle = input.throttle, brake = input.brake;
    if (this.gear === 0) [throttle, brake] = [input.brake, input.throttle];
    if (Math.abs(vLong) < 0.5) {
      if (input.brake > 0.1 && input.throttle < 0.1) this.gear = 0;
      else if (input.throttle > 0.1) this.gear = 2;
    }

    // --- Motor y cambio automático.
    const ratio = this.ratios[this.gear] ?? 0;
    const wheelRPM = Math.abs(vLong) / this.wheelRadius * 60 / (2 * Math.PI);
    this.rpm = Math.max(IDLE_RPM, wheelRPM * Math.abs(ratio));
    this.shiftTimer = Math.max(0, this.shiftTimer - dt);
    if (this.gear >= 2 && this.shiftTimer === 0) {
      const next = this.ratios[this.gear + 1];
      if (this.gear + 1 < this.numGears && next > 0.01 && this.rpm > (this.upRPM[this.gear] ?? this.maxRPM * 0.85)) {
        this.gear++; this.shiftTimer = SHIFT_TIME;
      } else if (this.gear > 2 && this.rpm < (this.downRPM[this.gear] ?? 2000)) {
        this.gear--; this.shiftTimer = SHIFT_TIME;
      }
    }
    const driveForce = this.shiftTimer > 0 || this.rpm >= this.maxRPM || this.wrecked
      ? 0
      : this.torqueAt(this.rpm) * ratio / this.wheelRadius * throttle;

    // --- Dirección: el ángulo se limita al que el agarre puede sostener
    //     (radio mínimo v²/(μ·g)) más un margen, para que no haga trompos solo.
    //     Se usa el eje con menos agarre: si el trasero agarra menos (furgonetas, pickups),
    //     limitar por el delantero dejaba girar más de lo que la trasera aguanta.
    const maxSteer = this.maxSteerAt(speed);
    //     Si el coche va de lado (deriva > 0,1 rad), el límite se desplaza hacia donde va su
    //     velocidad: así se puede contravolantear (antes el límite centrado en el morro lo
    //     impedía y el coche acababa en trompo). En conducción normal no cambia nada.
    const beta = Math.atan2(vLat, Math.max(Math.abs(vLong), 2));
    const shift = Math.abs(beta) > 0.1 ? beta - Math.sign(beta) * 0.1 : 0;
    const full = this.axles[0].steer * this.steerMul;
    const target = clamp(input.steer * maxSteer + shift, -full, full);
    this.steer += clamp(target - this.steer, -3 * dt, 3 * dt);

    // --- Cargas en cada rueda con transferencia de peso.
    const L = this.wheelbase;
    const front = this.mass * G * (L / 2 + this.cgForward) / L;
    const back = this.mass * G - front;
    const dLong = this.mass * this.aLong * this.cgHeight / L;
    const dLat = this.mass * this.aLat * this.cgHeight / this.track;
    const loads = [
      (front - dLong) / 2 - dLat / 2, (front - dLong) / 2 + dLat / 2,
      (back + dLong) / 2 - dLat / 2, (back + dLong) / 2 + dLat / 2,
    ].map((n) => Math.max(0, n));

    // Ruedas: [delantera izq, delantera dcha, trasera izq, trasera dcha]
    const driven = this.drivetrain === 2 ? [1, 1, 1, 1] : this.drivetrain === 1 ? [1, 1, 0, 0] : [0, 0, 1, 1];
    const drivenCount = driven.reduce((a, b) => a + b, 0);

    let Fx = 0, Fz = 0, torque = 0;
    for (let i = 0; i < 4; i++) {
      const axle = this.axles[i < 2 ? 0 : 1];
      const px = (i % 2 === 0 ? -1 : 1) * this.track / 2;   // lateral
      const pz = (i < 2 ? 1 : -1) * L / 2 - this.cgForward;  // longitudinal, desde el CG
      const steer = i < 2 ? this.steer : 0;

      // Velocidad del punto de contacto en ejes del coche.
      const cLong = vLong - this.w * px;
      const cLat = vLat + this.w * pz;
      const cs = Math.cos(steer), sn = Math.sin(steer);
      const wLong = cLong * cs + cLat * sn;
      const wLat = -cLong * sn + cLat * cs;

      let mu = axle.staticFric * this.handling;
      const handbrake = input.handbrake && i >= 2;
      if (handbrake) mu *= this.backDriftMul;

      // Fuerza lateral: lineal hasta el ángulo óptimo, luego cae a deslizamiento.
      const alpha = Math.atan2(wLat, Math.max(Math.abs(wLong), 2));
      const peak = Math.max(0.06, axle.optSlip * 1.2);
      const slideRatio = axle.slidingFric / axle.staticFric;
      const curve = Math.abs(alpha) < peak
        ? alpha / peak
        : Math.sign(alpha) * Math.max(slideRatio, 1 - (Math.abs(alpha) - peak) * 1.0);
      let fLat = -curve * mu * loads[i];
      // Estabilidad numérica: la fuerza no puede invertir el deslizamiento lateral en un solo paso
      // (a poca velocidad la rigidez del neumático es enorme y el paso explícito oscilaba).
      const maxLat = (this.mass / 4) * Math.abs(wLat) / dt;
      fLat = clamp(fLat, -maxLat, maxLat);

      // Fuerza longitudinal: tracción, freno y freno de mano.
      let fLong = driven[i] ? driveForce / drivenCount : 0;
      const dir = Math.sign(wLong) || 0;
      // BrakeRatio = fracción del agarre de su propia rueda que usa el freno.
      fLong -= dir * brake * axle.brake * mu * loads[i];
      if (handbrake) fLong -= dir * mu * loads[i] * 0.8;
      fLong -= clamp(wLong, -1, 1) * 0.015 * loads[i]; // rodadura

      // Control de tracción/ABS (decisión de diseño arcade): la fuerza
      // longitudinal solo usa el agarre que deja libre la lateral.
      const limit = mu * loads[i];
      if (!handbrake) {
        // Motor y freno solo usan el agarre libre (con un mínimo pequeño al frenar para poder parar):
        // si el freno se come el agarre lateral, la trasera se bloquea y el coche trompea.
        const room = Math.sqrt(Math.max(0, limit * limit - fLat * fLat));
        const braking = fLong * wLong < 0;
        const allowed = braking ? Math.max(room, 0.1 * limit) : room;
        fLong = clamp(fLong, -allowed, allowed);
      }

      // Círculo de fricción.
      const total = Math.hypot(fLat, fLong);
      this.slipping[i] = total > limit;
      if (total > limit) {
        const k = (limit * slideRatio) / total;
        fLat *= k; fLong *= k;
      }

      // De ejes de rueda a ejes del coche y luego al mundo.
      const bLong = fLong * cs - fLat * sn;
      const bLat = fLong * sn + fLat * cs;
      Fx += bLong * fx + bLat * rx;
      Fz += bLong * fz + bLat * rz;
      torque += px * bLong * -1 + pz * bLat;
    }

    // Resistencia aerodinámica.
    Fx -= this.drag * TUNING.dragScale * this.vx * speed;
    Fz -= this.drag * TUNING.dragScale * this.vz * speed;

    const ax = Fx / this.mass, az = Fz / this.mass;
    this.vx += ax * dt;
    this.vz += az * dt;
    this.w += (torque / this.inertia) * dt;
    if (speed < 0.3 && throttle < 0.05) { this.vx *= 0.9; this.vz *= 0.9; this.w *= 0.9; }
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.yaw += this.w * dt;

    // Aceleraciones para la transferencia de peso del paso siguiente (suavizadas).
    this.aLong += ((ax * fx + az * fz) - this.aLong) * 0.2;
    this.aLat += ((ax * rx + az * rz) - this.aLat) * 0.2;
  }

  torqueAt(rpm) {
    const span = rpm < this.optRPM ? this.optRPM - IDLE_RPM : this.maxRPM - this.optRPM;
    const t = (rpm - this.optRPM) / Math.max(span, 1);
    return this.maxTorque * clamp(1 - TUNING.torqueFalloff * t * t, 0.2, 1);
  }

  // Inclinación visual por transferencia de peso (rad).
  get bodyRoll() {
    const k = this.axles[0].spring * this.track * this.track;
    return clamp(this.mass * this.aLat * this.cgHeight / k, -0.12, 0.12);
  }
  get bodyPitch() {
    const k = this.axles[0].spring * this.wheelbase * this.wheelbase;
    return clamp(-this.mass * this.aLong * this.cgHeight / k, -0.08, 0.08);
  }

  // Medidas de la carrocería tomadas de la malla (ancho y largo en metros).
  setBodySize(width, length) {
    if (width > 0.5) this.size.width = width;
    if (length > 1) this.size.length = length;
  }

  // Círculos que cubren la carrocería, como desplazamientos a lo largo del eje del coche.
  get hullCircles() {
    const r = this.size.width / 2;
    const n = Math.max(2, Math.ceil(this.size.length / this.size.width) + 1);
    const span = this.size.length / 2 - r;
    return Array.from({ length: n }, (_, i) => ({ s: -span + (2 * span * i) / (n - 1) - this.cgForward, r }));
  }

  // Choque contra las paredes de la ciudad (World de world.js) a la altura y.
  // Devuelve los impactos { x, z (punto de contacto), speed, energy } para el daño.
  collideWorld(world, y) {
    const [fx, fz] = this.forward;
    const impacts = [];
    for (const { s, r } of this.hullCircles) {
      const cx = this.x + fx * s, cz = this.z + fz * s;
      for (const c of world.contacts(cx, cz, r, y)) {
        this.x += c.nx * c.depth;
        this.z += c.nz * c.depth;
        const speed = this.applyImpulse(fx * s, fz * s, c.nx, c.nz, Infinity, this.elasticity);
        const energy = this.impactEnergy(speed);
        if (energy > 0) impacts.push({ x: cx - c.nx * r, z: cz - c.nz * r, speed, energy });
      }
    }
    return impacts;
  }

  // Impulso en un punto (rx, rz relativo al CG) contra un cuerpo de masa otherMass.
  // Devuelve la velocidad de choque (m/s) para efectos y daños.
  applyImpulse(rx, rz, nx, nz, otherMass, e) {
    // Giro positivo = hacia +x: el punto se mueve con w·(rz, −rx) y el par es rz·Fx − rx·Fz.
    const vpx = this.vx + this.w * rz, vpz = this.vz - this.w * rx;
    const vn = vpx * nx + vpz * nz;
    if (vn >= 0) return 0;
    const rn = rz * nx - rx * nz;
    const invMass = 1 / this.mass + (otherMass === Infinity ? 0 : 1 / otherMass);
    const j = -(1 + e) * vn / (invMass + (rn * rn) / this.inertia);
    this.vx += (j * nx) / this.mass;
    this.vz += (j * nz) / this.mass;
    this.w += (j * rn) / this.inertia;
    return -vn;
  }
}
