// Comprueba que se pueden cambiar los coches desde la pausa y que física y selección
// usan el modelo elegido. Hace falta el servidor de desarrollo y Playwright.
// Uso: node tools/prueba_vehiculos.mjs
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1100, height: 620 } })).newPage();
const errores = [];
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push(e.message));
let fallos = 0;
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };

await p.goto(`http://localhost:${process.env.PUERTO ?? '5173'}/?salto=0&personaje=0&calidad=bajo`);
await p.waitForFunction(() => window.__juego, null, { timeout: 240000 });
await p.click('#jugar');
await p.waitForTimeout(500);
await p.evaluate(() => document.getElementById('boton-menu').click());
await p.waitForFunction(() => !document.getElementById('pausa').hidden);

const opciones = await p.evaluate(() => {
  const j = window.__juego;
  const selector = document.getElementById('vehiculo');
  return {
    seleccion: j.vehiculoSeleccionado,
    opciones: [...selector.options].filter((o) => o.value).map((o) => o.value),
    visible: !selector.closest('label').hidden,
  };
});
comprueba(opciones.visible && opciones.opciones.length > 1, `selector en pausa con ${opciones.opciones.length} modelos`);

const modelo = opciones.opciones.find((id) => id !== opciones.seleccion);
if (modelo) {
  await p.selectOption('#vehiculo', modelo);
  const cambiado = await p.evaluate((id) => {
    const j = window.__juego;
    const info = j.modelosCoches[id].info;
    const extents = j.coche.collider.halfExtents();
    const ruedas = j.coche.vehiculo.numWheels();
    const anclaje = j.coche.vehiculo.wheelChassisConnectionPointCs(0);
    const centro = j.coche.modelo.ruedas[0].centro;
    const config = j.coche.config;
    return {
      seleccionado: j.vehiculoSeleccionado,
      guardado: localStorage.getItem('cabanillas.vehiculo'),
      infoCorrecta: j.coche.info === info,
      anchoCollider: extents.x,
      largoCollider: extents.z,
      ancho: Math.min(info.ancho, config.chasis.anchoMax),
      ruedas,
      anclajeCorrecto: Math.abs(anclaje.x - centro.x) < 1e-4
        && Math.abs(anclaje.z - centro.z) < 1e-4
        && Math.abs(anclaje.y - centro.y + config.chasis.alturaLibre + config.chasis.altoCaja / 2
          - config.ruedas.suspensionReposo) < 1e-4,
      radioRueda: j.coche.vehiculo.wheelRadius(0),
      radioModelo: j.coche.modelo.ruedas[0].radio,
      largo: info.largo,
    };
  }, modelo);
  comprueba(cambiado.seleccionado === modelo && cambiado.guardado === modelo && cambiado.infoCorrecta,
    `selecciona ${modelo} y guarda la elección`);
  comprueba(cambiado.ruedas === 4 && Math.abs(cambiado.radioRueda - cambiado.radioModelo) < 1e-4,
    'las ruedas físicas corresponden al modelo visible');
  comprueba(cambiado.anclajeCorrecto && Math.abs(cambiado.largoCollider * 2 - cambiado.largo) < 1e-4
    && Math.abs(cambiado.anchoCollider * 2 - cambiado.ancho) < 1e-4,
  'anclajes de ruedas y tamaño de colisión se actualizan con el modelo');

  await p.evaluate(() => document.querySelector('#pausa [data-cierra="pausa"]').click());
  await p.waitForFunction(() => document.getElementById('pausa').hidden);
  await p.evaluate(() => window.__juego.entraFiestas('plaza'));
  await p.waitForFunction(() => window.__juego.modoFiestas === 'plaza', null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('boton-menu').click());
  const bloqueado = await p.evaluate((id) => {
    const j = window.__juego;
    return {
      selectorOculto: document.getElementById('vehiculo').closest('label').hidden,
      puedeCambiar: j.puedeCambiarVehiculo,
      rechaza: !j.seleccionaVehiculo(id),
      conserva: j.vehiculoSeleccionado,
    };
  }, opciones.seleccion);
  comprueba(bloqueado.selectorOculto && !bloqueado.puedeCambiar && bloqueado.rechaza && bloqueado.conserva === modelo,
    'el selector queda oculto y no se cambia de coche dentro de las fiestas');
}

comprueba(errores.length === 0, `errores de consola: ${JSON.stringify(errores.slice(0, 5))}`);
await b.close();
process.exit(fallos ? 1 : 0);
