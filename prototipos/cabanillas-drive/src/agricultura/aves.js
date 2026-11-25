// Gaviotas que siguen al arado (PLAN_AGRICULTURA.md §5.6, fase A4): cuando se labra, llegan unas
// cuantas, vuelan en círculos detrás del apero y se posan en la tierra recién removida a picotear;
// se espantan si el tractor pasa cerca y se van cuando deja de labrar. Tres mallas instanciadas
// (cuerpo y dos alas) para todas: tres llamadas de dibujo.
import * as THREE from 'three';

const MAX = 12;

function geometriaCuerpo() {
  // Huso alargado (cuerpo y cabeza) con la cola; blanco con el pico amarillo
  const g = new THREE.OctahedronGeometry(1, 1);
  g.scale(0.085, 0.075, 0.24);
  const pico = new THREE.ConeGeometry(0.018, 0.07, 5).rotateX(Math.PI / 2).translate(0, 0.01, 0.27);
  const colores = (geo, c) => {
    const n = geo.attributes.position.count;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return geo;
  };
  colores(g, new THREE.Color(0.95, 0.95, 0.93));
  colores(pico, new THREE.Color(0.9, 0.7, 0.1));
  const unida = new THREE.BufferGeometry();
  const piezas = [g, pico].map((x) => (x.index ? x.toNonIndexed() : x));
  const total = piezas.reduce((s, p) => s + p.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let k = 0;
  for (const p of piezas) {
    pos.set(p.attributes.position.array, k * 3);
    col.set(p.attributes.color.array, k * 3);
    k += p.attributes.position.count;
  }
  unida.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  unida.setAttribute('color', new THREE.BufferAttribute(col, 3));
  unida.computeVertexNormals();
  return unida;
}

// Ala izquierda (+X): raíz en el cuerpo, gris claro y punta negra. lado = −1 para la derecha
function geometriaAla(lado) {
  const v = [];
  const c = [];
  const gris = [0.72, 0.74, 0.77];
  const negro = [0.08, 0.08, 0.09];
  const tramos = [[0, 0.09, -0.07, gris], [0.32, 0.07, -0.08, gris], [0.5, 0.02, -0.06, negro], [0.62, -0.03, -0.04, negro]];
  for (let i = 0; i < tramos.length - 1; i++) {
    const [x0, a0, b0, c0] = tramos[i];
    const [x1, a1, b1, c1] = tramos[i + 1];
    const q = [[x0, a0], [x1, a1], [x1, b1], [x0, b0]].map(([x, z]) => [x * lado, 0, z]);
    for (const idx of [0, 1, 2, 0, 2, 3]) {
      v.push(...q[idx]);
      c.push(...(idx === 0 || idx === 3 ? c0 : c1));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

export function creaAves(escena, { terreno }) {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const cuerpos = new THREE.InstancedMesh(geometriaCuerpo(), material, MAX);
  const alaI = new THREE.InstancedMesh(geometriaAla(1), material, MAX);
  const alaD = new THREE.InstancedMesh(geometriaAla(-1), material, MAX);
  const raiz = new THREE.Group();
  raiz.name = 'gaviotas';
  for (const m of [cuerpos, alaI, alaD]) { m.count = 0; m.frustumCulled = false; m.castShadow = true; raiz.add(m); }
  escena.add(raiz);

  const aves = Array.from({ length: MAX }, (_, k) => ({
    activa: false, estado: 'fuera', pos: new THREE.Vector3(), vel: new THREE.Vector3(), objetivo: new THREE.Vector3(),
    fase: k * 1.7, giro: 0, rumbo: 0, alabeo: 0, tiempo: 0, aleteo: 0, radio: 6 + (k % 4) * 2.5, sentido: k % 2 ? 1 : -1,
  }));
  let deseadas = 0;
  let sinLabrar = 999;
  const foco = new THREE.Vector3();        // detrás del apero
  const tractor = new THREE.Vector3();
  const avance = new THREE.Vector2(0, 1);
  const m4 = new THREE.Matrix4();
  const ala = new THREE.Matrix4();
  const giroAla = new THREE.Matrix4();
  const escalaAla = new THREE.Matrix4();
  const mundoAla = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler(0, 0, 0, 'YXZ');
  const uno = new THREE.Vector3(1, 1, 1);
  const tmp = new THREE.Vector3();
  let reloj = 0;

  function entra(a) {
    a.activa = true;
    a.estado = 'vuela';
    const ang = Math.random() * Math.PI * 2;
    a.pos.set(foco.x + Math.cos(ang) * 70, foco.y + 18 + Math.random() * 10, foco.z + Math.sin(ang) * 70);
    a.vel.set(0, 0, 0);
    a.tiempo = 0;
  }

  return {
    raiz,
    // Cada fotograma en que se labra: dónde trabaja el apero, hacia dónde va y cuántas aves atrae
    atrae({ x, y, z, fx, fz, tx, tz, cuantas }) {
      foco.set(x, y, z);
      avance.set(fx, fz);
      tractor.set(tx, y, tz);
      deseadas = Math.min(MAX, cuantas);
      sinLabrar = 0;
    },
    actualiza(dt) {
      reloj += dt;
      sinLabrar += dt;
      const se_van = sinLabrar > 15;
      // Llegan de una en una mientras se labra
      const activas = aves.filter((a) => a.activa).length;
      if (!se_van && activas < deseadas && Math.random() < dt * 0.6) {
        const libre = aves.find((a) => !a.activa);
        if (libre) entra(libre);
      }
      let n = 0;
      for (const a of aves) {
        if (!a.activa) continue;
        a.tiempo += dt;
        const suelo = terreno.alturaEn(a.pos.x, a.pos.z);
        const cerca = Math.hypot(a.pos.x - tractor.x, a.pos.z - tractor.z) < 7;
        if (se_van) a.estado = 'marcha';
        if (a.estado === 'posada') {
          a.vel.set(0, 0, 0);
          a.pos.y = suelo;
          if (cerca || a.tiempo > 3 + (a.fase % 3)) { a.estado = 'vuela'; a.tiempo = 0; a.vel.set(0, 3.5, 0); }
        } else {
          // Objetivo: en vuelo, un círculo detrás del apero; para posarse, un punto de la tierra labrada
          if (a.estado === 'vuela') {
            const t = reloj * 0.45 * a.sentido + a.fase;
            const atras = 9 + Math.sin(a.fase) * 4;
            a.objetivo.set(foco.x - avance.x * atras + Math.cos(t) * a.radio, 0, foco.z - avance.y * atras + Math.sin(t) * a.radio);
            a.objetivo.y = terreno.alturaEn(a.objetivo.x, a.objetivo.z) + 3.5 + 2.5 * Math.sin(t * 0.7 + a.fase);
            if (a.tiempo > 4 && Math.random() < dt * 0.25) {
              a.estado = 'baja';
              a.tiempo = 0;
              const atrasP = 6 + Math.random() * 14;
              const lado = (Math.random() - 0.5) * 3;
              a.objetivo.set(foco.x - avance.x * atrasP - avance.y * lado, 0, foco.z - avance.y * atrasP + avance.x * lado);
              a.objetivo.y = terreno.alturaEn(a.objetivo.x, a.objetivo.z);
            }
          } else if (a.estado === 'marcha') {
            tmp.subVectors(a.pos, foco).setY(0).normalize();
            a.objetivo.set(a.pos.x + tmp.x * 40, suelo + 30, a.pos.z + tmp.z * 40);
          }
          tmp.subVectors(a.objetivo, a.pos);
          const d = tmp.length();
          const maxV = a.estado === 'baja' ? Math.max(1.2, Math.min(7, d * 0.9)) : 8.5;
          tmp.setLength(Math.min(maxV, d * 1.5));
          a.vel.lerp(tmp, Math.min(1, dt * 1.6));
          a.pos.addScaledVector(a.vel, dt);
          if (a.pos.y < suelo + 0.02) a.pos.y = suelo + 0.02;
          if (a.estado === 'baja' && (d < 0.35 || a.pos.y <= suelo + 0.03)) { a.estado = 'posada'; a.tiempo = 0; }
          if (a.estado === 'baja' && cerca) { a.estado = 'vuela'; a.tiempo = 0; }
          if (a.estado === 'marcha' && Math.hypot(a.pos.x - foco.x, a.pos.z - foco.z) > 90) { a.activa = false; continue; }
          const rumbo = Math.atan2(a.vel.x, a.vel.z);
          let dr = rumbo - a.rumbo;
          dr = Math.atan2(Math.sin(dr), Math.cos(dr));
          a.rumbo += dr * Math.min(1, dt * 5);
          a.alabeo += (THREE.MathUtils.clamp(-dr * 2.5, -0.7, 0.7) - a.alabeo) * Math.min(1, dt * 3);
        }
        // Dibujo: cuerpo y alas (aleteo al subir o frenar; planea el resto)
        const enSuelo = a.estado === 'posada';
        const picoteo = enSuelo ? Math.max(0, Math.sin(reloj * 7 + a.fase)) ** 6 * 0.6 : 0;
        e.set(enSuelo ? picoteo : -THREE.MathUtils.clamp(a.vel.y * 0.08, -0.4, 0.4), a.rumbo, enSuelo ? 0 : a.alabeo);
        q.setFromEuler(e);
        m4.compose(tmp.copy(a.pos).setY(a.pos.y + (enSuelo ? 0.09 : 0)), q, uno);
        cuerpos.setMatrixAt(n, m4);
        const sube = a.vel.y > 0.3 || a.estado === 'baja' || a.estado === 'marcha';
        a.aleteo += dt * (sube ? 11 : 6);
        const angAla = sube || Math.sin(reloj * 0.6 + a.fase) > 0.3 ? Math.sin(a.aleteo) * 0.75 : 0.08;
        for (const [malla, lado] of [[alaI, 1], [alaD, -1]]) {
          // Posada, el ala plegada hacia atrás a lo largo del cuerpo; volando, abierta y aleteando
          if (enSuelo) giroAla.makeRotationY(lado * 1.35).multiply(escalaAla.makeScale(0.5, 1, 1));
          else giroAla.makeRotationZ(lado * angAla);
          ala.makeTranslation(lado * 0.05, 0.03, 0.02).multiply(giroAla);
          malla.setMatrixAt(n, mundoAla.multiplyMatrices(m4, ala));
        }
        n++;
      }
      for (const m of [cuerpos, alaI, alaD]) { m.count = n; m.instanceMatrix.needsUpdate = true; m.visible = n > 0; }
    },
    get cuantas() { return aves.filter((a) => a.activa).length; },
    get posadas() { return aves.filter((a) => a.activa && a.estado === 'posada').length; },
    libera() { raiz.removeFromParent(); cuerpos.geometry.dispose(); alaI.geometry.dispose(); alaD.geometry.dispose(); material.dispose(); },
  };
}
