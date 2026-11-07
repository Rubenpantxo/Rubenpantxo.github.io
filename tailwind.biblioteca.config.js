// Tailwind de la Biblioteca, compilado a apps/biblioteca/biblioteca.css con
// `npm run css:biblioteca`. Sustituye al CDN de desarrollo (cdn.tailwindcss.com),
// que descargaba ~400 KB de JS y generaba el CSS en el navegador.
module.exports = {
    content: ['./apps/biblioteca/biblioteca.jsx'],
    theme: { extend: {} },
    plugins: []
};
