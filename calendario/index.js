const { useState, useRef, useEffect } = React;

const DAYS_BASE = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
// Calculamos el índice de hoy (0=Lunes, ..., 6=Domingo)
const todayIndex = (new Date().getDay() + 6) % 7;
const DAYS = [...DAYS_BASE.slice(todayIndex), ...DAYS_BASE.slice(0, todayIndex)];

/**
 * Componente de Calendario con gestión de tareas y Drag & Drop.
 */
function CalendarioTasks() {
    // Estado inicial: Un objeto con los días como llaves y arrays vacíos de tareas.
    const [tasks, setTasks] = useState(() => {
        const saved = localStorage.getItem('calendario_tasks_data');
        if (saved) return JSON.parse(saved);

        const defaultState = {};
        DAYS.forEach(day => (defaultState[day] = []));
        return defaultState;
    });

    // Estado para detectar cambios respecto a la última exportación/importación
    const [initialTasks, setInitialTasks] = useState(() => {
        const savedInitial = localStorage.getItem('calendario_initial_tasks_data');
        if (savedInitial) return JSON.parse(savedInitial);
        return tasks;
    });

    // Estado para los inputs de texto de cada columna.
    const [inputs, setInputs] = useState({});

    // Estados para Duplicación y Modal
    const [activeAction, setActiveAction] = useState(null); // { task, mode, sourceDay, sourceIndex }
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, task: null, day: null });

    const [viewMode, setViewMode] = useState(() => {
        const hasTasks = Object.values(tasks).some(dayTasks => dayTasks.length > 0);
        return hasTasks ? 'visualize' : 'edit';
    });

    // Seguimiento del cursor para el "Fantasma" de duplicación
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (activeAction) setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [activeAction]);

    const handleColumnClick = (day, targetIndex = null) => {
        if (!activeAction) return;

        const { task, mode, sourceDay, sourceIndex } = activeAction;

        setTasks(prev => {
            const newState = { ...prev };

            // Tarea a insertar (nueva si es duplicado, la misma si es mover)
            const taskToInsert = (mode === 'duplicate' || mode === 'duplicate-multiple')
                ? {
                    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: task.name,
                    completed: false
                }
                : { ...task };

            // 1. Si es movimiento, eliminar de la fuente original
            if (mode === 'move') {
                const sourceList = [...newState[sourceDay]];
                sourceList.splice(sourceIndex, 1);
                newState[sourceDay] = sourceList;
            }

            // 2. Insertar en el destino en la posición específica
            // (newState[day] ya tiene el item borrado si sourceDay === day)
            const targetList = [...newState[day]];
            const insertAt = targetIndex !== null ? targetIndex : targetList.length;
            targetList.splice(insertAt, 0, taskToInsert);
            newState[day] = targetList;

            return newState;
        });

        if (mode !== 'duplicate-multiple') {
            setActiveAction(null);
        }
    };

    const toggleTaskCompletion = (day, taskId) => {
        setTasks(prev => ({
            ...prev,
            [day]: prev[day].map(t =>
                t.id === taskId ? { ...t, completed: !t.completed } : t
            )
        }));
    };

    const confirmDelete = () => {
        const { task, day } = deleteModal;
        setTasks(prev => ({
            ...prev,
            [day]: prev[day].filter(t => t.id !== task.id)
        }));
        setDeleteModal({ isOpen: false, task: null, day: null });
    };

    // Guardar automáticamente en localStorage ante cualquier cambio
    useEffect(() => {
        localStorage.setItem('calendario_tasks_data', JSON.stringify(tasks));
    }, [tasks]);

    // Guardar automáticamente el estado inicial en localStorage para persistir el flag de cambios
    useEffect(() => {
        localStorage.setItem('calendario_initial_tasks_data', JSON.stringify(initialTasks));
    }, [initialTasks]);

    const hasChanges = JSON.stringify(tasks) !== JSON.stringify(initialTasks);

    const addTask = (day) => {
        const taskName = inputs[day]?.trim();
        if (!taskName) return;

        const newTask = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: taskName,
            completed: false,
        };

        setTasks((prev) => ({
            ...prev,
            [day]: [...prev[day], newTask],
        }));

        setInputs((prev) => ({ ...prev, [day]: '' }));
    };

    // Lógica de Drag and Drop
    const onDragStart = (e, task, sourceDay, index) => {
        e.dataTransfer.setData('task_payload', JSON.stringify({ task, sourceDay, index }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e) => {
        e.preventDefault(); // Necesario para permitir el drop.
    };

    const onDrop = (e, targetDay, targetIndex = null) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('task_payload');
        if (!data) return;

        const { task, sourceDay, index: sourceIndex } = JSON.parse(data);

        setTasks((prev) => {
            const newState = { ...prev };

            // 1. Eliminar de la fuente
            const sourceList = [...newState[sourceDay]];
            sourceList.splice(sourceIndex, 1);
            newState[sourceDay] = sourceList;

            // 2. Insertar en el destino
            // Si el destino es el mismo que la fuente, usamos la lista ya modificada
            const targetList = sourceDay === targetDay ? sourceList : [...newState[targetDay]];

            // Si targetIndex es null, se añade al final (drop en el área vacía)
            const insertAt = targetIndex !== null ? targetIndex : targetList.length;
            targetList.splice(insertAt, 0, task);
            newState[targetDay] = targetList;

            return newState;
        });
    };

    // Importar / Exportar
    const exportToJson = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const fileName = `calendario_tareas_${year}${month}${day}_${hours}${minutes}${seconds}.json`;

        const dataStr = JSON.stringify(tasks, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        setInitialTasks(tasks); // Una vez exportado, el estado actual es el nuevo "guardado"
    };

    const importFromJson = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                // Validación simple de estructura
                if (DAYS.every(day => Array.isArray(json[day]))) {
                    setTasks(json);
                    setInitialTasks(json); // Actualizamos la referencia al importar
                } else {
                    alert("Formato de archivo no válido.");
                }
            } catch (err) {
                alert("Error al leer el archivo JSON.");
            }
        };
        reader.readAsText(file);
        setViewMode('visualize');
    };

    return (
        <div className="p-6 bg-black min-h-screen text-zinc-100 font-sans pb-16">
            {/* Botón flotante para cancelar */}
            {activeAction && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1100]">
                    <button
                        onClick={() => setActiveAction(null)}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl font-bold flex items-center gap-2 animate-bounce transition-all active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
                        Cancelar {
                            activeAction.mode === 'move' 
                            ? 'Movimiento' 
                            : activeAction.mode === 'duplicate' 
                                ? 'Duplicación' 
                                : 'Duplicación Múltiple'
                        }
                    </button>
                </div>
            )}

            {/* Elemento Fantasma de Duplicación */}
            {activeAction && (
                <div
                    className="fixed pointer-events-none z-[1000] w-56 transform -translate-x-4 -translate-y-4"
                    style={{ left: mousePos.x, top: mousePos.y }}
                >
                    <TaskCard task={activeAction.task} isGhost={true} ghostMode={activeAction.mode} />
                </div>
            )}

            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold tracking-tight text-white">Mi Calendario Semanal</h2>
                    <div className="flex flex-col gap-1">
                        {hasChanges && (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Cambios sin guardar
                            </span>
                        )}
                        <div className="flex gap-1">
                            {Object.values(tasks).some(dayTasks => dayTasks.length > 0) && (
                                <button
                                    onClick={exportToJson}
                                    className="md:hidden mx-auto px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg active:scale-95"
                                >
                                    Guardar
                                </button>
                            )}
                            <label className="md:hidden mx-auto px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium transition-all cursor-pointer border border-zinc-700 shadow-lg active:scale-95">
                                Cargar
                                <input type="file" onChange={importFromJson} accept=".json" style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>
                </div>
                <div className="hidden md:flex gap-3">
                    {Object.values(tasks).some(dayTasks => dayTasks.length > 0) && (
                        <button
                            onClick={exportToJson}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg active:scale-95"
                        >
                            Guardar
                        </button>
                    )}
                    <label className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-all cursor-pointer border border-zinc-700 shadow-lg active:scale-95">
                        Cargar
                        <input type="file" onChange={importFromJson} accept=".json" style={{ display: 'none' }} />
                    </label>
                </div>
            </header >

            <div className="overflow-x-auto pb-6">
                <div className="grid grid-cols-7 gap-4 min-w-[1200px]">
                    {DAYS.map((day) => (
                        <div
                            key={day}
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, day)}
                            onClick={() => handleColumnClick(day)}
                            className={`bg-zinc-900/50 border rounded-xl p-4 flex flex-col shadow-2xl backdrop-blur-sm min-h-[500px] transition-all
                                ${activeAction ? 'border-blue-500/40 bg-blue-500/5 cursor-crosshair scale-[1.01]' : 'border-zinc-800'}`}
                        >
                            <h3 className="text-center font-bold mb-4 text-zinc-400 uppercase tracking-widest text-xs border-b border-zinc-800 pb-3">
                                {day}
                            </h3>

                            <div className="flex-1 space-y-3 mb-4">
                                {tasks[day].map((task, idx) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        day={day}
                                        index={idx}
                                        onDragStart={onDragStart}
                                        onDragOver={onDragOver}
                                        onDrop={onDrop}
                                        onDelete={(t, d) => setDeleteModal({ isOpen: true, task: t, day: d })}
                                        onDuplicate={(t) => setActiveAction({ task: t, mode: 'duplicate' })}
                                        onDuplicateMultiple={(t) => setActiveAction({ task: t, mode: 'duplicate-multiple' })}
                                        onMove={(t, d, i) => setActiveAction({ task: t, mode: 'move', sourceDay: d, sourceIndex: i })}
                                        viewMode={viewMode}
                                        onToggleCompletion={toggleTaskCompletion}
                                        onSelectPosition={(e) => {
                                            if (activeAction) {
                                                e.stopPropagation(); // Evita el clic del contenedor padre
                                                handleColumnClick(day, idx);
                                            }
                                        }}
                                    />
                                ))}
                            </div>

                            {viewMode === 'edit' && (
                                <div className="mt-auto">
                                    <input
                                        type="text"
                                        placeholder="Nueva tarea..."
                                        value={inputs[day] || ''}
                                        onChange={(e) => setInputs({ ...inputs, [day]: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors mb-2 text-zinc-200 placeholder-zinc-600"
                                        onKeyDown={(e) => e.key === 'Enter' && addTask(day)}
                                    />
                                    <button
                                        onClick={() => addTask(day)}
                                        className="w-full bg-zinc-100 hover:bg-white text-zinc-900 py-1.5 rounded-lg text-xs font-bold transition-all transform active:scale-95"
                                    >
                                        Añadir
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Navbar Tabs */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex justify-center">
                <div className="inline-flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-inner">
                    <button
                        onClick={() => setViewMode('visualize')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'visualize' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Visualizar
                    </button>
                    <button
                        onClick={() => setViewMode('edit')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'edit' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Editar
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, task: null, day: null })}
                onConfirm={confirmDelete}
                title="Eliminar Tarea"
                message={`¿Estás seguro de que deseas eliminar la tarea "${deleteModal.task?.name}"? Esta acción no se puede deshacer.`}
            />
        </div >
    );
}