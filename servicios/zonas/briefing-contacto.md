# Zona 06 · Comunicación y briefing

Archivos: `briefing-contacto.js` y `briefing-contacto.css`. Se montan solos sobre
`#sv-contact` de `index.html`. El formulario clásico (`#sv-contact-form`) se queda
en el HTML como respaldo si el JavaScript no carga.

## Recorrido del visitante

Portada con tres caminos:

1. **Contarte mi proyecto**: 5 pasos cortos.
   1. Qué quiere conseguir (y tipo de negocio, opcional).
   2. Qué debería incluir (bloques) y qué estilo le gusta (UI Kit).
   3. Plazo y presupuesto (horquillas orientativas).
   4. Contexto libre y webs de referencia.
   5. Resumen editable + datos de contacto + consentimiento.
2. **Prefiero hablar**: salta directamente a los datos de contacto, con teléfono
   obligatorio y franja horaria para una llamada de 15 minutos.
3. **Escribirte directamente**: abre el correo del visitante con un mensaje ya empezado.

Al enviar, pantalla de gracias con el plazo de respuesta, qué pasa después, qué
preparar y un botón para copiar el resumen.

Detalles: progreso «Paso N de 5», volver atrás sin perder datos, validación en vivo
con mensajes que dicen cómo corregir, borrador en `sessionStorage` (sobrevive a
recargar), foco en la pregunta al cambiar de paso, errores con `role="alert"`,
campos `type="email"`, `type="tel"` y `autocomplete`.

## Contrato con las otras zonas

Cada zona lanza un `CustomEvent` en `document` y guarda lo mismo en
`sessionStorage` con la misma clave. Todo es opcional: sin datos, el asistente
funciona igual.

| Evento / clave | Zona | `detail` que se usa | Qué precarga |
|---|---|---|---|
| `sv:perfil` | 1 Hero | `{ id }` (`web` · `3d` · `automatizacion`); en sessionStorage es texto plano | Objetivo |
| `sv:caso` | 2 Catálogo | `{ id, nombre, categoria, negocio, origen }` | Tipo de negocio, objetivo |
| `sv:kit` | 3 UI Kits | `{ id, nombre }` (`petardo` · `bruma` · `cota` · `maqueta` · `sereno`) | Estilo |
| `sv:configuracion` | 5 Configurador | `{ bloques, total, plazo, enlace, mensual, texto }` | Bloques y horquilla de presupuesto |
| `sv:configuracion-enviar` | 5 | igual que arriba, cancelable | Abre el briefing en el paso 2 |
| `sv:caso` con `origen: 'catalogo'` | 2 | cancelable | Abre el briefing en el paso 1 |

Lo precargado se marca con la etiqueta «Elegido antes» y se puede cambiar.

API pública: `window.svBriefing.abrir('briefing' | 'llamada', paso?)`,
`window.svBriefing.enfocar()`, `window.svBriefing.briefing()`.

## Canal de envío

`data-envio` en `#sv-contact` elige el canal: `web3forms` (por defecto, con la
misma clave que el formulario clásico), `mailto` o `prueba` (no envía nada y deja
el briefing en la consola). Rubén eligió Web3Forms el 2026-11-26.

Antispam: campo trampa oculto, tiempo mínimo de 4 s y un mínimo de interacciones
reales. Si parece un bot se finge el envío. Si el envío falla, se ofrece el
correo con todo ya escrito.

## Plantilla del briefing que recibe Rubén

Asunto: `[ALTA] Briefing · Una web nueva · Bar / Restaurante (María López)`

```
Prioridad: ALTA (6/8)
Ruta: Briefing completo
Perfil (zona 1): web
Objetivo: Una web nueva
Tipo de negocio: Bar / Restaurante
Caso de referencia (zona 2): Bar & Restaurante
Bloques: Reservas online, Panel avanzado
Estilo / UI Kit: Glass
Configuración (zona 5): 3.200 € – 4.100 € · 6-7 semanas
Enlace a la configuración: https://rubenpantxo.com/#…
Mantenimiento (zona 5): 30 € – 60 € / mes
Plazo: En 1–3 meses
Presupuesto: 1.500 – 5.000 €
Contexto: Tengo un bar con terraza y quiero que la gente reserve mesa…
Referencias: https://mi-bar.es
Nombre: María López
Correo: maria@ejemplo.com
Teléfono: 600 000 000
Prefiere: Correo
Origen: instagram / otono
Página de entrada: /#servicios
```

## Prioridad automática

Puntos (máximo 8):

- Presupuesto: menos de 1.500 € = 0 · 1.500–5.000 € = 2 · más de 5.000 € = 3 · no lo sé = 1.
- Plazo: 1–3 o 3–6 meses = 2 · urgente o sin fecha = 1.
- Encaje (hasta 3): objetivo concreto, contexto largo o 2+ bloques, y venir del
  configurador o del laboratorio o dejar teléfono.

**Alta** desde 6 puntos, **media** desde 4, **baja** por debajo.

## Respuestas tipo (para contestar rápido)

**Prioridad alta**
> Hola, {nombre}. Gracias por contarme tu proyecto con tanto detalle. Por lo que
> describes ({objetivo} con {bloques}), encaja muy bien con lo que hago. Te propongo
> una llamada de 15 minutos para cerrar dos dudas y te envío el presupuesto cerrado
> en 48 h. ¿Te viene bien {día} a las {hora}?

**Prioridad media**
> Hola, {nombre}. Gracias por escribirme. Para darte una cifra ajustada me faltan
> dos datos: {pregunta 1} y {pregunta 2}. Con eso te paso una propuesta orientativa
> esta misma semana.

**Prioridad baja / presupuesto ajustado**
> Hola, {nombre}. Gracias por pensar en mí. Con ese presupuesto lo más sensato es
> empezar por {versión mínima}, y ampliar después. Si te encaja, te explico cómo
> lo haríamos por pasos.

**Prefiere hablar**
> Hola, {nombre}. Te llamo {franja} al {teléfono}. Si te viene mejor otro momento,
> respóndeme a este correo y lo cambiamos.

Seguimiento: si no hay respuesta, recordatorio amable a los 3 y a los 7 días.

## Medición (GA4, solo con consentimiento)

| Evento | Cuándo |
|---|---|
| `briefing_inicio` | Elige un camino (`ruta`) |
| `briefing_paso` | Llega a cada paso (`paso`, `numero`) |
| `briefing_error` | Un paso no valida (`campo`) |
| `briefing_abandono` | Cierra la página a medias (`paso`) |
| `briefing_flotante` | Pulsa el botón flotante «Enviar mi proyecto» |
| `generate_lead` | Envío correcto (`metodo: 'briefing'`, `prioridad`) |

Objetivos iniciales: más del 5 % de visitantes empieza, más del 60 % de los que
empiezan termina, ningún paso pierde más del 20 %, respuesta en menos de 24 h laborables.

## Pendiente (fuera de este cambio)

- Correo de confirmación al cliente: el autorrespondedor de Web3Forms es de pago.
  La pantalla de gracias ya cumple esa función.
- Subida de archivos: Web3Forms gratuito no admite adjuntos; se piden por correo.
- Calendario de reserva (Cal.com o Calendly) y aviso al móvil para prioridad alta.
- Volcado a una hoja o CRM sencillo.
