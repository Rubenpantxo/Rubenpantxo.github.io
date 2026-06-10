// ============================================================
// SECCIÓN SERVICIOS — interacciones
// - Fallback de reveals para navegadores sin Scroll-driven
//   Animations nativas (animation-timeline: view()).
// - Formulario de contacto → abre el correo con el mensaje listo.
// ============================================================
(() => {
    'use strict';
    const section = document.getElementById('servicios');
    if (!section) return;

    /* ---------- Fallback de scroll-reveal ---------- */
    const nativeScrollTimeline = CSS.supports('animation-timeline: view()');
    if (!nativeScrollTimeline && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('sv-in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        section.querySelectorAll('.sv-reveal').forEach(el => io.observe(el));
    }

    /* ---------- Formulario de contacto → mailto ---------- */
    const form = document.getElementById('sv-contact-form');
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const data = new FormData(form);
            const nombre = (data.get('nombre') || '').toString().trim() || 'Un futuro cliente';
            const negocio = (data.get('negocio') || 'Otro').toString();
            const mensaje = (data.get('mensaje') || '').toString().trim();

            const subject = `💡 Idea de web/app — ${negocio} (${nombre})`;
            const body =
                `Hola Rubén,\n\n` +
                `Soy ${nombre} y tengo un negocio de tipo: ${negocio}.\n\n` +
                `Mi idea:\n${mensaje}\n\n` +
                `¿Hablamos?\n`;

            window.location.href =
                'mailto:rubenpantxo@gmail.com' +
                '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(body);

            const note = document.getElementById('sv-form-note');
            if (note) note.textContent = '✉️ Abriendo tu aplicación de correo con el mensaje preparado…';
        });
    }
})();
