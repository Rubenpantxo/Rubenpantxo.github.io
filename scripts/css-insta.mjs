#!/usr/bin/env node
// Compila el Tailwind del Instagram Downloader y lo mete en el
// <style id="tailwind"> de apps/instagram-downloader/index_insta_down.html.
// Uso: npm run css:insta
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HTML = 'apps/instagram-downloader/index_insta_down.html';
const tmp = path.join(os.tmpdir(), 'insta-tailwind-' + process.pid + '.css');
// tailwindcss es la versión fijada en package.json (npm install)
execSync(`npx --no-install tailwindcss -c tailwind.insta.config.js -i CSS/tailwind.entrada.css -o "${tmp}" --minify`, { stdio: 'inherit' });
const css = fs.readFileSync(tmp, 'utf8').trim();
fs.unlinkSync(tmp);

const html = fs.readFileSync(HTML, 'utf8');
const patron = /<style id="tailwind">[\s\S]*?<\/style>/;
if (!patron.test(html)) throw new Error('No encuentro <style id="tailwind"> en ' + HTML);
fs.writeFileSync(HTML, html.replace(patron, () => '<style id="tailwind">' + css + '</style>'));
console.log('Tailwind incrustado: ' + Math.round(css.length / 1024) + ' KB');
