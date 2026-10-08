# CLAUDE.md — Reglas de trabajo para Cabanillas Drive

Estas reglas son obligatorias en todas las sesiones de este proyecto. La especificación técnica completa está en `PLAN.md`.

## Al empezar cada sesión
1. Lee `PLAN.md` y `PROGRESO.md` (si existe).
2. Indica en una frase en qué fase estamos y cuál es la siguiente tarea.
3. No empieces una fase nueva sin confirmación explícita de Rubén.

## Orden y paradas
- Trabaja **una fase cada vez**, en el orden de `PLAN.md`.
- Paradas obligatorias (espera respuesta antes de continuar):
  - Tras `tools/00_inspect_raw.py` (informe de datos).
  - Al terminar cada fase.
  - Cuando falte un archivo de entrada, un dato no cuadre (CRS, cobertura, años distintos) o una descarga falle 3 veces.
- En cada parada: lista lo creado/modificado, dónde revisar el resultado (ruta de previews o comando) y qué necesitas de Rubén.

## Datos
- **Nunca inventes datos geográficos** ni rellenes con valores ficticios sin decirlo. Si algo falta, para y pregunta.
- Nunca modifiques ni borres nada en `data/raw/`.
- El origen local y `H_base` se leen siempre de `data/processed/origin.json`. Convención: 1 unidad = 1 m, Y arriba, norte = −Z (ver PLAN.md §4).
- Los scripts de `tools/` deben ser re-ejecutables (idempotentes) y leer parámetros de `config.json`, sin rutas fijas en el código.
- Cachea las descargas (WMS, Overpass) en `data/processed/` y no repitas peticiones si ya existen.

## Código
- Idioma: comentarios, mensajes de consola, textos de interfaz y nombres descriptivos en **español**.
- Entorno: Windows + PowerShell. Python del entorno conda `cabdrive`. Usa rutas con `pathlib`.
- Three.js y Rapier desde npm (no CDN). Rapier: `@dimforge/rapier3d-compat`.
- No uses assets externos (modelos, texturas, fuentes) con licencia dudosa. Coche y props con primitivas.
- Parámetros ajustables (vehículo, cámara, calidad) en archivos de configuración de `src/config/`, no dispersos.
- Tras crear o cambiar un script, **ejecútalo** y comprueba su salida antes de darlo por terminado.
- Escritorio y móvil deben funcionar siempre; no rompas los controles táctiles al tocar los de teclado.

## Registro
- Mantén `PROGRESO.md` actualizado: fase actual, tareas hechas, pendientes, decisiones tomadas y problemas abiertos.
- Commits pequeños y descriptivos en español al cerrar cada tarea (`feat(fase1): recorte MDT y origin.json`). No hagas push; eso lo hace Rubén.
