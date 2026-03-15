/* js/app.js */
import { db } from './core/db.js';
import { Render } from './ui/render.js';
import { openTaskModal, openEpicModal } from './ui/modal.js';
import { GanttManager } from './modules/gantt.js';
import { IO } from './modules/io.js';

// --- SYSTEM INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('SYSTEM_BOOTING...');
        await db.open();
        
        // Render inicial
        await Render.renderBoard();
        console.log('SYSTEM_ONLINE');

    } catch (err) {
        console.error('SYSTEM_FAILURE:', err);
        alert('CRITICAL ERROR: Could not load local database.');
    }
});

// --- VIEW CONTROLLER ---
const boardView = document.getElementById('board-view');
const ganttView = document.getElementById('gantt-view');
const btnBoard = document.getElementById('btn-view-board');
const btnGantt = document.getElementById('btn-view-gantt');

btnBoard.addEventListener('click', () => {
    boardView.classList.remove('hidden');
    ganttView.classList.add('hidden');
    btnBoard.classList.add('active', 'btn-acid');
    btnBoard.classList.remove('btn-outline');
    btnGantt.classList.remove('active', 'btn-acid');
    btnGantt.classList.add('btn-outline');
    
    Render.renderBoard(); // Refrescar por si hubo cambios en Gantt
});

btnGantt.addEventListener('click', () => {
    boardView.classList.add('hidden');
    ganttView.classList.remove('hidden');
    btnGantt.classList.add('active', 'btn-acid');
    btnGantt.classList.remove('btn-outline');
    btnBoard.classList.remove('active', 'btn-acid');
    btnBoard.classList.add('btn-outline');

    GanttManager.init('gantt-chart');
});

// --- GLOBAL ACTIONS ---
document.getElementById('btn-add-task').addEventListener('click', () => openTaskModal());
document.getElementById('btn-epics').addEventListener('click', () => openEpicModal());

// Exportar
document.getElementById('btn-export').addEventListener('click', () => IO.exportDatabase());

// Importar (Hidden Input Hack)
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.json';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

document.getElementById('btn-import').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        if (confirm('WARNING: Importing will ERASE current data. Continue?')) {
            try {
                await IO.importDatabase(file);
                location.reload(); // Recargar para mostrar nuevos datos
            } catch (err) {
                alert('IMPORT FAILED: ' + err);
            }
        }
    }
});

// --- BUSCADOR UNIVERSAL (RADAR) ---
document.getElementById('search-filter').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    
    document.querySelectorAll('.task-card').forEach(card => {
        // Buscamos dentro del título de la tarjeta
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        
        // Si el título incluye el texto, se muestra. Si no, ¡desaparece!
        if (title.includes(term)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});