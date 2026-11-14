// Utilidades de interfaz compartidas.

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const eur = n => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
export const mm = unidades => (unidades * 2.54).toLocaleString('es-ES', { maximumFractionDigits: 1 });

const TRAZOS = {
    nuevo: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M12 12v6M9 15h6',
    abrir: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3zM3 10h18l-2 9H5z',
    guardar: 'M5 3h11l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM7 3v6h8V3M7 21v-7h10v7',
    exportar: 'M12 3v12M7 10l5 5 5-5M4 19h16',
    deshacer: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
    rehacer: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
    cursor: 'M5 3l14 7-6 2-2 6z',
    mano: 'M8 11V5a1.5 1.5 0 0 1 3 0v5M11 10V4a1.5 1.5 0 0 1 3 0v6M14 10V5.5a1.5 1.5 0 0 1 3 0V12M17 12V9a1.5 1.5 0 0 1 3 0v6a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-3l-3-5a1.5 1.5 0 0 1 2.5-1.5L8 13',
    girar: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
    duplicar: 'M9 9h11v11H9zM5 15H4V4h11v1',
    borrar: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
    mas: 'M12 5v14M5 12h14',
    menos: 'M5 12h14',
    encuadre: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
    rejilla: 'M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16',
    rotulo: 'M3 12l9-9h8v8l-9 9zM16 8h.01',
    esquema: 'M3 12h5l2-5 4 10 2-5h5',
    alerta: 'M12 3l9.5 17h-19zM12 10v4M12 17.5h.01',
    error: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9l6 6M15 9l-6 6',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5h.01',
    ok: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12.5l3 3 5-6',
    buscar: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
    chip: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
    mesa: 'M4 5h16v11H4zM2 20h20M9 16v4M15 16v4',
    proyectos: 'M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM9 13h6M12 10v6',
    calculadora: 'M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01',
    libro: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10',
    enlace: 'M14 5h5v5M19 5l-8 8M17 14v5H5V7h5',
    repo: 'M7 4v10M7 14a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17 5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17 10c0 4-4 4-10 4',
    hoja: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
    estrella: 'M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z',
    copiar: 'M9 9h11v11H9zM5 15H4V4h11v1',
    rayo: 'M13 2L4 14h7l-1 8 9-12h-7z',
    cerrar: 'M6 6l12 12M18 6L6 18',
    tema: 'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z',
    codigo: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
    lista: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
    red: 'M12 3v6M6 21v-6h12v6M12 9v6M4 21h4M16 21h4M10 3h4',
    flecha: 'M5 12h14M13 6l6 6-6 6',
    ojo: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'
};

export function hojaIconos() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">${Object.entries(TRAZOS).map(([n, d]) =>
        `<symbol id="i-${n}" viewBox="0 0 24 24"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></symbol>`).join('')}</svg>`;
}
export const ico = (n, clase = '') => `<svg class="ico ${clase}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

export function descargar(nombre, contenido, tipo = 'text/plain;charset=utf-8') {
    const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    // Solo se admite el enlace temporal del propio navegador: nunca una URL con código.
    if (!/^blob:/.test(url)) return;
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); return true; }
    catch {
        const t = document.createElement('textarea');
        t.value = texto; t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch { /* sin portapapeles */ }
        t.remove();
        return ok;
    }
}

export const nombreArchivo = t => (t || 'montaje').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) || 'montaje';

// Enlace externo seguro. Solo se admiten http(s).
export function enlace(url, texto, clase = '') {
    if (!/^https?:\/\//.test(url)) return esc(texto);
    return `<a class="${clase}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${texto}</a>`;
}

export const almacen = {
    leer(clave, defecto = null) {
        try { const v = localStorage.getItem('lab-studio:' + clave); return v == null ? defecto : JSON.parse(v); } catch { return defecto; }
    },
    guardar(clave, valor) {
        try { localStorage.setItem('lab-studio:' + clave, JSON.stringify(valor)); return true; } catch { return false; }
    }
};
