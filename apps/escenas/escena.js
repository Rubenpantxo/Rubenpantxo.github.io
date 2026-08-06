/* ============================================================
   ESCENA — mundo 3D, marcadores arrastrables y las dos cámaras.

   Un solo WebGLRenderer con dos cámaras que se intercambian:
     · cenital → cámara fija en picado, es donde se arrastra
     · plano   → la cámara de la escena, con su FOV y su relación
                 de aspecto buzoneada

   Las etiquetas no usan CSS2DRenderer (en r128 va en un archivo
   aparte): se proyectan a mano con vector.project().
   ============================================================ */

(function (global) {
    'use strict';

    var DEG = Math.PI / 180;

    /* Paleta del Halogen Kit, en números para three.js */
    var COLOR = {
        canvas: 0x0a0d0a,
        suelo: 0x12160f,
        pared: 0x171c15,
        paredFondo: 0x1a1f18,
        rejilla: 0x2a312a,
        halogen: 0xa3e635,
        piel: 0xe8e4d8,
        pielAlt: 0xd6cdb8,
        disco: 0x3a423a
    };

    var SALA = { ancho: 14, fondo: 12, alto: 3 };
    var UMBRAL_PUCK = 0.5;
    var UMBRAL_TIRADOR = 0.3;
    var RADIO_TIRADOR = 0.85;

    var renderer, escena, camCenital, camPlano, raycaster, planoSuelo;
    var lienzo, capaEtiquetas, opciones;
    var grupoSujetos = [], grupoElementos = [], grupoCamara, mallaFrustum;
    var vista = 'cenital', aspecto = 16 / 9, etiquetasVisibles = true;
    var estadoActual = null;
    var arrastre = null;
    var punteroNDC = new THREE.Vector2();
    var puntoSuelo = new THREE.Vector3();
    var vecProy = new THREE.Vector3();

    /* ------------------------------------------------------------
       CONSTRUCCIÓN
       ------------------------------------------------------------ */
    function init(opts) {
        opciones = opts;
        lienzo = opts.canvas;
        capaEtiquetas = opts.labels;

        renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
        renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
        renderer.setClearColor(COLOR.canvas, 1);
        renderer.shadowMap.enabled = false;

        escena = new THREE.Scene();
        escena.fog = new THREE.Fog(COLOR.canvas, 16, 34);

        camCenital = new THREE.PerspectiveCamera(46, 1, 0.1, 200);
        camCenital.position.set(0, 11.5, 8.5);
        camCenital.lookAt(0, 0, -0.5);

        camPlano = new THREE.PerspectiveCamera(45, 1, 0.05, 200);

        raycaster = new THREE.Raycaster();
        planoSuelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        construirSala();
        construirLuces();
        construirCamaraGizmo();

        lienzo.addEventListener('pointerdown', alPulsar);
        global.addEventListener('pointermove', alMover);
        global.addEventListener('pointerup', alSoltar);
        global.addEventListener('pointercancel', alSoltar);

        if (global.ResizeObserver) {
            new ResizeObserver(redimensionar).observe(lienzo.parentElement);
        } else {
            global.addEventListener('resize', redimensionar);
        }
        redimensionar();

        renderer.setAnimationLoop(dibujar);
    }

    function construirSala() {
        var suelo = new THREE.Mesh(
            new THREE.PlaneGeometry(SALA.ancho, SALA.fondo),
            new THREE.MeshStandardMaterial({ color: COLOR.suelo, roughness: .95, metalness: 0 })
        );
        suelo.rotation.x = -Math.PI / 2;
        escena.add(suelo);

        var rejilla = new THREE.GridHelper(SALA.ancho, SALA.ancho, COLOR.halogen, COLOR.rejilla);
        rejilla.position.y = 0.002;
        rejilla.material.opacity = 0.22;
        rejilla.material.transparent = true;
        escena.add(rejilla);

        /* Tres paredes: fondo y laterales, mirando hacia dentro */
        var matFondo = new THREE.MeshStandardMaterial({
            color: COLOR.paredFondo, roughness: 1, side: THREE.DoubleSide
        });
        var matLateral = new THREE.MeshStandardMaterial({
            color: COLOR.pared, roughness: 1, side: THREE.DoubleSide
        });

        var fondo = new THREE.Mesh(new THREE.PlaneGeometry(SALA.ancho, SALA.alto), matFondo);
        fondo.position.set(0, SALA.alto / 2, -SALA.fondo / 2);
        escena.add(fondo);

        var izq = new THREE.Mesh(new THREE.PlaneGeometry(SALA.fondo, SALA.alto), matLateral);
        izq.position.set(-SALA.ancho / 2, SALA.alto / 2, 0);
        izq.rotation.y = Math.PI / 2;
        escena.add(izq);

        var der = new THREE.Mesh(new THREE.PlaneGeometry(SALA.fondo, SALA.alto), matLateral);
        der.position.set(SALA.ancho / 2, SALA.alto / 2, 0);
        der.rotation.y = -Math.PI / 2;
        escena.add(der);

        /* Zócalo halógeno en la unión de las paredes con el suelo */
        var zocalo = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(SALA.ancho, 0.02, SALA.fondo)),
            new THREE.LineBasicMaterial({ color: COLOR.halogen, transparent: true, opacity: .18 })
        );
        zocalo.position.y = 0.01;
        escena.add(zocalo);
    }

    function construirLuces() {
        escena.add(new THREE.HemisphereLight(0xdfe8d4, 0x0a0d0a, 0.85));

        var clave = new THREE.DirectionalLight(0xffffff, 0.75);
        clave.position.set(5, 9, 6);
        escena.add(clave);

        /* Un toque halógeno de relleno, sin teñir la sala entera */
        var relleno = new THREE.DirectionalLight(0xa3e635, 0.10);
        relleno.position.set(-6, 4, -5);
        escena.add(relleno);
    }

    /* ------------------------------------------------------------
       MANIQUÍ ARTICULADO
       Figura tipo maniquí de ensayo: piezas claras segmentadas,
       articulaciones oscuras y arnés en el pecho. Se construye a
       1,75 m, que es la talla sobre la que encuadre.js calcula el
       tamaño de plano; la altura real se aplica escalando el grupo.
       ------------------------------------------------------------ */
    var ALTURA_BASE = 1.75;

    /* Registra la escala de partida para poder aplicar complexión
       después sin perder la forma original de la pieza */
    function conVolumen(malla, sx, sy, sz) {
        malla.scale.set(sx || 1, sy || 1, sz || 1);
        malla.userData.base = { x: sx || 1, y: sy || 1, z: sz || 1 };
        return malla;
    }

    /* Piezas que no engordan pero sí se apartan del eje cuando el
       cuerpo ensancha: brazos, arnés y la separación de las piernas.
       fx/fz gradúan cuánto les afecta la complexión. */
    function conApertura(malla, fx, fz) {
        malla.userData.pos0 = { x: malla.position.x, z: malla.position.z };
        malla.userData.apertura = { x: fx, z: fz || 0 };
        return malla;
    }

    function crearSujeto(indice) {
        var grupo = new THREE.Group();
        var tono = indice % 2 === 0 ? COLOR.piel : COLOR.pielAlt;

        var matPiel = new THREE.MeshStandardMaterial({ color: tono, roughness: .78, metalness: 0 });
        var matJunta = new THREE.MeshStandardMaterial({ color: 0x2a2e28, roughness: .62 });
        var matArnes = new THREE.MeshStandardMaterial({ color: 0x1e2119, roughness: .85 });
        var matOjo = new THREE.MeshStandardMaterial({ color: 0x14170f, roughness: .35 });

        var volumen = [];
        var apertura = [];

        /* --- disco de apoyo con la cuña de orientación --- */
        var disco = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 0.03, 32),
            new THREE.MeshStandardMaterial({ color: COLOR.disco, roughness: .8 })
        );
        disco.position.y = 0.015;
        grupo.add(disco);

        var proa = new THREE.Mesh(
            new THREE.ConeGeometry(0.1, 0.2, 3),
            new THREE.MeshBasicMaterial({ color: COLOR.halogen })
        );
        proa.position.set(0, 0.035, 0.3);
        proa.rotation.x = Math.PI / 2;
        grupo.add(proa);

        /* --- piernas: pie, tobillo, tibia, rodilla, muslo --- */
        [-0.11, 0.11].forEach(function (lado) {
            var pie = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.075, 0.26), matPiel);
            pie.position.set(lado, 0.038, 0.035);
            apertura.push(conApertura(pie, 0.5));
            grupo.add(pie);

            var tobillo = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), matJunta);
            tobillo.position.set(lado, 0.095, 0);
            apertura.push(conApertura(tobillo, 0.5));
            grupo.add(tobillo);

            var tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.048, 0.40, 14), matPiel);
            tibia.position.set(lado, 0.30, 0);
            volumen.push(conVolumen(tibia, 1, 1, 1));
            apertura.push(conApertura(tibia, 0.5));
            grupo.add(tibia);

            var rodilla = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 10), matJunta);
            rodilla.position.set(lado, 0.51, 0);
            apertura.push(conApertura(rodilla, 0.5));
            grupo.add(rodilla);

            var muslo = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.062, 0.38, 14), matPiel);
            muslo.position.set(lado, 0.72, 0);
            volumen.push(conVolumen(muslo, 1, 1, 1));
            apertura.push(conApertura(muslo, 0.5));
            grupo.add(muslo);

            var cadera = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), matJunta);
            cadera.position.set(lado, 0.93, 0);
            apertura.push(conApertura(cadera, 0.6));
            grupo.add(cadera);
        });

        /* --- pelvis y cintura --- */
        var pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), matPiel);
        pelvis.position.y = 0.98;
        volumen.push(conVolumen(pelvis, 1, 0.72, 0.82));
        grupo.add(pelvis);

        var cintura = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.08, 18), matJunta);
        cintura.position.y = 1.10;
        volumen.push(conVolumen(cintura, 1, 1, 1));
        grupo.add(cintura);

        /* --- tórax --- */
        var torax = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.155, 0.34, 20), matPiel);
        torax.position.y = 1.30;
        volumen.push(conVolumen(torax, 1, 1, 0.82));
        grupo.add(torax);

        var pecho = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 14), matPiel);
        pecho.position.y = 1.44;
        volumen.push(conVolumen(pecho, 1, 0.62, 0.8));
        grupo.add(pecho);

        /* --- arnés en aspa sobre el pecho, la marca de la casa --- */
        [-1, 1].forEach(function (signo) {
            var tira = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.025), matArnes);
            tira.position.set(signo * 0.06, 1.30, 0.155);
            tira.rotation.z = -signo * 0.3;
            apertura.push(conApertura(tira, 1, 1));
            grupo.add(tira);
        });
        var cinturon = new THREE.Mesh(new THREE.CylinderGeometry(0.163, 0.163, 0.055, 20), matArnes);
        cinturon.position.y = 1.16;
        volumen.push(conVolumen(cinturon, 1, 1, 0.84));
        grupo.add(cinturon);

        /* --- brazos: hombro, brazo, codo, antebrazo, mano --- */
        [-1, 1].forEach(function (signo) {
            var hx = signo * 0.215;

            var hombro = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 12), matJunta);
            hombro.position.set(hx, 1.42, 0);
            apertura.push(conApertura(hombro, 1));
            grupo.add(hombro);

            var brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.28, 12), matPiel);
            brazo.position.set(hx, 1.27, 0);
            apertura.push(conApertura(brazo, 1));
            grupo.add(brazo);

            var codo = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), matJunta);
            codo.position.set(hx, 1.12, 0);
            apertura.push(conApertura(codo, 1));
            grupo.add(codo);

            var antebrazo = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.036, 0.26, 12), matPiel);
            antebrazo.position.set(hx, 0.98, 0);
            apertura.push(conApertura(antebrazo, 1));
            grupo.add(antebrazo);

            var mano = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), matPiel);
            mano.position.set(hx, 0.83, 0.01);
            mano.scale.set(0.75, 1.15, 0.55);
            apertura.push(conApertura(mano, 1));
            grupo.add(mano);
        });

        /* --- cuello y cabeza --- */
        var cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.075, 14), matJunta);
        cuello.position.y = 1.535;
        grupo.add(cuello);

        var cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18), matPiel);
        cabeza.position.y = 1.665;
        cabeza.scale.set(0.95, 1.12, 1);
        grupo.add(cabeza);

        [-0.045, 0.045].forEach(function (ox) {
            var ojo = new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 10), matOjo);
            ojo.position.set(ox, 1.685, 0.104);
            ojo.scale.set(1, 1, 0.5);
            grupo.add(ojo);
        });

        /* --- tirador de rotación --- */
        var varilla = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, RADIO_TIRADOR, 8),
            new THREE.MeshBasicMaterial({ color: COLOR.halogen, transparent: true, opacity: .35 })
        );
        varilla.position.set(0, 0.04, RADIO_TIRADOR / 2);
        varilla.rotation.x = Math.PI / 2;
        grupo.add(varilla);

        var tirador = new THREE.Mesh(
            new THREE.SphereGeometry(0.075, 16, 12),
            new THREE.MeshBasicMaterial({ color: COLOR.halogen })
        );
        tirador.position.set(0, 0.05, RADIO_TIRADOR);
        grupo.add(tirador);

        grupo.userData.gizmo = [varilla, tirador, disco, proa];
        grupo.userData.volumen = volumen;
        grupo.userData.apertura = apertura;
        escena.add(grupo);
        return grupo;
    }

    /* Altura y complexión: la primera escala todo el maniquí, la
       segunda sólo ensancha torso, cadera y piernas. */
    function ajustarFisico(grupo, altura, complexion) {
        var h = (altura || ALTURA_BASE) / ALTURA_BASE;
        var c = complexion || 1;
        grupo.scale.setScalar(h);
        grupo.userData.volumen.forEach(function (m) {
            var b = m.userData.base || { x: 1, y: 1, z: 1 };
            m.scale.set(b.x * c, b.y, b.z * c);
        });
        grupo.userData.apertura.forEach(function (m) {
            var p = m.userData.pos0, f = m.userData.apertura;
            m.position.x = p.x * (1 + (c - 1) * f.x);
            m.position.z = p.z * (1 + (c - 1) * f.z);
        });
    }

    /* --- Marcador de cámara: disco halógeno + cuña + frustum --- */
    function construirCamaraGizmo() {
        grupoCamara = new THREE.Group();

        var disco = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 0.12, 32),
            new THREE.MeshStandardMaterial({ color: COLOR.halogen, roughness: .45 })
        );
        disco.position.y = 0.06;
        grupoCamara.add(disco);

        var matCuerpo = new THREE.MeshStandardMaterial({ color: 0x1a1f18, roughness: .6 });
        var matMetal = new THREE.MeshStandardMaterial({ color: 0x0a0d0a, roughness: .35, metalness: .5 });
        var matAro = new THREE.MeshStandardMaterial({ color: 0x39412f, roughness: .5 });

        /* Trípode: tres patas abiertas y una columna central */
        for (var i = 0; i < 3; i++) {
            var a = (i / 3) * Math.PI * 2 + Math.PI;
            var pata = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.62, 8), matMetal);
            pata.position.set(Math.sin(a) * 0.12, 0.3, Math.cos(a) * 0.12);
            pata.rotation.set(Math.cos(a) * 0.32, 0, -Math.sin(a) * 0.32);
            grupoCamara.add(pata);
        }
        var columna = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.2, 12), matMetal);
        columna.position.y = 0.66;
        grupoCamara.add(columna);

        /* Cabezal y cuerpo de cámara */
        var rotula = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), matAro);
        rotula.position.y = 0.76;
        grupoCamara.add(rotula);

        var cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.36), matCuerpo);
        cuerpo.position.set(0, 0.86, 0.02);
        grupoCamara.add(cuerpo);

        var chasis = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.12), matAro);
        chasis.position.set(0, 0.99, -0.04);
        grupoCamara.add(chasis);

        /* Óptica: barrilete, dos aros de foco y la lente */
        var barrilete = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.26, 20), matCuerpo);
        barrilete.position.set(0, 0.86, 0.28);
        barrilete.rotation.x = Math.PI / 2;
        grupoCamara.add(barrilete);

        [0.22, 0.32].forEach(function (z) {
            var aro = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.012, 8, 20), matAro);
            aro.position.set(0, 0.86, z);
            grupoCamara.add(aro);
        });

        var lente = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.02, 20), matMetal);
        lente.position.set(0, 0.86, 0.415);
        lente.rotation.x = Math.PI / 2;
        grupoCamara.add(lente);

        /* Parasol y visor: dan de un vistazo hacia dónde mira */
        var parasol = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.19, 0.1), matCuerpo);
        parasol.position.set(0, 0.86, 0.44);
        grupoCamara.add(parasol);

        var visor = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.1, 12), matAro);
        visor.position.set(-0.15, 0.93, -0.02);
        visor.rotation.z = Math.PI / 2;
        grupoCamara.add(visor);

        var varilla = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, RADIO_TIRADOR, 8),
            new THREE.MeshBasicMaterial({ color: COLOR.halogen, transparent: true, opacity: .35 })
        );
        varilla.position.set(0, 0.04, RADIO_TIRADOR / 2);
        varilla.rotation.x = Math.PI / 2;
        grupoCamara.add(varilla);

        var tirador = new THREE.Mesh(
            new THREE.SphereGeometry(0.075, 16, 12),
            new THREE.MeshBasicMaterial({ color: COLOR.halogen })
        );
        tirador.position.set(0, 0.05, RADIO_TIRADOR);
        grupoCamara.add(tirador);
        grupoCamara.userData.gizmo = [varilla, tirador];

        /* Abanico del campo de visión, sobre el suelo */
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
        mallaFrustum = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
            color: COLOR.halogen, transparent: true, opacity: .06, side: THREE.DoubleSide,
            depthWrite: false
        }));
        mallaFrustum.position.y = 0.006;
        escena.add(mallaFrustum);

        escena.add(grupoCamara);
    }

    /* ------------------------------------------------------------
       ELEMENTOS DE ESCENA
       Las formas básicas se construyen en un metro y se escalan con
       su slider. Las plantillas llevan medidas reales, tomadas
       respecto a un sujeto de 1,75 m, y no se escalan.
       ------------------------------------------------------------ */
    var MAT_EL = null;
    function matsElemento() {
        if (!MAT_EL) {
            MAT_EL = {
                claro: new THREE.MeshStandardMaterial({ color: 0xdcd8cc, roughness: .82 }),
                medio: new THREE.MeshStandardMaterial({ color: 0xa8a396, roughness: .85 }),
                oscuro: new THREE.MeshStandardMaterial({ color: 0x2a2e28, roughness: .7 }),
                carton: new THREE.MeshStandardMaterial({ color: 0xb99a6b, roughness: .95 }),
                maceta: new THREE.MeshStandardMaterial({ color: 0x8a5a3b, roughness: .9 }),
                hoja: new THREE.MeshStandardMaterial({ color: 0x4d6b33, roughness: .85 }),
                cristal: new THREE.MeshStandardMaterial({
                    color: 0x8fa3b0, roughness: .25, metalness: .1,
                    transparent: true, opacity: .55
                })
            };
        }
        return MAT_EL;
    }

    /* Medidas reales en metros: largo (X), alto (Y), fondo (Z) */
    var MEDIDAS = {
        rect: [1, 1, 1], circulo: [1, 1, 1], triangulo: [1, 1, 1],
        caja: [0.60, 0.50, 0.40],
        coche: [1.80, 1.45, 4.40],
        silla: [0.45, 0.85, 0.48],
        bici: [0.55, 1.05, 1.75],
        moto: [0.75, 1.20, 2.10],
        planta: [0.44, 1.10, 0.44]
    };

    var ESCALABLES = { rect: 1, circulo: 1, triangulo: 1 };

    function crearElemento(tipo) {
        var m = matsElemento();
        var g = new THREE.Group();

        if (tipo === 'rect') {
            var caja1 = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.7), m.claro);
            caja1.position.y = 0.4;
            g.add(caja1);
        } else if (tipo === 'circulo') {
            var cil = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 28), m.claro);
            cil.position.y = 0.4;
            g.add(cil);
        } else if (tipo === 'triangulo') {
            var pri = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.8, 3), m.claro);
            pri.position.y = 0.4;
            g.add(pri);
        } else if (tipo === 'caja') {
            var cuerpoCaja = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.50, 0.40), m.carton);
            cuerpoCaja.position.y = 0.25;
            g.add(cuerpoCaja);
            /* Cinta de cierre en la tapa */
            var cinta = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.006, 0.07), m.medio);
            cinta.position.y = 0.503;
            g.add(cinta);
        } else if (tipo === 'coche') {
            var chasisC = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.62, 4.30), m.claro);
            chasisC.position.y = 0.62;
            g.add(chasisC);
            var cabina = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.56, 2.30), m.claro);
            cabina.position.set(0, 1.16, -0.20);
            g.add(cabina);
            var luna = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.46, 0.06), m.cristal);
            luna.position.set(0, 1.16, 0.94);
            luna.rotation.x = -0.42;
            g.add(luna);
            [[-0.82, 1.42], [0.82, 1.42], [-0.82, -1.38], [0.82, -1.38]].forEach(function (r) {
                var rueda = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 18), m.oscuro);
                rueda.position.set(r[0], 0.33, r[1]);
                rueda.rotation.z = Math.PI / 2;
                g.add(rueda);
            });
        } else if (tipo === 'silla') {
            var asiento = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.045, 0.44), m.claro);
            asiento.position.y = 0.45;
            g.add(asiento);
            var respaldo = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.04), m.claro);
            respaldo.position.set(0, 0.66, -0.20);
            respaldo.rotation.x = 0.12;
            g.add(respaldo);
            [[-0.19, 0.18], [0.19, 0.18], [-0.19, -0.18], [0.19, -0.18]].forEach(function (p) {
                var pata = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.022, 0.45, 8), m.claro);
                pata.position.set(p[0], 0.225, p[1]);
                g.add(pata);
            });
        } else if (tipo === 'bici' || tipo === 'moto') {
            var moto = tipo === 'moto';
            var rr = moto ? 0.32 : 0.34;                 /* radio de rueda */
            var sep = moto ? 0.72 : 0.62;                /* semidistancia entre ejes */
            var grosor = moto ? 0.14 : 0.045;
            [-sep, sep].forEach(function (z) {
                var rueda = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, grosor, 20), m.oscuro);
                rueda.position.set(0, rr, z);
                rueda.rotation.z = Math.PI / 2;
                g.add(rueda);
            });
            if (moto) {
                var deposito = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.30, 1.05), m.claro);
                deposito.position.set(0, 0.72, 0.02);
                g.add(deposito);
                var asientoM = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.11, 0.62), m.oscuro);
                asientoM.position.set(0, 0.86, -0.42);
                g.add(asientoM);
            } else {
                /* Cuadro en diamante: dos tubos y la tija */
                var sup = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 8), m.medio);
                sup.position.set(0, 0.82, 0.02);
                sup.rotation.x = Math.PI / 2;
                g.add(sup);
                var inf = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 8), m.medio);
                inf.position.set(0, 0.55, 0.14);
                inf.rotation.set(Math.PI / 2 - 0.42, 0, 0);
                g.add(inf);
                var tija = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), m.medio);
                tija.position.set(0, 0.75, -0.26);
                tija.rotation.x = 0.2;
                g.add(tija);
                var sillin = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.26), m.oscuro);
                sillin.position.set(0, 0.96, -0.30);
                g.add(sillin);
            }
            var horquilla = new THREE.Mesh(
                new THREE.CylinderGeometry(moto ? 0.03 : 0.022, moto ? 0.03 : 0.022, moto ? 0.75 : 0.68, 8), m.medio);
            horquilla.position.set(0, moto ? 0.66 : 0.62, sep - 0.04);
            horquilla.rotation.x = 0.28;
            g.add(horquilla);
            var manillar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.018, 0.018, moto ? 0.72 : 0.54, 8), m.oscuro);
            manillar.position.set(0, moto ? 1.02 : 0.98, sep - 0.14);
            manillar.rotation.z = Math.PI / 2;
            g.add(manillar);
        } else if (tipo === 'planta') {
            var maceta = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.32, 22), m.maceta);
            maceta.position.y = 0.16;
            g.add(maceta);
            var borde = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.022, 8, 24), m.maceta);
            borde.position.y = 0.32;
            borde.rotation.x = Math.PI / 2;
            g.add(borde);
            var tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.34, 8), m.hoja);
            tallo.position.y = 0.49;
            g.add(tallo);
            /* Tres masas de hoja desiguales, que no parezca un helado */
            [[0, 0.80, 0, 0.26], [-0.14, 0.94, 0.06, 0.21], [0.13, 0.92, -0.07, 0.19]].forEach(function (h) {
                var mata = new THREE.Mesh(new THREE.SphereGeometry(h[3], 16, 12), m.hoja);
                mata.position.set(h[0], h[1], h[2]);
                mata.scale.y = 0.86;
                g.add(mata);
            });
        }

        /* Tirador de rotación, igual que el de los sujetos */
        var varilla = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, RADIO_TIRADOR, 8),
            new THREE.MeshBasicMaterial({ color: COLOR.halogen, transparent: true, opacity: .35 })
        );
        varilla.position.set(0, 0.04, RADIO_TIRADOR / 2);
        varilla.rotation.x = Math.PI / 2;
        g.add(varilla);

        var tirador = new THREE.Mesh(
            new THREE.SphereGeometry(0.075, 16, 12),
            new THREE.MeshBasicMaterial({ color: COLOR.halogen })
        );
        tirador.position.set(0, 0.05, RADIO_TIRADOR);
        g.add(tirador);

        g.userData.gizmo = [varilla, tirador];
        g.userData.tipo = tipo;
        escena.add(g);
        return g;
    }

    /* ------------------------------------------------------------
       SINCRONIZACIÓN CON EL ESTADO
       ------------------------------------------------------------ */
    function sincronizar(estado) {
        estadoActual = estado;

        /* Crear o retirar marcadores según cuántos sujetos haya */
        while (grupoSujetos.length < estado.sujetos.length) {
            grupoSujetos.push(crearSujeto(grupoSujetos.length));
        }
        while (grupoSujetos.length > estado.sujetos.length) {
            escena.remove(grupoSujetos.pop());
        }

        var enCenital = vista === 'cenital';
        estado.sujetos.forEach(function (s, i) {
            var g = grupoSujetos[i];
            g.position.set(s.x, 0, s.z);
            g.rotation.y = s.rot * DEG;
            ajustarFisico(g, s.altura, s.complexion);
            /* Un sujeto añadido estando en vista de plano no debe
               aparecer con su tirador colgando */
            g.userData.gizmo.forEach(function (m) { m.visible = enCenital; });
        });

        /* Elementos: el tipo puede cambiar, así que se rehace el
           marcador cuando no coincide con el que ya había */
        var els = estado.elementos || [];
        while (grupoElementos.length > els.length) {
            escena.remove(grupoElementos.pop());
        }
        els.forEach(function (e, i) {
            if (!grupoElementos[i]) {
                grupoElementos[i] = crearElemento(e.tipo);
            } else if (grupoElementos[i].userData.tipo !== e.tipo) {
                escena.remove(grupoElementos[i]);
                grupoElementos[i] = crearElemento(e.tipo);
            }
            var g = grupoElementos[i];
            g.position.set(e.x, 0, e.z);
            g.rotation.y = (e.rot || 0) * DEG;
            var s = ESCALABLES[e.tipo] ? (e.escala || 1) : 1;
            g.scale.setScalar(s);
            g.userData.enPlano = e.enPlano !== false;
            g.userData.gizmo.forEach(function (m) { m.visible = enCenital; });
        });

        var c = estado.camara;
        grupoCamara.position.set(c.x, 0, c.z);
        grupoCamara.rotation.y = anguloCamara(estado) * DEG;

        actualizarFrustum(estado);
        actualizarCamPlano(estado);
    }

    /* Hacia dónde apunta la cámara: al objetivo activo */
    function anguloCamara(estado) {
        var obj = objetivoDe(estado);
        return Math.atan2(obj.x - estado.camara.x, obj.z - estado.camara.z) / DEG;
    }

    function objetivoDe(estado) {
        var c = estado.camara;
        if (c.objetivoX != null && c.objetivoZ != null) {
            return { x: c.objetivoX, z: c.objetivoZ };
        }
        var s = estado.sujetos[estado.enfoque] || estado.sujetos[0];
        return { x: s.x, z: s.z };
    }

    function actualizarFrustum(estado) {
        var c = estado.camara;
        var ang = anguloCamara(estado) * DEG;
        /* FOV horizontal a partir del vertical y la relación de aspecto */
        var fovH = 2 * Math.atan(Math.tan((c.fov * DEG) / 2) * aspecto);
        var largo = 6;

        var izq = ang - fovH / 2;
        var der = ang + fovH / 2;

        var pos = mallaFrustum.geometry.attributes.position;
        pos.setXYZ(0, c.x, 0, c.z);
        pos.setXYZ(1, c.x + Math.sin(izq) * largo, 0, c.z + Math.cos(izq) * largo);
        pos.setXYZ(2, c.x + Math.sin(der) * largo, 0, c.z + Math.cos(der) * largo);
        pos.needsUpdate = true;
        mallaFrustum.geometry.computeBoundingSphere();
    }

    function actualizarCamPlano(estado) {
        var c = estado.camara;
        var obj = objetivoDe(estado);
        camPlano.fov = c.fov;
        camPlano.aspect = aspecto;
        camPlano.position.set(c.x, c.altura, c.z);
        camPlano.lookAt(obj.x, c.mira != null ? c.mira : 1.35, obj.z);
        camPlano.updateProjectionMatrix();
    }

    /* ------------------------------------------------------------
       INTERACCIÓN
       ------------------------------------------------------------ */
    function puntoDelPuntero(ev) {
        var r = lienzo.getBoundingClientRect();
        punteroNDC.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
        punteroNDC.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
        raycaster.setFromCamera(punteroNDC, camCenital);
        return raycaster.ray.intersectPlane(planoSuelo, puntoSuelo) ? puntoSuelo : null;
    }

    /* Devuelve el marcador o el tirador más cercano al punto dado */
    function objetivoBajo(p) {
        if (!estadoActual) return null;
        var mejor = null;
        var mejorD = Infinity;

        function probar(tipo, id, x, z, umbral) {
            var d = Math.hypot(p.x - x, p.z - z);
            if (d < umbral && d < mejorD) { mejorD = d; mejor = { tipo: tipo, id: id }; }
        }

        /* Los tiradores tienen prioridad: se comprueban primero y con
           un umbral más pequeño */
        estadoActual.sujetos.forEach(function (s, i) {
            var a = s.rot * DEG;
            probar('rot', i, s.x + Math.sin(a) * RADIO_TIRADOR, s.z + Math.cos(a) * RADIO_TIRADOR, UMBRAL_TIRADOR);
        });
        (estadoActual.elementos || []).forEach(function (e, i) {
            var a = (e.rot || 0) * DEG;
            var r = RADIO_TIRADOR * (ESCALABLES[e.tipo] ? (e.escala || 1) : 1);
            probar('rotel', i, e.x + Math.sin(a) * r, e.z + Math.cos(a) * r, UMBRAL_TIRADOR);
        });
        var ac = anguloCamara(estadoActual) * DEG;
        probar('rotcam', -1,
            estadoActual.camara.x + Math.sin(ac) * RADIO_TIRADOR,
            estadoActual.camara.z + Math.cos(ac) * RADIO_TIRADOR, UMBRAL_TIRADOR);

        if (mejor) return mejor;

        estadoActual.sujetos.forEach(function (s, i) {
            probar('pos', i, s.x, s.z, UMBRAL_PUCK);
        });
        (estadoActual.elementos || []).forEach(function (e, i) {
            probar('posel', i, e.x, e.z, UMBRAL_PUCK);
        });
        probar('poscam', -1, estadoActual.camara.x, estadoActual.camara.z, UMBRAL_PUCK);

        return mejor;
    }

    function alPulsar(ev) {
        if (vista !== 'cenital') return;
        var p = puntoDelPuntero(ev);
        if (!p) return;
        var obj = objetivoBajo(p);
        if (!obj) return;
        ev.preventDefault();
        arrastre = obj;
        lienzo.classList.add('is-grabbing');
        if (lienzo.setPointerCapture) {
            try { lienzo.setPointerCapture(ev.pointerId); } catch (e) { /* opcional */ }
        }
    }

    function alMover(ev) {
        if (vista !== 'cenital') return;

        if (!arrastre) {
            var p0 = puntoDelPuntero(ev);
            lienzo.classList.toggle('is-over', !!(p0 && objetivoBajo(p0)));
            return;
        }

        var p = puntoDelPuntero(ev);
        if (!p) return;

        var lim = { x: SALA.ancho / 2 - 0.6, z: SALA.fondo / 2 - 0.6 };
        var x = Math.max(-lim.x, Math.min(lim.x, p.x));
        var z = Math.max(-lim.z, Math.min(lim.z, p.z));

        if (arrastre.tipo === 'pos') {
            opciones.onMoverSujeto(arrastre.id, x, z);
        } else if (arrastre.tipo === 'poscam') {
            opciones.onMoverCamara(x, z);
        } else if (arrastre.tipo === 'rot') {
            var s = estadoActual.sujetos[arrastre.id];
            opciones.onRotarSujeto(arrastre.id, Math.atan2(p.x - s.x, p.z - s.z) / DEG);
        } else if (arrastre.tipo === 'posel') {
            opciones.onMoverElemento(arrastre.id, x, z);
        } else if (arrastre.tipo === 'rotel') {
            var e = estadoActual.elementos[arrastre.id];
            opciones.onRotarElemento(arrastre.id, Math.atan2(p.x - e.x, p.z - e.z) / DEG);
        } else if (arrastre.tipo === 'rotcam') {
            opciones.onApuntarCamara(p.x, p.z);
        }
    }

    function alSoltar() {
        arrastre = null;
        lienzo.classList.remove('is-grabbing');
    }

    /* ------------------------------------------------------------
       VISTA, ASPECTO Y ETIQUETAS
       ------------------------------------------------------------ */
    function setVista(v) {
        vista = v;
        var enCenital = v === 'cenital';
        grupoCamara.visible = enCenital;
        mallaFrustum.visible = enCenital;
        grupoSujetos.concat(grupoElementos).forEach(function (g) {
            g.userData.gizmo.forEach(function (m) { m.visible = enCenital; });
        });
        if (!enCenital) { arrastre = null; lienzo.classList.remove('is-over', 'is-grabbing'); }
        redimensionar();
    }

    function setAspecto(a) {
        aspecto = a;
        if (estadoActual) { actualizarFrustum(estadoActual); actualizarCamPlano(estadoActual); }
    }

    function setEtiquetas(v) { etiquetasVisibles = v; }

    function redimensionar() {
        if (!lienzo.parentElement) return;
        var w = lienzo.parentElement.clientWidth;
        var h = lienzo.parentElement.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camCenital.aspect = w / h;
        camCenital.updateProjectionMatrix();
        if (estadoActual) actualizarCamPlano(estadoActual);
    }

    /* ------------------------------------------------------------
       DIBUJO
       ------------------------------------------------------------ */
    function dibujar() {
        var w = renderer.domElement.clientWidth;
        var h = renderer.domElement.clientHeight;
        if (!w || !h) return;

        if (vista === 'cenital') {
            renderer.setScissorTest(false);
            renderer.setViewport(0, 0, w, h);
            renderer.render(escena, camCenital);
            pintarEtiquetas(w, h);
        } else {
            /* Buzoneado a la relación de aspecto elegida */
            var vw = w, vh = h;
            if (w / h > aspecto) { vw = h * aspecto; } else { vh = w / aspecto; }
            var vx = (w - vw) / 2;
            var vy = (h - vh) / 2;

            renderer.setScissorTest(false);
            renderer.setViewport(0, 0, w, h);
            renderer.clear();

            /* Un elemento puede estar en la escena y quedarse fuera de
               la toma: se oculta sólo mientras se renderiza el plano */
            grupoElementos.forEach(function (g) {
                if (g.userData.enPlano === false) g.visible = false;
            });

            renderer.setViewport(vx, vy, vw, vh);
            renderer.setScissor(vx, vy, vw, vh);
            renderer.setScissorTest(true);
            renderer.render(escena, camPlano);
            renderer.setScissorTest(false);

            grupoElementos.forEach(function (g) { g.visible = true; });

            capaEtiquetas.classList.add('is-hidden');
        }
    }

    function pintarEtiquetas(w, h) {
        if (!estadoActual) return;
        capaEtiquetas.classList.toggle('is-hidden', !etiquetasVisibles);
        if (!etiquetasVisibles) return;

        var necesarias = estadoActual.sujetos.length + 1;
        while (capaEtiquetas.children.length < necesarias) {
            var el = document.createElement('span');
            el.className = 'puck-label';
            capaEtiquetas.appendChild(el);
        }
        while (capaEtiquetas.children.length > necesarias) {
            capaEtiquetas.removeChild(capaEtiquetas.lastChild);
        }

        estadoActual.sujetos.forEach(function (s, i) {
            colocar(capaEtiquetas.children[i], s.x, 1.95, s.z, s.nombre, w, h,
                i === estadoActual.enfoque ? 'puck-label puck-label--focus' : 'puck-label');
        });

        var c = estadoActual.camara;
        colocar(capaEtiquetas.children[necesarias - 1], c.x, 0.55, c.z, 'Cámara', w, h,
            'puck-label puck-label--camera');
    }

    function colocar(el, x, y, z, texto, w, h, clase) {
        vecProy.set(x, y, z).project(camCenital);
        var visible = vecProy.z < 1;
        el.style.display = visible ? '' : 'none';
        if (!visible) return;
        el.className = clase;
        if (el.textContent !== texto) el.textContent = texto;
        el.style.left = ((vecProy.x * 0.5 + 0.5) * w) + 'px';
        el.style.top = ((-vecProy.y * 0.5 + 0.5) * h) + 'px';
    }

    /* Punto del mundo → píxeles del lienzo, con la cámara cenital.
       Lo usan las etiquetas y sirve para dirigir las pruebas. */
    function proyectar(x, y, z) {
        var r = lienzo.getBoundingClientRect();
        vecProy.set(x, y, z).project(camCenital);
        return {
            x: r.left + (vecProy.x * 0.5 + 0.5) * r.width,
            y: r.top + (-vecProy.y * 0.5 + 0.5) * r.height
        };
    }

    global.Escena = {
        init: init,
        sincronizar: sincronizar,
        proyectar: proyectar,
        setVista: setVista,
        setAspecto: setAspecto,
        setEtiquetas: setEtiquetas,
        redimensionar: redimensionar,
        SALA: SALA,
        MEDIDAS: MEDIDAS,
        ESCALABLES: ESCALABLES,
        ALTURA_BASE: ALTURA_BASE
    };
})(window);
