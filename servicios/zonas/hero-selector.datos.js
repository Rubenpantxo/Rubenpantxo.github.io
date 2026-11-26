// ============================================================
// ZONA 01 · HERO Y SELECTOR — textos de cada perfil
// Aquí se edita el copy sin tocar la lógica (hero-selector.js).
//
// OJO: el perfil por defecto ('web') también está escrito a mano en
// index.html (dentro de <header class="sv-hero">) para que el hero se
// pinte sin esperar al JS. Si cambias sus textos aquí, cámbialos allí.
//
// Plazos: rangos orientativos y honestos, con una línea de qué dependen.
// Prueba social: solo hechos comprobables en la propia web.
// ============================================================

/** Orden de las pestañas: primero lo que más se busca y más se vende. */
export const ORDEN = ['web', '3d', 'automatizacion'];

/** Perfil activo si no llega otro por la URL (?perfil=) ni por la sesión. */
export const DEFECTO = 'web';

/** Alias admitidos en ?perfil= para enlaces de campaña cortos. */
export const ALIAS = {
    app: 'web', webapp: 'web',
    webgl: '3d', visualizacion: '3d',
    auto: 'automatizacion', ia: 'automatizacion', edge: 'automatizacion'
};

export const PERFILES = {
    web: {
        // Pestaña
        etiqueta: 'Una web o app',
        micro: 'Para vender, reservar o gestionar tu negocio',
        icono: 'web',
        acento: '#7c6cff',
        // Hero
        antetitulo: 'Webs & apps a medida',
        titulo: ['Tu negocio,', 'en una app.'],
        subtitulo: 'Hecha a la medida de cómo trabajas, sin plantillas ni cuotas por usuario. El código es tuyo desde el primer día.',
        plazo: '4–10 semanas',
        plazoDepende: 'según cuántas pantallas tenga y si se conecta con tu TPV, stock o reservas',
        prueba: '8 demos de negocio que puedes probar ahora mismo',
        cta: { texto: 'Quiero ver demos de mi sector', accion: 'demos', href: '#sv-deck' },
        // «presupuesto» baja al configurador de alcance (#sv-configurador) si está; si no, al contacto
        cta2: { texto: 'Pedir mi presupuesto', accion: 'presupuesto', href: '#contacto' },
        // Banco de titulares para futuras pruebas A/B (no se muestran)
        titularesAlternativos: [
            ['Tu negocio,', 'en el bolsillo de tus clientes.'],
            ['Tu app a medida,', 'en producción en semanas.'],
            ['Menos llamadas,', 'más pedidos.']
        ]
    },
    '3d': {
        etiqueta: 'Mi producto en 3D',
        micro: 'Que tu cliente lo gire, lo configure y lo pida',
        icono: '3d',
        acento: '#4ce0b3',
        antetitulo: 'Visualización 3D · WebGL',
        titulo: ['Tu producto,', 'en 3D.'],
        subtitulo: 'Se abre en el navegador del móvil, sin instalar nada. Tu cliente lo gira, cambia medidas y colores, y lo entiende antes de comprar.',
        plazo: '3–8 semanas',
        plazoDepende: 'según si ya tienes los modelos 3D o hay que crearlos',
        prueba: 'Cada una de las 8 demos gira alrededor de un objeto 3D en tiempo real',
        cta: { texto: 'Quiero ver ejemplos 3D', accion: 'demo', demo: 'industria', href: 'servicios/industria.html' },
        cta2: { texto: 'Contarte mi producto', accion: 'contacto', href: '#contacto' },
        titularesAlternativos: [
            ['Que lo vean', 'antes de comprarlo.'],
            ['Tu catálogo,', 'en tres dimensiones.'],
            ['Menos devoluciones,', 'más certezas.']
        ]
    },
    automatizacion: {
        etiqueta: 'Automatizar tareas',
        micro: 'Pedidos, avisos e informes que salen solos',
        icono: 'automatizacion',
        acento: '#ffb648',
        antetitulo: 'Automatización · IA en tu equipo',
        titulo: ['Tu rutina,', 'en automático.'],
        subtitulo: 'Conecto lo que ya usas (Excel, correo, TPV o sensores) para que lo repetitivo se haga solo. Sin cambiar tu forma de trabajar y con tus datos en casa.',
        plazo: '2–6 semanas',
        plazoDepende: 'según cuántos programas haya que conectar',
        prueba: 'Si los datos no deben salir de tu negocio, la IA puede funcionar en tu propio equipo',
        cta: { texto: 'Quiero automatizar una tarea', accion: 'contacto', href: '#contacto' },
        cta2: { texto: 'Ver un ejemplo', accion: 'demo', demo: 'logistica', href: 'servicios/logistica.html' },
        titularesAlternativos: [
            ['Lo repetitivo,', 'que se haga solo.'],
            ['Menos papeleo,', 'más negocio.'],
            ['Tus horas,', 'de vuelta.']
        ]
    }
};
