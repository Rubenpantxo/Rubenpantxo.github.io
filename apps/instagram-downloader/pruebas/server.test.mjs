// Pruebas del servidor local del Instagram Downloader: arranca server.js con un
// yt-dlp falso (yt-dlp-falso.mjs) en otro puerto y comprueba cada endpoint y
// cada cerrojo de seguridad. No sale a internet.
//   npm test        (o: node --test apps/instagram-downloader/pruebas/)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const SERVIDOR = path.join(aqui, '..', 'server.js');
const FALSO = path.join(aqui, 'yt-dlp-falso.mjs');

function arrancar(puerto, entorno = {}) {
    return new Promise((resolver, rechazar) => {
        const p = spawn(process.execPath, [SERVIDOR], {
            env: { ...process.env, IGDL_PORT: String(puerto), IGDL_YTDLP: FALSO, IGDL_COOKIES_BROWSER: '', ...entorno },
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let salida = '';
        const t = setTimeout(() => rechazar(new Error('El servidor no arrancó:\n' + salida)), 10000);
        p.stdout.on('data', (d) => {
            salida += d;
            if (/yt-dlp: 2099/.test(salida)) { clearTimeout(t); resolver({ proceso: p, salida: () => salida }); }
        });
        p.stderr.on('data', (d) => { salida += d; });
    });
}

// http.request y no fetch: fetch no deja poner una cabecera Host falsa.
function pedir(puerto, ruta, { cabeceras = {}, metodo = 'GET', host } = {}) {
    return new Promise((resolver, rechazar) => {
        const r = http.request({
            host: '127.0.0.1', port: puerto, path: ruta, method: metodo,
            headers: { Host: host || 'localhost:' + puerto, ...cabeceras }
        }, (res) => {
            const trozos = [];
            res.on('data', (c) => trozos.push(c));
            res.on('end', () => {
                const cuerpo = Buffer.concat(trozos);
                let json = null;
                try { json = JSON.parse(cuerpo.toString('utf8')); } catch (e) { /* no es JSON */ }
                resolver({ estado: res.statusCode, cabeceras: res.headers, cuerpo, json });
            });
        });
        r.on('error', rechazar);
        r.end();
    });
}

const P = 18787;
const REEL = encodeURIComponent('https://www.instagram.com/reel/ABC123/');
let srv;
let token;
const conToken = () => ({ 'X-IGDL-Token': token });

before(async () => {
    srv = await arrancar(P);
    const pagina = await pedir(P, '/');
    token = (pagina.cuerpo.toString().match(/__IGDL_TOKEN__="([0-9a-f]+)"/) || [])[1];
});
after(() => srv && srv.proceso.kill());

test('la página lleva el token y cabeceras contra iframes', async () => {
    const r = await pedir(P, '/');
    assert.equal(r.estado, 200);
    assert.match(token, /^[0-9a-f]{48}$/);
    assert.equal(r.cabeceras['x-frame-options'], 'DENY');
    assert.match(r.cabeceras['content-security-policy'], /frame-ancestors 'none'/);
});

test('el token no sale en la consola', () => {
    assert.ok(!srv.salida().includes(token));
});

test('rechaza una cabecera Host ajena (DNS rebinding)', async () => {
    const r = await pedir(P, '/api/estado', { host: 'atacante.example:' + P, cabeceras: conToken() });
    assert.equal(r.estado, 403);
});

test('rechaza orígenes que no están en la lista', async () => {
    const r = await pedir(P, '/api/estado', { cabeceras: { ...conToken(), Origin: 'https://atacante.example' } });
    assert.equal(r.estado, 403);
});

test('preflight desde rubenpantxo.com con permiso de red privada', async () => {
    const r = await pedir(P, '/api/estado', { metodo: 'OPTIONS', cabeceras: { Origin: 'https://rubenpantxo.com' } });
    assert.equal(r.estado, 204);
    assert.equal(r.cabeceras['access-control-allow-origin'], 'https://rubenpantxo.com');
    assert.equal(r.cabeceras['access-control-allow-private-network'], 'true');
});

test('/api/* sin token o con token malo → 403', async () => {
    assert.equal((await pedir(P, '/api/estado')).estado, 403);
    assert.equal((await pedir(P, '/api/estado', { cabeceras: { 'X-IGDL-Token': 'x'.repeat(48) } })).estado, 403);
});

test('/api/estado devuelve la versión de yt-dlp', async () => {
    const r = await pedir(P, '/api/estado', { cabeceras: conToken() });
    assert.equal(r.estado, 200);
    assert.equal(r.json.ytdlp, '2099.01.01-falso');
});

test('/api/info rechaza enlaces que no son de Instagram o demasiado largos', async () => {
    const malo = await pedir(P, '/api/info?url=' + encodeURIComponent('https://example.com/video'), { cabeceras: conToken() });
    assert.equal(malo.estado, 400);
    const largo = 'https://www.instagram.com/reel/ABC/?x=' + 'a'.repeat(600);
    assert.equal((await pedir(P, '/api/info?url=' + encodeURIComponent(largo), { cabeceras: conToken() })).estado, 400);
});

test('/api/info devuelve el vídeo', async () => {
    const r = await pedir(P, '/api/info?url=' + REEL, { cabeceras: conToken() });
    assert.equal(r.estado, 200);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.code, 'ABC123');
    assert.equal(r.json.items.length, 1);
    assert.equal(r.json.items[0].calidad, 1280);
    assert.equal(r.cabeceras['x-content-type-options'], 'nosniff');
});

test('/api/info de una foto explica que no hay vídeo', async () => {
    const r = await pedir(P, '/api/info?url=' + encodeURIComponent('https://www.instagram.com/p/FOTO/'), { cabeceras: conToken() });
    assert.equal(r.estado, 502);
    assert.match(r.json.error, /ningun video/);
});

test('si Instagram pide sesión, el mensaje lo explica', async () => {
    const r = await pedir(P, '/api/info?url=' + encodeURIComponent('https://www.instagram.com/reel/FALLA/'), { cabeceras: conToken() });
    assert.equal(r.estado, 502);
    assert.match(r.json.error, /sesion/);
});

test('/api/descargar envía el mp4 y borra el temporal', async () => {
    const antes = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('igdl-')).length;
    const r = await pedir(P, '/api/descargar?url=' + REEL + '&index=0', { cabeceras: conToken() });
    assert.equal(r.estado, 200);
    assert.equal(r.cabeceras['content-type'], 'video/mp4');
    assert.match(r.cabeceras['content-disposition'], /filename="ABC123\.mp4"/);
    assert.equal(r.cuerpo.toString(), 'ftypmp42 video de prueba');
    await new Promise((res) => setTimeout(res, 200));
    const despues = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('igdl-')).length;
    assert.ok(despues <= antes, 'quedan archivos igdl-* en la carpeta temporal');
});

test('/api/descargar rechaza un índice no válido', async () => {
    for (const i of ['-1', '999', 'abc']) {
        const r = await pedir(P, '/api/descargar?url=' + REEL + '&index=' + i, { cabeceras: conToken() });
        assert.equal(r.estado, 400, 'index=' + i);
    }
});

test('no admite más de 2 trabajos a la vez', async () => {
    const lento = '/api/info?url=' + encodeURIComponent('https://www.instagram.com/reel/LENTO/');
    const dos = [pedir(P, lento, { cabeceras: conToken() }), pedir(P, lento, { cabeceras: conToken() })];
    await new Promise((r) => setTimeout(r, 300));
    const tercero = await pedir(P, '/api/info?url=' + REEL, { cabeceras: conToken() });
    assert.equal(tercero.estado, 429);
    const [a, b] = await Promise.all(dos);
    assert.equal(a.estado, 200);
    assert.equal(b.estado, 200);
});

test('ruta desconocida → 404', async () => {
    assert.equal((await pedir(P, '/no-existe')).estado, 404);
});

test('tope de peticiones por tiempo → 429 con Retry-After', async () => {
    const P2 = P + 1;
    const otro = await arrancar(P2, { IGDL_LIMITE_INFO: '2' });
    try {
        const pag = await pedir(P2, '/');
        const t = pag.cuerpo.toString().match(/__IGDL_TOKEN__="([0-9a-f]+)"/)[1];
        const ruta = '/api/info?url=' + REEL;
        assert.equal((await pedir(P2, ruta, { cabeceras: { 'X-IGDL-Token': t } })).estado, 200);
        assert.equal((await pedir(P2, ruta, { cabeceras: { 'X-IGDL-Token': t } })).estado, 200);
        const tercera = await pedir(P2, ruta, { cabeceras: { 'X-IGDL-Token': t } });
        assert.equal(tercera.estado, 429);
        assert.ok(Number(tercera.cabeceras['retry-after']) > 0);
        assert.match(tercera.json.error, /Espera/);
    } finally {
        otro.proceso.kill();
    }
});
