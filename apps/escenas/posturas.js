/* ============================================================
   POSTURAS — biblioteca de poses del maniquí.

   Cada postura es un mapa hueso → [giroX, giroY, giroZ] en grados,
   más la altura a la que baja la raíz y su inclinación.

   Convenios (mirando al maniquí de frente, que mira hacia +Z):
     · giroX negativo en cadera/hombro → miembro hacia delante
     · giroX positivo en rodilla       → talón hacia atrás
     · giroZ separa el miembro del eje del cuerpo
   ============================================================ */

(function (global) {
    'use strict';

    var LISTA = [
        {
            id: 'pie', nombre: 'De pie', es: 'de pie', en: 'standing',
            huesos: {
                hombroI: [0, 0, 4], hombroD: [0, 0, -4]
            }
        },
        {
            id: 'alerta', nombre: 'Alerta', es: 'en tensión, alerta', en: 'alert and tense',
            altura: -0.05,
            huesos: {
                abdomen: [-6, 0, 0], pecho: [-4, 0, 0], cuello: [4, 0, 0],
                hombroI: [-24, 0, 12], hombroD: [-24, 0, -12],
                codoI: [-62, 0, 0], codoD: [-62, 0, 0],
                caderaI: [-10, 0, 5], caderaD: [-10, 0, -5],
                rodillaI: [22, 0, 0], rodillaD: [22, 0, 0],
                tobilloI: [-12, 0, 0], tobilloD: [-12, 0, 0]
            }
        },
        {
            id: 'andando', nombre: 'Andando', es: 'caminando', en: 'walking',
            huesos: {
                pecho: [0, 6, 0],
                hombroI: [24, 0, 5], hombroD: [-26, 0, -5],
                codoI: [-18, 0, 0], codoD: [-30, 0, 0],
                caderaI: [-26, 0, 2], caderaD: [22, 0, -2],
                rodillaI: [14, 0, 0], rodillaD: [30, 0, 0],
                tobilloI: [8, 0, 0], tobilloD: [-14, 0, 0]
            }
        },
        {
            id: 'agachado', nombre: 'Agachado', es: 'agachado', en: 'crouching',
            altura: -0.42,
            huesos: {
                abdomen: [-24, 0, 0], pecho: [-10, 0, 0], cuello: [26, 0, 0],
                hombroI: [-38, 0, 10], hombroD: [-38, 0, -10],
                codoI: [-58, 0, 0], codoD: [-58, 0, 0],
                caderaI: [-88, 0, 10], caderaD: [-88, 0, -10],
                rodillaI: [104, 0, 0], rodillaD: [104, 0, 0],
                tobilloI: [-26, 0, 0], tobilloD: [-26, 0, 0]
            }
        },
        {
            id: 'rodillas', nombre: 'De rodillas', es: 'de rodillas', en: 'kneeling',
            altura: -0.44,
            huesos: {
                abdomen: [-4, 0, 0],
                hombroI: [-12, 0, 6], hombroD: [-12, 0, -6],
                caderaI: [-6, 0, 6], caderaD: [-6, 0, -6],
                rodillaI: [116, 0, 0], rodillaD: [116, 0, 0],
                tobilloI: [-32, 0, 0], tobilloD: [-32, 0, 0]
            }
        },
        {
            id: 'sentado', nombre: 'Sentado', es: 'sentado', en: 'seated',
            altura: -0.46,
            huesos: {
                abdomen: [-6, 0, 0], cuello: [4, 0, 0],
                hombroI: [-16, 0, 8], hombroD: [-16, 0, -8],
                codoI: [-52, 0, 0], codoD: [-52, 0, 0],
                caderaI: [-92, 0, 8], caderaD: [-92, 0, -8],
                rodillaI: [92, 0, 0], rodillaD: [92, 0, 0]
            }
        },
        {
            id: 'tumbado', nombre: 'Tumbado', es: 'tumbado boca arriba', en: 'lying on their back',
            inclinacion: -90, altura: 0.16, desplazamiento: 0.85,
            huesos: {
                cuello: [22, 0, 0],
                hombroI: [0, 0, 26], hombroD: [0, 0, -26],
                codoI: [-14, 0, 0], codoD: [-14, 0, 0],
                caderaI: [0, 0, 7], caderaD: [0, 0, -7],
                tobilloI: [-34, 0, 0], tobilloD: [-34, 0, 0]
            }
        },
        {
            id: 'durmiendo', nombre: 'Durmiendo', es: 'tumbado y acurrucado, durmiendo', en: 'curled up asleep',
            inclinacion: -90, altura: 0.18, desplazamiento: 0.62,
            huesos: {
                abdomen: [-20, 0, 0], cuello: [26, 0, 0],
                hombroI: [-58, 0, 34], hombroD: [-52, 0, -30],
                codoI: [-84, 0, 0], codoD: [-88, 0, 0],
                caderaI: [-62, 0, 12], caderaD: [-56, 0, -10],
                rodillaI: [92, 0, 0], rodillaD: [86, 0, 0],
                tobilloI: [-20, 0, 0], tobilloD: [-20, 0, 0]
            }
        },
        {
            id: 'yoga', nombre: 'Yoga (árbol)', es: 'en la postura del árbol de yoga', en: 'in a yoga tree pose',
            huesos: {
                hombroI: [-8, 0, 152], hombroD: [-8, 0, -152],
                codoI: [-26, 0, 0], codoD: [-26, 0, 0],
                caderaD: [0, 0, -62], rodillaD: [122, 0, 0],
                tobilloD: [-16, 0, 0]
            }
        },
        {
            id: 'pelea', nombre: 'Pelea', es: 'en guardia de pelea', en: 'in a fighting stance',
            altura: -0.10,
            huesos: {
                pecho: [0, 26, 0], cuello: [0, -18, 0],
                hombroI: [-58, 0, 16], hombroD: [-42, 0, -14],
                codoI: [-92, 0, 0], codoD: [-104, 0, 0],
                caderaI: [-16, 0, 12], caderaD: [10, 0, -12],
                rodillaI: [34, 0, 0], rodillaD: [26, 0, 0],
                tobilloI: [-16, 0, 0], tobilloD: [-10, 0, 0]
            }
        },
        {
            id: 'senalando', nombre: 'Señalando', es: 'señalando al frente', en: 'pointing ahead',
            huesos: {
                pecho: [0, -10, 0],
                hombroD: [-86, 0, -8], codoD: [-8, 0, 0],
                hombroI: [10, 0, 6], codoI: [-24, 0, 0]
            }
        },
        {
            id: 'brazos', nombre: 'Brazos cruzados', es: 'con los brazos cruzados', en: 'with arms folded',
            huesos: {
                hombroI: [-44, 0, 26], hombroD: [-44, 0, -26],
                codoI: [-112, 0, -18], codoD: [-112, 0, 18],
                caderaI: [0, 0, 4], caderaD: [0, 0, -4]
            }
        }
    ];

    function definicion(id) {
        for (var i = 0; i < LISTA.length; i++) if (LISTA[i].id === id) return LISTA[i];
        return LISTA[0];
    }

    /* Cómo se nombra la postura dentro del prompt */
    function texto(id, en) {
        var p = definicion(id);
        return en ? p.en : p.es;
    }

    global.Posturas = {
        LISTA: LISTA,
        definicion: definicion,
        texto: texto
    };
})(window);
