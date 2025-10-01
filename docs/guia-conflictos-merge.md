# Cómo resolver conflictos de fusión en tu Pull Request

Cuando GitHub indica que un pull request tiene **conflictos de fusión** quiere decir que el archivo que quieres mezclar (por ejemplo `index.html`) cambió tanto en tu rama como en la rama principal (`main`). Git no sabe cuál versión debe conservar y necesita que lo resuelvas manualmente.

Sigue estos pasos desde tu ordenador para aplicar los cambios del PR y resolver los conflictos:

## 1. Actualiza tu repositorio local

```bash
git checkout main
git pull origin main
```

Así te aseguras de tener la última versión del sitio publicada.

## 2. Cambia a la rama del PR y actualízala

```bash
git checkout work
# Si tu rama tiene otro nombre, reemplázalo aquí
git merge main
```

El último comando va a intentar combinar `main` dentro de tu rama. Git mostrará qué archivos quedaron en conflicto.

## 3. Abre los archivos en conflicto

Verás secciones marcadas como:

```html
<<<<<<< HEAD
(cambios de tu rama)
=======
(cambios que hay en main)
>>>>>>> main
```

Elimina los marcadores (`<<<<<<<`, `=======`, `>>>>>>>`) y decide qué partes conservar. Para facilitar la tarea puedes seguir esta guía:

- **`js/site-data.js`**: deja siempre la versión que declare `window.siteData`. Ahí es donde debes añadir o editar noticias, apps y grupos de enlaces.
- **`js/home-sections.js`**: conserva la versión que genera dinámicamente las tarjetas de noticias, aplicaciones y enlaces. Si quieres traer algo específico de `main`, hazlo después de resolver el conflicto.
- **`index.html`**: mantén la estructura actual (cabecera con botones flotantes) y asegúrate de que al final del `<body>` se carguen los scripts en este orden:
  ```html
  <script src="js/site-data.js"></script>
  <script src="js/home-sections.js"></script>
  ```
  Si el HTML de `main` contiene contenido nuevo que quieras conservar, cópialo a la sección correspondiente después de eliminar los marcadores.

## 4. Comprueba que no queden conflictos

```bash
git status
```

Los archivos deben aparecer como “modificados” pero sin conflictos pendientes. Si todavía ves mensajes de "both modified", vuelve a editar los archivos correspondientes y elimina los marcadores.

## 5. Prueba el sitio localmente

Abre `index.html` en tu navegador o usa la extensión "Live Server" de VS Code. Verifica que:

- Las noticias se muestran ordenadas por fecha y el filtro funciona.
- Las aplicaciones activan el panel correspondiente o muestran el mensaje genérico si aún no hay panel.
- Los enlaces aparecen agrupados por temática.

## 6. Finaliza la resolución del conflicto

```bash
git add index.html js/site-data.js js/home-sections.js
# Añade cualquier otro archivo que hayas tocado

git commit -m "Resuelve conflictos tras actualizar main"

git push origin work
```

Al subir los cambios el PR se actualizará y GitHub mostrará que ya no hay conflictos. Ahora podrás solicitar la revisión o completar la fusión normalmente.

---

> 💡 Consejo: si prefieres no modificar tu rama original, crea una nueva rama desde `main`, copia los archivos `index.html`, `js/site-data.js` y `js/home-sections.js` desde la rama con tus cambios y haz un nuevo PR. El flujo de datos seguirá funcionando igual.
