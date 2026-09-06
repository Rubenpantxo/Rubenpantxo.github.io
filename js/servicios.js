// ============================================================
// SECCIÓN SERVICIOS — interacciones
// - Fallback de reveals para navegadores sin Scroll-driven
//   Animations nativas (animation-timeline: view()).
// - Formulario de contacto → Web3Forms si hay clave configurada,
//   si no, mailto (comportamiento de siempre, nunca se rompe).
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

    /* ---------- Formulario de contacto ---------- */
    const form = document.getElementById('sv-contact-form');
    if (form) {
        const MARCADOR_SIN_CLAVE = 'TU_CLAVE_DE_WEB3FORMS_AQUI';
        const accessKeyInput = form.querySelector('input[name="access_key"]');
        const accessKey = ((accessKeyInput && accessKeyInput.value) || '').trim();
        const hayClaveWeb3Forms = accessKey && accessKey !== MARCADOR_SIN_CLAVE;

        const note = document.getElementById('sv-form-note');
        const status = document.getElementById('sv-form-status');
        const submitBtn = form.querySelector('.sv-submit');

        function enviarPorMailto(data) {
            const nombre = (data.get('nombre') || '').toString().trim() || 'Un futuro cliente';
            const negocio = (data.get('negocio') || 'Otro').toString();
            const mensaje = (data.get('mensaje') || '').toString().trim();
            const email = (data.get('email') || '').toString().trim();

            const subject = `💡 Idea de web/app — ${negocio} (${nombre})`;
            const body =
                `Hola Rubén,\n\n` +
                `Soy ${nombre} y tengo un negocio de tipo: ${negocio}.\n` +
                (email ? `Mi correo: ${email}\n\n` : `\n`) +
                `Mi idea:\n${mensaje}\n\n` +
                `¿Hablamos?\n`;

            window.location.href =
                'mailto:rubenpantxo@gmail.com' +
                '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(body);

            if (note) note.textContent = '✉️ Abriendo tu aplicación de correo con el mensaje preparado…';
        }

        async function enviarPorWeb3Forms(data) {
            if (submitBtn) submitBtn.disabled = true;
            if (status) {
                status.textContent = 'Enviando…';
                status.className = 'sv-form-status';
            }
            try {
                const respuesta = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(Object.fromEntries(data.entries()))
                });
                const json = await respuesta.json();
                if (!json.success) throw new Error(json.message || 'Error desconocido');

                if (status) {
                    status.textContent = '✅ Idea enviada. Te responderé pronto.';
                    status.classList.add('is-success');
                }
                form.reset();
            } catch (err) {
                if (status) {
                    status.textContent = '❌ No se pudo enviar. Escríbeme a rubenpantxo@gmail.com.';
                    status.classList.add('is-error');
                }
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        }

        form.addEventListener('submit', e => {
            e.preventDefault();
            const data = new FormData(form);
            if (hayClaveWeb3Forms) {
                enviarPorWeb3Forms(data);
            } else {
                enviarPorMailto(data);
            }
        });
    }
})();
