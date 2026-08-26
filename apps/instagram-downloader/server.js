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

const PORT = 8787;
const HTML_FILE = path.join(__dirname, 'Instagram_Downloader.html');
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
            execFile(c.cmd, c.base.concat(['--version']), { timeout: 20000 }, (err, stdout) => {
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
        return 'Instagram no ha devuelto el video. Suele ser una cuenta privada, un enlace caducado o un limite temporal de peticiones: espera un par de minutos y reintenta.';
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
    const bruto = await ejecutarYtdlp(['-J', '--no-warnings', entrada.url]);
    const data = JSON.parse(bruto);
    const entradas = data._type === 'playlist' && Array.isArray(data.entries) ? data.entries : [data];
    const items = entradas.map(normalizarEntrada).filter((i) => i.esVideo);
    if (!items.length) throw new Error('Ese enlace no contiene ningun video (puede ser solo una foto).');
    json(res, 200, { ok: true, code: entrada.code, items: items }, cabeceras);
}

async function apiDescarga(res, entrada, index, cabeceras) {
    const base = path.join(os.tmpdir(), 'igdl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
    await ejecutarYtdlp([
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

    // Lo primero de todo: si la peticion viene de una web que no esta en la
    // lista, se corta aqui y no se hace ningun trabajo.
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
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Max-Age': '86400',
        }, cabeceras));
        return res.end();
    }

    if (u.pathname === '/api/estado') {
        return json(res, 200, { ok: true, ytdlp: ytdlp ? ytdlp.version : null }, cabeceras);
    }

    if (u.pathname === '/api/info' || u.pathname === '/api/descargar') {
        if (!ytdlp) {
            return json(res, 503, { ok: false, error: 'yt-dlp no esta instalado. Ejecuta: python -m pip install -U yt-dlp' }, cabeceras);
        }
        const entrada = parseIgUrl(u.searchParams.get('url') || '');
        if (!entrada) {
            return json(res, 400, { ok: false, error: 'El enlace no es de Instagram. Debe ser del tipo instagram.com/reel/... o instagram.com/p/...' }, cabeceras);
        }
        try {
            if (u.pathname === '/api/info') return await apiInfo(res, entrada, cabeceras);
            const index = Math.max(0, parseInt(u.searchParams.get('index') || '0', 10) || 0);
            return await apiDescarga(res, entrada, index, cabeceras);
        } catch (e) {
            console.error('[error]', e.message);
            if (res.headersSent) return res.destroy();
            return json(res, 502, { ok: false, error: mensajeError(e.message) }, cabeceras);
        }
    }

    if (u.pathname === '/' || u.pathname === '/index.html' || u.pathname === '/Instagram_Downloader.html') {
        return fs.readFile(HTML_FILE, (err, buf) => {
            if (err) {
                res.writeHead(500);
                return res.end('No se encuentra Instagram_Downloader.html');
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(buf);
        });
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404');
});

detectarYtdlp().then((r) => {
    ytdlp = r;
    servidor.listen(PORT, '127.0.0.1', () => {
        console.log('');
        console.log('  Instagram Downloader - servidor local');
        console.log('  --------------------------------------');
        console.log('  Abre:   http://localhost:' + PORT);
        console.log('  yt-dlp: ' + (r ? r.version + ' (' + r.cmd + ')' : 'NO ENCONTRADO -> python -m pip install -U yt-dlp'));
        console.log('  Para parar el servidor: Ctrl + C');
        console.log('');
    });
});
