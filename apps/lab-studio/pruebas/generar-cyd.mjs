// Escribe los seis proyectos PlatformIO de los ejemplos de la CYD
// (platformio.ini, include/pines.h, src/main.cpp…) tal y como los descarga
// Lab Studio, para compilarlos con `pio run`. Lo usa el workflow
// .github/workflows/cyd.yml; en local:
//   node apps/lab-studio/pruebas/generar-cyd.mjs <carpeta>
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { CATALOGO } from '../js/datos/componentes.js';
import { PROYECTOS } from '../js/datos/proyectos.js';
import { archivosEjemplo } from '../js/core/exportar.js';

const destino = process.argv[2];
if (!destino) {
    console.error('Uso: node apps/lab-studio/pruebas/generar-cyd.mjs <carpeta>');
    process.exit(2);
}

const cyd = PROYECTOS.filter(p => p.id.startsWith('cyd-') && p.ejemplo);
if (!cyd.length) {
    console.error('No hay ejemplos de la CYD que generar.');
    process.exit(1);
}
for (const p of cyd) {
    for (const a of archivosEjemplo(p, CATALOGO)) {
        const ruta = join(destino, p.id, a.nombre);
        mkdirSync(dirname(ruta), { recursive: true });
        writeFileSync(ruta, a.texto);
    }
    console.log(p.id);
}
