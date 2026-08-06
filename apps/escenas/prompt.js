/* ============================================================
   PROMPT — generador de texto a partir de la geometría real de
   la escena, no del botón que se haya pulsado.

   Cada modelo tiene su plantilla: unos prefieren lenguaje
   cinematográfico corrido, otros una lista de parámetros.
   ============================================================ */

(function (global) {
    'use strict';

    var DEG = Math.PI / 180;

    /* ------------------------------------------------------------
       DICCIONARIO ES → EN
       ------------------------------------------------------------ */
    var EN = {
        'PRIMERÍSIMO PRIMER PLANO': 'extreme close-up',
        'PRIMER PLANO': 'close-up',
        'PLANO MEDIO CORTO': 'medium close-up',
        'PLANO MEDIO': 'medium shot',
        'PLANO AMERICANO': 'cowboy shot',
        'PLANO GENERAL': 'wide shot',
        'GRAN PLANO GENERAL': 'extreme wide shot',

        'FRONTAL': 'front on',
        '3/4 IZQ': 'three-quarter left',
        '3/4 DER': 'three-quarter right',
        'PERFIL IZQ': 'left profile',
        'PERFIL DER': 'right profile',
        '3/4 TRASERO IZQ': 'rear three-quarter left',
        '3/4 TRASERO DER': 'rear three-quarter right',
        'TRASERO': 'from behind',

        'ALTURA SUELO': 'ground level',
        'ALTURA RODILLA': 'knee level',
        'ALTURA CADERA': 'hip level',
        'ALTURA PECHO': 'chest level',
        'ALTURA OJOS': 'eye level',
        'ALTURA ALTA': 'above eye level',
        'PICADO': 'high angle',
        'CONTRAPICADO': 'low angle',
        'CENITAL': 'overhead'
    };

    var ES_MINUS = {
        'PRIMERÍSIMO PRIMER PLANO': 'primerísimo primer plano',
        'PRIMER PLANO': 'primer plano',
        'PLANO MEDIO CORTO': 'plano medio corto',
        'PLANO MEDIO': 'plano medio',
        'PLANO AMERICANO': 'plano americano',
        'PLANO GENERAL': 'plano general',
        'GRAN PLANO GENERAL': 'gran plano general',

        'FRONTAL': 'de frente',
        '3/4 IZQ': 'en tres cuartos por la izquierda',
        '3/4 DER': 'en tres cuartos por la derecha',
        'PERFIL IZQ': 'de perfil izquierdo',
        'PERFIL DER': 'de perfil derecho',
        '3/4 TRASERO IZQ': 'en tres cuartos trasero por la izquierda',
        '3/4 TRASERO DER': 'en tres cuartos trasero por la derecha',
        'TRASERO': 'de espaldas',

        'ALTURA SUELO': 'a ras de suelo',
        'ALTURA RODILLA': 'a la altura de la rodilla',
        'ALTURA CADERA': 'a la altura de la cadera',
        'ALTURA PECHO': 'a la altura del pecho',
        'ALTURA OJOS': 'a la altura de los ojos',
        'ALTURA ALTA': 'por encima de los ojos',
        'PICADO': 'en picado',
        'CONTRAPICADO': 'en contrapicado',
        'CENITAL': 'en cenital'
    };

    /* ------------------------------------------------------------
       POSICIÓN DE CADA SUJETO DENTRO DEL CUADRO
       Se proyecta el sujeto sobre el eje horizontal de la cámara.
       ------------------------------------------------------------ */
    function posicionEnCuadro(camara, objetivo, sujeto, fov, aspecto, idioma) {
        var ejeX = objetivo.x - camara.x;
        var ejeZ = objetivo.z - camara.z;
        var largo = Math.hypot(ejeX, ejeZ) || 1;
        ejeX /= largo;
        ejeZ /= largo;

        var dx = sujeto.x - camara.x;
        var dz = sujeto.z - camara.z;

        /* El "derecha" de la cámara es perpendicular a su eje: con eje
           (ex, ez) y Y hacia arriba, sale (−ez, ex). */
        var profundidad = dx * ejeX + dz * ejeZ;          /* hacia delante */
        var lateral = dz * ejeX - dx * ejeZ;              /* derecha positiva */

        if (profundidad <= 0.05) {
            return idioma === 'en' ? 'out of frame behind the camera' : 'fuera de cuadro, detrás de la cámara';
        }

        var fovH = 2 * Math.atan(Math.tan((fov * DEG) / 2) * aspecto);
        var mitad = profundidad * Math.tan(fovH / 2);
        var u = lateral / mitad;   /* −1 borde izquierdo, +1 borde derecho */

        if (Math.abs(u) > 1.15) {
            return idioma === 'en' ? 'just outside the frame' : 'justo fuera de cuadro';
        }
        if (Math.abs(u) < 0.18) {
            return idioma === 'en' ? 'centred in frame' : 'centrado en el encuadre';
        }
        if (u < 0) {
            return idioma === 'en' ? 'on the left of the frame' : 'a la izquierda del encuadre';
        }
        return idioma === 'en' ? 'on the right of the frame' : 'a la derecha del encuadre';
    }

    /* ------------------------------------------------------------
       PLANTILLAS POR MODELO
       ------------------------------------------------------------ */
    /* Midjourney no acepta decimales en --ar: hay que darle enteros */
    var AR_MJ = {
        '16:9': '16:9',
        '2.39:1': '21:9',
        '1:1': '1:1',
        '9:16': '9:16'
    };

    var MODELOS = [
        /* --- vídeo --- */
        { id: 'veo31', nombre: 'Veo 3.1', tipo: 'video', estilo: 'cine' },
        { id: 'sora2', nombre: 'Sora 2', tipo: 'video', estilo: 'narrativo' },
        { id: 'runway4', nombre: 'Runway Gen-4', tipo: 'video', estilo: 'lista' },
        { id: 'kling25', nombre: 'Kling 2.5', tipo: 'video', estilo: 'lista' },
        { id: 'luma2', nombre: 'Luma Ray 2', tipo: 'video', estilo: 'narrativo' },
        /* --- imagen --- */
        { id: 'mj7', nombre: 'Midjourney V7', tipo: 'imagen', estilo: 'lista' },
        { id: 'flux11', nombre: 'Flux 1.1 Pro', tipo: 'imagen', estilo: 'cine' },
        { id: 'nanobanana', nombre: 'Nano Banana', tipo: 'imagen', estilo: 'narrativo' },
        { id: 'ideogram3', nombre: 'Ideogram 3.0', tipo: 'imagen', estilo: 'lista' },
        { id: 'sd35', nombre: 'Stable Diffusion 3.5', tipo: 'imagen', estilo: 'lista' }
    ];

    function modelo(id) {
        for (var i = 0; i < MODELOS.length; i++) {
            if (MODELOS[i].id === id) return MODELOS[i];
        }
        return MODELOS[0];
    }

    /* Los modelos de vídeo y los de imagen no se mezclan: la lista
       depende de lo que se haya elegido producir. */
    function modelosPor(salida) {
        var tipo = salida === 'imagen' ? 'imagen' : 'video';
        return MODELOS.filter(function (m) { return m.tipo === tipo; });
    }

    /* ------------------------------------------------------------
       GENERACIÓN
       ------------------------------------------------------------ */
    function generar(estado) {
        var idioma = estado.prompt.idioma;
        var en = idioma === 'en';
        var mod = modelo(estado.prompt.modelo);
        var esVideo = estado.prompt.salida === 'video';

        var sujetoFoco = estado.sujetos[estado.enfoque] || estado.sujetos[0];
        var objetivo = objetivoDe(estado);
        var d = global.Encuadre.describir(
            { x: estado.camara.x, z: estado.camara.z, altura: estado.camara.altura, mira: estado.camara.mira },
            sujetoFoco,
            estado.camara.fov
        );

        var tamano = en ? EN[d.tamano] : ES_MINUS[d.tamano];
        var angulo = en ? EN[d.angulo] : ES_MINUS[d.angulo];
        var altura = en ? EN[d.altura] : ES_MINUS[d.altura];

        /* --- Bloque de cámara --- */
        var camara;
        if (en) {
            camara = tamano + ', ' + angulo + ', ' + altura + ', ' + d.mm + 'mm lens';
        } else {
            camara = tamano + ' ' + angulo + ', ' + altura + ', lente de ' + d.mm + ' mm';
        }

        /* --- Bloque de sujetos --- */
        var partes = [];
        estado.sujetos.forEach(function (s, i) {
            var desc = (s.descripcion || '').trim();
            if (!desc) {
                desc = en ? 'an unnamed figure' : 'una figura sin describir';
            }
            desc = complexionTexto(s, desc, en);

            var donde = posicionEnCuadro(estado.camara, objetivo, s, estado.camara.fov, estado.aspecto, idioma);
            var orientacion = global.Encuadre.anguloPlano(estado.camara, s);
            var orientaTxt = en ? EN[orientacion] : ES_MINUS[orientacion];

            partes.push(en
                ? desc + ', ' + donde + ', seen ' + orientaTxt
                : desc + ', ' + donde + ', visto ' + orientaTxt);
        });

        var sujetos = partes.join(en ? '. ' : '. ');

        /* --- Elementos de atrezo que entran en el plano --- */
        var notas = [];
        var atrezo = describirElementos(estado, objetivo, en);
        if (atrezo) {
            notas.push(en ? 'In shot: ' + atrezo + '.' : 'En el plano: ' + atrezo + '.');
        }

        var ar = estado.aspectoEtiqueta;

        /* --- Montaje según el estilo del modelo --- */
        var texto;

        if (mod.estilo === 'lista') {
            var campos = en
                ? ['Shot: ' + camara, 'Subjects: ' + sujetos, 'Aspect ratio: ' + ar]
                : ['Plano: ' + camara, 'Sujetos: ' + sujetos, 'Relación de aspecto: ' + ar];
            if (esVideo && mod.tipo === 'video') {
                campos.push(en ? 'Camera: locked off, no movement' : 'Cámara: fija, sin movimiento');
            }
            texto = campos.concat(notas).join('\n');
            if (mod.id === 'mj7') {
                texto += '\n--ar ' + AR_MJ[ar] + ' --style raw';
            }
        } else if (mod.estilo === 'narrativo') {
            texto = (en
                ? 'A ' + camara + '. ' + sujetos + '. Framed ' + ar + '.'
                : 'Un ' + camara + '. ' + sujetos + '. Encuadre ' + ar + '.');
            if (esVideo) {
                texto += en
                    ? ' The camera holds still throughout the take.'
                    : ' La cámara se mantiene fija durante toda la toma.';
            }
            if (notas.length) texto += ' ' + notas.join(' ');
        } else {
            /* cine: lenguaje de guion técnico */
            texto = (en
                ? camara.charAt(0).toUpperCase() + camara.slice(1) + '. ' + sujetos + '. Aspect ratio ' + ar + '.'
                : camara.charAt(0).toUpperCase() + camara.slice(1) + '. ' + sujetos + '. Relación de aspecto ' + ar + '.');
            if (esVideo) {
                texto += en
                    ? ' Static camera, natural lighting, cinematic depth of field.'
                    : ' Cámara estática, luz natural, profundidad de campo cinematográfica.';
            }
            if (notas.length) texto += ' ' + notas.join(' ');
        }

        return texto;
    }

    function objetivoDe(estado) {
        var c = estado.camara;
        if (c.objetivoX != null && c.objetivoZ != null) return { x: c.objetivoX, z: c.objetivoZ };
        var s = estado.sujetos[estado.enfoque] || estado.sujetos[0];
        return { x: s.x, z: s.z };
    }

    /* ------------------------------------------------------------
       FÍSICO DEL SUJETO
       La altura y la complexión son datos de la escena, así que
       entran en el prompt aunque el usuario no los escriba.
       ------------------------------------------------------------ */
    function complexionTexto(s, desc, en) {
        var h = s.altura || 1.75;
        var c = s.complexion || 1;
        var rasgos = [];

        if (h >= 1.9) rasgos.push(en ? 'very tall' : 'muy alto');
        else if (h >= 1.82) rasgos.push(en ? 'tall' : 'alto');
        else if (h <= 1.55) rasgos.push(en ? 'short' : 'bajo');
        else if (h <= 1.63) rasgos.push(en ? 'shortish' : 'de estatura baja');

        if (c >= 1.25) rasgos.push(en ? 'heavy-set' : 'de complexión ancha');
        else if (c >= 1.12) rasgos.push(en ? 'stocky' : 'corpulento');
        else if (c <= 0.86) rasgos.push(en ? 'very slim' : 'muy delgado');
        else if (c <= 0.93) rasgos.push(en ? 'slim' : 'delgado');

        if (!rasgos.length) return desc;
        var medida = en
            ? rasgos.join(' and ') + ' (' + h.toFixed(2) + ' m)'
            : rasgos.join(' y ') + ' (' + h.toFixed(2).replace('.', ',') + ' m)';
        return desc + ', ' + medida;
    }

    /* ------------------------------------------------------------
       ATREZO
       Solo se nombra lo que de verdad entra en el encuadre y está
       marcado como visible en el plano.
       ------------------------------------------------------------ */
    var NOMBRES_EN = {
        rect: 'a rectangular block', circulo: 'a cylindrical block', triangulo: 'a wedge block',
        caja: 'a standard cardboard box', coche: 'a car', silla: 'a plastic bistro chair',
        bici: 'a bicycle', moto: 'a motorbike', planta: 'a potted plant in a brown pot'
    };
    var NOMBRES_ES = {
        rect: 'un bloque rectangular', circulo: 'un bloque cilíndrico', triangulo: 'una cuña',
        caja: 'una caja de cartón estándar', coche: 'un coche', silla: 'una silla de plástico de bar',
        bici: 'una bicicleta', moto: 'una moto', planta: 'una planta en maceta marrón'
    };

    function describirElementos(estado, objetivo, en) {
        var lista = estado.elementos || [];
        var partes = [];
        lista.forEach(function (e) {
            if (!e.enPlano) return;
            var donde = posicionEnCuadro(estado.camara, objetivo, e, estado.camara.fov,
                estado.aspecto, en ? 'en' : 'es');
            if (donde.indexOf('fuera') === 0 || donde.indexOf('out of') === 0 ||
                donde.indexOf('just outside') === 0 || donde.indexOf('justo fuera') === 0) return;
            var nombre = (en ? NOMBRES_EN : NOMBRES_ES)[e.tipo] || e.nombre;
            partes.push(nombre + ' ' + donde);
        });
        return partes.join(en ? ', ' : ', ');
    }

    global.Prompt = {
        MODELOS: MODELOS,
        modelo: modelo,
        modelosPor: modelosPor,
        generar: generar,
        posicionEnCuadro: posicionEnCuadro
    };
})(window);
