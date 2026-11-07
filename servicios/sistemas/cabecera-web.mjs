// Cabecera común de las páginas publicadas de servicios/sistemas/: canonical,
// Open Graph, favicon y aviso de cookies. La usan generar-fichas.mjs y
// generar-paletas.mjs; las páginas escritas a mano (configurador, elementos)
// llevan el mismo bloque copiado entre las marcas <!--@cabecera-->.
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function cabeceraWeb({ archivo, titulo, descripcion }) {
    const url = `https://rubenpantxo.com/servicios/sistemas/${archivo}`;
    return `<!--@cabecera-->
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Rubenpantxo.com">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="https://rubenpantxo.com/img/compartir.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../../favicon.ico" sizes="any">
<link rel="icon" href="../../img/favicon-32.png" type="image/png">
<link rel="apple-touch-icon" href="../../img/apple-touch-icon.png">
<script src="../../js/consentimiento.js" defer></script>
<!--/@cabecera-->
`;
}
