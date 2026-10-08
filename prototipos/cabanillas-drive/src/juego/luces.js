// Luces de los coches al anochecer: dos focos de verdad en el coche del jugador (sin sombras)
// y, para todos (jugador y tráfico), puntos brillantes de faros blancos y pilotos rojos.
// Las luces existen siempre (con intensidad 0 de día): así no se recompilan los materiales.
import * as THREE from 'three';
import { DIA } from '../config/dia.js';

function texturaBrillo() {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 64;
  const ctx = lienzo.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(lienzo);
}

export function creaLuces({ escena, cocheJugador, infoJugador, agentes }) {
  const { largo, ancho } = infoJugador;
  // El origen del coche del jugador es el centro de su caja de chasis
  const altoFaro = -0.15;
  const focos = [-1, 1].map((lado) => {
    const foco = new THREE.SpotLight(0xfff4e0, 0, DIA.faros.alcanceM, DIA.faros.anguloGrados * Math.PI / 180,
      DIA.faros.penumbra, 1.6);
    foco.position.set(lado * ancho * 0.33, altoFaro, largo / 2 - 0.2);
    foco.target.position.set(lado * ancho * 0.33, -1.6, largo / 2 + 20);
    foco.castShadow = false;
    cocheJugador.add(foco, foco.target);
    return foco;
  });

  // Puntos: 4 por coche (2 faros + 2 pilotos)
  const coches = 1 + agentes.length;
  const posiciones = new Float32Array(coches * 4 * 3);
  const colores = new Float32Array(coches * 4 * 3);
  for (let i = 0; i < coches * 4; i++) colores.set(i % 4 < 2 ? [1, 0.95, 0.85] : [1, 0.08, 0.04], i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  const material = new THREE.PointsMaterial({
    size: 0.55, map: texturaBrillo(), vertexColors: true, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
  });
  const puntos = new THREE.Points(geo, material);
  puntos.name = 'luces_coches';
  puntos.frustumCulled = false;
  puntos.visible = false;
  escena.add(puntos);

  const v = new THREE.Vector3();
  function ponCoche(indice, objeto, la, an, alto, visible) {
    const base = indice * 12;
    if (!visible) {
      posiciones.fill(-1e5, base, base + 12);
      return;
    }
    const lx = an * 0.36;
    const puntosLocales = [[-lx, alto, la / 2 + 0.02], [lx, alto, la / 2 + 0.02], [-lx, alto + 0.05, -la / 2 - 0.02], [lx, alto + 0.05, -la / 2 - 0.02]];
    puntosLocales.forEach(([x, y, z], k) => {
      v.set(x, y, z).applyMatrix4(objeto.matrixWorld);
      posiciones.set([v.x, v.y, v.z], base + k * 3);
    });
  }

  return {
    actualiza(oscuridad) {
      for (const f of focos) f.intensity = DIA.faros.intensidad * oscuridad;
      puntos.visible = oscuridad > 0.01;
      material.opacity = oscuridad;
      if (!puntos.visible) return;
      ponCoche(0, cocheJugador, largo, ancho, altoFaro, cocheJugador.visible);
      agentes.forEach((a, i) => ponCoche(i + 1, a.grupo, a.largo, Math.min(a.ancho, 2.0), 0.72, a.listo && a.grupo.visible));
      geo.attributes.position.needsUpdate = true;
    },
  };
}
