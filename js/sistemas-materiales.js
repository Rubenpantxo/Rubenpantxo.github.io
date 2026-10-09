/**
 * LOS NUEVE MATERIALES DE LOS SISTEMAS DE DISEÑO
 *
 * Un objeto 3D por sistema: filamento, baldosa, cartel, bloque neobrutal,
 * vóxel, vidrio, arcilla, marco de oro y pieza mecanizada. Los usan la vitrina
 * de la portada (js/sistemas-portada.js) y la cabecera de cada ficha
 * (js/sistemas-ficha.js).
 *
 *   const hacer = fabricas(e);          // e = escena de servicios/kit/escena.js
 *   const objeto = hacer.neon();        // THREE.Group
 *   objeto.userData.vivo?.(t, activo);  // animación propia, si la tiene
 */
import { THREE, material, texturaTexto } from '../servicios/kit/escena.js';
import { RoundedBoxGeometry } from './vendor/three/addons/RoundedBoxGeometry.js';

export function fabricas(e) {
  const halo = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const resplandor = (color, tam) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(tam);
    return s;
  };

  return {
    // Filamento incandescente dentro de una bombilla
    halogeno() {
      const g = new THREE.Group();
      const perfil = [[0.16, -0.62], [0.18, -0.5], [0.2, -0.36], [0.34, -0.18], [0.5, 0.02], [0.56, 0.22], [0.52, 0.44], [0.38, 0.62], [0.18, 0.72], [0.001, 0.75]];
      // El perfil pasa por una spline para que el cristal no salga facetado
      const suave = new THREE.SplineCurve(perfil.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(64);
      const vidrio = new THREE.Mesh(new THREE.LatheGeometry(suave, 64),
        new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, transparent: true, opacity: 0.22, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
      const pts = [];
      for (let k = 0; k <= 16; k++) pts.push(new THREE.Vector3(-0.22 + k * 0.0275, 0.2 + (k % 2 ? 0.08 : -0.08), 0));
      const filamento = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.12, -0.3, 0), ...pts, new THREE.Vector3(0.12, -0.3, 0)]), 120, 0.012, 6),
        new THREE.MeshBasicMaterial({ color: '#e9ffb8' }));
      const rosca = new THREE.Group();
      const metal = material('metal', '#c9ccc4', { roughness: 0.3 });
      const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.32, 32), metal);
      cuerpo.position.y = -0.78;
      rosca.add(cuerpo);
      for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.018, 8, 32), metal); t.rotation.x = Math.PI / 2; t.position.y = -0.68 - k * 0.07; rosca.add(t); }
      const punta = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 8), material('default', '#1a1a1a'));
      punta.position.y = -0.95;
      const brillo = resplandor('#c6ff5c', 2.6); brillo.position.y = 0.2;
      g.add(vidrio, filamento, rosca, punta, brillo);
      g.userData.vivo = (t, act) => {
        const k = act ? 0.85 + Math.sin(t * 9) * 0.05 + Math.sin(t * 23) * 0.04 : 0.45;
        brillo.material.opacity = k;
      };
      return g;
    },
    // Baldosa de barro con un botón hundido
    terracota() {
      const g = new THREE.Group();
      const baldosa = new THREE.Mesh(new RoundedBoxGeometry(1.35, 1.35, 0.24, 5, 0.08), material('default', '#b34a1f', { roughness: 0.88 }));
      const boton = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.14, 48), material('ceramica', '#fdf6ec', { roughness: 0.5 }));
      boton.rotation.x = Math.PI / 2; boton.position.z = 0.15;
      const hueco = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.025, 10, 48), material('default', '#7d3112', { roughness: 0.9 }));
      hueco.position.z = 0.12;
      g.add(baldosa, boton, hueco);
      g.userData.vivo = (t, act) => { boton.position.z = 0.15 - (act ? Math.max(0, Math.sin(t * 2.2)) * 0.07 : 0); };
      return g;
    },
    // Cartel de papel con la esquina levantada
    editorial() {
      const c = document.createElement('canvas'); c.width = 512; c.height = 700;
      const x = c.getContext('2d');
      const pintar = () => {
        x.fillStyle = '#fafafa'; x.fillRect(0, 0, 512, 700);
        x.fillStyle = '#111114'; x.font = '400 300px Anton, Impact, sans-serif'; x.textBaseline = 'top';
        x.fillText('Aa', 18, 40);
        x.fillStyle = '#e7335a'; x.fillRect(0, 380, 512, 58);
        x.fillStyle = '#111114'; x.font = '700 34px Archivo, Arial, sans-serif';
        x.fillText('EDICIÓN Nº 03', 24, 470);
        for (let k = 0; k < 5; k++) x.fillRect(24, 530 + k * 26, 300 + (k % 2) * 120, 9);
      };
      pintar();
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      document.fonts?.ready.then(() => { pintar(); tex.needsUpdate = true; e.pedir(); });
      const geo = new THREE.PlaneGeometry(1.15, 1.58, 24, 32);
      const pos = geo.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const px = pos.getX(k), py = pos.getY(k);
        const curl = Math.max(0, px + py - 0.9);
        pos.setZ(k, Math.sin(px * 2.2) * 0.05 + curl * curl * 0.9);
      }
      geo.computeVertexNormals();
      const papel = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }));
      const g = new THREE.Group(); g.add(papel);
      return g;
    },
    // Bloque neobrutal con su sombra dura de tinta
    carmin() {
      const g = new THREE.Group();
      const frente = new THREE.Mesh(new RoundedBoxGeometry(1.25, 1.25, 0.28, 2, 0.02), material('default', '#a4262c', { roughness: 0.55 }));
      const sombra = new THREE.Mesh(new RoundedBoxGeometry(1.25, 1.25, 0.28, 2, 0.02), material('default', '#1d1412', { roughness: 0.9 }));
      sombra.position.set(0.16, -0.16, -0.18);
      const borde = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.25, 1.25, 0.28)), new THREE.LineBasicMaterial({ color: '#1d1412' }));
      const rotulo = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5),
        new THREE.MeshBasicMaterial({ map: texturaTexto('¡YA!', { ancho: 512, alto: 256, fuente: '700 170px "Space Grotesk", Arial, sans-serif', color: '#fbf7f1' }), transparent: true }));
      rotulo.position.z = 0.145;
      g.add(sombra, frente, borde, rotulo);
      g.userData.vivo = (t, act) => {
        const k = act ? (Math.sin(t * 2.4) > 0.7 ? 1 : 0) : 0;
        frente.position.set(k * 0.16, -k * 0.16, 0); borde.position.copy(frente.position); rotulo.position.set(k * 0.16, -k * 0.16, 0.145);
      };
      return g;
    },
    // Marciano de 8 bits hecho de vóxeles
    neon() {
      const MAPA = [
        '..X.....X..',
        '...X...X...',
        '..XXXXXXX..',
        '.XX.XXX.XX.',
        'XXXXXXXXXXX',
        'X.XXXXXXX.X',
        'X.X.....X.X',
        '...XX.XX...'
      ];
      const celdas = [];
      MAPA.forEach((fila, y) => [...fila].forEach((ch, x) => { if (ch === 'X') celdas.push([x, y]); }));
      const lado = 0.12;
      const malla = new THREE.InstancedMesh(new RoundedBoxGeometry(lado * 0.92, lado * 0.92, lado * 0.92, 1, 0.01), new THREE.MeshBasicMaterial(), celdas.length);
      const m = new THREE.Matrix4(), col = new THREE.Color();
      const tonos = ['#c8f04c', '#38e1d4', '#ff3fa4'];
      celdas.forEach(([x, y], k) => {
        m.makeTranslation((x - 5) * lado, (3.5 - y) * lado, 0);
        malla.setMatrixAt(k, m);
        malla.setColorAt(k, col.set(tonos[y < 3 ? 0 : y < 6 ? 1 : 2]));
      });
      const g = new THREE.Group();
      g.add(malla, resplandor('#8a5cff', 2.6));
      g.userData.vivo = (t, act) => { malla.position.y = act ? (Math.floor(t * 2) % 2) * 0.05 : 0; };
      return g;
    },
    // Placa de vidrio esmerilado con dos luces detrás
    savia() {
      const g = new THREE.Group();
      const vidrio = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.45, 0.14, 4, 0.06),
        new THREE.MeshPhysicalMaterial({ color: '#f4f7f4', roughness: 0.42, transmission: 1, thickness: 0.6, ior: 1.42, transparent: true }));
      const verde = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 16), new THREE.MeshBasicMaterial({ color: '#1f9d55' }));
      const naranja = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 16), new THREE.MeshBasicMaterial({ color: '#e67e22' }));
      verde.position.set(-0.22, 0.25, -0.45); naranja.position.set(0.25, -0.28, -0.45);
      g.add(verde, naranja, vidrio);
      g.userData.vivo = (t, act) => {
        const v = act ? 1 : 0.3;
        verde.position.x = -0.22 + Math.sin(t * 0.9) * 0.18 * v; verde.position.y = 0.25 + Math.cos(t * 0.7) * 0.12 * v;
        naranja.position.x = 0.25 + Math.cos(t * 0.8) * 0.16 * v; naranja.position.y = -0.28 + Math.sin(t * 1.1) * 0.12 * v;
      };
      return g;
    },
    // Arcilla blanda que respira
    organico() {
      const geo = new THREE.SphereGeometry(0.66, 96, 64);
      const base = geo.attributes.position.array.slice();
      const malla = new THREE.Mesh(geo, material('default', '#7a8a5e', { roughness: 0.92 }));
      const guijarro = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), material('default', '#e9dcc3', { roughness: 0.95 }));
      guijarro.scale.set(1, 0.7, 0.9); guijarro.position.set(0.55, -0.5, 0.25);
      const deformar = t => {
        const p = geo.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const x = base[k * 3], y = base[k * 3 + 1], z = base[k * 3 + 2];
          const n = Math.sin(x * 3.1 + t) * 0.06 + Math.sin(y * 2.7 + t * 1.3) * 0.07 + Math.sin(z * 3.7 - t * 0.8) * 0.05;
          const f = 1 + n;
          p.setXYZ(k, x * f, y * f * 0.94, z * f);
        }
        p.needsUpdate = true;
        geo.computeVertexNormals();
      };
      deformar(0);
      const g = new THREE.Group(); g.add(malla, guijarro);
      let ultimo = 0;
      g.userData.vivo = (t, act) => { if (act && t - ultimo > 1 / 30) { deformar(t * 0.8); ultimo = t; } };
      return g;
    },
    // Marco dorado sobre tinta profunda
    clasico() {
      const g = new THREE.Group();
      const oro = material('metal', '#d4ae62', { roughness: 0.26 });
      const W = 1.2, H = 1.5, a = 0.13;
      [[0, H / 2, W + a, a], [0, -H / 2, W + a, a], [-W / 2, 0, a, H + a], [W / 2, 0, a, H + a]].forEach(([x, y, w, h]) => {
        const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.12, 3, 0.04), oro); b.position.set(x, y, 0); g.add(b);
      });
      const c = document.createElement('canvas'); c.width = 400; c.height = 500;
      const x = c.getContext('2d');
      const pintar = () => {
        x.fillStyle = '#14110d'; x.fillRect(0, 0, 400, 500);
        x.strokeStyle = '#c9a255'; x.lineWidth = 2; x.strokeRect(22, 22, 356, 456); x.strokeRect(30, 30, 340, 440);
        x.fillStyle = '#e9cf95'; x.font = 'italic 600 300px "Cormorant Garamond", Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('C', 200, 240);
      };
      pintar();
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      document.fonts?.ready.then(() => { pintar(); tex.needsUpdate = true; e.pedir(); });
      const lienzoC = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, H - 0.02), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
      lienzoC.position.z = -0.02;
      g.add(lienzoC);
      return g;
    },
    // Pieza mecanizada en acero cepillado, con su cota
    industrial() {
      const forma = new THREE.Shape();
      const w = 1.3, h = 0.9, r = 0.06;
      forma.moveTo(-w / 2 + r, -h / 2); forma.lineTo(w / 2 - r, -h / 2); forma.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      forma.lineTo(w / 2, h / 2 - r); forma.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); forma.lineTo(-w / 2 + r, h / 2);
      forma.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); forma.lineTo(-w / 2, -h / 2 + r); forma.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      [[-0.4, 0.2], [0.4, 0.2]].forEach(([cx, cy]) => { const a = new THREE.Path(); a.absarc(cx, cy, 0.11, 0, Math.PI * 2, true); forma.holes.push(a); });
      const ranura = new THREE.Path();
      ranura.moveTo(-0.3, -0.25); ranura.lineTo(0.3, -0.25); ranura.absarc(0.3, -0.17, 0.08, -Math.PI / 2, Math.PI / 2, false); ranura.lineTo(-0.3, -0.09); ranura.absarc(-0.3, -0.17, 0.08, Math.PI / 2, Math.PI * 1.5, false);
      forma.holes.push(ranura);
      const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 32 });
      geo.center();
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const x = c.getContext('2d');
      x.fillStyle = '#9aa1a8'; x.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 40},${Math.random() > 0.5 ? 255 : 40},${Math.random() > 0.5 ? 255 : 40},${Math.random() * 0.08})`; x.fillRect(0, Math.random() * 256, 256, 1); }
      const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      const pieza = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#c3c8cd', metalness: 0.92, roughness: 0.36, roughnessMap: tex, map: tex }));
      const azul = new THREE.LineBasicMaterial({ color: '#7fa6cf' });
      const cota = new THREE.Group();
      const ln = (a, b) => cota.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), azul));
      ln([-0.65, -0.66, 0], [0.65, -0.66, 0]); ln([-0.65, -0.58, 0], [-0.65, -0.74, 0]); ln([0.65, -0.58, 0], [0.65, -0.74, 0]);
      ln([-0.65, -0.66, 0], [-0.57, -0.62, 0]); ln([-0.65, -0.66, 0], [-0.57, -0.70, 0]); ln([0.65, -0.66, 0], [0.57, -0.62, 0]); ln([0.65, -0.66, 0], [0.57, -0.70, 0]);
      const etq = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaTexto('130', { ancho: 256, alto: 96, fuente: '600 72px "Barlow Condensed", Arial, sans-serif', color: '#9ec2e8' }), transparent: true, depthTest: false }));
      etq.scale.set(0.5, 0.19, 1); etq.position.set(0, -0.8, 0);
      cota.add(etq);
      const g = new THREE.Group(); g.add(pieza, cota);
      return g;
    }
  };
}
