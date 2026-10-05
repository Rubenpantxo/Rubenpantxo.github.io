// Coche hecho con primitivas de Three.js (sin modelos externos).
// Ejes locales: X = derecha, Y = arriba, Z = adelante; origen = centro de la caja del chasis.
import * as THREE from 'three';

function caja(ancho, alto, largo, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, largo), material);
  m.position.set(x, y, z);
  return m;
}

export function creaModeloCoche(dimensiones, ruedas, color = 0xb3261e) {
  const { largo, ancho } = dimensiones;
  const grupo = new THREE.Group();
  grupo.name = 'coche';

  const pintura = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4 });
  const cristal = new THREE.MeshStandardMaterial({ color: 0x1b2632, roughness: 0.08, metalness: 0.6 });
  const negro = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 });
  const faro = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff1c0, emissiveIntensity: 0.6 });
  const piloto = new THREE.MeshStandardMaterial({ color: 0x8a0a0a, emissive: 0x6a0000, emissiveIntensity: 0.5 });

  // Carrocería baja, capó y maletero
  const yCarroceria = -0.28;
  grupo.add(caja(ancho, 0.62, largo, pintura, 0, yCarroceria, 0));
  // Habitáculo retrasado con lunas
  const largoCabina = largo * 0.5;
  const zCabina = -0.15;
  const cabina = caja(ancho * 0.86, 0.55, largoCabina, pintura, 0, yCarroceria + 0.58, zCabina);
  grupo.add(cabina);
  grupo.add(caja(ancho * 0.87, 0.42, largoCabina * 0.96, cristal, 0, yCarroceria + 0.6, zCabina));
  // Paragolpes
  grupo.add(caja(ancho * 1.01, 0.22, 0.18, negro, 0, yCarroceria - 0.22, largo / 2));
  grupo.add(caja(ancho * 1.01, 0.22, 0.18, negro, 0, yCarroceria - 0.22, -largo / 2));
  // Faros y pilotos
  for (const lado of [-1, 1]) {
    grupo.add(caja(0.38, 0.14, 0.04, faro, lado * ancho * 0.33, yCarroceria + 0.12, largo / 2 + 0.01));
    grupo.add(caja(0.34, 0.12, 0.04, piloto, lado * ancho * 0.35, yCarroceria + 0.12, -largo / 2 - 0.01));
  }

  // Ruedas: cada una en un pivote (dirección) con la llanta dentro (giro)
  const geoRueda = new THREE.CylinderGeometry(ruedas.radio, ruedas.radio, ruedas.anchoVisual, 20);
  geoRueda.rotateZ(Math.PI / 2);
  const goma = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 });
  const geoLlanta = new THREE.CylinderGeometry(ruedas.radio * 0.6, ruedas.radio * 0.6, ruedas.anchoVisual + 0.01, 10);
  geoLlanta.rotateZ(Math.PI / 2);
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.3, metalness: 0.8 });
  const pivotes = [];
  for (let i = 0; i < 4; i++) {
    const pivote = new THREE.Group();
    const giro = new THREE.Group();
    giro.add(new THREE.Mesh(geoRueda, goma), new THREE.Mesh(geoLlanta, metal));
    pivote.add(giro);
    grupo.add(pivote);
    pivotes.push({ pivote, giro });
  }
  return { grupo, ruedas: pivotes };
}
