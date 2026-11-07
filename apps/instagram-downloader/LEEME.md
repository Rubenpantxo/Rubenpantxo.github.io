# Instagram Downloader

Descarga vídeos y reels públicos de Instagram pegando el enlace.

## Cómo usarlo

1. Doble clic en **`Iniciar.bat`**.
2. Se abre solo `http://localhost:8787` en el navegador.
3. Pega el enlace del reel y pulsa **Descargar Vídeo** → **Guardar vídeo (MP4)**.
4. Para cerrar: `Ctrl + C` en la ventana negra, o simplemente ciérrala.

En la parte superior verás el estado: verde = servidor listo, rojo = hay que arrancar `Iniciar.bat`.

## Por qué hace falta un servidor local

Instagram ya no permite leer los vídeos desde el navegador: exige sesión iniciada y bloquea
las peticiones entre dominios (CORS). Por eso la descarga la hace `server.js` desde tu propio
ordenador usando [yt-dlp](https://github.com/yt-dlp/yt-dlp), que mantiene actualizado el
método de extracción. No se usa ningún servicio externo y no se envía nada a terceros.

Consecuencia: la descarga ocurre siempre en tu PC. La versión publicada en
[rubenpantxo.com](https://rubenpantxo.com/apps/instagram-downloader/index_insta_down.html)
no puede descargar por sí sola (el navegador bloquea `https://` → `http://localhost`), así que
hace de puente: pegas el enlace, pulsas **Descargar** y te lleva a `http://localhost:8787`
con el enlace ya escrito en el campo. La descarga **no** arranca sola: hay que pulsar el botón.

## Requisitos

- **Node.js** — https://nodejs.org
- **yt-dlp** — `Iniciar.bat` lo instala solo la primera vez (necesita Python).

Si Instagram cambia algo y deja de funcionar, casi siempre se arregla actualizando yt-dlp:

```bash
python -m pip install -U yt-dlp
```

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index_insta_down.html` | La interfaz (lleva el CSS de Tailwind dentro: `npm run css:insta` lo regenera) |
| `server.js` | Servidor local (puerto 8787) que llama a yt-dlp |
| `Iniciar.bat` | Lanzador: comprueba requisitos, arranca y abre el navegador |
| `pruebas/` | Pruebas automáticas del servidor (`npm test` desde la raíz del repo) |

## Seguridad

Este servidor lanza procesos en tu ordenador, así que tiene estos cerrojos:

- **Token por arranque.** Cada vez que arranca genera un secreto distinto y lo inyecta en la
  página que sirve él mismo (ya no lo imprime en la ventana negra: no hace falta y una consola
  se comparte en capturas). Todo `/api/*` lo exige. Por eso hay que entrar por
  **`http://localhost:8787`**: si abres el `.html` a mano (doble clic, `file://`) no hay token
  y el servidor responde 403.
- **Sin iframes.** La página lleva `X-Frame-Options: DENY`: ninguna otra web puede meterla
  dentro y hacerte pulsar sus botones sin que lo veas.
- **Host y origen comprobados.** Solo atiende peticiones cuyo `Host` sea `localhost:8787` o
  `127.0.0.1:8787`, y solo a una lista corta de orígenes. Esto corta el *DNS rebinding* y que
  cualquier web que visites use tu servidor de descargador mientras lo tienes abierto.
- **Cookies solo si las pides.** Antes, si Instagram exigía sesión, el servidor probaba
  automáticamente las cookies de Chrome, Edge, Firefox, Brave y Opera. Eso es prestarle tu
  sesión de Instagram a `yt-dlp`. Ahora no lo hace nunca por su cuenta. Para permitirlo en una
  sesión concreta, cierra el navegador del todo y arranca así:

  ```bat
  set IGDL_COOKIES_BROWSER=chrome
  node server.js
  ```

Además hay topes para que una ráfaga de peticiones no deje la máquina sin CPU ni haga que
Instagram marque tu IP:

- **2 trabajos a la vez** como mucho.
- **30 consultas y 20 descargas cada 10 minutos.** Si se pasa, responde «espera unos minutos»
  (código 429 con `Retry-After`).
- Enlaces de más de 500 caracteres o números de elemento raros se rechazan antes de llamar a
  yt-dlp, y si cierras la página a mitad, yt-dlp se para y se borran sus archivos temporales.

## Pruebas

`npm test` (desde la raíz del repo) arranca el servidor en el puerto 18787 con un yt-dlp
falso (`pruebas/yt-dlp-falso.mjs`, no sale a internet) y comprueba cada endpoint y cada
cerrojo: token, `Host`, orígenes, enlaces no válidos, foto sin vídeo, Instagram pidiendo
sesión, descarga y borrado del temporal, tope de simultáneas y tope por tiempo. La CI las
pasa en cada push.

Las variables `IGDL_PORT`, `IGDL_YTDLP`, `IGDL_LIMITE_INFO` e `IGDL_LIMITE_DESCARGAS` existen
solo para esas pruebas; en uso normal no hace falta tocarlas.

## Límites

- Solo cuentas **públicas**. Las privadas requieren iniciar sesión y no están soportadas.
- Si haces muchas peticiones seguidas, Instagram limita temporalmente: espera unos minutos.
- Descarga contenido solo para uso personal y respeta los derechos de autor de cada creador.
