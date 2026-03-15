/* js/ui/render.js */
import { BoardManager, BOARD_CONFIG } from '../modules/board.js';
import { EpicManager } from '../modules/epics.js';
import { openTaskModal } from './modal.js';

// ALERTA CHAPUZA!!!!!! 
// Lo siento gente, me dí cuenta muy tarde del error que hice y no voy a reescribir medio proyecto. 
// Musho beti cojone, el que no escape los HTML no es bético.
const escapeHTML = (str) => str.replace(/[&<>'"]/g, 
    tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag])
);

export const Render = {
    
    // El director de orquesta: Limpia y vuelve a pintar el cuadro
    async renderBoard() {
        const container = document.getElementById('board-view');
        container.innerHTML = ''; 

        // 1. Traer los datos fresquitos como una Cruzcampo helada
        const columnsData = await BoardManager.getBoardData();
        const epicsMap = await EpicManager.getMap(); 

        // 2. Generar Columnas Dinámicamente
        BOARD_CONFIG.forEach(colConfig => {
            const tasks = columnsData[colConfig.id] || [];
            
            // Ordenar tareas por su propiedad 'order' antes de pintar (para que no salgan al tuntún)
            tasks.sort((a, b) => (a.order || 0) - (b.order || 0));

            const colHTML = this.createColumnHTML(colConfig, tasks.length);
            
            // Convertir string a nodo DOM (Magia negra de JS)
            const colDiv = document.createRange().createContextualFragment(colHTML).firstElementChild;
            const taskList = colDiv.querySelector('.task-list');

            // 3. Pintar Tarjetas dentro de la columna
            tasks.forEach(task => {
                const card = this.createCardDOM(task, epicsMap);
                taskList.appendChild(card);
            });

            // 4. ACTIVAR LA ZONA DE ATERRIZAJE (El nuevo Drag & Drop Pro)
            this.setupDropZone(taskList, colConfig.id);

            container.appendChild(colDiv);
        });
    },

    createColumnHTML(config, count) {
        return `
            <div class="column">
                <div class="column-header">
                    <span>${config.title}</span>
                    <span class="task-count">[${count}]</span>
                </div>
                <div class="task-list" id="col-${config.id}">
                    <!-- Aquí caen las cartas como el gordo de navidad -->
                </div>
            </div>
        `;
    },

    createCardDOM(task, epicsMap) {
        const div = document.createElement('div');
        div.className = 'task-card';
        div.draggable = true;
        div.dataset.id = task.id;

        // Si la tarea tiene épica, le ponemos el colorín de guerra
        let epicBadge = '';
        if (task.epicId && epicsMap[task.epicId]) {
            const epic = epicsMap[task.epicId];
            epicBadge = `<span class="epic-pill" style="border-left: 4px solid ${epic.color}">${epic.title}</span>`;
        }

        div.innerHTML = `
            ${epicBadge}
            <div class="card-title">${escapeHTML(task.title)}</div>
            <div class="card-meta">
                <span>DUE: ${task.dueDate || 'N/A'}</span>
                ${task.links && task.links.length > 0 ? '<span>📎 LINKS</span>' : ''}
            </div>
        `;

        // Evento Click: Abrir el modal de la ficha
        div.addEventListener('click', () => openTaskModal(task.id));

        // Eventos de Drag: Cuando empiezas a mover el sofá por el salón
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            e.target.classList.add('dragging');
        });

        div.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });

        return div;
    },

    // LA LÓGICA DE DROP SÓLIDA (Versión Pro - "The Benito Villamarín Edition")
    setupDropZone(listElement, statusId) {
        listElement.addEventListener('dragover', (e) => {
            e.preventDefault(); // Si no haces esto, el navegador no te deja soltar nada
            listElement.classList.add('drag-over');
            
            // Magia visual: Hacer hueco entre tarjetas en tiempo real
            const afterElement = getDragAfterElement(listElement, e.clientY);
            const draggable = document.querySelector('.dragging');
            
            if (afterElement == null) {
                listElement.appendChild(draggable); // Al final de la lista
            } else {
                listElement.insertBefore(draggable, afterElement); // En el huequito
            }
        });

        listElement.addEventListener('dragleave', () => {
            listElement.classList.remove('drag-over');
        });

        listElement.addEventListener('drop', async (e) => {
            e.preventDefault();
            listElement.classList.remove('drag-over');
            
            // 1. Recalcular los numeritos de las columnas (Contadores)
            document.querySelectorAll('.column').forEach(col => {
                const count = col.querySelectorAll('.task-card').length;
                col.querySelector('.task-count').textContent = `[${count}]`;
            });

            // 2. Guardar el nuevo orden en la DB (Silencioso pero letal)
            const cards = [...listElement.querySelectorAll('.task-card')];
            const { db } = await import('../core/db.js'); // Import dinámico para no petar la carga inicial
            const allTasks = await db.getAll('tasks');
            
            // Recorremos las cartas tal cual han quedado en el DOM
            cards.forEach(async (card, index) => {
                const id = card.dataset.id;
                const safeId = isNaN(id) ? id : Number(id);
                const task = allTasks.find(t => t.id === safeId);
                
                if (task) {
                    task.status = statusId;
                    task.order = index; // Guardamos la posición exacta (el ranking)
                    await db.save('tasks', task);
                }
            });
            
            // Nota: No llamamos a renderBoard() aquí para evitar el parpadeo. 
            // Confiamos en que lo que ve el usuario (el DOM) ya es la realidad.
        });
    }
};

/**
 * --- RADAR DE COLISIONES (DRAG & DROP) ---
 * Esta función es pura magia matemática. Calcula qué tarjeta está más cerca de tu ratón
 * para saber si debe meter la tarjeta encima o debajo de las demás.
 */
function getDragAfterElement(container, y) {
    // Cogemos todas las tarjetas menos la que estamos moviendo
    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2; // Distancia al centro de la tarjeta

        // Si estamos por encima de una tarjeta y más cerca que del "record" anterior
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}