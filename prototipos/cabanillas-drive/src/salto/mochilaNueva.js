// Mochila-paracaídas redibujada (pedido de Rubén: la del modelo era demasiado cuadrada). Se hace
// aquí, en código, encima del modelo de modelos/salto/mochila_paracaidas.glb: se esconden sus
// cajas (contenedor, respaldo y solapas) y las dos perneras del arnés, que quedaban colgando como
// dos aros bajo el personaje, y se ponen piezas redondeadas como las de un equipo de verdad:
//   - respaldo acolchado contra la espalda, con dos almohadillas
//   - contenedor de una pieza (principal y reserva), contorneado y abombado, con cinta de remate
//   - costura entre la reserva y el principal y una franja de color
//   - solapa del pasador y bolsillo del pilotillo abajo
//   - solapas laterales e inferior acolchadas, con vivo rojo (las mismas que se abren al tirar)
//   - cintas del arnés por encima de los hombros
// Todo en el sistema de la mochila: X a lo ancho, Y arriba, Z hacia atrás (la cara de delante,
// contra la espalda, en z = 0). Las solapas y la cúpula siguen siendo los nodos del modelo.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const COLORES = { cordura: 0x1f2329, respaldo: 0x30343a, acento: 0x8e1f26, vivo: 0x3b4048, cinta: 0x121417, franja: 0xc23a2e, solapa: 0x2b3038 };

// Relieve de tela de cordura (trama de rip-stop) hecho en un lienzo
let texturaTela = null;
function relieveTela() {
  if (texturaTela) return texturaTela;
  const lado = 128;
  const c = document.createElement('canvas');
  c.width = lado; c.height = lado;
  const g = c.getContext('2d');
  const img = g.createImageData(lado, lado);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      // Hilos finos cada 2 px y refuerzo del rip-stop cada 16
      const hx = Math.sin((x / lado) * Math.PI * 2 * 64) * 0.5 + (x % 16 === 0 ? 1.2 : 0);
      const hy = Math.sin((y / lado) * Math.PI * 2 * 64) * 0.5 + (y % 16 === 0 ? 1.2 : 0);
      const i = (y * lado + x) * 4;
      img.data[i] = 128 + hx * 30;
      img.data[i + 1] = 128 + hy * 30;
      img.data[i + 2] = 245;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  texturaTela = new THREE.CanvasTexture(c);
  texturaTela.wrapS = texturaTela.wrapT = THREE.RepeatWrapping;
  texturaTela.repeat.set(5, 5);
  texturaTela.colorSpace = THREE.NoColorSpace;
  return texturaTela;
}

function material(color, { rugosidad = 0.82, relieve = true } = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: rugosidad, metalness: 0,
    normalMap: relieve ? relieveTela() : null, normalScale: new THREE.Vector2(0.35, 0.35),
  });
}

// Caja redondeada deformada: más estrecha abajo («estrecha»: ancho abajo / ancho arriba) y
// abombada por detrás («bombeo»: metros en el centro de la cara de atrás)
function cojin(ancho, alto, fondo, radio, { estrecha = 1, bombeo = 0, fondoAbajo = 1 } = {}) {
  const g = new RoundedBoxGeometry(ancho, alto, fondo, 5, radio);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const t = (v.y / alto) + 0.5;                          // 0 abajo … 1 arriba
    v.x *= THREE.MathUtils.lerp(estrecha, 1, t);
    // Más fino abajo: la cara de delante (contra la espalda) no se mueve
    v.z = (v.z + fondo / 2) * THREE.MathUtils.lerp(fondoAbajo, 1, t) - fondo / 2;
    if (v.z > 0) {
      const u = 1 - (2 * v.x / ancho) ** 2;
      const w = 1 - (2 * v.y / alto) ** 2;
      v.z += bombeo * Math.max(0, u) * Math.max(0, w) * (2 * v.z / fondo);
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// Vivo (cordón del borde) siguiendo un rectángulo redondeado en el plano XY, a la altura z
function vivo(ancho, alto, radio, z, grosor, estrecha = 1) {
  const forma = new THREE.Shape();
  const a = ancho / 2 - radio; const b = alto / 2 - radio;
  forma.moveTo(-a, -alto / 2);
  forma.lineTo(a, -alto / 2);
  forma.quadraticCurveTo(ancho / 2, -alto / 2, ancho / 2, -b);
  forma.lineTo(ancho / 2, b);
  forma.quadraticCurveTo(ancho / 2, alto / 2, a, alto / 2);
  forma.lineTo(-a, alto / 2);
  forma.quadraticCurveTo(-ancho / 2, alto / 2, -ancho / 2, b);
  forma.lineTo(-ancho / 2, -b);
  forma.quadraticCurveTo(-ancho / 2, -alto / 2, -a, -alto / 2);
  const puntos = forma.getSpacedPoints(80).map((p) => {
    const t = (p.y / alto) + 0.5;
    return new THREE.Vector3(p.x * THREE.MathUtils.lerp(estrecha, 1, t), p.y, z);
  });
  const curva = new THREE.CatmullRomCurve3(puntos, true);
  return new THREE.TubeGeometry(curva, 160, grosor, 6, true);
}

function malla(geometria, mat, x, y, z, nombre) {
  const m = new THREE.Mesh(geometria, mat);
  m.position.set(x, y, z);
  m.name = nombre;
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

export function rehaceMochila(mochila) {
  const nodo = (n) => mochila.getObjectByName(n);
  // --- Fuera las cajas del modelo y las perneras
  const cuerpo = nodo('Mochila_Cuerpo');
  cuerpo?.children.forEach((h) => { if (h.isMesh && h.name !== 'Compartimento_Interno') h.visible = false; });
  // Del arnés del modelo solo quedan las anillas de los hombros: las perneras (los dos aros que
  // colgaban bajo el personaje), las bandas de delante y la anilla de apertura estaban pensadas
  // para otro cuerpo y flotaban delante del pecho. Las cintas de los hombros se dibujan abajo
  nodo('Arnes_Correas')?.traverse((h) => { if (h.isMesh && !/^Anilla_3/.test(h.name)) h.visible = false; });
  for (const s of ['Solapa_Izq', 'Solapa_Der', 'Solapa_Inf']) nodo(s)?.children.forEach((h) => { if (h.isMesh) h.visible = false; });

  const cordura = material(COLORES.cordura);
  const respaldoMat = material(COLORES.respaldo, { rugosidad: 0.9 });
  const acento = material(COLORES.acento, { rugosidad: 0.7 });
  const vivoMat = material(COLORES.vivo, { rugosidad: 0.6, relieve: false });
  const cinta = material(COLORES.cinta, { rugosidad: 0.75 });
  const solapaMat = material(COLORES.solapa);
  const nuevo = new THREE.Group();
  nuevo.name = 'mochila_redibujada';

  // Respaldo acolchado y sus dos almohadillas (contra la espalda)
  nuevo.add(malla(cojin(0.32, 0.52, 0.03, 0.014, { estrecha: 0.92 }), respaldoMat, 0, -0.02, 0.016, 'Respaldo'));
  for (const lado of [-1, 1]) {
    nuevo.add(malla(cojin(0.11, 0.3, 0.02, 0.009, { bombeo: 0.006 }), respaldoMat, lado * 0.075, 0.02, 0.004, 'Almohadilla'));
  }
  // Contenedor de una pieza (principal abajo y reserva arriba), contorneado: más ancho y
  // grueso arriba, abombado por detrás. La cara de atrás queda en z ≈ 0,16 (donde cierran las solapas)
  const ancho = 0.34; const alto = 0.52; const fondo = 0.13;
  nuevo.add(malla(cojin(ancho, alto, fondo, 0.06, { estrecha: 0.84, bombeo: 0.014, fondoAbajo: 0.92 }), cordura, 0, -0.015, 0.03 + fondo / 2, 'Contenedor'));
  nuevo.add(malla(vivo(ancho - 0.004, alto - 0.004, 0.06, 0.03 + fondo / 2, 0.007, 0.84), vivoMat, 0, -0.015, 0, 'Cinta_Remate'));
  // Costura entre la reserva y el principal y una franja de color en la reserva
  nuevo.add(malla(cojin(0.33, 0.012, 0.012, 0.005), cinta, 0, 0.115, 0.168, 'Costura_Reserva'));
  nuevo.add(malla(cojin(0.2, 0.022, 0.008, 0.004), material(COLORES.franja, { rugosidad: 0.6 }), 0, 0.185, 0.17, 'Franja_Reserva'));
  // Solapa del pasador de cierre (entre reserva y principal) y bolsillo del pilotillo abajo
  nuevo.add(malla(cojin(0.12, 0.045, 0.012, 0.006, { bombeo: 0.003 }), acento, 0, 0.085, 0.166, 'Solapa_Pasador'));
  nuevo.add(malla(cojin(0.13, 0.05, 0.06, 0.02, { bombeo: 0.006 }), cordura, 0.06, -0.275, 0.095, 'Bolsillo_Pilotillo'));
  nuevo.add(malla(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 16).rotateX(Math.PI / 2), acento, 0.06, -0.275, 0.13, 'Asa_Pilotillo'));
  // Cintas de los hombros: salen de lo alto de la mochila, pasan por encima del hombro y bajan un
  // poco por delante (cinta plana: un tubo aplastado)
  for (const lado of [-1, 1]) {
    const x = lado * 0.11;
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.22, 0.035), new THREE.Vector3(x * 1.05, 0.3, 0.0),
      new THREE.Vector3(x * 1.1, 0.31, -0.08), new THREE.Vector3(x * 1.1, 0.24, -0.15), new THREE.Vector3(x * 1.05, 0.13, -0.17),
    ]);
    const g = new THREE.TubeGeometry(curva, 24, 0.02, 8, false);
    g.scale(0.45, 1, 1);
    nuevo.add(malla(g, cinta, 0, 0, 0, 'Cinta_Hombro'));
  }
  mochila.add(nuevo);

  // Solapas acolchadas en sus nodos (mismo sitio que las piezas del modelo, que se abren igual)
  const solapa = (nombre, w, h, x, y) => {
    const n = nodo(nombre);
    if (!n) return;
    const m = malla(cojin(w, h, 0.012, 0.01, { bombeo: 0.003 }), solapaMat, x, y, 0.004, `${nombre}_Acolchada`);
    const v = malla(vivo(w - 0.004, h - 0.004, 0.01, 0.006, 0.004), acento, x, y, 0, `${nombre}_Vivo`);
    n.add(m, v);
  };
  solapa('Solapa_Izq', 0.165, 0.29, 0.08, 0);
  solapa('Solapa_Der', 0.165, 0.29, -0.08, 0);
  solapa('Solapa_Inf', 0.3, 0.14, 0, 0.07);
  return mochila;
}
