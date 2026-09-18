#!/usr/bin/env node
// Revisión compartida por el hook de pre-commit y el CI de GitHub Actions.
// Vive en un único sitio a propósito: la auditoría de seguridad señaló que
// tener dos copias de las mismas reglas es como tener dos copias del mismo
// archivo — divergen, y la divergencia fue la causa de la última fuga.
//
// Modos:
//   --staged        revisa lo que hay en el índice (usado por el hook)
//   --diff <base>   revisa los commits nuevos respecto a <base> (CI en PR)
//   --all           revisa el estado completo del repo (CI en push/manual)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();

const rojo = s => `\x1b[31m${s}\x1b[0m`;
const verde = s => `\x1b[32m${s}\x1b[0m`;

let fallos = 0;
function fallo(msg) {
    console.error(rojo(`[revisar] ${msg}`));
    fallos++;
}

// ---------------------------------------------------------------- opciones
const argv = process.argv.slice(2);
let mode = null;
let base = null;
if (argv.includes('--staged')) mode = 'staged';
const diffIdx = argv.indexOf('--diff');
if (diffIdx !== -1) {
    mode = 'diff';
    base = argv[diffIdx + 1];
}
if (argv.includes('--all')) mode = 'all';

const bloqueIdx = argv.indexOf('--bloque');
const bloque = bloqueIdx !== -1 ? argv[bloqueIdx + 1] : 'todo'; // 'fugas' | 'sanidad' | 'todo'

if (!mode || (mode === 'diff' && !base) || !['fugas', 'sanidad', 'todo'].includes(bloque)) {
    console.error('Uso: node scripts/revisar.mjs (--staged | --diff <base> | --all) [--bloque fugas|sanidad]');
    process.exit(2);
}

// -------------------------------------------------------------- utilidades
function git(args) {
    const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 });
    return r.stdout || '';
}

if (mode === 'diff') {
    const ok = spawnSync('git', ['rev-parse', '--verify', base], { cwd: ROOT }).status === 0;
    if (!ok) {
        console.error(`No se encuentra la referencia base "${base}". ¿Está el repo con el historial completo (fetch-depth: 0)?`);
        process.exit(2);
    }
}

function listaArchivos() {
    if (mode === 'staged') {
        return git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']).split('\n').filter(Boolean);
    }
    if (mode === 'diff') {
        return git(['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`]).split('\n').filter(Boolean);
    }
    return git(['ls-files']).split('\n').filter(Boolean);
}

// Líneas realmente añadidas por el cambio (staged/diff). Para --all no existe
// "lo añadido": se revisa el archivo completo tal cual está hoy.
function lineasAnadidas() {
    const raw = mode === 'staged'
        ? git(['diff', '--cached', '-U0'])
        : git(['diff', '-U0', `${base}...HEAD`]);

    const out = [];
    let file = null;
    let lineNo = null;
    for (const l of raw.split('\n')) {
        if (l.startsWith('+++ ')) {
            file = l.slice(4) === '/dev/null' ? null : l.slice(6); // "+++ b/ruta"
            continue;
        }
        if (l.startsWith('@@')) {
            const m = /\+(\d+)/.exec(l);
            lineNo = m ? parseInt(m[1], 10) : null;
            continue;
        }
        if (l.startsWith('+') && file && lineNo !== null) {
            out.push({ file, line: lineNo, text: l.slice(1) });
            lineNo++;
        }
    }
    return out;
}

// Contenido completo actual de una lista de archivos, línea a línea.
// En --staged se lee del índice (lo que de verdad se va a commitear), no del
// árbol de trabajo, para que un `git add -f` no se escape por tener el
// archivo modificado en disco después de añadirlo.
function contenidoCompleto(archivos) {
    const out = [];
    for (const file of archivos) {
        let texto;
        if (mode === 'staged') {
            const r = spawnSync('git', ['show', `:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 });
            if (r.status !== 0) continue;
            texto = r.stdout;
        } else {
            const abs = path.join(ROOT, file);
            if (!fs.existsSync(abs)) continue;
            try { texto = fs.readFileSync(abs, 'utf8'); } catch { continue; }
        }
        texto.split('\n').forEach((text, i) => out.push({ file, line: i + 1, text }));
    }
    return out;
}

console.log(`[revisar] modo: ${mode}${base ? ` (base ${base})` : ''}`);

const archivos = listaArchivos();

// ======================================================== BLOQUE «FUGAS» =
// Lo que la auditoría del 2026-09-05 encontró, para que no vuelva.
if (bloque !== 'sanidad') {

// 1) Aplicaciones solo-locales: nunca deben publicarse.
for (const f of archivos) {
    if (/^apps\/estructura(\.html|\/)/.test(f)) {
        fallo(`${f}: es una aplicación solo-local (describe esta máquina y esta casa) y no puede publicarse. Se ejecuta con \`npm run dev\` -> http://127.0.0.1:3000.`);
    }
}

// 2-4) Rutas absolutas de Windows, el hash filtrado y patrones de credencial.
// En --all se mira el archivo completo; en --staged/--diff, solo lo añadido
// por el cambio (así no se bloquea por algo que ya estaba antes).
// Partido en dos trozos para que este propio archivo no se detecte a sí mismo.
const HASH_FILTRADO = '07aec214ed14010f3b309e4f70f01cbc13693d5b94f29417be473bd' + 'beb620e5f';
const PATRONES_CREDENCIAL = [
    { nombre: 'una clave privada PEM', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
    { nombre: 'una clave de acceso de AWS', re: /AKIA[0-9A-Z]{16}/ },
    { nombre: 'un token de GitHub', re: /(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})/ },
    { nombre: 'un token de Slack', re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
    { nombre: 'una clave de Google API', re: /AIza[0-9A-Za-z_-]{35}/ },
];

const lineasFugas = mode === 'all' ? contenidoCompleto(archivos) : lineasAnadidas();
for (const { file, line, text } of lineasFugas) {
    if (/C:\\+Users\\+[A-Za-z]/.test(text)) {
        fallo(`${file}:${line}: hay una ruta absoluta de Windows (C:\\Users\\...).`);
    }
    if (text.includes(HASH_FILTRADO)) {
        fallo(`${file}:${line}: ha vuelto a aparecer el hash de contraseña que se filtró.`);
    }
    for (const { nombre, re } of PATRONES_CREDENCIAL) {
        if (re.test(text)) fallo(`${file}:${line}: parece haber ${nombre}.`);
    }
}

// 5) Heurística de inventario doméstico: la forma exacta que tenía la fuga
// de Red Hogar. Se mira siempre el archivo completo, no solo lo añadido,
// porque lo que importa es cómo queda el archivo, no cómo llegó ahí.
const contenidoIP = mode === 'all' ? lineasFugas : contenidoCompleto(archivos);
{
    const ipsPorArchivo = new Map();
    for (const { file, text } of contenidoIP) {
        const m = text.match(/\b192\.168\.\d{1,3}\.\d{1,3}\b/g);
        if (!m) continue;
        if (!ipsPorArchivo.has(file)) ipsPorArchivo.set(file, 0);
        ipsPorArchivo.set(file, ipsPorArchivo.get(file) + m.length);
    }
    for (const [file, n] of ipsPorArchivo) {
        if (/^apps\/estructura(\.html|\/)/.test(file)) continue;
        if (n >= 5) {
            fallo(`${file}: contiene ${n} direcciones IP privadas (192.168.x.x) — la misma forma que tenía la fuga de Red Hogar.`);
        }
    }
}

// 6) gitleaks, si está instalado. Los comandos `detect`/`protect` están
// deprecados desde la v8.19; se usan los actuales `git` y `dir`.
{
    const hayGitleaks = spawnSync('gitleaks', ['version'], { encoding: 'utf8' }).status === 0;
    if (!hayGitleaks) {
        console.log('[revisar] gitleaks no está instalado; solo se aplican los patrones básicos de arriba. Instálalo con: winget install gitleaks');
    } else {
        const configPath = path.join(ROOT, '.gitleaks.toml');
        const conConfig = fs.existsSync(configPath) ? ['--config', configPath] : [];
        let args;
        if (mode === 'staged') args = ['git', '--pre-commit', '--staged', '--redact', '--no-banner', ...conConfig];
        else if (mode === 'diff') args = ['git', `--log-opts=${base}..HEAD`, '--redact', '--no-banner', ...conConfig];
        else args = ['dir', '.', '--redact', '--no-banner', ...conConfig];

        const r = spawnSync('gitleaks', args, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
        if (r.status !== 0) fallo('gitleaks ha encontrado algo. Revísalo arriba antes de continuar.');
    }
}

} // bloque fugas

// ======================================================= BLOQUE «SANIDAD» =
// Lo que se rompió al editar: etiquetas huérfanas y enlaces a archivos que
// ya no existen. Alcance fijo: index.html, 404.html y los .html de primer
// nivel de apps/ y servicios/ (no servicios/sistemas/uiverse/**, que son 200+
// fragmentos de biblioteca en marcha).
function archivosSanidad() {
    const candidatos = [];
    for (const f of ['index.html', '404.html']) {
        if (fs.existsSync(path.join(ROOT, f))) candidatos.push(f);
    }
    for (const dir of ['apps', 'servicios']) {
        const abs = path.join(ROOT, dir);
        if (!fs.existsSync(abs)) continue;
        for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
            if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
                candidatos.push(`${dir}/${entry.name}`);
            }
        }
    }
    return candidatos.filter(f => f !== 'apps/estructura.html');
}

function revisarScriptsInline(archivo, contenido) {
    const re = /<script(?![^>]*\bsrc=)(?![^>]*\btype=["'][^"']*json)[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(contenido))) {
        const inner = m[1];
        if (!inner.trim()) continue;

        const antes = contenido.slice(0, m.index);
        const lineaInicio = antes.split('\n').length;
        const esModulo = /\b(import|export)\b/.test(inner.slice(0, 200));
        const ext = esModulo ? '.mjs' : '.js';
        const tmp = path.join(os.tmpdir(), `revisar-${process.pid}-${Math.random().toString(36).slice(2)}${ext}`);

        // Se rellena con líneas en blanco hasta lineaInicio para que el número
        // de línea que reporte `node --check` coincida con el del HTML original.
        fs.writeFileSync(tmp, '\n'.repeat(lineaInicio) + inner, 'utf8');
        const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
        fs.unlinkSync(tmp);

        if (r.status !== 0) {
            const primeraLinea = (r.stderr || '').trim().split('\n')[0];
            fallo(`${archivo}: error de sintaxis en un <script> interno — ${primeraLinea}`);
        }
    }
}

// El contenido de <script> es JS, no marcado: puede mencionar "href=" o
// "src=" dentro de cadenas de texto (ejemplos, plantillas) sin que sea un
// enlace real. Se blanquea preservando saltos de línea para no desajustar
// los números de línea de los avisos.
function quitarScripts(contenido) {
    return contenido.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, m => m.replace(/[^\n]/g, ' '));
}

function revisarEnlaces(archivo, contenido) {
    const dir = path.dirname(archivo);
    const re = /\b(?:href|src)\s*=\s*"([^"]*)"/gi;
    let m;
    while ((m = re.exec(contenido))) {
        const url = m[1].trim();
        if (!url) continue;
        if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(url)) continue; // http(s):// o //cdn...
        if (/^(mailto|tel|data|javascript):/i.test(url)) continue;
        if (url.startsWith('#')) continue;

        const sinFragmento = url.split('#')[0].split('?')[0];
        if (!sinFragmento) continue;

        const destino = url.startsWith('/')
            ? path.normalize(path.join(ROOT, sinFragmento))
            : path.normalize(path.join(ROOT, dir, decodeURIComponent(sinFragmento)));

        if (!destino.startsWith(ROOT)) continue; // fuera del repo: no es cosa nuestra

        if (!fs.existsSync(destino)) {
            const linea = contenido.slice(0, m.index).split('\n').length;
            fallo(`${archivo}:${linea}: el enlace a "${url}" no apunta a ningún archivo existente.`);
        }
    }
}

if (bloque !== 'fugas') {
    for (const archivo of archivosSanidad()) {
        const abs = path.join(ROOT, archivo);
        const contenido = fs.readFileSync(abs, 'utf8');
        revisarScriptsInline(archivo, contenido);
        revisarEnlaces(archivo, quitarScripts(contenido));
    }
}

// ================================================================ resumen =
if (fallos > 0) {
    console.error(rojo(`\n[revisar] ${fallos} problema(s) encontrado(s).`));
    process.exit(1);
}
console.log(verde('[revisar] todo en orden.'));
