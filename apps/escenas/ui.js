/* ============================================================
   UI — estado de la aplicación, paneles y persistencia.
   Es la única pieza que toca el DOM: escena.js dibuja,
   encuadre.js calcula y prompt.js redacta.
   ============================================================ */

(function () {
    'use strict';

    var CLAVE = 'escenas:v2';
    var MAX_SUJETOS = 6;
    var MAX_ELEMENTOS = 12;

    /* Límites físicos con sentido: nadie mide 3 m ni el doble de ancho */
    var ALTURA_MIN = 1.40, ALTURA_MAX = 2.05;
    var COMPLEXION_MIN = 0.80, COMPLEXION_MAX = 1.35;

    var FORMAS = [
        { tipo: 'rect', nombre: 'Rectángulo' },
        { tipo: 'circulo', nombre: 'Círculo' },
        { tipo: 'triangulo', nombre: 'Triángulo' }
    ];

    var PLANTILLAS = [
        { tipo: 'caja', nombre: 'Caja de cartón' },
        { tipo: 'coche', nombre: 'Coche' },
        { tipo: 'silla', nombre: 'Silla de bar' },
        { tipo: 'bici', nombre: 'Bicicleta' },
        { tipo: 'moto', nombre: 'Moto' },
        { tipo: 'planta', nombre: 'Planta en maceta' }
    ];

    function nombreTipo(tipo) {
        var todos = FORMAS.concat(PLANTILLAS);
        for (var i = 0; i < todos.length; i++) if (todos[i].tipo === tipo) return todos[i].nombre;
        return tipo;
    }

    /* "1,80 × 1,45 × 4,40 m" a partir de las medidas de la escena */
    function medidaTexto(tipo) {
        var m = Escena.MEDIDAS[tipo];
        if (!m) return '';
        return m.map(function (v) { return v.toFixed(2).replace('.', ','); }).join(' × ') + ' m';
    }

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
                { nombre: 'Sujeto 1', x: -0.9, z: -0.4, rot: 0, altura: 1.75, complexion: 1, descripcion: '' },
                { nombre: 'Sujeto 2', x: 1.1, z: -0.6, rot: -20, altura: 1.68, complexion: 1, descripcion: '' }
            ],
            elementos: [],
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
        construirBotonesAnadir();
        construirElementos();

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
            },
            onMoverElemento: function (i, x, z) {
                estado.elementos[i].x = x;
                estado.elementos[i].z = z;
                aplicar();
            },
            onRotarElemento: function (i, grados) {
                estado.elementos[i].rot = Math.round(Encuadre.normalizar(grados));
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
        card.appendChild(slider('Altura', s.altura, ALTURA_MIN, ALTURA_MAX, 0.01, ' m', function (v) {
            s.altura = v; aplicar();
        }, 's' + i + '-alt', 2));
        card.appendChild(slider('Complexión', s.complexion, COMPLEXION_MIN, COMPLEXION_MAX, 0.01, '', function (v) {
            s.complexion = v; aplicar();
        }, 's' + i + '-cpx', 2));

        return card;
    }

    function slider(etiqueta, valor, min, max, paso, unidad, alCambiar, id, dec) {
        var wrap = document.createElement('div');
        wrap.className = 'field';

        var head = document.createElement('div');
        head.className = 'field__head';

        var lab = document.createElement('label');
        lab.textContent = etiqueta;
        lab.setAttribute('for', id);

        var val = document.createElement('span');
        val.className = 'field__value';
        val.textContent = formatear(valor, paso, dec) + unidad;

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
        input.dataset.dec = dec == null ? '' : dec;
        input.dataset.unidad = unidad;
        input.addEventListener('input', function () {
            var v = parseFloat(input.value);
            val.textContent = formatear(v, paso, dec) + unidad;
            alCambiar(v);
        });

        wrap.appendChild(head);
        wrap.appendChild(input);
        return wrap;
    }

    function formatear(v, paso, dec) {
        if (dec != null) return v.toFixed(dec).replace('.', ',');
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
            altura: 1.75,
            complexion: 1,
            descripcion: ''
        });
        construirSujetos();
        aplicar();
    }

    /* ------------------------------------------------------------
       PANEL · ELEMENTOS
       ------------------------------------------------------------ */
    var SVG_OJO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/></svg>';
    var SVG_OJO_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l16 16"/><path d="M9.6 5.3A9.6 9.6 0 0112 5c6.5 0 10 6 10 6a17 17 0 01-3.2 3.8M6.5 7.2A17 17 0 002 11s3.5 6 10 6a9.7 9.7 0 004-.8"/></svg>';

    function construirBotonesAnadir() {
        FORMAS.forEach(function (f) {
            $('add-formas').appendChild(botonAnadir(f, false));
        });
        PLANTILLAS.forEach(function (p) {
            $('add-plantillas').appendChild(botonAnadir(p, true));
        });
    }

    function botonAnadir(def, conMedida) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'add-btn';
        var n = document.createElement('b');
        n.textContent = def.nombre;
        b.appendChild(n);
        if (conMedida) {
            var med = document.createElement('span');
            med.textContent = medidaTexto(def.tipo);
            b.appendChild(med);
        }
        b.addEventListener('click', function () { anadirElemento(def.tipo); });
        return b;
    }

    /* Cae en un punto al azar dentro de lo que ve la cámara. No se
       comprueban solapes a propósito: el elemento se arrastra al
       sitio que toque, y dos objetos juntos son cosa de un segundo. */
    function sitioAleatorio() {
        var c = estado.camara;
        var obj = c.objetivoX != null && c.objetivoZ != null
            ? { x: c.objetivoX, z: c.objetivoZ }
            : (estado.sujetos[estado.enfoque] || estado.sujetos[0]);

        var ex = obj.x - c.x, ez = obj.z - c.z;
        var largo = Math.hypot(ex, ez) || 1;
        ex /= largo; ez /= largo;

        var fondo = 1.5 + Math.random() * 3;                     /* distancia a cámara */
        var fovH = 2 * Math.atan(Math.tan((c.fov * Math.PI / 180) / 2) * estado.aspecto);
        var margen = fondo * Math.tan(fovH / 2) * 0.75;
        var lado = (Math.random() * 2 - 1) * margen;

        /* "derecha" de la cámara: perpendicular a su eje */
        var x = c.x + ex * fondo - ez * lado;
        var z = c.z + ez * fondo + ex * lado;

        var lx = Escena.SALA.ancho / 2 - 1;
        var lz = Escena.SALA.fondo / 2 - 1;
        return {
            x: Math.round(Math.max(-lx, Math.min(lx, x)) * 10) / 10,
            z: Math.round(Math.max(-lz, Math.min(lz, z)) * 10) / 10
        };
    }

    function anadirElemento(tipo) {
        if (estado.elementos.length >= MAX_ELEMENTOS) return;
        var sitio = sitioAleatorio();
        estado.elementos.push({
            tipo: tipo,
            nombre: nombreTipo(tipo),
            x: sitio.x,
            z: sitio.z,
            rot: Math.round(Math.random() * 360 - 180),
            escala: 1,
            enPlano: true
        });
        construirElementos();
        aplicar();
    }

    function eliminarElemento(i) {
        estado.elementos.splice(i, 1);
        construirElementos();
        aplicar();
    }

    function construirElementos() {
        var lista = $('element-list');
        lista.textContent = '';
        estado.elementos.forEach(function (e, i) {
            lista.appendChild(tarjetaElemento(e, i));
        });
        $('element-count').textContent = estado.elementos.length
            ? estado.elementos.length + ' / ' + MAX_ELEMENTOS
            : 'ninguno';
        Array.prototype.forEach.call($('add-formas').children, function (b) {
            b.disabled = estado.elementos.length >= MAX_ELEMENTOS;
        });
        Array.prototype.forEach.call($('add-plantillas').children, function (b) {
            b.disabled = estado.elementos.length >= MAX_ELEMENTOS;
        });
    }

    function tarjetaElemento(e, i) {
        var card = document.createElement('div');
        card.className = 'element-card' + (e.enPlano ? '' : ' is-out');

        var head = document.createElement('div');
        head.className = 'subject-card__head';

        var nombre = document.createElement('input');
        nombre.className = 'subject-name';
        nombre.value = e.nombre;
        nombre.setAttribute('aria-label', 'Nombre del elemento ' + (i + 1));
        nombre.addEventListener('input', function () { e.nombre = nombre.value; aplicar(); });
        head.appendChild(nombre);

        var ojo = document.createElement('button');
        ojo.type = 'button';
        ojo.className = 'mini-btn';
        ojo.innerHTML = e.enPlano ? SVG_OJO : SVG_OJO_OFF;
        ojo.title = e.enPlano ? 'Sale en el plano' : 'En la escena, pero fuera del plano';
        ojo.setAttribute('aria-pressed', String(!!e.enPlano));
        ojo.addEventListener('click', function () {
            e.enPlano = !e.enPlano;
            construirElementos();
            aplicar();
        });
        head.appendChild(ojo);

        var quitar = document.createElement('button');
        quitar.type = 'button';
        quitar.className = 'mini-btn';
        quitar.innerHTML = SVG_QUITAR;
        quitar.title = 'Eliminar elemento';
        quitar.addEventListener('click', function () { eliminarElemento(i); });
        head.appendChild(quitar);

        card.appendChild(head);

        var tag = document.createElement('p');
        tag.className = 'element-card__tag';
        tag.textContent = Escena.ESCALABLES[e.tipo]
            ? 'Forma básica · escalable'
            : nombreTipo(e.tipo) + ' · ' + medidaTexto(e.tipo);
        card.appendChild(tag);

        card.appendChild(slider('Izq / der', e.x, -5, 5, 0.1, ' m', function (v) {
            e.x = v; aplicar();
        }, 'e' + i + '-x'));
        card.appendChild(slider('Profundidad', e.z, -5, 5, 0.1, ' m', function (v) {
            e.z = v; aplicar();
        }, 'e' + i + '-z'));
        card.appendChild(slider('Rotar', e.rot, -180, 180, 1, '°', function (v) {
            e.rot = v; aplicar();
        }, 'e' + i + '-rot'));

        /* El slider de escala es sólo para las formas básicas: las
           plantillas van a su medida real y no se tocan. */
        if (Escena.ESCALABLES[e.tipo]) {
            card.appendChild(slider('Escala', e.escala, 0.2, 4, 0.05, ' ×', function (v) {
                e.escala = v; aplicar();
            }, 'e' + i + '-esc', 2));
        }

        return card;
    }

    /* ------------------------------------------------------------
       PANEL · PROMPT
       ------------------------------------------------------------ */
    /* La lista de modelos depende de si se pide imagen o vídeo: no
       tiene sentido ofrecer Midjourney para una toma de vídeo. */
    function construirModelos() {
        var disponibles = Prompt.modelosPor(estado.prompt.salida);
        var sigueValiendo = disponibles.some(function (m) { return m.id === estado.prompt.modelo; });
        if (!sigueValiendo) estado.prompt.modelo = disponibles[0].id;

        promptModelo.textContent = '';
        disponibles.forEach(function (m) {
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
        construirModelos();
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

        /* Sliders de sujetos y elementos, por si el cambio vino del arrastre */
        estado.sujetos.forEach(function (s, i) {
            sincronizarSlider('s' + i + '-x', s.x);
            sincronizarSlider('s' + i + '-z', s.z);
            sincronizarSlider('s' + i + '-rot', s.rot);
            sincronizarSlider('s' + i + '-alt', s.altura);
            sincronizarSlider('s' + i + '-cpx', s.complexion);
        });
        estado.elementos.forEach(function (e, i) {
            sincronizarSlider('e' + i + '-x', e.x);
            sincronizarSlider('e' + i + '-z', e.z);
            sincronizarSlider('e' + i + '-rot', e.rot);
            if (Escena.ESCALABLES[e.tipo]) sincronizarSlider('e' + i + '-esc', e.escala);
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

    function sincronizarSlider(id, valor) {
        var input = document.getElementById(id);
        if (!input || document.activeElement === input) return;
        input.value = valor;
        var val = input.parentElement.querySelector('.field__value');
        if (!val) return;
        var dec = input.dataset.dec === '' ? null : parseInt(input.dataset.dec, 10);
        val.textContent = formatear(valor, parseFloat(input.step), dec) + (input.dataset.unidad || '');
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
        estado.elementos.forEach(function (e) {
            e.x = Math.max(-lx, Math.min(lx, e.x));
            e.z = Math.max(-lz, Math.min(lz, e.z));
        });
    }

    /* ------------------------------------------------------------
       PERSISTENCIA
       ------------------------------------------------------------ */
    function guardar() {
        try {
            localStorage.setItem(CLAVE, JSON.stringify({
                sujetos: estado.sujetos,
                elementos: estado.elementos,
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
            /* Los sujetos guardados antes de existir el físico no
               traen altura ni complexión: se les pone la de serie. */
            var sujetos = g.sujetos.map(function (s) {
                return Object.assign({ altura: 1.75, complexion: 1, rot: 0, descripcion: '' }, s);
            });

            return {
                sujetos: sujetos,
                elementos: Array.isArray(g.elementos) ? g.elementos : [],
                enfoque: Math.min(g.enfoque || 0, sujetos.length - 1),
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
