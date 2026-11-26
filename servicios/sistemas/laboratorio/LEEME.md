# Laboratorio de UI Kits

Página: `servicios/sistemas/laboratorio/` → https://rubenpantxo.com/servicios/sistemas/laboratorio/

El visitante elige un kit y ve la misma escena (tienda, panel o visor 3D) con otra cara al instante. Cambiar de kit solo cambia el atributo `data-kit` del contenedor: el HTML de la escena no se toca nunca.

## Estructura

```
laboratorio/
├── index.html            página y plantillas de las escenas (<template>)
├── laboratorio.css       marco de la página (tokens --pg-*, no se mezclan con los del kit)
├── tokens-base.css       valores por defecto de las tres capas de tokens
├── escena.css            componentes de la escena; SOLO leen tokens
├── laboratorio.js        carga el índice, cambia de kit, ficha, favorito, exportación
├── validar-contraste.mjs comprueba AA (4,5:1) en todos los kits, claro y oscuro
└── kits/
    ├── index.json        lista de kits
    └── <id>/
        ├── kit.css       [data-kit="<id>"] { …tokens… } y su modo oscuro
        ├── ficha.json    textos de la ficha
        └── miniatura.*   (opcional) si no hay, se pinta a partir de "muestra"
```

## Tokens: tres capas

1. **Primitivos** `--p-*`: la paleta del kit, sin significado. Solo los usa el propio kit.
2. **Semánticos**: `--color-fondo`, `--color-superficie`, `--color-texto`, `--color-accion`, `--color-sobre-accion`, `--fuente-titulos`, `--texto-m`, `--espacio-4`, `--radio-m`, `--sombra-2`, `--duracion-media`…
3. **Componente**: `--boton-radio`, `--tarjeta-sombra`, `--campo-borde`, `--etiqueta-fondo`… Por defecto leen los semánticos (ver `tokens-base.css`); un kit solo los toca si su estética lo pide.

Reglas:

- `escena.css` no lleva ni un color ni un radio escritos a mano.
- Un kit no declara `--color-accion-hover` ni `--color-accion-profundo`: salen de `--color-accion`, así el «Tu color» del visitante arrastra también hover y relieves.
- Si el fondo es un degradado (`--escena-fondo`), declara `--color-fondo-solido` con un color liso parecido: es el que usa la validación de contraste.

## Añadir un kit nuevo en cinco pasos

1. **Copia una carpeta** de `kits/` (la más parecida) con el id nuevo, en minúsculas y sin acentos: `kits/feria/`.
2. **Edita `kit.css`**: cambia el selector a `[data-kit="feria"]` y `[data-kit="feria"][data-modo="oscuro"]` y da valores a los tokens. No toques nada fuera de esos dos bloques.
3. **Edita `ficha.json`**: nombre, dirección visual, lema, para quién, sectores, tipografía, paleta, rasgos, un ejemplo real y la nota de accesibilidad. En `referencia` puedes enlazar la pieza de Atlas o Book of Shapes (si `enlace` está vacío, la ficha no la muestra).
4. **Añade su entrada a `kits/index.json`**: `id`, `nombre`, `direccion`, `descripcion`, `sectores`, `css`, `ficha`, `miniatura` (o `null`), `fuentes` (la parte `family=…` de Google Fonts), `muestra` (colores de la miniatura) y `orden`.
5. **Valida y prueba**: `node servicios/sistemas/laboratorio/validar-contraste.mjs` y abre `laboratorio/?kit=feria`.

No hace falta tocar `laboratorio.js` ni el HTML. Un kit de temporada o de campaña se activa igual y se retira quitando su entrada del índice. Para que salga elegido de entrada, cambia `porDefecto`.

## El kit favorito (para el briefing)

Al pulsar «Me quedo con este»:

- se guarda en `sessionStorage`, clave `sv:kit`, el JSON `{ id, nombre, direccion, colorMarca, modo }` (`colorMarca` es un hex o `null`);
- se lanza `CustomEvent('sv:kit', { detail })` en `document`;
- se lanza `CustomEvent('servicios:kit-elegido', { detail })` en `window` y en `document`.

El formulario de contacto (`/#contacto`) lo recoge aunque cargue después, porque el enlace abre en la misma pestaña. También está `window.ServiciosKits.favorito()`.

## Medición

Eventos de analítica (solo si el visitante acepta cookies, vía `window.rpEvento`):

| Evento | Cuándo |
|---|---|
| `lab_kit_cambio` (`kit`) | pulsa una miniatura |
| `lab_comparar` (`kit`, `con`) | activa el modo comparación |
| `lab_color_marca` (`kit`) | prueba su color (una vez por visita) |
| `lab_kit_favorito` (`kit`) | pulsa «Me quedo con este» |
| `lab_tokens_descarga` | descarga los tokens en JSON |
| `quiero_una_asi` (`origen=laboratorio…`) | va al formulario desde el laboratorio |
