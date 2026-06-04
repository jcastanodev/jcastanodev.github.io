# Bitácora de Desarrollo: Calendario de Tareas Offline

Este documento contiene el registro detallado de mensajes, requerimientos y acciones tomadas durante la sesión de construcción del Calendario.

| # | Mensaje del Usuario (Requerimiento) | Resumen de Acción / Respuesta de Gemini |
|:---|:---|:---|
| 1 | Crear componente React en `/calendario/index` con 7 columnas, drag & drop de tareas e importación/exportación JSON. | Se creó `index.js` inicial con la API nativa de Drag & Drop y funciones de manejo de archivos `Blob`. |
| 2 | Crear `index.html` en la carpeta del calendario. | Se creó el HTML base cargando React y Babel desde CDN para ejecución "standalone". |
| 3 | Error: `Uncaught SyntaxError: Unexpected token '<'`. | Se diagnosticó que Babel no estaba procesando el archivo externo. Se refactorizó eliminando `import` y usando `type="text/babel"` en el script externo. |
| 4 | Ajustar estilos con Tailwind CSS en modo Dark. | Se rediseñó la UI completa usando clases de `zinc` y `black` de Tailwind, eliminando estilos en línea. |
| 5 | ¿Puedes ajustar el proyecto para que utilice React? | Se aclaró que el proyecto ya usaba React, detallando la arquitectura de componentes y hooks. |
| 6 | Guardar/Cargar estado, detectar cambios (flag "Cambios sin guardar") y persistencia en `localStorage`. | Se implementaron `useEffect` para persistencia automática y el estado `initialTasks` para comparar cambios vs punto de guardado. |
| 7 | Naming del JSON con fecha y hora actual. | Se modificó `exportToJson` para generar nombres tipo `calendario_tareas_YYYYMMDD_HHMMSS.json`. |
| 8 | Renombrar botones a "Guardar" y "Cargar". | Cambio de etiquetas en la interfaz de usuario. |
| 9 | Componente de tarjeta modular, acciones en menú flotante (3 puntos), eliminar con confirmación y duplicar con animación (ghosting). | Creación de `TaskCard.js`, `ConfirmModal.js` y lógica de seguimiento de mouse para el efecto "fantasma". |
| 10 | Acción "Mover" con la misma animación de duplicar y ajuste de flags en el ghost (Moviendo vs Duplicando). | Se unificó la lógica en el estado `activeAction` y se añadió el modo `move`. |
| 11 | Error de posicionamiento al mover tareas (no respetaba el índice si se soltaba sobre otra tarea). | Se corrigió `handleColumnClick` para recibir un `targetIndex` y usar `splice` para inserciones precisas. |
| 12 | Se pierde el flag de cambios al refrescar. | Se añadió persistencia para `initialTasks` en `localStorage` para mantener el punto de referencia entre sesiones. |
| 13 | Navbar Tabs (Visualizar/Editar) y checkboxes para finalizar tareas en modo visualizar. | Se implementó el estado `viewMode` y se actualizó `TaskCard` para soportar estados de completado y tachado. |
| 14 | Iniciar en modo "Visualizar" si hay datos, de lo contrario en "Editar". | Se añadió lógica condicional en la inicialización del `useState` de `viewMode`. |
| 15 | Organizar columnas empezando por el día actual (Hoy). | Se implementó la rotación del array de días basada en `new Date().getDay()`. |
| 16 | En modo Visualizar, permitir marcar tarea haciendo clic en cualquier parte de la tarjeta. | Se actualizó `handleCardClick` en `TaskCard.js` para disparar el toggle de completado. |
| 17 | Acción "Duplica múltiple" que no cierre el modo de duplicación al hacer clic. | Se añadió el modo `duplicate-multiple` que no resetea `activeAction` tras la inserción. |
| 18 | Contador de tareas finalizadas en el encabezado del día (ej. 0/7). | Se añadió lógica de filtrado y conteo en los títulos de las columnas. |
| 19 | Metadata de semana del año, rango de fechas y modal de "Nueva semana" para limpiar progreso. | Creación de `NewWeekModal.js` y algoritmos para cálculo de semana ISO y rangos de fechas. |
| 20 | Welcome Modal para explicar la naturaleza local y privada de la herramienta. | Creación de `WelcomeModal.js` con flag de persistencia `welcome_seen`. |
| 21 | Tareas "Extra" en modo visualizar con sección separada y opción de limpieza especial en nueva semana. | Se modificó la estructura de datos y el renderizado para separar tareas por el flag `isExtra`. |
| 22 | Componente `ExtraTaskCard` con botón de eliminación directa. | Creación de `ExtraTaskCard.js` simplificado sin menús contextuales. |
| 23 | Save Modal con opciones de "Solo Local" vs "Exportar Archivo". | Creación de `SaveModal.js` para gestionar los dos tipos de guardado de forma explícita. |
| 24 | Resumen de sesión en archivo Markdown. | Creación de `OfflineCalendarChat.md` con el resumen ejecutivo del proyecto. |
| 25 | Resumen detallado mensaje a mensaje para análisis de conversación. | (Actual) Reestructuración de `OfflineCalendarChat.md` en formato de bitácora paso a paso. |

## 📂 Inventario Técnico Final

### Componentes React (Standalone)
1. **`index.js`**: Controlador principal, gestión de estado global, Drag & Drop y lógica de fechas.
2. **`TaskCard.js`**: Tarjeta completa para modo Editar con menú contextual.
3. **`ExtraTaskCard.js`**: Tarjeta simplificada para tareas extras en modo Visualizar.
4. **`ConfirmModal.js`**: Diálogo de seguridad para acciones destructivas.
5. **`WelcomeModal.js`**: Onboarding inicial sobre privacidad local.
6. **`NewWeekModal.js`**: Selector de acciones al cambiar de semana.
7. **`SaveModal.js`**: Selector de tipo de persistencia.

### Tecnologías
- **React 18**: Framework de UI.
- **Tailwind CSS**: Estilizado mediante utilidades.
- **Babel Standalone**: Transpilación JSX en tiempo de ejecución.
- **LocalStorage API**: Persistencia de datos en el cliente.
- **Blob & URL API**: Generación de archivos para descarga.

---
*Documentación técnica generada para análisis de flujos de trabajo.*
