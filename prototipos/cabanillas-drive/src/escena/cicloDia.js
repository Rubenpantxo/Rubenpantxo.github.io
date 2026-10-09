// Ciclo de día y noche (config/dia.js).
// - El sol sigue el camino del día de la ortofoto (declinación y hora sacadas de sol.json); de
//   noche la luz direccional pasa a ser la luna, en el lado opuesto.
// - Lo que no se ilumina (ortofoto del terreno, tejados, impostores, hierba) se multiplica por
//   un factor de luz con tono dorado al atardecer; el terreno además recibe luz difusa de noche
//   (luna y faros), ver suelo.js.
// - Cielo: el fotográfico de día; al acercarse el sol al horizonte se funde con el calculado
//   (Sky), que da los colores del ocaso y la noche, con estrellas encima.
import * as THREE from 'three';
import { DIA } from '../config/dia.js';
import { LUZ_SUELO } from './suelo.js';
import { LUCES_FACHADA } from './fachadas.glsl.js';

const GRADO = Math.PI / 180;
const suave = THREE.MathUtils.smoothstep;
const mezcla = THREE.MathUtils.lerp;

// Ejes en coordenadas del juego (x = este, y = arriba, z = sur)
function ejes(latitud) {
  const f = latitud * GRADO;
  return {
    polo: new THREE.Vector3(0, Math.sin(f), -Math.cos(f)),      // eje de la Tierra, hacia el norte
    mediodia: new THREE.Vector3(0, Math.cos(f), Math.sin(f)),   // sol a mediodía (sur, arriba)
    oeste: new THREE.Vector3(-1, 0, 0),
  };
}

// Hora local ↔ ángulo horario (sin la ecuación del tiempo: minutos de error)
const horaAAngulo = (hora) => ((hora - DIA.husoHoras + DIA.longitudGrados / 15) - 12) * 15 * GRADO;
const anguloAHora = (h) => (((h / GRADO / 15 + 12 + DIA.husoHoras - DIA.longitudGrados / 15) % 24) + 24) % 24;

// Fracción de ventanas encendidas según la hora (interpolada; DIA.ventanas)
function ventanasA(hora) {
  const t = DIA.ventanas.porHora;
  for (let i = 0; i < t.length; i++) {
    const [h0, f0] = t[i];
    const [h1, f1] = t[(i + 1) % t.length];
    const largo = ((h1 - h0) + 24) % 24 || 24;
    const d = ((hora - h0) + 24) % 24;
    if (d <= largo) return mezcla(f0, f1, d / largo);
  }
  return t[0][1];
}

export function textoHora(hora) {
  const m = Math.round(hora * 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function creaEstrellas(cantidad) {
  // Reparto fijo (semilla) por la media esfera de arriba
  let s = 12345;
  const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pos = new Float32Array(cantidad * 3);
  for (let i = 0; i < cantidad; i++) {
    const y = azar() * 0.95 + 0.05;
    const a = azar() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false,
  });
  const puntos = new THREE.Points(geo, material);
  puntos.name = 'estrellas';
  puntos.frustumCulled = false;
  puntos.renderOrder = -1;
  return puntos;
}

// El Sky de three pinta opaco: se le añade opacidad para fundirlo con el cielo de la foto
function cieloConOpacidad(cielo) {
  const m = cielo.material;
  m.uniforms.opacidad = { value: 1 };
  m.fragmentShader = m.fragmentShader
    .replace('void main() {', 'uniform float opacidad;\nvoid main() {')
    .replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor, opacidad );');
  m.transparent = true;
  m.needsUpdate = true;
  cielo.renderOrder = -2;
  return m.uniforms.opacidad;
}

export function creaCicloDia({ escena, camara, luzSol, direccionRender, intensidadSol }) {
  const { polo, mediodia, oeste } = ejes(DIA.latitudGrados);
  // Sol de la foto → declinación y hora
  const solFoto = direccionRender.clone().normalize();
  const declinacion = Math.asin(THREE.MathUtils.clamp(solFoto.dot(polo), -1, 1));
  const horaFoto = anguloAHora(Math.atan2(solFoto.dot(oeste), solFoto.dot(mediodia)));

  const hemisferio = escena.children.find((o) => o.isHemisphereLight);
  const hemiDia = hemisferio
    ? { cielo: hemisferio.color.clone(), suelo: hemisferio.groundColor.clone(), intensidad: hemisferio.intensity }
    : null;
  const hemiNoche = {
    cielo: new THREE.Color(DIA.hemisferioNoche.cielo), suelo: new THREE.Color(DIA.hemisferioNoche.suelo),
  };
  const colorSol = luzSol.color.clone();
  const colorDorado = new THREE.Color(1.0, 0.62, 0.36);
  const colorLuna = new THREE.Color(DIA.luna.color);
  const tonoDorado = new THREE.Color(...DIA.tonoDorado);
  const entornoDia = escena.environmentIntensity;
  const nieblaDia = escena.fog ? escena.fog.color.clone() : null;
  const giroBase = escena.userData.giroCieloBase;   // cielo de la foto: ángulo de su sol

  const sky = escena.getObjectByName('cielo');
  const opacidadSky = sky ? cieloConOpacidad(sky) : null;
  const estrellas = creaEstrellas(DIA.estrellas);
  escena.add(estrellas);

  // Materiales sin luz: se guarda su color de día la primera vez que se ven
  const sinLuz = new Set();
  function recogeMateriales() {
    escena.traverse((o) => {
      if (!o.material || o === sky || o === estrellas) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (sinLuz.has(m) || m.userData.esSuelo) continue;
        if (m.isMeshBasicMaterial || m.isSpriteMaterial) {
          m.userData.colorDia = m.color.clone();
          m.userData.luzMinima = m.isSpriteMaterial ? 0.55 : 0;   // los carteles se siguen leyendo
          sinLuz.add(m);
        }
      }
    });
  }

  let modo = DIA.modoInicial;
  let hora = horaFoto;
  let recogerEn = 0;
  const dir = new THREE.Vector3();
  const luzFoto = new THREE.Color();
  const tmp = new THREE.Color();
  const estado = { hora, elevacion: 0, oscuridad: 0 };

  function solEn(h) {
    const a = horaAAngulo(h);
    return dir.copy(mediodia).multiplyScalar(Math.cos(a))
      .addScaledVector(oeste, Math.sin(a)).multiplyScalar(Math.cos(declinacion))
      .addScaledVector(polo, Math.sin(declinacion)).normalize();
  }

  function aplica() {
    const sol = solEn(hora);
    const s = sol.y;                                          // seno de la elevación
    const dia = suave(s, -0.06, 0.25);
    const dorado = (1 - suave(s, 0.06, 0.35)) * suave(s, -0.1, 0.02);
    const luna = DIA.luna.intensidad * (1 - suave(s, -0.15, -0.02));

    // Luz direccional: sol o luna (cambia cuando ambas son casi cero)
    if (s > -0.015) {
      direccionRender.copy(sol);
      luzSol.intensity = intensidadSol * suave(s, -0.01, 0.12);
      luzSol.color.copy(colorSol).lerp(colorDorado, dorado);
    } else {
      direccionRender.set(-sol.x, Math.max(-sol.y, 0.25), -sol.z).normalize();
      luzSol.intensity = luna;
      luzSol.color.copy(colorLuna);
    }

    if (hemisferio) {
      hemisferio.intensity = mezcla(DIA.hemisferioNoche.intensidad, hemiDia.intensidad, dia);
      hemisferio.color.copy(hemiNoche.cielo).lerp(hemiDia.cielo, dia);
      hemisferio.groundColor.copy(hemiNoche.suelo).lerp(hemiDia.suelo, dia);
    }
    escena.environmentIntensity = mezcla(0.05, entornoDia, dia);

    // Fotos (terreno, tejados, impostores): de noche oscuras y azuladas, doradas al ocaso
    luzFoto.setRGB(...DIA.fotoNoche).lerp(tmp.setRGB(1, 1, 1), dia);
    luzFoto.multiply(tmp.setRGB(1, 1, 1).lerp(tonoDorado, dorado));
    LUZ_SUELO.emisivo.value.copy(luzFoto);
    LUZ_SUELO.factor.value = (luzFoto.r + luzFoto.g + luzFoto.b) / 3;
    LUZ_SUELO.difuso.value = 1 - dia;
    for (const m of sinLuz) {
      const f = Math.max(m.userData.luzMinima, 0);
      m.color.copy(m.userData.colorDia).multiply(tmp.setRGB(
        Math.max(luzFoto.r, f), Math.max(luzFoto.g, f), Math.max(luzFoto.b, f)));
    }

    // Cielo: foto de día, calculado al ocaso y de noche, estrellas de noche
    const foto = suave(s, 0.12, 0.4);
    if (escena.userData.cieloFoto) {
      escena.backgroundIntensity = foto;
      escena.backgroundRotation.y = giroBase - Math.atan2(sol.z, sol.x);
      escena.environmentRotation.y = escena.backgroundRotation.y;
    }
    if (sky) {
      sky.material.uniforms.sunPosition.value.copy(sol);
      opacidadSky.value = escena.userData.cieloFoto ? 1 - foto : 1;
      sky.visible = opacidadSky.value > 0.01;
    }
    estrellas.material.opacity = 1 - suave(s, -0.2, -0.04);
    estrellas.visible = estrellas.material.opacity > 0.01;
    if (escena.fog && nieblaDia) {
      escena.fog.color.setRGB(...DIA.nieblaNoche).lerp(nieblaDia, dia)
        .lerp(tmp.setRGB(...DIA.nieblaDorada), dorado * 0.7);
    }

    LUCES_FACHADA.encendidas.value = ventanasA(hora);
    LUCES_FACHADA.intensidad.value = DIA.ventanas.intensidad * (1 - suave(s, -0.05, 0.06));

    estado.hora = hora;
    estado.elevacion = Math.asin(s) / GRADO;
    estado.oscuridad = 1 - suave(s, -0.02, 0.1);
  }

  function horaDelModo() {
    const fija = DIA.modos[modo]?.hora;
    if (fija !== undefined) return fija;
    return horaFoto;
  }

  // Elección guardada en el navegador (si se puede) o ?hora=
  try {
    const p = new URLSearchParams(location.search).get('hora') ?? localStorage.getItem('cabanillas.hora');
    if (p && DIA.modos[p]) modo = p;
    hora = horaDelModo();
    if (p && !DIA.modos[p] && p.trim() !== '' && !Number.isNaN(Number(p))) hora = ((Number(p) % 24) + 24) % 24;
  } catch { /* sin almacenamiento */ }
  recogeMateriales();
  aplica();

  return {
    estado,
    estrellas,
    horaFoto,
    get modo() { return modo; },
    ponModo(nuevo) {
      if (!DIA.modos[nuevo]) return;
      modo = nuevo;
      hora = horaDelModo();
      try { localStorage.setItem('cabanillas.hora', nuevo); } catch { /* nada */ }
      aplica();
    },
    // Adelanta la hora (tecla T); la hora queda fija donde se deje
    adelanta(horas) {
      hora = (hora + horas + 24) % 24;
      aplica();
    },
    actualiza(dt) {
      // Materiales creados después (carga por partes): se recogen de vez en cuando
      recogerEn -= dt;
      if (recogerEn <= 0) { recogeMateriales(); recogerEn = 3; }
      estrellas.position.copy(camara.position);
      estrellas.scale.setScalar(camara.far * 0.9);
      aplica();
    },
  };
}
