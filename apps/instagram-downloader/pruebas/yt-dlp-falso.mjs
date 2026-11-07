// yt-dlp de mentira para las pruebas: no sale a internet. Lo que devuelve
// depende del código del enlace (instagram.com/reel/<CODIGO>/):
//   FOTO   → un post sin vídeo
//   FALLA  → error de «login required», como cuando Instagram pide sesión
//   LENTO  → tarda 1,5 s (para probar el tope de descargas simultáneas)
//   otro   → un reel con vídeo
import fs from 'node:fs';

const args = process.argv.slice(2);
if (args.includes('--version')) {
    console.log('2099.01.01-falso');
    process.exit(0);
}

const url = args[args.length - 1] || '';
const codigo = (url.match(/\/(?:p|reel|tv)\/([^/]+)/) || [])[1] || '';

if (codigo === 'FALLA') {
    console.error('ERROR: [Instagram] ' + codigo + ': login required');
    process.exit(1);
}
if (codigo === 'LENTO') await new Promise((r) => setTimeout(r, 1500));

const iO = args.indexOf('-o');
if (iO >= 0) {
    // Descarga: escribe un «mp4» pequeño donde diga la plantilla -o
    fs.writeFileSync(args[iO + 1].replace('%(ext)s', 'mp4'), Buffer.from('ftypmp42 video de prueba'));
    process.exit(0);
}

const video = {
    title: 'Reel de prueba',
    uploader: 'cuenta_prueba',
    description: 'Descripción con <b>etiquetas</b> y "comillas"',
    thumbnail: 'https://scontent.cdninstagram.com/miniatura.jpg',
    duration: 12.5,
    height: 1280,
    vcodec: 'avc1'
};
console.log(JSON.stringify(codigo === 'FOTO'
    ? { title: 'Foto', thumbnail: 'https://scontent.cdninstagram.com/foto.jpg', vcodec: 'none', formats: [] }
    : video));
