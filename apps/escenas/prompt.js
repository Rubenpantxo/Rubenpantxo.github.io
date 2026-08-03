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
        { id: 'veo31', nombre: 'Veo 3.1', tipo: 'video', estilo: 'cine' },
        { id: 'sora2', nombre: 'Sora 2', tipo: 'video', estilo: 'narrativo' },
        { id: 'runway4', nombre: 'Runway Gen-4', tipo: 'video', estilo: 'lista' },
        { id: 'kling25', nombre: 'Kling 2.5', tipo: 'video', estilo: 'lista' },
        { id: 'mj7', nombre: 'Midjourney V7', tipo: 'imagen', estilo: 'lista' }
    ];

    function modelo(id) {
        for (var i = 0; i < MODELOS.length; i++) {
            if (MODELOS[i].id === id) return MODELOS[i];
        }
        return MODELOS[0];
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
            if (!desc && estado.prompt.hojaPersonaje) {
                desc = en
                    ? 'the character from the attached reference sheet'
                    : 'el personaje de la hoja de referencia adjunta';
            }
            if (!desc) {
                desc = en ? 'an unnamed figure' : 'una figura sin describir';
            }

            var donde = posicionEnCuadro(estado.camara, objetivo, s, estado.camara.fov, estado.aspecto, idioma);
            var orientacion = global.Encuadre.anguloPlano(estado.camara, s);
            var orientaTxt = en ? EN[orientacion] : ES_MINUS[orientacion];

            partes.push(en
                ? desc + ', ' + donde + ', seen ' + orientaTxt
                : desc + ', ' + donde + ', visto ' + orientaTxt);
        });

        var sujetos = partes.join(en ? '. ' : '. ');

        /* --- Notas de referencia --- */
        var notas = [];
        if (estado.prompt.hojaPersonaje) {
            notas.push(en
                ? 'Keep the character design consistent with the attached character sheet.'
                : 'Mantén el diseño del personaje fiel a la hoja de personaje adjunta.');
        }
        if (estado.prompt.refEntorno) {
            notas.push(en
                ? 'Use the attached environment reference as the set.'
                : 'Usa la referencia de entorno adjunta como escenario.');
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

    global.Prompt = {
        MODELOS: MODELOS,
        modelo: modelo,
        generar: generar,
        posicionEnCuadro: posicionEnCuadro
    };
})(window);
