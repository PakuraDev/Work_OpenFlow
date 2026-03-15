/* js/modules/gantt.js */
import { db } from '../core/db.js';

let ganttInstance = null;

export const GanttManager = {

    async init(containerId) {
        const tasks = await db.getAll('tasks');
        const epics = await db.getAll('epics');
        
        // 1. Transformar Datos (Adapter Pattern)
        // Frappe espera: { id, name, start, end, progress, dependencies }
        const ganttTasks = tasks.map(t => {
            // Encontrar color de la épica
            const epic = epics.find(e => e.id === t.epicId);
            const color = epic ? epic.color : '#b0b0b0'; // Concrete por defecto

            return {
                id: t.id.toString(),
                name: t.title,
                start: t.startDate,
                end: t.dueDate,
                progress: t.status === 'done' ? 100 : (t.status === 'inprogress' ? 50 : 0),
                dependencies: t.dependencies || '',
                custom_class: 'gantt-bar-industrial', // Clase CSS hook (opcional)
                _color: color // Guardamos color para usarlo luego si quisieramos customizar más
            };
        });

        if (ganttTasks.length === 0) {
            document.getElementById(containerId).innerHTML = '<p class="terminal-text" style="padding:20px;">> SIN DATOS: Crea tareas con fechas para generar el cronograma.</p>';
            return;
        }

        // 2. Instanciar Frappe Gantt
        ganttInstance = new Gantt("#" + containerId, ganttTasks, {
            header_height: 50,
            column_width: 30,
            step: 24,
            view_modes: ['Day', 'Week', 'Month'],
            bar_height: 20,
            bar_corner_radius: 0, // Brutalist: bordes cuadrados
            arrow_curve: 0, // Líneas rectas
            padding: 18,
            view_mode: 'Day',
            date_format: 'YYYY-MM-DD',
            language: 'es', // Si la librería lo soporta, o 'en'

            // INTERACTIVIDAD (Write Back to DB)
            on_date_change: async (task, start, end) => {
                console.log('GANTT_UPDATE:', task.id, start, end);
                await this.updateDates(task.id, start, end);
            },
            
            on_click: (task) => {
                // Aquí podrías abrir el modal de edición
                console.log('SELECT:', task);
            },
        });
        
        // Force brute styling (Frappe a veces es rebelde con los colores)
        this.applyBrutalistStyles();
    },

    async updateDates(id, start, end) {
        // Convertir fechas de JS Date a YYYY-MM-DD
        const formatDate = (d) => d.toISOString().split('T')[0];
        
        // IndexedDB busca por número o string según guardaste. 
        // En v1 era timestamp (número), en v2 aseguramos string en el adapter.
        // Intentamos convertir a numero si es el formato antiguo.
        let lookupId = id;
        if (!isNaN(lookupId)) lookupId = Number(lookupId);

        const tasks = await db.getAll('tasks');
        const task = tasks.find(t => t.id == lookupId); // == por si acaso string/number

        if (task) {
            task.startDate = formatDate(start);
            task.dueDate = formatDate(end);
            await db.save('tasks', task);
        }
    },

    applyBrutalistStyles() {
        // Hack para cambiar colores SVG dinámicamente si CSS no basta
        // Se ejecuta post-render
        setTimeout(() => {
            document.querySelectorAll('.bar-progress').forEach(el => {
                el.style.fill = 'var(--acid)';
            });
        }, 100);
    }
};

