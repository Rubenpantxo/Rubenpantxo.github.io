// Parámetros de física de cada coche, calculados a partir de unas pocas cifras de diseño:
//  mass (kg), hp (potencia), top (m/s de velocidad punta), gears, drive (0 trasera, 1 delantera,
//  2 total), grip (agarre delantero), rearGrip, size [ancho, alto, largo], steer (rad de giro de
//  las ruedas), drift (agarre trasero con freno de mano, 0–1).
const RPM_MAX = 7000, RPM_OPT = 5200, RPM_SHIFT = 6600, WHEEL_R = 0.34;

export function makeSim(d) {
  const gears = d.gears ?? 5;
  // Desarrollo de la última marcha: llega a la punta justo antes del corte.
  const top = (RPM_SHIFT * 1.03 * 2 * Math.PI / 60) * WHEEL_R / d.top;
  const first = top * (d.spread ?? 3.6);
  const ratios = [];
  for (let g = 0; g < gears; g++) ratios.push(first * (top / first) ** (g / (gears - 1)));
  const power = d.hp * 745.7;
  // Resistencia: con toda la potencia, la velocidad de equilibrio queda un poco por encima de la punta.
  const drag = power / (0.8 * (d.top * 1.14) ** 3);
  const up = [0, 0, ...ratios.map(() => RPM_SHIFT)];
  const down = [0, 0, ...ratios.map(() => 3000)];
  return {
    Mass: d.mass,
    InertiaBox: d.size,
    BodyCG: [0, d.cgHeight ?? 0, 0],
    Engine: { MaxHorsePower: d.hp, OptRPM: RPM_OPT, MaxRPM: RPM_MAX },
    Trans: { GearRatios: [-first * 0.9, 0, ...ratios], NumGears: gears + 2, UpshiftRPM: up, DownshiftRPM: down },
    DrivetrainType: d.drive ?? 0,
    Drag: drag,
    CarFrictionHandling: 1,
    BoundElasticity: d.bounce ?? 0.3,
    SteerMultiplier: 1,
    BackDriftFricMultiplier: d.drift ?? 0.7,
    MaxDamage: 0.5 * d.mass * 30.5 * 30.5 * (d.tough ?? 1),
    FrontLeft: { SteeringRatio: d.steer ?? 0.55, BrakeRatio: 0.8, StaticFric: d.grip, SlidingFric: d.grip * 0.75, OptimumSlipPercent: 0.1, Spring: 40000 },
    BackLeft: { SteeringRatio: 0, BrakeRatio: 0.6, StaticFric: d.rearGrip ?? d.grip, SlidingFric: (d.rearGrip ?? d.grip) * 0.72, OptimumSlipPercent: 0.1, Spring: 40000 },
  };
}

// Coches jugables (mismas cifras de diseño que la selección de coche).
export const PLAYER_TUNES = {
  gt: { mass: 1150, hp: 330, top: 53, gears: 6, drive: 0, grip: 1.35, rearGrip: 1.3, size: [1.95, 1.2, 4.3], steer: 0.6, drift: 0.65 },
  v8: { mass: 1500, hp: 420, top: 56, gears: 5, drive: 0, grip: 1.2, rearGrip: 1.08, size: [2.05, 1.3, 4.9], steer: 0.55, drift: 0.55 },
  furgo: { mass: 2100, hp: 190, top: 39, gears: 5, drive: 1, grip: 1.15, rearGrip: 1.15, size: [2.0, 2.2, 4.7], steer: 0.5, drift: 0.75, tough: 1.4 },
  bus: { mass: 9000, hp: 560, top: 33, gears: 4, drive: 0, grip: 1.1, rearGrip: 1.15, size: [2.5, 3.0, 10], steer: 0.45, drift: 0.8, tough: 2.5, spread: 3 },
};

// Rivales, tráfico y policía.
export const NPC_TUNES = {
  rival: { mass: 1300, hp: 340, top: 50, gears: 5, drive: 0, grip: 1.3, rearGrip: 1.28, size: [1.95, 1.25, 4.4], steer: 0.6 },
  sedan: { mass: 1400, hp: 140, top: 42, gears: 4, drive: 1, grip: 1.15, size: [1.9, 1.4, 4.3], steer: 0.55 },
  van: { mass: 2000, hp: 150, top: 36, gears: 4, drive: 1, grip: 1.1, size: [2.0, 2.2, 4.8], steer: 0.5 },
  bus: { mass: 9000, hp: 480, top: 30, gears: 4, drive: 0, grip: 1.1, size: [2.5, 3.0, 10], steer: 0.45, spread: 3 },
  cop: { mass: 1550, hp: 380, top: 55, gears: 5, drive: 0, grip: 1.35, rearGrip: 1.32, size: [1.95, 1.4, 4.6], steer: 0.6, tough: 1.6 },
};
