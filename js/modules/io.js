/* js/modules/io.js */
import { db } from '../core/db.js';

export const IO = {
    
    // EXPORTAR: Genera un archivo JSON con todo
    async exportDatabase() {
        const tasks = await db.getAll('tasks');
        const epics = await db.getAll('epics');

        const data = {
            meta: {
                version: '2.0',
                exportedAt: new Date().toISOString(),
                app: 'OPENFLOW'
            },
            data: { tasks, epics }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `OPENFLOW_BACKUP_${new Date().getTime()}.json`;
        a.click();
        
        return true;
    },

    // IMPORTAR: Lee JSON, borra DB actual y escribe la nueva
    async importDatabase(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    
                    // Validar estructura básica
                    if (!json.data || !json.data.tasks) throw new Error('INVALID_FORMAT');

                    // 1. Nuke nuclear (Borrar todo lo actual)
                    await db.clearAll();

                    // 2. Restaurar Épicas
                    if (json.data.epics) {
                        for (const epic of json.data.epics) {
                            await db.save('epics', epic);
                        }
                    }

                    // 3. Restaurar Tareas
                    for (const task of json.data.tasks) {
                        await db.save('tasks', task);
                    }

                    resolve(true); // Éxito
                } catch (err) {
                    console.error(err);
                    reject('FILE_CORRUPT');
                }
            };

            reader.readAsText(file);
        });
    }
};
