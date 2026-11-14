// Un vehículo completo: física (physics.js) + modelo (models.js), con saltos en las rampas.
// Interfaz común para el jugador, los rivales, el tráfico y la policía.
import { Car } from './physics.js';
import { makeSim } from './tuning.js';

const GRAVITY = 22;

export class Vehicle {
  // tune: cifras de diseño (tuning.js); parts: { group, wheels, frontWheels, rearMat, siren? }.
  constructor(tune, parts, name = '') {
    this.car = new Car(makeSim(tune), name);
    this.parts = parts;
    this.group = parts.group;
    this.y = 0;
    this.vy = 0;
    this.lastVy = 0;
    this.air = false;
    this.wheelSpin = 0;
    this.steerVis = 0;
    this.braking = false;
    this.onHit = null;        // (energía, velocidad del golpe) → efectos y sonido
    // Medidas reales del modelo: batalla y ruedas.
    const fw = parts.frontWheels[0];
    if (fw) this.car.setWheelGeometry({ wheelbase: Math.abs(fw.position.z) * 2, track: Math.abs(fw.position.x) * 2, radius: fw.position.y });
    this.car.setBodySize(tune.size[0], tune.size[2]);
  }

  place(x, z, yaw, heightAt, y = 0) {
    this.car.reset(x, z, yaw);
    this.y = heightAt ? heightAt(x, z, y) ?? 0 : y;
    this.vy = 0; this.lastVy = 0; this.air = false;
    this.sync(0);
  }

  // Un paso de física con colisiones de la ciudad; devuelve los impactos.
  step(dt, input, world, bangers, heightAt) {
    const car = this.car;
    this.braking = input.brake > 0 && car.speed > 0.5;
    if (this.air) {
      // En el aire: sin agarre ni motor; sigue su trayectoria.
      car.x += car.vx * dt;
      car.z += car.vz * dt;
      car.yaw += car.w * dt;
    } else car.step(dt, input);
    const impacts = world ? car.collideWorld(world, this.y) : [];
    for (const hit of impacts) this.hurt(hit);
    // Vertical: rampas y saltos.
    const gy = heightAt ? heightAt(car.x, car.z, this.y) ?? 0 : 0;
    if (!this.air) {
      if (gy <= this.y - 0.3) { this.air = true; this.vy = Math.max(0, this.lastVy); }
      else { this.lastVy = (gy - this.y) / Math.max(dt, 1e-4); this.y = gy; }
    }
    if (this.air) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= gy) {
        this.air = false;
        if (this.vy < -10) this.hurt({ x: car.x, z: car.z, speed: -this.vy, energy: 0.5 * car.mass * (this.vy + 10) ** 2 * 4 });
        this.y = gy; this.vy = 0; this.lastVy = 0;
      }
    }
    return impacts;
  }

  hurt(hit) {
    this.car.addDamage(hit.energy);
    this.onHit?.(hit.energy, hit.speed ?? 0);
  }

  get damagePct() { return Math.min(100, (this.car.damage / this.car.maxDamage) * 100); }

  sync(dt) {
    const car = this.car;
    this.group.position.set(car.x, this.y, car.z);
    this.group.rotation.set(-car.bodyPitch * 0.5, car.yaw, 0, 'YXZ');
    this.wheelSpin += (car.speed / car.wheelRadius) * dt;
    for (const w of this.parts.wheels) w.rotation.x = this.wheelSpin;
    this.steerVis += (car.steer - this.steerVis) * 0.3;
    for (const fw of this.parts.frontWheels) fw.rotation.y = this.steerVis;
    this.parts.rearMat?.emissive.setHex(this.braking ? 0xdd1111 : 0x300404);
  }

  dispose() { this.group.parent?.remove(this.group); }
}
