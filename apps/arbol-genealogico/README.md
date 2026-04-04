# 🌳 Árbol Genealógico Familiar — Audiovisual e Interactivo

Aplicación web estática para visualizar, gestionar y documentar el árbol genealógico de una familia, con soporte para fotos, vídeos, audios y un sistema de comentarios/dudas colaborativo.

---

## ✅ Funcionalidades implementadas

### 🌳 Árbol Visual
- Visualización jerárquica por generaciones (bisabuelos → nietos)
- Líneas de conexión entre parejas (punteadas con ♥) y entre padres e hijos
- Nodos interactivos con foto o avatar con iniciales
- Indicadores de multimedia (vídeo, audio) en cada nodo
- Distinción visual por género (azul/rosa/morado) y fallecidos (grisado)
- Zoom (+/-/reset) y desplazamiento por arrastre
- Leyenda explicativa del árbol
- Etiquetas de nombre de generación

### 👥 Lista de Miembros
- Tarjetas detalladas con foto/avatar, fechas, lugar de nacimiento y biografía
- Etiquetas/profesiones por miembro
- Buscador en tiempo real (nombre, lugar, tags, biografía)
- Indicadores de multimedia disponible por miembro
- Acceso rápido a editar o eliminar desde la tarjeta

### 🖼️ Perfil Completo de Miembro (modal)
- Foto de perfil o avatar generado con iniciales
- Fecha y lugar de nacimiento, año de fallecimiento, género
- Reproducción integrada de **vídeo** (YouTube embed o MP4 nativo)
- Reproducción integrada de **audio** (grabaciones familiares)
- Fotografías adicionales
- Biografía personal
- Comentarios vinculados visibles desde el perfil
- Acciones: editar, añadir comentario, eliminar

### 💬 Comentarios y Dudas
- Tipos: 💬 Comentario, ❓ Duda/Pregunta, ✏️ Corrección
- Vinculación opcional a un miembro específico del árbol
- Estados: Pendiente / Respondido / Verificado
- Sistema de respuestas a cada comentario
- Marcado rápido como "respondido"
- Filtros por tipo y por estado
- Eliminación de comentarios

---

## 🗂️ Estructura de archivos

```
index.html         → Estructura principal (header, secciones, modales)
css/style.css      → Todos los estilos visuales (variables CSS, responsive)
js/app.js          → Lógica completa (API, árbol, miembros, comentarios)
```

---

## 📡 Rutas y parámetros funcionales

| Sección     | Ruta / Acción                       |
|-------------|-------------------------------------|
| Árbol       | `#section-tree` (por defecto)        |
| Miembros    | `#section-members`                  |
| Comentarios | `#section-comments`                 |

---

## 🗃️ Modelos de datos

### `family_members`
| Campo        | Tipo     | Descripción                              |
|--------------|----------|------------------------------------------|
| id           | text     | Identificador único                       |
| name         | text     | Nombre completo                           |
| gender       | text     | male / female / other                    |
| generation   | number   | -2 bisabuelos → 4 bisnietos              |
| birth_year   | text     | Año de nacimiento                         |
| death_year   | text     | Año de fallecimiento (vacío si vive)      |
| birth_place  | text     | Lugar de nacimiento                       |
| parent_ids   | array    | IDs de los padres                         |
| partner_id   | text     | ID de la pareja                           |
| photo_url    | text     | URL de la fotografía                      |
| video_url    | text     | URL de vídeo (YouTube o MP4)             |
| audio_url    | text     | URL de grabación de audio (MP3, etc.)    |
| biography    | rich_text| Biografía personal                        |
| tags         | array    | Profesiones / etiquetas                   |

### `family_comments`
| Campo     | Tipo      | Descripción                               |
|-----------|-----------|-------------------------------------------|
| id        | text      | Identificador único                        |
| author    | text      | Nombre del autor                          |
| type      | text      | comment / question / correction           |
| member_id | text      | ID del miembro relacionado (opcional)     |
| content   | rich_text | Contenido del comentario o duda           |
| status    | text      | pending / answered / verified             |
| reply     | rich_text | Respuesta o aclaración                    |

---

## 🚧 Funcionalidades por implementar

- [ ] Edición de relaciones (vincular padres/pareja directamente desde el árbol)
- [ ] Exportar árbol como imagen o PDF
- [ ] Subida directa de fotos/audio (actualmente por URL)
- [ ] Filtro visual del árbol por rama familiar
- [ ] Línea de tiempo cronológica de la familia
- [ ] Autenticación para proteger la edición
- [ ] Búsqueda en el árbol visual (resaltar nodo)
- [ ] Importar/exportar datos en formato GEDCOM

---

## 💡 Próximos pasos recomendados

1. **Vincular relaciones**: Añadir un formulario para enlazar `parent_ids` y `partner_id` entre miembros existentes.
2. **Subida de medios**: Integrar con servicios como Cloudinary o Imgur para cargar fotos desde el dispositivo.
3. **Diseño responsivo del árbol**: Adaptar el canvas SVG para pantallas pequeñas.
4. **Exportar**: Implementar captura del canvas con `html2canvas` para descargar el árbol como imagen.
