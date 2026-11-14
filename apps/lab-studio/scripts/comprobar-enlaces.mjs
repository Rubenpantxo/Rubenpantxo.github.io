// Comprueba que todos los enlaces de la biblioteca responden.
//   node apps/lab-studio/scripts/comprobar-enlaces.mjs
import { COMPONENTES } from '../js/datos/componentes.js';
import { PROYECTOS } from '../js/datos/proyectos.js';
import { RECURSOS } from '../js/datos/recursos.js';

const urls = new Set();
for (const c of COMPONENTES) for (const e of c.enlaces) urls.add(e.url);
for (const p of PROYECTOS) for (const e of [...(p.repos || []), ...(p.docs || [])]) urls.add(e.url);
for (const g of RECURSOS) for (const e of g.enlaces) urls.add(e.url);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
async function probar(url) {
    for (const method of ['HEAD', 'GET']) {
        try {
            const r = await fetch(url, { method, redirect: 'follow', headers: { 'user-agent': UA, accept: '*/*' }, signal: AbortSignal.timeout(20000) });
            if (r.ok) return r.status;
            if (method === 'GET') return r.status;
        } catch (e) { if (method === 'GET') return 'ERR ' + (e.cause?.code || e.name); }
    }
}
const lista = [...urls];
let mal = 0;
for (let i = 0; i < lista.length; i += 8) {
    await Promise.all(lista.slice(i, i + 8).map(async u => {
        const s = await probar(u);
        if (s !== 200) { mal++; console.log(String(s).padEnd(14), u); }
    }));
}
console.log(`${lista.length} enlaces, ${mal} con incidencia`);
process.exitCode = mal ? 1 : 0;
