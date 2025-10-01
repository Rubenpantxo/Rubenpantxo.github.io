# Rubenpantxo.com

Sitio personal estático que recopila noticias recientes, aplicaciones interactivas y enlaces útiles. Toda la información visible en la página de inicio se alimenta desde un único archivo de datos en JavaScript para que el mantenimiento sea rápido.

## Estructura de carpetas

```
Rubenpantxo.github.io/
├── CSS/
├── img/
├── js/
│   ├── home-sections.js
│   ├── main.js
│   ├── site-data.js   ← contenido editable
│   └── vendors/
├── index.html
├── humans.txt
└── robots.txt
```

## Cómo actualizar el contenido

El archivo `js/site-data.js` expone un objeto `window.siteData` con tres listas: `news`, `apps` y `linkGroups`. Cada sección de la página se construye automáticamente a partir de estas listas cuando se carga `index.html`.

### 1. Noticias

Cada noticia es un objeto dentro del array `news`.

```js
{
  id: 'identificador-unico',
  title: 'Título visible',
  summary: 'Texto corto que aparecerá en la tarjeta.',
  image: 'ruta/a/la/imagen.png',
  link: 'https://enlace-completo',
  source: 'Nombre de la fuente',
  tags: ['temática1', 'temática2'],
  publishedAt: '2025-01-31' // Formato ISO (AAAA-MM-DD)
}
```

1. Copia y pega un objeto existente como plantilla.
2. Cambia el valor de `id` por uno único (sin espacios, usar guiones o camelCase).
3. Mantén la fecha en formato `YYYY-MM-DD` para que el listado se ordene de más reciente a más antiguo y el filtro funcione.
4. Añade o elimina etiquetas (`tags`) para controlar el filtro de categorías.
5. Guarda el archivo: la noticia aparecerá automáticamente la próxima vez que abras la web.

### 2. Aplicaciones

Las tarjetas de la sección “Apps y entretenimiento” leen la configuración del array `apps`.

```js
{
  id: 'nombre-app',
  title: 'Título en la tarjeta',
  subtitle: 'Estado o versión',
  description: 'Breve explicación de lo que hace.',
  icon: 'clase-font-awesome',
  keywords: ['palabra clave 1', 'palabra clave 2']
}
```

* El `id` debe coincidir con el atributo `data-app-panel` del panel interactivo que quieras mostrar dentro de `index.html`. Si solo quieres listar la aplicación (sin panel personalizado todavía) basta con definir el objeto en `site-data.js`; el script mostrará un mensaje genérico hasta que crees el panel HTML correspondiente.
* Usa clases de [Font Awesome 6](https://fontawesome.com/search?m=free) para personalizar el icono (`fa-solid fa-robot`, por ejemplo).

### 3. Enlaces agrupados

Los enlaces se organizan en tarjetas temáticas (`linkGroups`). Cada grupo contiene un título, una descripción y un listado de recursos.

```js
{
  id: 'grupo-tematico',
  title: 'Nombre del grupo',
  description: 'Texto introductorio.',
  icon: 'clase-font-awesome',
  links: [
    {
      label: 'Nombre del enlace',
      url: 'https://ruta.com',
      description: 'Qué ofrece este recurso.',
      icon: 'fa-solid fa-link'
    }
  ]
}
```

Puedes añadir tantos grupos o enlaces como necesites. El orden en el archivo será el mismo que se muestra en la web.

## Consejos de mantenimiento

* **Respeta las comas**: en JavaScript cada objeto del array debe ir separado con `,`. Si el navegador muestra pantalla en blanco, revisa la consola (F12) para detectar errores de sintaxis.
* **Imágenes**: guarda las imágenes en la carpeta `img/` y actualiza la ruta en el campo `image`.
* **Pruebas locales**: abre `index.html` en tu navegador o utiliza una extensión como “Live Server” de VS Code para recargar automáticamente.
* **Control de versiones**: usa `git status` para comprobar qué archivos cambiaste y `git diff` para ver las diferencias antes de subirlas.

## Créditos

Proyecto basado en el esqueleto de HTML5 Boilerplate y adaptado para Rubenpantxo.com.
