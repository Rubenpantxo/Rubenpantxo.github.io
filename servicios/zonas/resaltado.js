// ============================================================
// ZONA 04 · Resaltado de código mínimo para el explorador del
// entregable. Se importa solo al abrir un archivo de código, así el
// explorador no carga nada de esto hasta que hace falta.
// Cubre JS, CSS y HTML de los ejemplos: no pretende ser un parser.
// ============================================================

const escapar = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const REGLAS = {
    js: [
        ['com', /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
        ['str', /`(?:\\[\s\S]|[^`\\])*`|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/y],
        ['kw', /\b(?:import|from|export|const|let|var|function|return|if|else|await|async|new|throw|try|catch|for|of|in|while|default|class|extends|typeof)\b/y],
        ['lit', /\b(?:true|false|null|undefined|this)\b|\b\d+(?:\.\d+)?\b/y],
        ['fn', /\b[A-Za-z_$][\w$]*(?=\s*\()/y]
    ],
    css: [
        ['com', /\/\*[\s\S]*?\*\//y],
        ['str', /'[^'\n]*'|"[^"\n]*"/y],
        ['kw', /--[\w-]+|@[\w-]+/y],
        ['fn', /[.#:]?[A-Za-z][\w-]*(?=\s*[{,])/y],
        ['attr', /[A-Za-z-]+(?=\s*:)/y],
        ['lit', /#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|%|s|ms)?\b/y]
    ],
    html: [
        ['com', /<!--[\s\S]*?-->/y],
        ['kw', /<\/?[A-Za-z][\w-]*|\/?>|<!doctype[^>]*>/iy],
        ['attr', /\b[a-z-]+(?==)/y],
        ['str', /"[^"]*"|'[^']*'/y]
    ]
};
REGLAS.mjs = REGLAS.js;

export function resaltar(texto, lenguaje) {
    const reglas = REGLAS[lenguaje];
    if (!reglas) return escapar(texto);
    let html = '';
    let i = 0;
    let llano = '';
    while (i < texto.length) {
        let hecho = false;
        for (const [clase, re] of reglas) {
            re.lastIndex = i;
            const m = re.exec(texto);
            if (m && m[0].length) {
                if (llano) { html += escapar(llano); llano = ''; }
                html += `<span class="ent-t-${clase}">${escapar(m[0])}</span>`;
                i += m[0].length;
                hecho = true;
                break;
            }
        }
        if (!hecho) {
            // Avanza una palabra entera o un carácter suelto, para no
            // resaltar «fn» dentro de un identificador más largo.
            const palabra = /[\w$]+/y;
            palabra.lastIndex = i;
            const m = palabra.exec(texto);
            const trozo = m ? m[0] : texto[i];
            llano += trozo;
            i += trozo.length;
        }
    }
    if (llano) html += escapar(llano);
    return html;
}
