// ============================================================
// SECCIÓN SERVICIOS — interacciones
// - Tarjetas: inclinación 3D con el puntero, brillo y acento vivo.
// - Visor: la tarjeta se transforma en un móvil con la demo dentro
//   (View Transition API si existe; si no, una entrada con CSS).
// - Interruptor claro / oscuro de la sección.
// - Fallback de reveals para navegadores sin Scroll-driven
//   Animations nativas (animation-timeline: view()).
// - Formulario de contacto → Web3Forms si hay clave configurada,
//   si no, mailto (comportamiento de siempre, nunca se rompe).
// El fondo WebGL vive aparte (js/servicios-gl.js) y escucha los
// eventos sv:acento, sv:visor y sv:tema que se lanzan aquí.
// ============================================================
(() => {
    'use strict';
    const section = document.getElementById('servicios');
    if (!section) return;

    const ACENTO_BASE = '#7c6cff';
    const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)');
    const punteroFino = matchMedia('(hover: hover) and (pointer: fine)');

    // Lo justo para el visor: el resto de cada negocio se ve probándolo.
    const DEMOS = {
        bar:       { nombre: 'Bar & Restaurante', inspira: 'Inspirado en las cartas de imprenta de toda la vida', rasgos: ['Mesa en 3D', 'Cuenta dividida', 'Reserva en el plano'], negocio: 'Bar / Restaurante' },
        ropa:      { nombre: 'Tienda de ropa', inspira: 'Inspirado en las revistas de moda', rasgos: ['Prenda que se mueve', 'Probador por zonas', 'Revista que se compra'], negocio: 'Tienda de ropa' },
        carne:     { nombre: 'Carnicería', inspira: 'Inspirado en los mostradores del mercado de abastos', rasgos: ['Báscula en 3D', 'Papel que se pliega', 'Turno en directo'], negocio: 'Carnicería / Alimentación' },
        gym:       { nombre: 'Gimnasio & Entrenador', inspira: 'Inspirado en el marcador de una retransmisión deportiva', rasgos: ['Cuerpo en 3D', 'Series con récord', 'Clases sin colas'], negocio: 'Gimnasio / Entrenador personal' },
        super:     { nombre: 'Supermercado', inspira: 'Inspirado en Mercadona online · apps de inventario', rasgos: ['Recogida sin colas', 'Almacén con PIN 1234', 'Stock en tiempo real'], negocio: 'Supermercado / Comercio local' },
        granja:    { nombre: 'Granja', inspira: 'Inspirado en las cestas de huerta, las granjas escuela y la agricultura de precisión', rasgos: ['Finca en 3D', 'Cesta de temporada', 'Sensores en la maqueta'], negocio: 'Granja / Explotación agraria' },
        industria: { nombre: 'Industria', inspira: 'Inspirado en configuradores CAD, planos técnicos y gemelos digitales', rasgos: ['Pieza paramétrica 3D', 'Cotas que se estiran', 'Planta en gemelo'], negocio: 'Industria / Fábrica' },
        logistica: { nombre: 'Logística', inspira: 'Inspirado en los cuadros de mando de flota y las etiquetas de envío', rasgos: ['Mapa en relieve 3D', 'Caja que se mide', 'Firma en ruta'], negocio: 'Logística / Transporte' }
    };

    const cards = Array.from(section.querySelectorAll('.sv-card[data-demo]'));
    const deck = document.getElementById('sv-deck');

    /* ---------- Acento vivo (titular, halos, WebGL) ---------- */
    let acentoActual = ACENTO_BASE;
    let vueltaAcento = 0;
    function ponerAcento(hex) {
        clearTimeout(vueltaAcento);
        if (hex === acentoActual) return;
        acentoActual = hex;
        section.style.setProperty('--sv-acc', hex);
        section.dispatchEvent(new CustomEvent('sv:acento', { detail: hex }));
    }
    const acentoDe = card => card.style.getPropertyValue('--accent').trim() || ACENTO_BASE;

    /* ---------- Tarjetas: inclinación, brillo y paralaje ---------- */
    cards.forEach(card => {
        const caja = card.parentElement; // el <li> no se inclina: medirlo no realimenta el giro
        let px = 0, py = 0, frame = 0;

        const pintar = () => {
            frame = 0;
            card.style.setProperty('--px', px.toFixed(3));
            card.style.setProperty('--py', py.toFixed(3));
        };
        const soltar = () => {
            card.classList.remove('is-hover');
            px = 0; py = 0;
            if (!frame) frame = requestAnimationFrame(pintar);
        };

        card.addEventListener('pointerenter', e => {
            if (e.pointerType === 'mouse' || e.pointerType === 'pen') card.classList.add('is-hover');
            ponerAcento(acentoDe(card));
        });
        card.addEventListener('pointermove', e => {
            if (!punteroFino.matches || sinMovimiento.matches) return;
            const r = caja.getBoundingClientRect();
            px = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
            py = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
            if (!frame) frame = requestAnimationFrame(pintar);
        });
        card.addEventListener('pointerleave', soltar);
        card.addEventListener('focus', () => ponerAcento(acentoDe(card)));
        // En táctil no hay hover: la microinteracción se ve al pulsar
        card.addEventListener('touchstart', () => card.classList.add('is-hover'), { passive: true });
        card.addEventListener('touchend', () => setTimeout(soltar, 900), { passive: true });
    });
    if (deck) {
        deck.addEventListener('pointerleave', () => {
            clearTimeout(vueltaAcento);
            vueltaAcento = setTimeout(() => {
                if (!dialog || !dialog.open) ponerAcento(ACENTO_BASE);
            }, 450);
        });
    }

    /* ---------- Visor ---------- */
    const dialog = document.getElementById('sv-viewer');
    const el = id => document.getElementById(id);
    const info = dialog && dialog.querySelector('.sv-v-info');
    const phone = el('sv-v-phone');
    const screen = phone && phone.querySelector('.sv-v-screen');
    const frameDemo = el('sv-v-frame');
    const dots = el('sv-v-dots');
    let actual = -1;
    let cargaPendiente = 0;

    function rellenar(i) {
        const card = cards[i];
        const d = DEMOS[card.dataset.demo];
        const nombre = d ? d.nombre : card.querySelector('.sv-card-name').textContent;
        dialog.style.setProperty('--accent', acentoDe(card));
        el('sv-v-num').textContent = String(i + 1).padStart(2, '0');
        el('sv-v-name').textContent = nombre;
        el('sv-v-inspo').textContent = d ? d.inspira : '';
        const chips = el('sv-v-chips');
        chips.replaceChildren(...(d ? d.rasgos : []).map(t => {
            const li = document.createElement('li');
            li.textContent = t;
            return li;
        }));
        el('sv-v-open').href = card.getAttribute('href');
        frameDemo.title = 'Demo interactiva: ' + nombre;
        Array.from(dots.children).forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));

        // Reanima el bloque de texto en cada cambio
        info.classList.remove('is-swap');
        void info.offsetWidth;
        info.classList.add('is-swap');
    }

    function cargar(i) {
        const src = cards[i].getAttribute('href');
        screen.classList.remove('is-loaded');
        clearTimeout(cargaPendiente);
        frameDemo.src = src;
        // Si el load no llega (red lenta), no dejamos el cargador para siempre
        cargaPendiente = setTimeout(() => screen.classList.add('is-loaded'), 6000);
    }

    function mostrar(i, { conCarga = true } = {}) {
        const n = cards.length;
        i = ((i % n) + n) % n;
        actual = i;
        rellenar(i);
        if (conCarga) cargar(i);
        ponerAcento(acentoDe(cards[i]));
    }

    function cambiar(paso) {
        if (!dialog.open) return;
        screen.classList.add('is-out');
        // El destino se calcula al cambiar, no al pulsar: dos toques rápidos avanzan dos
        setTimeout(() => {
            screen.classList.remove('is-out');
            mostrar(actual + paso);
        }, sinMovimiento.matches ? 0 : 170);
    }

    function morph(antes, despues, actualizar) {
        const vt = document.startViewTransition && !sinMovimiento.matches;
        if (!vt) { actualizar(); return null; }
        antes.style.viewTransitionName = 'sv-morph';
        document.documentElement.classList.add('sv-vt-morph');
        let hecho = false;
        const t = document.startViewTransition(() => {
            hecho = true;
            antes.style.viewTransitionName = '';
            if (despues) despues.style.viewTransitionName = 'sv-morph';
            actualizar();
        });
        // Red de seguridad: en un equipo que tarda en capturar el fotograma,
        // se renuncia a la animación antes que dejar el clic sin respuesta
        setTimeout(() => { if (!hecho) t.skipTransition(); }, 350);
        t.finished.finally(() => {
            if (despues) despues.style.viewTransitionName = '';
            document.documentElement.classList.remove('sv-vt-morph');
        });
        return t;
    }

    function abrir(i) {
        if (!dialog || typeof dialog.showModal !== 'function') return false;
        if (dialog.open) { mostrar(i); return true; }
        const card = cards[i];
        mostrar(i);
        const t = morph(card, phone, () => {
            dialog.showModal();
            document.documentElement.classList.add('sv-locked');
        });
        if (!t && !sinMovimiento.matches) {
            dialog.classList.add('is-entering');
            setTimeout(() => dialog.classList.remove('is-entering'), 500);
        }
        section.dispatchEvent(new CustomEvent('sv:visor', { detail: true }));
        return true;
    }

    function cerrar() {
        if (!dialog.open) return;
        const card = cards[actual];
        const vaciar = () => {
            clearTimeout(cargaPendiente);
            frameDemo.src = 'about:blank';
            screen.classList.remove('is-loaded');
        };
        const t = morph(phone, card, () => {
            dialog.close();
            document.documentElement.classList.remove('sv-locked');
        });
        if (t) t.finished.finally(vaciar); else vaciar();
        section.dispatchEvent(new CustomEvent('sv:visor', { detail: false }));
        if (card) card.focus({ preventScroll: true });
    }

    if (dialog && cards.length) {
        // Puntos de navegación
        cards.forEach((card, k) => {
            const b = document.createElement('button');
            b.type = 'button';
            const d = DEMOS[card.dataset.demo];
            b.setAttribute('aria-label', 'Ver ' + (d ? d.nombre : card.dataset.demo));
            b.addEventListener('click', () => {
                if (k === actual) return;
                cambiar(k - actual);
            });
            dots.appendChild(b);
        });

        cards.forEach((card, k) => {
            card.addEventListener('click', e => {
                // Ctrl/Cmd/Mayús o botón central: que el navegador abra la demo como siempre
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                if (abrir(k)) e.preventDefault();
            });
        });

        frameDemo.addEventListener('load', () => {
            if (!frameDemo.src || frameDemo.src === 'about:blank') return;
            clearTimeout(cargaPendiente);
            screen.classList.add('is-loaded');
        });

        el('sv-v-prev').addEventListener('click', () => cambiar(-1));
        el('sv-v-next').addEventListener('click', () => cambiar(1));
        el('sv-v-close').addEventListener('click', cerrar);
        dialog.addEventListener('cancel', e => { e.preventDefault(); cerrar(); });
        dialog.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft') { e.preventDefault(); cambiar(-1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); cambiar(1); }
        });
        // Clic en el vacío (fuera del móvil y del texto) cierra
        el('sv-v-inner').addEventListener('click', e => {
            if (e.target === e.currentTarget || e.target.classList.contains('sv-v-stage')) cerrar();
        });

        // "Quiero una así": cierra, elige el negocio en el formulario y baja hasta él
        el('sv-v-want').addEventListener('click', () => {
            const card = cards[actual];
            const d = card && DEMOS[card.dataset.demo];
            cerrar();
            const select = el('sv-negocio');
            if (select && d) {
                const opcion = Array.from(select.options).find(o => o.text === d.negocio);
                if (opcion) select.value = opcion.value;
                select.classList.remove('is-picked');
                void select.offsetWidth;
                select.classList.add('is-picked');
            }
            const contacto = el('sv-contact');
            setTimeout(() => {
                if (contacto) contacto.scrollIntoView({ behavior: sinMovimiento.matches ? 'auto' : 'smooth', block: 'start' });
                const nombre = el('sv-nombre');
                if (nombre) setTimeout(() => nombre.focus({ preventScroll: true }), 650);
            }, 120);
        });
    }

    /* ---------- Interruptor claro / oscuro ---------- */
    const tema = document.getElementById('sv-theme');
    const etiquetaTema = document.getElementById('sv-theme-label');
    function aplicarTema(oscuro, guardar) {
        section.dataset.svTema = oscuro ? 'oscuro' : 'claro';
        if (tema) tema.setAttribute('aria-checked', oscuro ? 'true' : 'false');
        if (etiquetaTema) etiquetaTema.textContent = oscuro ? 'Oscuro' : 'Claro';
        section.dispatchEvent(new CustomEvent('sv:tema', { detail: oscuro ? 'oscuro' : 'claro' }));
        if (guardar) {
            try { localStorage.setItem('sv-tema', oscuro ? 'oscuro' : 'claro'); } catch (err) { /* modo privado */ }
        }
    }
    let temaGuardado = null;
    try { temaGuardado = localStorage.getItem('sv-tema'); } catch (err) { /* modo privado */ }
    aplicarTema(temaGuardado !== 'claro', false);
    if (tema) {
        // Sin View Transition: los colores ya transicionan en CSS y así el
        // interruptor responde en el mismo fotograma del clic
        tema.addEventListener('click', () => aplicarTema(tema.getAttribute('aria-checked') !== 'true', true));
    }

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
