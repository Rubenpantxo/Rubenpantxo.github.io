// Vista de las posturas de las personas (de frente y de lado), para comprobar a ojo que son
// naturales: quieto, andando, corriendo (la del jugador), aplaudiendo, ¡olé!, ¡uy!, apoyado y
// citando. Saca dos imágenes. Hace falta el servidor de desarrollo (npm run dev) y Playwright.
// Uso: node tools/vista_posturas.mjs <carpeta> [persona]
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const persona = process.argv[3] ?? 'h_joven';
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
p.on('pageerror', (e) => console.log('ERROR', e.message));
await p.goto(`http://localhost:${process.env.PUERTO ?? '5173'}/?calidad=alto&visor=1`);
await p.waitForTimeout(2000);
const salida = await p.evaluate(async (id) => {
  const THREE = await import('/node_modules/.vite/deps/three.js');
  const { clone } = await import('/node_modules/.vite/deps/three_examples_jsm_utils_SkeletonUtils__js.js').catch(() => import('/node_modules/three/examples/jsm/utils/SkeletonUtils.js'));
  const { cargaPersonas } = await import('/src/juego/peatones.js');
  const { POSTURAS, creaCapa } = await import('/src/fiestas/pose.js');
  const personas = await cargaPersonas('assets/personas/');
  const v = personas.modelos.find((m) => m.id === id) ?? personas.modelos[0];
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0xdfe6ec);
  escena.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2.2));
  const sol = new THREE.DirectionalLight(0xffffff, 2); sol.position.set(3, 5, 4); escena.add(sol);
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), new THREE.MeshStandardMaterial({ color: 0xb8a98c }));
  suelo.rotation.x = -Math.PI / 2; escena.add(suelo);
  const casos = [
    ['quieto', null, 0], ['andar', null, 0.27], ['correr', 'corre', 0.27], ['correr', 'corre', 0.77], ['aplauso', 'aplauso', 0.1],
    ['olé', 'ole', 0.3], ['uy', 'uy', 0], ['apoyado', 'apoyado', 0], ['cita', 'cita', 0.2],
  ];
  casos.forEach(([nombre, postura, t], i) => {
    const o = clone(v.escena);
    o.position.set((i - (casos.length - 1) / 2) * 1.15, 0, 0);
    escena.add(o);
    o.updateMatrixWorld(true);
    const m = new THREE.AnimationMixer(o);
    const capa = creaCapa(o);
    const clip = nombre === 'quieto' || ['aplauso', 'olé', 'uy', 'apoyado', 'cita'].includes(nombre) ? v.quieto : v.andar;
    const a = m.clipAction(clip); a.play(); a.time = t * clip.duration;
    m.update(0); o.updateMatrixWorld(true);
    capa.despues();
    if (postura === 'corre') capa.pon(POSTURAS.corre(1, t));
    else if (postura) capa.pon(POSTURAS[postura](t));
    o.updateMatrixWorld(true);
  });
  const lienzo = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, preserveDrawingBuffer: true });
  r.setSize(2000, 640, false);
  const camara = new THREE.PerspectiveCamera(26, 2000 / 640, 0.1, 100);
  const fotos = [];
  const figuras = escena.children.filter((o) => o.type !== 'Mesh' && !o.isLight);
  // De frente
  camara.position.set(0, 1.0, 11); camara.lookAt(0, 0.95, 0);
  r.render(escena, camara); fotos.push(lienzo.toDataURL('image/png'));
  // De lado: cada figura girada un cuarto de vuelta
  for (const f of figuras) f.rotation.y = Math.PI / 2;
  escena.updateMatrixWorld(true);
  r.render(escena, camara); fotos.push(lienzo.toDataURL('image/png'));
  for (const f of figuras) f.rotation.y = 0;
  escena.updateMatrixWorld(true);
  // La mano derecha de la primera, de cerca
  const mano = new THREE.Vector3(); figuras[0].getObjectByName('hand_r').getWorldPosition(mano);
  camara.position.set(mano.x - 0.25, mano.y + 0.05, mano.z + 0.6); camara.lookAt(mano);
  r.setSize(800, 640, false); camara.aspect = 800 / 640; camara.updateProjectionMatrix();
  r.render(escena, camara); fotos.push(lienzo.toDataURL('image/png'));
  return { fotos, correccion: personas.modelos.map((m) => [m.id, m.correccion]) };
}, persona);
for (const [i, f] of salida.fotos.entries()) writeFileSync(`${S}/posturas_${['frente', 'lado', 'mano'][i]}.png`, Buffer.from(f.split(',')[1], 'base64'));
for (const [id, c] of salida.correccion) console.log(id, JSON.stringify(c));
await b.close();
