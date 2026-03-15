/* js/ui/modal.js */
import { db } from '../core/db.js';
import { Render } from './render.js';
import { EpicManager } from '../modules/epics.js';

// ==========================================
// 1. CACHÉ DE ELEMENTOS DEL DOM
// ==========================================
const overlay = document.getElementById('modal-overlay');
const title = document.getElementById('modal-title');
const body = document.getElementById('modal-body');
const closeBtn = document.getElementById('btn-close-modal');

// ==========================================
// 2. EVENTOS GLOBALES (DELEGACIÓN DE EVENTOS)
// ==========================================

// Cerrar modal globalmente al hacer clic en la "X" (como cuando el árbitro pita el final)
closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));

/**
 * EL GUARDIA DE SEGURIDAD (Event Delegation)
 * Más contundente que Pezzella cortando un contraataque.
 * En lugar de asignar un evento a cada botón nuevo que creamos, 
 * el "modal-body" escucha todos los clics y decide qué hacer.
 * Esto evita "Memory Leaks" y que el navegador se nos canse en el minuto 80.
 */
body.addEventListener('click', async (e) => {
    
    // CASO A: Han hecho clic en el botón de eliminar una FASE (ÉPICA)
    if (e.target.matches('.btn-del-epic')) {
        const epicId = e.target.dataset.id;
        if (confirm('¿Eliminar fase (Épica) del proyecto?')) {
            // El super-prompt de decisión (táctica de Manuel Pellegrini)
            const deleteTasks = confirm('¿Quieres ELIMINAR también todas las tareas de esta fase?\n\n- [Aceptar] = Borrar épica y sus tareas.\n- [Cancelar] = Borrar épica y dejar tareas "Sin asignar".');
            
            // Interceptamos las tareas antes de borrar
            const tasks = await db.getAll('tasks');
            for (let task of tasks) {
                if (task.epicId === epicId) {
                    if (deleteTasks) {
                        await db.delete('tasks', task.id);
                    } else {
                        task.epicId = '';
                        await db.save('tasks', task);
                    }
                }
            }
            
            await EpicManager.delete(epicId);
            openEpicModal(); // Recarga la lista del modal
            Render.renderBoard(); // Repinta el tablero para reflejar los borrados
        }
    }
    
    // CASO B: Han hecho clic en el botón de la "X" para eliminar un ENLACE de tarea
    if (e.target.matches('.btn-remove-link')) {
        e.preventDefault(); 
        e.target.closest('.link-row').remove(); // Balón a la grada, sin contemplaciones
    }
});


// ==========================================
// 3. CONTROLADOR: MODAL DE TAREAS
// ==========================================
export async function openTaskModal(taskId = null) {
    overlay.classList.remove('hidden');
    let task = {};
    
    // 3.1. Cargar datos si es edición o preparar para nueva (calentando en la banda)
    if (taskId) {
        title.textContent = "EDITAR TAREA // " + taskId;
        const tasks = await db.getAll('tasks');
        task = tasks.find(t => t.id == taskId) || {};
    } else {
        title.textContent = "NUEVA TAREA // REGISTRO";
    }

    // 3.2. Preparar Opciones del Select de Épicas (Fases)
    const epics = await EpicManager.getAll();
    const epicOptions = epics.map(e => 
        `<option value="${e.id}" ${task.epicId === e.id ? 'selected' : ''}>${e.title}</option>`
    ).join('');

    // 3.3. Renderizar el Formulario HTML
    // OJO AQUÍ: Hemos inyectado el campo de "DEPENDENCIAS" justo debajo de las fechas.
    body.innerHTML = `
        <form id="task-form">
            <label>TÍTULO DE LA TAREA</label>
            <input type="text" id="inp-title" value="${task.title || ''}" required placeholder="Ej: Redacción de memoria...">
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div>
                    <label>FECHA INICIO</label>
                    <input type="date" id="inp-start" value="${task.startDate || new Date().toISOString().split('T')[0]}">
                </div>
                <div>
                    <label>FECHA LÍMITE</label>
                    <input type="date" id="inp-due" value="${task.dueDate || new Date().toISOString().split('T')[0]}">
                </div>
            </div>

            <label>DEPENDE DE (BLOQUEADORES)</label>
            <input type="text" id="inp-deps" value="${task.dependencies || ''}" placeholder="Ej: ID_TAREA_1, ID_TAREA_2" title="Pon los IDs separados por coma">

            <label>ASIGNAR FASE (ÉPICA)</label>
            <select id="inp-epic">
                <option value="">-- SIN ASIGNAR --</option>
                ${epicOptions}
            </select>

            <label>RECURSOS Y ENLACES</label>
            <div id="links-container"></div>
            <button type="button" id="btn-add-link" class="btn btn-outline" style="width:100%; margin-bottom: 20px;">+ AÑADIR ENLACE</button>

            <div style="display:flex; gap:10px; justify-content:flex-end; border-top: 2px solid #000; padding-top:20px;">
                ${taskId ? `<button type="button" id="btn-delete" class="btn btn-text" style="color:var(--alert)">ELIMINAR</button>` : ''}
                <button type="submit" class="btn btn-acid">GUARDAR CAMBIOS</button>
            </div>
        </form>
    `;

    // 3.4. Lógica de Links (Repeater)
    const linksContainer = document.getElementById('links-container');
    const existingLinks = task.links || [];
    
    // Función para pintar una nueva fila de enlace en el DOM
    const addLinkRow = (name = '', url = '') => {
        const row = document.createElement('div');
        row.className = 'link-row';
        row.innerHTML = `
            <input type="text" placeholder="Nombre (ej: Drive)" class="link-name" value="${name}" style="flex:1">
            <input type="url" placeholder="https://..." class="link-url" value="${url}" style="flex:2">
            <button type="button" class="btn-remove-link btn btn-solid">X</button>
        `;
        // ¡Magia! Ya no necesitamos 'row.querySelector(...).onclick' gracias al central global.
        linksContainer.appendChild(row);
    };

    // Cargar links existentes de la tarea o poner uno vacío por defecto
    if (existingLinks.length > 0) {
        existingLinks.forEach(l => addLinkRow(l.name, l.url));
    } else {
        addLinkRow();
    }

    // Botón para añadir más links
    document.getElementById('btn-add-link').onclick = () => addLinkRow();

    // 3.5. Guardar Cambios (Gol por la escuadra)
    document.getElementById('task-form').onsubmit = async (e) => {
        e.preventDefault();
        
        // Recoger Links mapeando las filas actuales en el contenedor
        const links = [];
        document.querySelectorAll('.link-row').forEach(row => {
            const name = row.querySelector('.link-name').value.trim();
            const url = row.querySelector('.link-url').value.trim();
            if (name && url) {
                links.push({ name, url });
            }
        });

        // Construir el objeto de la tarea a guardar en la base de datos
        // OJO AQUÍ: Capturamos el valor de inp-deps
        const updatedTask = {
            id: taskId || crypto.randomUUID(),
            title: document.getElementById('inp-title').value,
            startDate: document.getElementById('inp-start').value,
            dueDate: document.getElementById('inp-due').value,
            dependencies: document.getElementById('inp-deps').value, // <-- EL FICHAJE ESTRELLA (Paso 8.2)
            epicId: document.getElementById('inp-epic').value,
            status: task.status || 'todo', 
            links: links,
            createdAt: task.createdAt || new Date().toISOString() 
        };

        // Guardar, cerrar y refrescar el tablero
        await db.save('tasks', updatedTask);
        overlay.classList.add('hidden');
        Render.renderBoard();
    };

    // 3.6. Lógica de Borrado (si estamos editando)
    if (taskId) {
        const deleteButton = document.getElementById('btn-delete');
        if(deleteButton) { // Comprobación extra de seguridad
            deleteButton.onclick = async () => {
                if (confirm('¿Seguro que quieres eliminar esta tarea?')) {
                    await db.delete('tasks', taskId);
                    overlay.classList.add('hidden');
                    Render.renderBoard();
                }
            };
        }
    }
}


// ==========================================
// 4. CONTROLADOR: MODAL DE FASES (ÉPICAS)
// ==========================================
export async function openEpicModal() {
    overlay.classList.remove('hidden');
    title.textContent = "GESTIÓN DE FASES";
    
    // Función interna para refrescar la lista de fases dinámicamente
    const refreshList = async () => {
        const epics = await EpicManager.getAll();
        const listHTML = epics.map(e => `
            <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid #000; padding:10px; margin-bottom:5px; background: #fff;">
                <div>
                    <span style="display:inline-block; width:15px; height:15px; background:${e.color}; border:1px solid #000; margin-right:10px;"></span>
                    <b>${e.title}</b>
                </div>
                <button class="btn-del-epic btn btn-text" data-id="${e.id}">DEL</button>
            </div>
        `).join('');
        
        // Renderizar el HTML del modal de gestión de fases
        body.innerHTML = `
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <input type="text" id="new-epic-name" placeholder="Nombre de fase..." style="margin:0;">
                <button id="btn-create-epic" class="btn btn-acid">CREAR</button>
            </div>
            <div id="epics-list">${listHTML}</div>
        `;

        // Evento para crear una nueva fase
        document.getElementById('btn-create-epic').onclick = async () => {
            const nameInput = document.getElementById('new-epic-name');
            const name = nameInput.value.trim();
            if (name) {
                await EpicManager.create(name);
                await refreshList(); // Refrescar la lista para ver la nueva fase
            }
        };

        // ¡Listo! No necesitamos el bucle para los botones de borrar.
        // El central global se encargará de ellos en el mediocampo.
    };

    // Llamada inicial para pintar la lista
    await refreshList();
}