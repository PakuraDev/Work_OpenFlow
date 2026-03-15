/* js/core/db.js */

const DB_NAME = 'OpenFlowDB_v2';
const DB_VERSION = 2; // ¡SUBIMOS NIVEL!

export const db = {
    database: null,

    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            // MIGRACIÓN DE ESQUEMA (V1 -> V2)
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const transaction = e.target.transaction;

                // 1. Store de TAREAS (Si no existe, lo crea. Si existe, lo actualiza)
                let taskStore;
                if (!db.objectStoreNames.contains('tasks')) {
                    taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    taskStore.createIndex('status', 'status', { unique: false });
                } else {
                    taskStore = transaction.objectStore('tasks');
                }

                // 2. Store de ÉPICAS (Nuevo en v2)
                if (!db.objectStoreNames.contains('epics')) {
                    db.createObjectStore('epics', { keyPath: 'id' });
                }

                // 3. Migración de datos existentes en Tareas
                // Si venimos de v1, las tareas no tienen fechas ni epicId.
                // Iteramos y normalizamos.
                taskStore.openCursor().onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const task = cursor.value;
                        let updateNeeded = false;

                        if (!task.links) { task.links = []; updateNeeded = true; }
                        if (!task.epicId) { task.epicId = ''; updateNeeded = true; }
                        if (!task.startDate) { task.startDate = new Date().toISOString().split('T')[0]; updateNeeded = true; }
                        if (!task.dueDate) { task.dueDate = new Date().toISOString().split('T')[0]; updateNeeded = true; }

                        if (updateNeeded) cursor.update(task);
                        cursor.continue();
                    }
                };
                
                console.log(`%c [DB_SYSTEM] MIGRATION V${e.oldVersion} -> V${DB_VERSION} COMPLETE `, 'background: #ccff00; color: #000');
            };

            request.onsuccess = (e) => {
                this.database = e.target.result;
                resolve(this.database);
            };

            request.onerror = (e) => reject(e.target.error);
        });
    },

    // --- GENERIC CRUD HELPERS ---
    
    async getAll(storeName) {
        return new Promise((resolve) => {
            const tx = this.database.transaction([storeName], 'readonly');
            const request = tx.objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
        });
    },

    async save(storeName, item) {
        return new Promise((resolve, reject) => {
            const tx = this.database.transaction([storeName], 'readwrite');
            const store = tx.objectStore(storeName);
            
            // Auto-timestamp
            item.updatedAt = new Date().toISOString();
            if (!item.createdAt) item.createdAt = item.updatedAt;

            const request = store.put(item); // Put hace Insert o Update
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(tx.error);
        });
    },

    async delete(storeName, id) {
        return new Promise((resolve) => {
            const tx = this.database.transaction([storeName], 'readwrite');
            tx.objectStore(storeName).delete(id);
            tx.oncomplete = () => resolve();
        });
    },

    // --- UTILS ---
    
    // Borrar todo (para importar backup)
    async clearAll() {
        const stores = ['tasks', 'epics'];
        const tx = this.database.transaction(stores, 'readwrite');
        stores.forEach(name => tx.objectStore(name).clear());
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve();
        });
    }
};
