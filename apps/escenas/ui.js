/* ============================================================
   UI — estado de la aplicación, paneles y persistencia.
   Es la única pieza que toca el DOM: escena.js dibuja,
   encuadre.js calcula y prompt.js redacta.
   ============================================================ */

(function () {
    'use strict';

    var CLAVE = 'escenas:v1';
    var MAX_SUJETOS = 3;

    var ASPECTOS = [
        { etiqueta: '16:9', valor: 16 / 9 },
        { etiqueta: '2.39:1', valor: 2.39 },
        { etiqueta: '1:1', valor: 1 },
        { etiqueta: '9:16', valor: 9 / 16 }
    ];

    /* ------------------------------------------------------------
       ESTADO
       ------------------------------------------------------------ */
    function estadoInicial() {
        return {
            sujetos: [
                { nombre: 'Sujeto 1', x: -0.9, z: -0.4, rot: 0, descripcion: '' },
                { nombre: 'Sujeto 2', x: 1.1, z: -0.6, rot: -20, descripcion: '' }
            ],
            enfoque: 0,
            camara: {
                x: 0, z: 3.0, altura: 1.35, fov: 45, mira: 1.35,
                objetivoX: null, objetivoZ: null
            },
            vista: 'cenital',
            aspectoIndice: 0,
            etiquetas: true,
            planoActivo: null,
            prompt: {
                salida: 'video',
                modelo: 'veo31',
                hojaPersonaje: false,
                refEntorno: false,
                idioma: 'es'
            }
        };
    }

    var estado = cargar() || estadoInicial();

    /* Campos derivados que leen encuadre.js y prompt.js */
    function refrescarDerivados() {
        var a = ASPECTOS[estado.aspectoIndice] || ASPECTOS[0];
        estado.aspecto = a.valor;
        estado.aspectoEtiqueta = a.etiqueta;
    }
    refrescarDerivados();

    /* ------------------------------------------------------------
       DOM
       ------------------------------------------------------------ */
    var $ = function (id) { return document.getElementById(id); };

    var stage = $('stage');
    var shotGrid = $('shot-grid');
    var subjectGrid = $('subject-grid');
    var promptSujetos = $('prompt-sujetos');
    var readout = $('shot-readout');
    var fov = $('fov');
    var fovValue = $('fov-value');
    var altura = $('altura');
    var alturaValue = $('altura-value');
    var btnAspecto = $('btn-aspecto');
    var btnEtiquetas = $('btn-etiquetas');
    var promptOut = $('prompt-out');
    var promptModelo = $('prompt-modelo');
    var promptMeta = $('prompt-meta');
    var subjectCount = $('subject-count');

    /* ------------------------------------------------------------
       ARRANQUE
       ------------------------------------------------------------ */
    function iniciar() {
        construirTiposDePlano();
        construirModelos();
        construirSujetos();

        Escena.init({
            canvas: $('escena-canvas'),
            labels: $('labels'),
            onMoverSujeto: function (i, x, z) {
                estado.sujetos[i].x = x;
                estado.sujetos[i].z = z;
                estado.planoActivo = null;
                aplicar();
            },
            onMoverCamara: function (x, z) {
                estado.camara.x = x;
                estado.camara.z = z;
                estado.planoActivo = null;
                aplicar();
            },
            onRotarSujeto: function (i, grados) {
                estado.sujetos[i].rot = Math.round(Encuadre.normalizar(grados));
                aplicar();
            },
            onApuntarCamara: function (x, z) {
                estado.camara.objetivoX = x;
                estado.camara.objetivoZ = z;
                estado.planoActivo = null;
                aplicar();
            }
        });

        cablearControles();
        Escena.setVista(estado.vista);
        Escena.setAspecto(estado.aspecto);
        Escena.setEtiquetas(estado.etiquetas);
        aplicar();
    }

    /* ------------------------------------------------------------
       PANEL · TIPO DE PLANO
       ------------------------------------------------------------ */
    function construirTiposDePlano() {
        Encuadre.PRESETS.forEach(function (p) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'shot-btn';
            b.textContent = p.nombre;
            b.dataset.id = p.id;
            b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', function () { usarPreset(p.id); });
            shotGrid.appendChild(b);
        });
    }

    function usarPreset(id) {
        var foco = estado.sujetos[estado.enfoque];
        var otro = estado.sujetos[estado.enfoque === 0 ? 1 : 0] || null;
        var r = Encuadre.aplicarPreset(id, foco, otro, estado.camara, estado.aspecto);
        if (!r) return;

        estado.camara.x = r.x;
        estado.camara.z = r.z;
        estado.camara.altura = r.altura;
        estado.camara.fov = r.fov;
        estado.camara.mira = r.mira;

        /* Sólo el plano a dos fija un objetivo propio; el resto sigue
           al sujeto enfocado aunque éste se mueva después. */
        if (id === 'dos') {
            estado.camara.objetivoX = r.objetivoX;
            estado.camara.objetivoZ = r.objetivoZ;
        } else {
            estado.camara.objetivoX = null;
            estado.camara.objetivoZ = null;
        }

        estado.planoActivo = id;
        aplicar();
    }

    /* ------------------------------------------------------------
       PANEL · SUJETOS
       ------------------------------------------------------------ */
    var SVG_FOCO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h13v10H3z"/><path d="M16 10l5-3v10l-5-3z"/></svg>';
    var SVG_QUITAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

    function construirSujetos() {
        subjectGrid.textContent = '';
        promptSujetos.textContent = '';

        estado.sujetos.forEach(function (s, i) {
            subjectGrid.appendChild(tarjetaSujeto(s, i));
            promptSujetos.appendChild(filaDescripcion(s, i));
        });

        subjectCount.textContent = estado.sujetos.length + ' / ' + MAX_SUJETOS;
        $('btn-add-subject').disabled = estado.sujetos.length >= MAX_SUJETOS;
    }

    function tarjetaSujeto(s, i) {
        var card = document.createElement('div');
        card.className = 'subject-card' + (i === estado.enfoque ? ' is-focus' : '');

        var head = document.createElement('div');
        head.className = 'subject-card__head';

        var nombre = document.createElement('input');
        nombre.className = 'subject-name';
        nombre.value = s.nombre;
        nombre.setAttribute('aria-label', 'Nombre del sujeto ' + (i + 1));
        nombre.addEventListener('input', function () {
            s.nombre = nombre.value;
            var etiqueta = promptSujetos.querySelector('[data-etiqueta="' + i + '"]');
            if (etiqueta) etiqueta.textContent = nombre.value || 'Sujeto ' + (i + 1);
            aplicar();
        });
        head.appendChild(nombre);

        var foco = document.createElement('button');
        foco.type = 'button';
        foco.className = 'mini-btn';
        foco.innerHTML = SVG_FOCO;
        foco.title = 'Enfocar la cámara en este sujeto';
        foco.setAttribute('aria-pressed', String(i === estado.enfoque));
        foco.addEventListener('click', function () {
            estado.enfoque = i;
            estado.camara.objetivoX = null;
            estado.camara.objetivoZ = null;
            construirSujetos();
            aplicar();
        });
        head.appendChild(foco);

        if (i > 0) {
            var quitar = document.createElement('button');
            quitar.type = 'button';
            quitar.className = 'mini-btn';
            quitar.innerHTML = SVG_QUITAR;
            quitar.title = 'Eliminar sujeto';
            quitar.addEventListener('click', function () { eliminarSujeto(i); });
            head.appendChild(quitar);
        }

        card.appendChild(head);
        card.appendChild(slider('Izq / der', s.x, -5, 5, 0.1, ' m', function (v) {
            s.x = v; estado.planoActivo = null; aplicar();
        }, 's' + i + '-x'));
        card.appendChild(slider('Profundidad', s.z, -5, 5, 0.1, ' m', function (v) {
            s.z = v; estado.planoActivo = null; aplicar();
        }, 's' + i + '-z'));
        card.appendChild(slider('Rotar', s.rot, -180, 180, 1, '°', function (v) {
            s.rot = v; aplicar();
        }, 's' + i + '-rot'));

        return card;
    }

    function slider(etiqueta, valor, min, max, paso, unidad, alCambiar, id) {
        var wrap = document.createElement('div');
        wrap.className = 'field';

        var head = document.createElement('div');
        head.className = 'field__head';

        var lab = document.createElement('label');
        lab.textContent = etiqueta;
        lab.setAttribute('for', id);

        var val = document.createElement('span');
        val.className = 'field__value';
        val.textContent = formatear(valor, paso) + unidad;

        head.appendChild(lab);
        head.appendChild(val);

        var input = document.createElement('input');
        input.type = 'range';
        input.className = 'hk-range';
        input.id = id;
        input.min = min;
        input.max = max;
        input.step = paso;
        input.value = valor;
        input.dataset.sync = id;
        input.addEventListener('input', function () {
            var v = parseFloat(input.value);
            val.textContent = formatear(v, paso) + unidad;
            alCambiar(v);
        });

        wrap.appendChild(head);
        wrap.appendChild(input);
        return wrap;
    }

    function formatear(v, paso) {
        return paso < 1 ? v.toFixed(1).replace('.', ',') : String(Math.round(v));
    }

    function eliminarSujeto(i) {
        estado.sujetos.splice(i, 1);
        if (estado.enfoque >= estado.sujetos.length) estado.enfoque = estado.sujetos.length - 1;
        estado.camara.objetivoX = null;
        estado.camara.objetivoZ = null;
        construirSujetos();
        aplicar();
    }

    function anadirSujeto() {
        if (estado.sujetos.length >= MAX_SUJETOS) return;
        var n = estado.sujetos.length + 1;
        estado.sujetos.push({
            nombre: 'Sujeto ' + n,
            x: -2 + n * 1.4,
            z: -0.5,
            rot: 0,
            descripcion: ''
        });
        construirSujetos();
        aplicar();
    }

    /* ------------------------------------------------------------
       PANEL · PROMPT
       ------------------------------------------------------------ */
    function construirModelos() {
        Prompt.MODELOS.forEach(function (m) {
            var o = document.createElement('option');
            o.value = m.id;
            o.textContent = m.nombre;
            promptModelo.appendChild(o);
        });
        promptModelo.value = estado.prompt.modelo;
    }

    function filaDescripcion(s, i) {
        var row = document.createElement('div');
        row.className = 'prompt-row';

        var lab = document.createElement('label');
        lab.setAttribute('for', 'desc-' + i);
        lab.dataset.etiqueta = i;
        lab.textContent = s.nombre || 'Sujeto ' + (i + 1);
        row.appendChild(lab);

        var field = document.createElement('div');
        field.className = 'hk-field hk-field--top';

        var ta = document.createElement('textarea');
        ta.id = 'desc-' + i;
        ta.value = s.descripcion || '';
        ta.placeholder = i === 0 ? 'una joven con abrigo color camel' : 'descríbelo aquí';
        ta.addEventListener('input', function () {
            s.descripcion = ta.value;
            aplicar();
        });

        field.appendChild(ta);
        row.appendChild(field);
        return row;
    }

    /* ------------------------------------------------------------
       CONTROLES SUELTOS
       ------------------------------------------------------------ */
    function cablearControles() {
        fov.value = estado.camara.fov;
        altura.value = estado.camara.altura;

        fov.addEventListener('input', function () {
            estado.camara.fov = parseFloat(fov.value);
            estado.planoActivo = null;
            aplicar();
        });

        altura.addEventListener('input', function () {
            estado.camara.altura = parseFloat(altura.value);
            estado.planoActivo = null;
            aplicar();
        });

        $('btn-recentrar').addEventListener('click', function () {
            estado.camara.objetivoX = null;
            estado.camara.objetivoZ = null;
            estado.camara.mira = Encuadre.ALTURAS.pecho;
            aplicar();
        });

        $('btn-add-subject').addEventListener('click', anadirSujeto);

        $('btn-vista-plano').addEventListener('click', function () { cambiarVista('plano'); });
        $('btn-vista-cenital').addEventListener('click', function () { cambiarVista('cenital'); });

        btnAspecto.addEventListener('click', function () {
            estado.aspectoIndice = (estado.aspectoIndice + 1) % ASPECTOS.length;
            refrescarDerivados();
            Escena.setAspecto(estado.aspecto);
            aplicar();
        });

        btnEtiquetas.addEventListener('click', function () {
            estado.etiquetas = !estado.etiquetas;
            Escena.setEtiquetas(estado.etiquetas);
            aplicar();
        });

        $('btn-salida-imagen').addEventListener('click', function () { cambiarSalida('imagen'); });
        $('btn-salida-video').addEventListener('click', function () { cambiarSalida('video'); });

        $('btn-idioma-es').addEventListener('click', function () { cambiarIdioma('es'); });
        $('btn-idioma-en').addEventListener('click', function () { cambiarIdioma('en'); });

        promptModelo.addEventListener('change', function () {
            estado.prompt.modelo = promptModelo.value;
            aplicar();
        });

        $('chk-hoja').checked = estado.prompt.hojaPersonaje;
        $('chk-hoja').addEventListener('change', function () {
            estado.prompt.hojaPersonaje = this.checked;
            aplicar();
        });

        $('chk-entorno').checked = estado.prompt.refEntorno;
        $('chk-entorno').addEventListener('change', function () {
            estado.prompt.refEntorno = this.checked;
            aplicar();
        });

        copiarCon($('btn-copiar-plano'), function () { return readout.textContent; }, 'Copiar');
        copiarCon($('btn-copiar-prompt'), function () { return promptOut.textContent; }, null);
    }

    function cambiarVista(v) {
        estado.vista = v;
        stage.dataset.vista = v;
        Escena.setVista(v);
        aplicar();
    }

    function cambiarSalida(s) {
        estado.prompt.salida = s;
        aplicar();
    }

    function cambiarIdioma(l) {
        estado.prompt.idioma = l;
        aplicar();
    }

    function copiarCon(boton, obtener, textoBase) {
        boton.addEventListener('click', function () {
            var texto = obtener();
            var etiquetaOriginal = textoBase || boton.innerHTML;

            function hecho() {
                boton.classList.add('is-done');
                if (textoBase) boton.textContent = 'Copiado';
                setTimeout(function () {
                    boton.classList.remove('is-done');
                    if (textoBase) boton.textContent = etiquetaOriginal;
                }, 1400);
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(texto).then(hecho, respaldo);
            } else {
                respaldo();
            }

            function respaldo() {
                var ta = document.createElement('textarea');
                ta.value = texto;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); hecho(); } catch (e) { /* sin portapapeles */ }
                document.body.removeChild(ta);
            }
        });
    }

    /* ------------------------------------------------------------
       APLICAR: sincroniza escena, textos y almacenamiento
       ------------------------------------------------------------ */
    function aplicar() {
        limitarCamara();
        Escena.sincronizar(estado);

        /* Píldora del encuadre */
        var foco = estado.sujetos[estado.enfoque] || estado.sujetos[0];
        var d = Encuadre.describir(estado.camara, foco, estado.camara.fov);
        readout.textContent = Encuadre.textoPildora(d);

        /* Cámara */
        fov.value = estado.camara.fov;
        altura.value = estado.camara.altura;
        fovValue.textContent = Math.round(estado.camara.fov) + '° · ' + d.mm + ' mm';
        alturaValue.textContent = estado.camara.altura.toFixed(2).replace('.', ',') + ' m';

        /* Sliders de los sujetos, por si el cambio vino del arrastre */
        estado.sujetos.forEach(function (s, i) {
            sincronizarSlider('s' + i + '-x', s.x, 0.1, ' m');
            sincronizarSlider('s' + i + '-z', s.z, 0.1, ' m');
            sincronizarSlider('s' + i + '-rot', s.rot, 1, '°');
        });

        /* Botones de tipo de plano */
        Array.prototype.forEach.call(shotGrid.children, function (b) {
            b.setAttribute('aria-pressed', String(b.dataset.id === estado.planoActivo));
        });

        /* Vista, aspecto y etiquetas */
        $('btn-vista-plano').setAttribute('aria-pressed', String(estado.vista === 'plano'));
        $('btn-vista-cenital').setAttribute('aria-pressed', String(estado.vista === 'cenital'));
        btnAspecto.textContent = estado.aspectoEtiqueta;
        btnEtiquetas.setAttribute('aria-pressed', String(estado.etiquetas));

        /* Prompt */
        $('btn-salida-imagen').setAttribute('aria-pressed', String(estado.prompt.salida === 'imagen'));
        $('btn-salida-video').setAttribute('aria-pressed', String(estado.prompt.salida === 'video'));
        $('btn-idioma-es').setAttribute('aria-pressed', String(estado.prompt.idioma === 'es'));
        $('btn-idioma-en').setAttribute('aria-pressed', String(estado.prompt.idioma === 'en'));

        var mod = Prompt.modelo(estado.prompt.modelo);
        promptMeta.textContent = (estado.prompt.salida === 'video' ? 'Vídeo' : 'Imagen') + ' · ' + mod.nombre;
        promptOut.textContent = Prompt.generar(estado);

        guardar();
    }

    function sincronizarSlider(id, valor, paso, unidad) {
        var input = document.getElementById(id);
        if (!input || document.activeElement === input) return;
        input.value = valor;
        var val = input.previousSibling && input.previousSibling.querySelector
            ? input.previousSibling.querySelector('.field__value') : null;
        if (val) val.textContent = formatear(valor, paso) + unidad;
    }

    /* La cámara no puede salirse de la sala */
    function limitarCamara() {
        var lx = Escena.SALA.ancho / 2 - 0.6;
        var lz = Escena.SALA.fondo / 2 - 0.6;
        estado.camara.x = Math.max(-lx, Math.min(lx, estado.camara.x));
        estado.camara.z = Math.max(-lz, Math.min(lz, estado.camara.z));
        estado.sujetos.forEach(function (s) {
            s.x = Math.max(-lx, Math.min(lx, s.x));
            s.z = Math.max(-lz, Math.min(lz, s.z));
        });
    }

    /* ------------------------------------------------------------
       PERSISTENCIA
       ------------------------------------------------------------ */
    function guardar() {
        try {
            localStorage.setItem(CLAVE, JSON.stringify({
                sujetos: estado.sujetos,
                enfoque: estado.enfoque,
                camara: estado.camara,
                vista: estado.vista,
                aspectoIndice: estado.aspectoIndice,
                etiquetas: estado.etiquetas,
                planoActivo: estado.planoActivo,
                prompt: estado.prompt
            }));
        } catch (e) { /* modo privado o cuota llena: seguimos sin guardar */ }
    }

    function cargar() {
        try {
            var crudo = localStorage.getItem(CLAVE);
            if (!crudo) return null;
            var g = JSON.parse(crudo);
            if (!g || !Array.isArray(g.sujetos) || !g.sujetos.length || !g.camara) return null;
            var base = estadoInicial();
            /* Mezcla defensiva: una versión antigua guardada no debe
               dejar la app sin campos nuevos. */
            return {
                sujetos: g.sujetos,
                enfoque: Math.min(g.enfoque || 0, g.sujetos.length - 1),
                camara: Object.assign(base.camara, g.camara),
                vista: g.vista === 'plano' ? 'plano' : 'cenital',
                aspectoIndice: g.aspectoIndice || 0,
                etiquetas: g.etiquetas !== false,
                planoActivo: g.planoActivo || null,
                prompt: Object.assign(base.prompt, g.prompt || {})
            };
        } catch (e) {
            return null;
        }
    }

    /* ------------------------------------------------------------ */
    stage.dataset.vista = estado.vista;
    iniciar();
})();
