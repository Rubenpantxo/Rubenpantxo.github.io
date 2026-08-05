/* ============================================================
   ENCUADRE — lógica pura de cámara y clasificación del plano.
   Sin DOM y sin three.js: sólo números, para poder razonar
   sobre ella y probarla por separado.

   Sistema de coordenadas (metros):
     x → izquierda/derecha del set
     z → profundidad (negativo = fondo)
     y → altura
     rot → grados; 0° = el sujeto mira hacia +z (hacia cámara
           cuando ésta está delante). Sentido antihorario visto
           desde arriba.
   ============================================================ */

(function (global) {
    'use strict';

    var DEG = Math.PI / 180;

    /* --- Alturas de referencia de una persona de 1,75 m --- */
    var ALTURAS = {
        suelo: 0.25,
        rodilla: 0.55,
        cadera: 1.00,
        pecho: 1.35,
        ojos: 1.62
    };

    /* ------------------------------------------------------------
       LENTE
       El equivalente en 35 mm se calcula sobre el lado vertical
       del fotograma completo (24 mm de alto → semialtura 12 mm).
       ------------------------------------------------------------ */
    function fovAMilimetros(fovVertical) {
        return Math.round(12 / Math.tan((fovVertical * DEG) / 2));
    }

    function milimetrosAFov(mm) {
        return 2 * Math.atan(12 / mm) / DEG;
    }

    /* ------------------------------------------------------------
       PRESETS DE TIPO DE PLANO
       distancia: metros desde el sujeto
       altura:    altura de la cámara en metros
       fov:       campo de visión vertical en grados
       mira:      altura del punto al que apunta la cámara
       azimut:    desviación en grados respecto al eje actual
                  cámara→sujeto (null = conservar el que haya)
       ------------------------------------------------------------ */
    var PRESETS = [
        { id: 'medio',      nombre: 'Medio',        distancia: 2.2, altura: ALTURAS.pecho,   fov: 40, mira: ALTURAS.pecho },
        { id: 'general',    nombre: 'General',      distancia: 4.2, altura: ALTURAS.pecho,   fov: 45, mira: ALTURAS.cadera },
        { id: 'primer',     nombre: 'Primer plano', distancia: 1.1, altura: ALTURAS.ojos,    fov: 30, mira: ALTURAS.ojos },
        { id: 'contra',     nombre: 'Contrapicado', distancia: 2.4, altura: ALTURAS.rodilla, fov: 46, mira: ALTURAS.ojos },
        { id: 'picado',     nombre: 'Picado',       distancia: 2.6, altura: 2.30,            fov: 46, mira: ALTURAS.cadera },
        { id: 'escorzo',    nombre: 'Escorzo',      distancia: 1.9, altura: ALTURAS.ojos,    fov: 38, mira: ALTURAS.ojos },
        { id: 'dos',        nombre: 'Plano a dos',  distancia: 4.0, altura: ALTURAS.pecho,   fov: 52, mira: ALTURAS.pecho }
    ];

    function preset(id) {
        for (var i = 0; i < PRESETS.length; i++) {
            if (PRESETS[i].id === id) return PRESETS[i];
        }
        return null;
    }

    /* ------------------------------------------------------------
       APLICAR UN PRESET
       Devuelve la nueva posición y orientación de la cámara.
       - sujeto:   { x, z, rot }  el sujeto enfocado
       - otro:     { x, z, rot }  el segundo sujeto, o null
       - camaraAct:{ x, z }       posición actual, para conservar
                                  el eje cuando el preset no lo fija
       ------------------------------------------------------------ */
    function aplicarPreset(id, sujeto, otro, camaraAct, aspecto) {
        aspecto = aspecto || 16 / 9;
        var p = preset(id);
        if (!p) return null;

        var objetivoX = sujeto.x;
        var objetivoZ = sujeto.z;
        var distancia = p.distancia;
        var fov = p.fov;
        var mira = p.mira;

        /* Ángulo actual cámara→sujeto, para no perder el eje elegido
           al cambiar de tipo de plano. */
        var ang = Math.atan2(camaraAct.x - sujeto.x, camaraAct.z - sujeto.z);

        if (id === 'escorzo' && otro) {
            /* Detrás y por encima del hombro del otro sujeto, mirando
               al enfocado: la cámara se coloca en la prolongación de la
               recta otro→enfocado, un poco desplazada lateralmente. */
            var dx = otro.x - sujeto.x;
            var dz = otro.z - sujeto.z;
            var len = Math.hypot(dx, dz) || 1;
            var ux = dx / len;
            var uz = dz / len;
            /* Perpendicular, para separarse del hombro */
            var px = -uz;
            var pz = ux;
            return {
                x: sujeto.x + ux * (len + 0.55) + px * 0.42,
                z: sujeto.z + uz * (len + 0.55) + pz * 0.42,
                altura: p.altura,
                fov: fov,
                mira: mira,
                objetivoX: objetivoX,
                objetivoZ: objetivoZ
            };
        }

        if (id === 'dos' && otro) {
            /* Encuadra a los dos: apunta al punto medio y retrocede lo
               suficiente para que quepa la separación entre ambos. */
            objetivoX = (sujeto.x + otro.x) / 2;
            objetivoZ = (sujeto.z + otro.z) / 2;
            var separacion = Math.hypot(otro.x - sujeto.x, otro.z - sujeto.z);
            /* Margen del 45% a los lados. El FOV horizontal sale del
               vertical por la relación de aspecto, con la tangente:
               tan(H/2) = tan(V/2) · aspecto */
            var anchoNecesario = Math.max(separacion * 1.45, 1.6);
            var fovH = 2 * Math.atan(Math.tan((fov * DEG) / 2) * aspecto);
            distancia = (anchoNecesario / 2) / Math.tan(fovH / 2);
            distancia = Math.max(2.6, Math.min(distancia, 9));
            ang = Math.atan2(camaraAct.x - objetivoX, camaraAct.z - objetivoZ);
        }

        return {
            x: objetivoX + Math.sin(ang) * distancia,
            z: objetivoZ + Math.cos(ang) * distancia,
            altura: p.altura,
            fov: fov,
            mira: mira,
            objetivoX: objetivoX,
            objetivoZ: objetivoZ
        };
    }

    /* ------------------------------------------------------------
       CLASIFICACIÓN DEL ENCUADRE
       ------------------------------------------------------------ */

    /* Altura visible en metros a la distancia del sujeto. De ahí sale
       qué parte del cuerpo entra en el cuadro y, por tanto, el tamaño
       de plano — igual que en un visor real. */
    function tamanoPlano(distancia, fovVertical) {
        var visible = 2 * distancia * Math.tan((fovVertical * DEG) / 2);
        if (visible < 0.42) return 'PRIMERÍSIMO PRIMER PLANO';
        if (visible < 0.75) return 'PRIMER PLANO';
        if (visible < 1.20) return 'PLANO MEDIO CORTO';
        if (visible < 1.70) return 'PLANO MEDIO';
        if (visible < 2.40) return 'PLANO AMERICANO';
        if (visible < 4.50) return 'PLANO GENERAL';
        return 'GRAN PLANO GENERAL';
    }

    /* Ángulo horizontal respecto a hacia dónde mira el sujeto. */
    function anguloPlano(camara, sujeto) {
        /* Dirección sujeto→cámara, en grados */
        var haciaCamara = Math.atan2(camara.x - sujeto.x, camara.z - sujeto.z) / DEG;
        /* Relativo a la mirada del sujeto */
        var rel = normalizar(haciaCamara - sujeto.rot);
        var abs = Math.abs(rel);
        var lado = rel >= 0 ? 'DER' : 'IZQ';

        if (abs < 22.5) return 'FRONTAL';
        if (abs < 67.5) return '3/4 ' + lado;
        if (abs < 112.5) return 'PERFIL ' + lado;
        if (abs < 157.5) return '3/4 TRASERO ' + lado;
        return 'TRASERO';
    }

    /* Altura e inclinación de la cámara. */
    function alturaPlano(alturaCamara, alturaMira, distancia) {
        var inclinacion = Math.atan2(alturaMira - alturaCamara, distancia) / DEG;

        if (alturaCamara > 2.6 && inclinacion < -40) return 'CENITAL';
        if (inclinacion < -14) return 'PICADO';
        if (inclinacion > 14) return 'CONTRAPICADO';

        if (alturaCamara < 0.45) return 'ALTURA SUELO';
        if (alturaCamara < 0.80) return 'ALTURA RODILLA';
        if (alturaCamara < 1.18) return 'ALTURA CADERA';
        if (alturaCamara < 1.50) return 'ALTURA PECHO';
        if (alturaCamara < 1.85) return 'ALTURA OJOS';
        return 'ALTURA ALTA';
    }

    function normalizar(grados) {
        var g = grados % 360;
        if (g > 180) g -= 360;
        if (g < -180) g += 360;
        return g;
    }

    /* Descripción completa: los cuatro campos de la píldora. */
    function describir(camara, sujeto, fovVertical) {
        var distancia = Math.hypot(camara.x - sujeto.x, camara.z - sujeto.z);
        var mira = camara.mira != null ? camara.mira : ALTURAS.pecho;
        return {
            distancia: distancia,
            tamano: tamanoPlano(distancia, fovVertical),
            angulo: anguloPlano(camara, sujeto),
            altura: alturaPlano(camara.altura, mira, distancia),
            mm: fovAMilimetros(fovVertical)
        };
    }

    function textoPildora(d) {
        return [d.tamano, d.angulo, d.altura, d.mm + ' MM'].join(' · ');
    }

    global.Encuadre = {
        ALTURAS: ALTURAS,
        PRESETS: PRESETS,
        preset: preset,
        aplicarPreset: aplicarPreset,
        fovAMilimetros: fovAMilimetros,
        milimetrosAFov: milimetrosAFov,
        tamanoPlano: tamanoPlano,
        anguloPlano: anguloPlano,
        alturaPlano: alturaPlano,
        normalizar: normalizar,
        describir: describir,
        textoPildora: textoPildora
    };
})(window);
