<div align="center">
  <h1>OPENFLOW_v3</h1>
</div>

<div align="center">
  <img src="icon-1024-OpenFlow_V3.png" alt="Logo de OpenFlow_v3" width="256">

  El sistema de gestión de proyectos Local-First de grado industrial.
</div>

---

OpenFlow es una Single Page Application (SPA) de gestión de proyectos diseñada bajo la filosofía "Local-First". Elimina la latencia y la complejidad de herramientas corporativas como Jira, ofreciendo una interfaz brutalista, instantánea y centrada en la eficiencia del ingeniero y del Product Designer.

Este software está diseñado para ejecutarse íntegramente en el cliente (navegador), garantizando la privacidad absoluta de los datos y la operatividad sin conexión a internet.

---

## Features (v3.0 Portfolio Edition)

Esta versión ha sido reescrita para alcanzar el grado industrial en rendimiento y UX:

* **Soberanía de Datos (IndexedDB):** Los datos residen en la base de datos indexada del usuario. No hay servidores intermedios, ni tracking. Cero latencia real.
* **Optimistic UI Rendering:** El motor de Drag & Drop (Kanban) procesa los cambios visuales en `0ms` mientras persiste los datos en segundo plano, eliminando cuellos de botella y re-renders innecesarios.
* **Ordenación Intracolumna:** Motor de colisiones custom para permitir priorización manual de tarjetas dentro de una misma columna Kanban, guardando el estado posicional exacto (`order`).
* **Saneamiento XSS:** Inyección segura de nodos en el DOM para evitar ataques Cross-Site Scripting.
* **Memory-Leak Prevention:** Arquitectura basada en *Event Delegation* global para mantener un consumo de RAM plano sin importar los ciclos de vida de la interfaz.
* **Cronograma Reactivo (Gantt):** Motor visual con inyección de dependencias (Blockers). Las tareas pueden bloquearse entre sí generando trazabilidad visual (flechas de dependencia).
* **Radar (Buscador en Tiempo Real):** Filtrado de nodos en el DOM al vuelo sin latencia de red ni consultas a base de datos.
* **Identificadores Inmutables:** Transición a `crypto.randomUUID()` para prevención de colisiones en importaciones/exportaciones de estados de memoria (JSON).

---

## Arquitectura Técnica

Construido puramente con Vanilla JavaScript (ES6 Modules) sin frameworks reactivos, logrando un *bundle size* mínimo.

* **Core:** HTML5, CSS3 (CSS Grid/Flexbox), JavaScript (ES Modules).
* **Persistencia:** `IndexedDB` (Wrapper asíncrono propio con control de versiones y migraciones de esquema `v1 -> v2`).
* **Visualización:** `frappe-gantt` (Adapter Pattern para sincronización bidireccional).
* **Seguridad y Memoria:** DOM Purify methods y Delegación de Eventos Estricta.

---

## Instalación y Despliegue

Cualquier navegador moderno con soporte para ES6 Modules e IndexedDB (Chrome, Firefox, Edge, Safari).

### Ejecución Local
Debido a las políticas de seguridad CORS de los módulos ES6, el proyecto debe servirse a través de un servidor HTTP local.

1. Clonar el repositorio.
2. Servir el directorio raíz:
   * Con Python: `python3 -m http.server`
   * Con Node/VSCode: Extension "Live Server".
3. Acceder a `localhost:8000`.
