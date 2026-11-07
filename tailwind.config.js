// Tailwind de la portada, compilado a CSS/tailwind.css con `npm run css`.
// Antes se usaba el CDN de desarrollo (cdn.tailwindcss.com), que descarga
// ~400 KB de JS y genera el CSS en el navegador en cada visita. Si añades
// clases de Tailwind nuevas a index.html, vuelve a ejecutar `npm run css`.
module.exports = {
    content: ['./index.html', './js/*.js'],
    theme: { extend: {} },
    plugins: []
};
