# Elementos de UIverse

Los 196 elementos de esta carpeta vienen de [UIverse.io](https://uiverse.io),
a traves de su archivo publico [uiverse-io/galaxy](https://github.com/uiverse-io/galaxy).

## Licencia

MIT, copyright 2023 Uiverse.io. El texto completo esta en `LICENSE`, junto a
esta nota, tal y como pide la licencia. Cada elemento conserva ademas dentro de
su propio CSS el comentario `/* From Uiverse.io by <autor> */` con el nombre de
quien lo hizo.

La atribucion no es obligatoria bajo MIT, pero UIverse la agradece y aqui se
mantiene: la galeria muestra el autor de cada pieza.

## Que hay y que no

De los 3.802 elementos del archivo se importaron 196. Se descarto todo lo que
no puede funcionar en una pagina estatica sin framework:

- lo que depende de Tailwind, porque esta web no lo carga
- lo que pide una URL de fuera (imagenes, CDNs)
- lo que trae `<script>` o `<img>`
- lo muy largo, por peso

## Como se vuelve a generar

    git clone --depth 1 https://github.com/uiverse-io/galaxy.git
    node servicios/sistemas/importar-uiverse.mjs ./galaxy

El clon no se guarda en el repo: solo entra lo importado.

## Como se usan

Cada archivo es markup + `<style>`, y las clases se repiten entre archivos
(`.cta`, `.card`, `.radio-input`...). Por eso la galeria los monta en un
**shadow root**: aisla las clases y, aun asi, las variables CSS lo atraviesan,
de modo que un elemento retokenizado sigue la paleta que tengas elegida.
