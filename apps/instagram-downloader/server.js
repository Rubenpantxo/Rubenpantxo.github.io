/**
 * Servidor local del Instagram Downloader.
 * Sin dependencias: solo Node + yt-dlp (instalado con pip).
 * Arranca con: node server.js   ->   http://localhost:8787
 */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFile } = require('child_process');
const crypto = require('crypto');

const PORT = 8787;

// Secreto distinto en cada arranque. Se inyecta en la pagina que sirve este
// mismo proceso y se exige en todo /api/*. Sin el, bastaba con que te llevaran
// a http://localhost:8787/?u=... (una navegacion no lleva cabecera Origin, asi
// que la lista blanca de origenes no la ve) para usar tu maquina de descargador.
const TOKEN = crypto.randomBytes(24).toString('hex');

// Contra DNS rebinding: un nombre de dominio del atacante puede resolver a
// 127.0.0.1, pero la cabecera Host que envia el navegador sigue siendo la suya.
const HOSTS_PERMITIDOS = new Set(['localhost:' + PORT, '127.0.0.1:' + PORT]);

// yt-dlp tarda hasta 180 s por proceso: sin tope, unas pocas peticiones dejan
// la maquina sin CPU y a la IP marcada por Instagram como scraper.
const MAX_TRABAJOS = 2;
let trabajosActivos = 0;
const HTML_CANDIDATOS = ['Instagram_Downloader.html', 'index_insta_down.html', 'index.html'];
const HTML_FILE = (HTML_CANDIDATOS
    .map((n) => path.join(__dirname, n))
    .find((f) => { try { return fs.existsSync(f); } catch (e) { return false; } })) || null;
const TIMEOUT_MS = 180000;

// Solo se aceptan enlaces de Instagram: la URL se reconstruye desde el codigo
// capturado, nunca se pasa texto libre del usuario al proceso hijo.
const IG_RE = /instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/;

function parseIgUrl(raw) {
    if (typeof raw !== 'string') return null;
    const m = raw.match(IG_RE);
    if (!m) return null;
    const tipo = m[1] === 'reels' ? 'reel' : m[1];
    return { code: m[2], url: 'https://www.instagram.com/' + tipo + '/' + m[2] + '/' };
}

/* ---------- localizacion de yt-dlp ---------- */

const CANDIDATOS = [
    { cmd: 'python', base: ['-m', 'yt_dlp'] },
    { cmd: 'py', base: ['-m', 'yt_dlp'] },
    { cmd: 'python3', base: ['-m', 'yt_dlp'] },
    { cmd: 'yt-dlp.exe', base: [] },
    { cmd: 'yt-dlp', base: [] },
];

let ytdlp = null;

function detectarYtdlp() {
    return new Promise((resolve) => {
        let i = 0;
        const probar = () => {
            if (i >= CANDIDATOS.length) return resolve(null);
            const c = CANDIDATOS[i++];
            execFile(c.cmd, c.base.concat(['--version']), { timeout: 8000 }, (err, stdout) => {
                if (!err) return resolve({ cmd: c.cmd, base: c.base, version: String(stdout).trim() });
                probar();
            });
        };
        probar();
    });
}

function ejecutarYtdlp(args, opciones) {
    const capturar = !opciones || opciones.capturar !== false;
    return new Promise((resolve, reject) => {
        const p = spawn(ytdlp.cmd, ytdlp.base.concat(args), { windowsHide: true });
        let out = '';
        let err = '';
        const t = setTimeout(() => p.kill(), TIMEOUT_MS);
        if (capturar) p.stdout.on('data', (d) => { out += d; });
        p.stderr.on('data', (d) => { err += d; });
        p.on('error', (e) => { clearTimeout(t); reject(e); });
        p.on('close', (code) => {
            clearTimeout(t);
            if (code === 0) resolve(out);
            else reject(new Error(err.trim() || 'yt-dlp termino con codigo ' + code));
        });
    });
}

// Instagram exige sesion iniciada para casi todos los reels desde 2024.
// Prestarle a yt-dlp las cookies del navegador es prestarle tu sesion de
// Instagram: lee lo que leen tus cuentas privadas seguidas y hace que Instagram
// marque tu cuenta por scraping. Por eso NO es automatico. Antes se probaban
// chrome, edge, firefox, brave y opera sin preguntar; ahora hay que pedirlo:
//     set IGDL_COOKIES_BROWSER=chrome  &&  node server.js
const NAVEGADOR_COOKIES = process.env.IGDL_COOKIES_BROWSER || null;
const NECESITA_SESION = /login required|rate-limit|requested content is not available|empty media response|sign in|restricted/i;

async function ejecutarYtdlpConSesion(args, opciones) {
    try {
        return await ejecutarYtdlp(args, opciones);
    } catch (e) {
        const texto = String((e && e.message) || e);
        if (!NECESITA_SESION.test(texto)) throw e;
        if (!NAVEGADOR_COOKIES) throw e;
        console.log('  [sesion] Instagram pide login: reintentando con las cookies de '
            + NAVEGADOR_COOKIES + ' (pedido con IGDL_COOKIES_BROWSER)...');
        return await ejecutarYtdlp(['--cookies-from-browser', NAVEGADOR_COOKIES].concat(args), opciones);
    }
}

/* ---------- utilidades ---------- */

function limpiarNombre(s) {
    return String(s || 'instagram')
        .replace(/[^\w\- ]+/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 60) || 'instagram';
}

/* ---------- quien puede hablar con este servidor ---------- */

// Antes esto era 'Access-Control-Allow-Origin: *', o sea: cualquier web que
// visitaras podia, mientras el servidor estuviera arrancado, pedirle que
// descargara cosas. Ahora solo se le contesta a esta lista.
const ORIGENES_PERMITIDOS = new Set([
    'https://rubenpantxo.com',
    'https://www.rubenpantxo.com',
    'http://localhost:' + PORT,
    'http://127.0.0.1:' + PORT,
]);

/**
 * Devuelve las cabeceras CORS que tocan, o null si el origen no esta permitido.
 * Sin cabecera Origin (peticion desde la propia pagina que sirve este proceso,
 * o desde curl) no hay nada que autorizar: no es una peticion entre webs.
 */
function cors(req) {
    const origen = req.headers.origin;
    if (!origen) return {};
    if (!ORIGENES_PERMITIDOS.has(origen)) return null;
    return {
        'Access-Control-Allow-Origin': origen,
        // Sin Vary, una cache podria servirle a un origen la respuesta que se
        // preparo para otro.
        'Vary': 'Origin',
        'Access-Control-Allow-Private-Network': 'true',
    };
}

function json(res, status, data, cabeceras) {
    const body = JSON.stringify(data);
    res.writeHead(status, Object.assign({
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Length': Buffer.byteLength(body),
    }, cabeceras || {}));
    res.end(body);
}

function mensajeError(texto) {
    const t = String(texto);
    if (/login required|rate-limit|requested content is not available|empty media response/i.test(t)) {
        return 'Instagram no ha devuelto el video: casi siempre pide sesion iniciada. Este servidor ya NO toma tus cookies por su cuenta. Si quieres prestarle la sesion de un navegador, para el servidor y arrancalo asi: set IGDL_COOKIES_BROWSER=chrome  y luego  node server.js (cierra antes ese navegador del todo). Ten en cuenta que eso presta tu sesion de Instagram a yt-dlp. Si sigue fallando, actualiza yt-dlp con: python -m pip install -U yt-dlp';
    }
    if (/Unsupported URL|Unable to extract/i.test(t)) {
        return 'No se ha podido extraer el video de ese enlace. Comprueba que es un post, reel o IGTV publico.';
    }
    return t.split('\n').slice(-1)[0] || 'Error desconocido de yt-dlp.';
}

/* ---------- endpoints ---------- */

function normalizarEntrada(e, index) {
    const fmts = Array.isArray(e.formats) ? e.formats : [];
    const alturas = fmts.map((f) => f.height).filter(Boolean);
    const miniatura = e.thumbnail || (e.thumbnails && e.thumbnails.length ? e.thumbnails[e.thumbnails.length - 1].url : '');
    return {
        index: index,
        titulo: e.title || 'Video de Instagram',
        autor: e.uploader || e.channel || e.uploader_id || '',
        descripcion: (e.description || '').slice(0, 400),
        miniatura: miniatura,
        duracion: e.duration || null,
        calidad: e.height || (alturas.length ? Math.max.apply(null, alturas) : null),
        esVideo: Boolean(e.duration || (e.vcodec && e.vcodec !== 'none') || fmts.some((f) => f.vcodec && f.vcodec !== 'none')),
    };
}

async function apiInfo(res, entrada, cabeceras) {
    const bruto = await ejecutarYtdlpConSesion(['-J', '--no-warnings', entrada.url]);
    const data = JSON.parse(bruto);
    const entradas = data._type === 'playlist' && Array.isArray(data.entries) ? data.entries : [data];
    const items = entradas.map(normalizarEntrada).filter((i) => i.esVideo);
    if (!items.length) throw new Error('Ese enlace no contiene ningun video (puede ser solo una foto).');
    json(res, 200, { ok: true, code: entrada.code, items: items }, cabeceras);
}

async function apiDescarga(res, entrada, index, cabeceras) {
    const base = path.join(os.tmpdir(), 'igdl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
    await ejecutarYtdlpConSesion([
        '-f', 'b[ext=mp4]/bv*[ext=mp4]+ba/b',
        '--merge-output-format', 'mp4',
        '--no-warnings',
        '--playlist-items', String(index + 1),
        '-o', base + '.%(ext)s',
        entrada.url,
    ], { capturar: false });

    const dir = path.dirname(base);
    const prefijo = path.basename(base);
    const archivo = fs.readdirSync(dir).find((f) => f.indexOf(prefijo) === 0);
    if (!archivo) throw new Error('yt-dlp no genero ningun archivo.');

    const ruta = path.join(dir, archivo);
    const nombre = limpiarNombre(entrada.code) + '.mp4';
    const stat = fs.statSync(ruta);

    res.writeHead(200, Object.assign({
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size,
        'Content-Disposition': 'attachment; filename="' + nombre + '"',
        'Access-Control-Expose-Headers': 'Content-Disposition',
    }, cabeceras || {}));
    const stream = fs.createReadStream(ruta);
    stream.pipe(res);
    const limpiar = () => fs.unlink(ruta, () => {});
    stream.on('close', limpiar);
    stream.on('error', limpiar);
}

/* ---------- servidor ---------- */

const servidor = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost:' + PORT);

    // Antes que nada: la cabecera Host. Un dominio del atacante que resuelva a
    // 127.0.0.1 llega hasta aqui con su propio Host, no con localhost.
    if (!HOSTS_PERMITIDOS.has(String(req.headers.host || '').toLowerCase())) {
        console.warn('[bloqueado] Host no permitido: ' + req.headers.host);
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: false, error: 'Host no permitido.' }));
    }

    // Si la peticion viene de una web que no esta en la lista, se corta aqui y
    // no se hace ningun trabajo.
    const cabeceras = cors(req);
    if (cabeceras === null) {
        console.warn('[bloqueado] origen no permitido: ' + req.headers.origin);
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: false, error: 'Origen no permitido.' }));
    }

    if (req.method === 'OPTIONS') {
        // Access-Control-Allow-Private-Network es lo que deja que la version
        // publicada en https://rubenpantxo.com hable con este servidor local
        // (Chrome/Edge). Solo se concede a los origenes de la lista.
        res.writeHead(204, Object.assign({
            'Access-Control-Allow-Headers': 'Content-Type, X-IGDL-Token',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Max-Age': '86400',
        }, cabeceras));
        return res.end();
    }

    // Token de arranque en todo /api/*. Solo lo conoce la pagina que sirve este
    // mismo proceso, que es donde se inyecta.
    if (u.pathname.indexOf('/api/') === 0) {
        const enviado = req.headers['x-igdl-token'] || u.searchParams.get('token') || '';
        const esperado = Buffer.from(TOKEN);
        const recibido = Buffer.from(String(enviado));
        const valido = recibido.length === esperado.length
            && crypto.timingSafeEqual(recibido, esperado);
        if (!valido) {
            console.warn('[bloqueado] token invalido o ausente en ' + u.pathname);
            return json(res, 403, { ok: false, error: 'Falta el token de sesion. Abre http://localhost:' + PORT + ' en el navegador.' }, cabeceras);
        }
    }

    if (u.pathname === '/api/estado') {
        if (!ytdlp && deteccion) { try { await deteccion; } catch (e) {} }
        return json(res, 200, { ok: true, ytdlp: ytdlp ? ytdlp.version : null }, cabeceras);
    }

    if (u.pathname === '/api/info' || u.pathname === '/api/descargar') {
        if (!ytdlp && deteccion) { try { await deteccion; } catch (e) {} }
        if (!ytdlp) {
            return json(res, 503, { ok: false, error: 'yt-dlp no esta instalado. Ejecuta: python -m pip install -U yt-dlp' }, cabeceras);
        }
        const entrada = parseIgUrl(u.searchParams.get('url') || '');
        if (!entrada) {
            return json(res, 400, { ok: false, error: 'El enlace no es de Instagram. Debe ser del tipo instagram.com/reel/... o instagram.com/p/...' }, cabeceras);
        }
        if (trabajosActivos >= MAX_TRABAJOS) {
            return json(res, 429, { ok: false, error: 'Ya hay ' + MAX_TRABAJOS + ' descargas en curso. Espera a que terminen.' }, cabeceras);
        }
        trabajosActivos++;
        try {
            if (u.pathname === '/api/info') return await apiInfo(res, entrada, cabeceras);
            const index = Math.max(0, parseInt(u.searchParams.get('index') || '0', 10) || 0);
            return await apiDescarga(res, entrada, index, cabeceras);
        } catch (e) {
            console.error('[error]', e.message);
            if (res.headersSent) return res.destroy();
            return json(res, 502, { ok: false, error: mensajeError(e.message) }, cabeceras);
        } finally {
            trabajosActivos--;
        }
    }

    if (u.pathname === '/' || u.pathname === '/index.html' || u.pathname === '/Instagram_Downloader.html') {
        if (!HTML_FILE) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            return res.end('<!doctype html><html lang="es"><meta charset="utf-8">'
                + '<title>Ayudante local en marcha</title>'
                + '<body style="font:16px/1.6 system-ui;max-width:34rem;margin:12vh auto;padding:0 1.5rem;color:#1c1330;background:#f6f3ff">'
                + '<h1 style="font-size:1.4rem">El ayudante local esta funcionando</h1>'
                + '<p>Esta carpeta solo tiene el servidor, no la pagina. Vuelve a '
                + '<a href="https://rubenpantxo.com/apps/instagram-downloader/index_insta_down.html">Instagram Downloader</a>'
                + ' y pulsa <b>Volver a comprobar</b>: ya deberia dejarte descargar.</p></body></html>');
        }
        return fs.readFile(HTML_FILE, 'utf8', (err, texto) => {
            if (err) {
                res.writeHead(500);
                return res.end('No se ha podido leer la pagina local.');
            }
            // El token solo viaja aqui: en la pagina que sirve este proceso.
            const inyeccion = '<script>window.__IGDL_TOKEN__=' + JSON.stringify(TOKEN) + ';<\/script>';
            const salida = texto.indexOf('</head>') >= 0
                ? texto.replace('</head>', inyeccion + '</head>')
                : inyeccion + texto;
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
                'Content-Length': Buffer.byteLength(salida),
            });
            res.end(salida);
        });
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404');
});

let deteccion = null;

servidor.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error('');
        console.error('  [X] El puerto ' + PORT + ' ya esta ocupado.');
        console.error('      Puede que el servidor ya estuviera arrancado en otra ventana:');
        console.error('      abre http://localhost:' + PORT + ' y comprueba.');
        console.error('      Si no, cierra el programa que use ese puerto y vuelve a intentarlo.');
    } else {
        console.error('  [X] Error del servidor: ' + e.message);
    }
    process.exitCode = 1;
});

servidor.listen(PORT, '127.0.0.1', () => {
    console.log('');
    console.log('  Instagram Downloader - servidor local');
    console.log('  --------------------------------------');
    console.log('  Abre:   http://localhost:' + PORT + '  <- la pagina debe abrirse DESDE aqui');
    console.log('  Token de esta sesion: ' + TOKEN);
    console.log('  (cambia en cada arranque; solo lo lleva la pagina que sirve este proceso)');
    console.log('  Cookies del navegador: ' + (NAVEGADOR_COOKIES
        ? 'SI, ' + NAVEGADOR_COOKIES + ' (IGDL_COOKIES_BROWSER)'
        : 'no (para activarlas: set IGDL_COOKIES_BROWSER=chrome)'));
    console.log('  Pagina local: ' + (HTML_FILE ? path.basename(HTML_FILE) : 'no incluida (usa la web de rubenpantxo.com)'));
    console.log('  Buscando yt-dlp...');
    console.log('  Para parar el servidor: Ctrl + C');
    console.log('');
    deteccion = detectarYtdlp().then((r) => {
        ytdlp = r;
        console.log('  yt-dlp: ' + (r ? r.version + ' (' + r.cmd + ')' : 'NO ENCONTRADO -> instalalo con: python -m pip install -U yt-dlp'));
        return r;
    });
});
