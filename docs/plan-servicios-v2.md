# Plan de trabajo — Servicios v2

Apps de negocio más completas, cada una con un diseño propio, y una sección nueva de sistemas de diseño.

## La idea que lo une todo: el objeto es la interfaz

Cada app gira alrededor de **un objeto del oficio en 3D (Three.js)**. Ese objeto no está de adorno en una cabecera: se usa para pedir, elegir o consultar.

| Negocio | Objeto protagonista | Qué se hace con él |
|---|---|---|
| Bar & Restaurante | **La mesa**, vista desde arriba | Cada plato pedido aparece servido en la mesa. Se arrastra cada plato a un comensal para dividir la cuenta. Las mesas del local también están en 3D para reservar. |
| Tienda de ropa | **La prenda colgada** (tela con movimiento) | Se gira, cambia de color en vivo y se mece al tocarla. El probador muestra las tallas comparadas con tus medidas. |
| Carnicería | **La báscula y el mostrador** | Eliges la pieza en la vitrina, la báscula pesa al girar el dial y sale el ticket con tu turno. |
| Gimnasio | **El cuerpo** (mapa muscular) | Tocas un músculo y aparecen sus ejercicios. Los entrenos de la semana colorean el cuerpo como un mapa de calor. |
| Supermercado | **La cesta** | Los productos caen dentro con física. La cesta se llena y el total va escrito en el asa. |
| Granja | **La finca** (maqueta) | Granero, huerta, gallinero y nave son las secciones. Además cambia la estación y pasa de día a noche. |
| Industria | **La pieza** (paramétrica de verdad) | Las cotas generan la geometría y se puede ver la pieza despiezada. La planta es un gemelo digital con las máquinas en su sitio. |
| Logística | **La caja y el mapa** | La caja crece con las medidas que escribes y da el precio. La ruta va sobre un mapa en relieve con el camión. |

Así cada app se distingue sin explicarla: basta con ver el objeto para saber de qué negocio es.

## Reglas comunes a las ocho apps

1. **Un objeto 3D protagonista** que se pueda tocar, arrastrar o girar.
2. **De 3 a 4 vistas de cliente y 1 vista del dueño**: cocina, almacén, cola de turnos o planta.
3. **Al menos seis microinteracciones propias del negocio.** Nada de efectos genéricos: el ticket se rasga, la báscula oscila antes de asentarse, la puerta del granero se abre…
4. **Un estado para cada situación:** vacío, cargando, error y éxito, cada uno con su propio diseño.
5. **Memoria local:** carrito, reservas y favoritos se guardan en `localStorage`, con try/catch.
6. **Accesibilidad:**
   - todo se puede usar con teclado;
   - los cambios se anuncian con `aria-live`;
   - con `prefers-reduced-motion` se ve una pose quieta;
   - sin WebGL queda una imagen fija y la app sigue funcionando.
7. **Rendimiento:**
   - DPR limitado;
   - render solo cuando hay cambios o animación;
   - pausa fuera de pantalla o con la pestaña oculta;
   - recuperación si se pierde el contexto WebGL.
8. **Compatible con el selector de sistemas de diseño.** El layout y el objeto son de cada negocio. Color, letra y radios salen de los tokens `--sd-*`, y la escena 3D también los lee y se repinta al cambiar de sistema.
9. **Primero para móvil (en el visor con forma de teléfono).** En escritorio la app pasa a dos columnas y no queda un teléfono estirado.

## Fases

### Fase 0 — Cimientos compartidos
- [ ] Three.js r170 servido desde el propio repo (`js/vendor/three/`), con los complementos que se necesiten y las importaciones relativas. Así no hace falta importmap, que la revisión de CI no acepta como script en línea.
- [ ] `servicios/kit/escena.js`. Arranca la escena (renderer, cámara, luces de estudio y entorno), lee los tokens `--sd-*` como colores de Three y se repinta al cambiar de sistema. También se encarga de:
  - pausar fuera de pantalla;
  - la pose quieta con movimiento reducido;
  - la pérdida de contexto;
  - el fallback sin WebGL;
  - ajustar la resolución si baja el rendimiento.
- [ ] `servicios/kit/gestos.js`: arrastrar y girar con inercia, resortes (spring), contadores que ruedan, listas animadas por FLIP y una vibración corta cuando el dispositivo la tiene.
- [ ] `servicios/kit/app.css`: la estructura común (barra de pestañas, hojas inferiores, avisos, esqueletos de carga, foco visible) construida solo con tokens. La identidad de cada negocio va en su propio CSS.

### Fases 1 a 8 — Las apps, una por fase
Cada una sustituye a la demo actual en el mismo archivo, así que no cambia ningún enlace.

1. **Bar & Restaurante** — *La mesa*: carta, mesa compartida y cuenta dividida, reserva sobre plano 3D. Vista de cocina con comandas y temporizadores. Estética de carta de imprenta con papel, sello y tinta.
2. **Tienda de ropa** — *La prenda*: lookbook vertical, prenda en 3D con color en vivo, guía de tallas con tus medidas, armario de looks. Vista del dueño con stock por talla. Estética de revista con tipografía gigante y mucho blanco.
3. **Carnicería** — *La báscula*: vitrina 3D, dial de peso con báscula física, forma de corte, turno con ticket y recetas por pieza. Vista del dueño con la cola de turnos. Estética de mostrador: azulejo, rótulo y papel de envolver.
4. **Gimnasio** — *El cuerpo*: mapa muscular 3D, horario con aforo, reproductor de entreno con descansos y progreso. Vista del entrenador con sus clientes. Estética de marcador deportivo: oscuro, cifras grandes y neón.
5. **Supermercado** — *La cesta*: cesta 3D con física, pasillos, escanear y pagar (simulado), lista compartida y franjas de entrega. Vista del dueño con reposición. Estética de mercado fresco: etiquetas de precio y cuadrícula de lineal.
6. **Granja** — *La finca*: maqueta navegable, cesta de temporada, visitas y sensores sobre la maqueta. Vista del granjero. Estética de huerto con tierra, papel kraft y letra redonda.
7. **Industria** — *La pieza*: configurador paramétrico real, vista despiezada, pedidos por fases y planta 3D. Estética de plano técnico: cotas, retícula y monoespaciada.
8. **Logística** — *La caja y el mapa*: tarifa con caja 3D, seguimiento sobre mapa en relieve, ruta del repartidor con firma y almacén con huecos. Estética de cuadro de mando de flota: oscuro y lima.

Después de cada app se actualiza su ficha en el visor de la home (`js/servicios.js`: lema y rasgos).

### Fase 9 — Sistemas de diseño, rediseño completo
- [ ] **Portada nueva** en la misma línea que Servicios: minimalismo funcional, mucho espacio y titular audaz. Sustituye al parallax cinematográfico por **una vitrina 3D**, con una muestra de material por sistema:

  | Sistema | Material |
  |---|---|
  | Halógeno | Filamento incandescente |
  | Terracota | Baldosa de barro |
  | Editorial | Cartel de papel |
  | Carmín | Bloque neobrutal |
  | Neón | Vóxel de 8 bits |
  | Savia | Vidrio esmerilado |
  | Orgánico | Arcilla blanda |
  | Clásico | Marco dorado |
  | Industrial | Acero mecanizado |

- [ ] **Tarjetas nuevas: cada tarjeta es una muestra viva de su estilo**, diseñada en su propio lenguaje y con su microinteracción propia:
  - Neón: líneas de escaneo y píxel;
  - Savia: cristal con refracción;
  - Carmín: sombra dura que se aplasta al pulsar;
  - Clásico: filete dorado que se dibuja;
  - el resto, igual.
- [ ] **Mezclador**: paleta, tipografía y elementos aplicados en vivo a una pantalla de ejemplo, el mismo que usan las demos.
- [ ] El generador (`generar-sistemas.mjs`) sigue siendo la fuente de la verdad: se reescriben sus plantillas para que las tarjetas nuevas salgan de `sistemas-datos.mjs`. Se mantienen las marcas `@bloque` de la portada y de `index.html`.

### Fase 10 — Integración y control de calidad
- [ ] Capturas automáticas (Playwright) de cada app a 390 px y a 1280 px, con el tema claro y el oscuro y con varios sistemas.
- [ ] Prueba en el visor de la home (iframe), con teclado y con movimiento reducido.
- [ ] Peso por página y fotogramas por segundo en móvil simulado.
- [ ] `node scripts/revisar.mjs --all` sin fallos.
- [ ] Actualizar el README.

## Orden y entregas
- Fase 0, luego las apps en orden y después la Fase 9. Cada fase es un commit propio en `claude/blissful-hamilton-iik55b`.
- Las apps se pueden desarrollar en paralelo una vez estén los cimientos: cada una vive en su propio archivo.
