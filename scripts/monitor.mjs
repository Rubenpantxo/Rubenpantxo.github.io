#!/usr/bin/env node
// Comprueba que rubenpantxo.com responde como debe. Lo ejecuta el workflow
// «Monitor» cada 30 minutos; también se puede lanzar a mano:
//   node scripts/monitor.mjs
// Sale con código 1 si algo crítico falla (caída, error, certificado a punto
// de caducar). Las cabeceras de seguridad que falten solo se avisan.
// Escribe el informe en Markdown en informe-monitor.md y, en Actions, en el
// resumen del job.
import tls from 'node:tls';
import fs from 'node:fs';

const BASE = 'https://rubenpantxo.com';
// Página → texto que tiene que aparecer (prueba de que no es una página vacía o ajena)
const PAGINAS = {
    '/': 'Rubenpantxo.com',
    '/servicios/bar-restaurante.html': 'Taberna El Rincón',
    '/servicios/sistemas-de-diseno.html': 'Sistemas de diseño',
    '/legal/privacidad.html': 'Política de privacidad',
    '/sitemap.xml': '<urlset',
    '/robots.txt': 'Sitemap:',
    // Si deja de servirse, la app Android de Pantxiko Notes enseña la barra del navegador
    '/.well-known/assetlinks.json': 'com.rubenpantxo.notes'
};
const CABECERAS = ['strict-transport-security', 'content-security-policy', 'x-content-type-options', 'referrer-policy'];
const DIAS_AVISO_CERTIFICADO = 14;
const INTENTOS = 3;

const criticos = [];
const avisos = [];
const filas = [];

const espera = ms => new Promise(r => setTimeout(r, ms));

async function pedir(url, opciones = {}) {
    let ultimo;
    for (let i = 1; i <= INTENTOS; i++) {
        const inicio = Date.now();
        try {
            const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'rubenpantxo-monitor' }, ...opciones });
            const cuerpo = r.status < 300 ? await r.text() : '';
            return { r, cuerpo, ms: Date.now() - inicio };
        } catch (e) {
            ultimo = e;
            if (i < INTENTOS) await espera(15000);
        }
    }
    throw ultimo;
}

for (const [ruta, marca] of Object.entries(PAGINAS)) {
    const url = BASE + ruta;
    try {
        const { r, cuerpo, ms } = await pedir(url);
        const ok = r.status === 200 && cuerpo.includes(marca);
        filas.push(`| ${ok ? '✅' : '❌'} | ${ruta} | ${r.status} | ${ms} ms |`);
        if (!ok) criticos.push(`${ruta}: respondió ${r.status}${r.status === 200 ? ` pero sin el texto «${marca}»` : ''}`);
        if (ruta === '/') {
            const faltan = CABECERAS.filter(c => !r.headers.get(c));
            if (faltan.length) avisos.push(`Faltan cabeceras de seguridad en la portada: ${faltan.join(', ')}`);
        }
    } catch (e) {
        filas.push(`| ❌ | ${ruta} | sin respuesta | — |`);
        criticos.push(`${ruta}: no responde (${e.cause?.code || e.name})`);
    }
}

// Una ruta inexistente debe dar 404 (no 200 ni 5xx)
try {
    const { r } = await pedir(BASE + '/esta-pagina-no-existe-' + Date.now());
    filas.push(`| ${r.status === 404 ? '✅' : '⚠️'} | (página inexistente) | ${r.status} | — |`);
    if (r.status !== 404) avisos.push(`Una ruta inexistente responde ${r.status} en vez de 404`);
} catch { /* ya se habrá visto en las anteriores */ }

// http → https y www → sin www
for (const origen of ['http://rubenpantxo.com/', 'https://www.rubenpantxo.com/']) {
    try {
        const { r } = await pedir(origen);
        const destino = r.headers.get('location') || '';
        const ok = r.status >= 301 && r.status <= 308 && destino.startsWith(BASE);
        filas.push(`| ${ok ? '✅' : '⚠️'} | ${origen} | ${r.status} → ${destino || '—'} | — |`);
        if (!ok) avisos.push(`${origen} no redirige a ${BASE}/ (responde ${r.status}${destino ? ' → ' + destino : ''})`);
    } catch (e) {
        filas.push(`| ⚠️ | ${origen} | error | — |`);
        avisos.push(`${origen} falla (${e.cause?.code || e.name}); revisa el DNS o el certificado de ese nombre`);
    }
}

// Certificado: días hasta que caduca
await new Promise(resolver => {
    const s = tls.connect({ host: 'rubenpantxo.com', port: 443, servername: 'rubenpantxo.com', timeout: 15000 }, () => {
        const cert = s.getPeerCertificate();
        const dias = Math.floor((new Date(cert.valid_to) - Date.now()) / 86400000);
        filas.push(`| ${dias > DIAS_AVISO_CERTIFICADO ? '✅' : '❌'} | certificado TLS | caduca en ${dias} días | — |`);
        if (dias <= DIAS_AVISO_CERTIFICADO) criticos.push(`El certificado caduca en ${dias} días (${cert.valid_to})`);
        s.end();
        resolver();
    });
    s.on('error', e => { criticos.push(`No se pudo comprobar el certificado (${e.code || e.message})`); resolver(); });
    s.on('timeout', () => { criticos.push('El certificado no respondió a tiempo'); s.destroy(); resolver(); });
});

const informe = [
    `## Monitor de rubenpantxo.com — ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`,
    '',
    criticos.length ? `**${criticos.length} problema(s) crítico(s):**\n${criticos.map(c => `- ${c}`).join('\n')}` : '**Todo responde con normalidad.**',
    avisos.length ? `\n**Avisos:**\n${avisos.map(a => `- ${a}`).join('\n')}` : '',
    '',
    '| | Comprobación | Resultado | Tiempo |',
    '|---|---|---|---|',
    ...filas
].join('\n');

console.log(informe);
fs.writeFileSync('informe-monitor.md', informe + '\n');
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, informe + '\n');
process.exit(criticos.length ? 1 : 0);
