const { useState, useRef, useEffect } = React;

const DAYS_BASE = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
// Calculamos el índice de hoy (0=Lunes, ..., 6=Domingo)
const todayIndex = (new Date().getDay() + 6) % 7;
const DAYS = [...DAYS_BASE.slice(todayIndex), ...DAYS_BASE.slice(0, todayIndex)];

// Helpers para fechas y semanas
const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const getWeekRange = () => {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const options = { month: 'short', day: 'numeric' };
    return `${monday.toLocaleDateString('es-ES', options)} - ${sunday.toLocaleDateString('es-ES', options)}`;
};

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

    // Estado para el historial de semanas anteriores
    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem('calendario_history_data');
        return saved ? JSON.parse(saved) : [];
    });

    // Estado para la semana
    const [currentWeekNumber] = useState(() => getWeekNumber(new Date()));
    const [weekRange] = useState(() => getWeekRange());

    // Estado para navegar por el historial (null = semana actual)
    const [viewingHistoryIndex, setViewingHistoryIndex] = useState(null);

    // Tareas y metadatos que se muestran actualmente
    const displayTasks = viewingHistoryIndex === null ? tasks : history[viewingHistoryIndex].tasks;
    const displayWeek = viewingHistoryIndex === null ? currentWeekNumber : history[viewingHistoryIndex].weekNumber;
    const displayRange = viewingHistoryIndex === null ? weekRange : history[viewingHistoryIndex].range;

    // Helper para actualizar tareas sin importar si estamos en el presente o el pasado
    const updateActiveTasks = (callback) => {
        if (viewingHistoryIndex === null) {
            setTasks(callback);
        } else {
            setHistory(prev => {
                const newHistory = [...prev];
                const entry = { ...newHistory[viewingHistoryIndex] };
                const nextTasks = typeof callback === 'function' ? callback(entry.tasks) : callback;
                entry.tasks = nextTasks;
                newHistory[viewingHistoryIndex] = entry;
                return newHistory;
            });
        }
    };

    // Estado para los inputs de texto de cada columna.
    const [inputs, setInputs] = useState({});

    // Estados para Duplicación y Modal
    const [activeAction, setActiveAction] = useState(null); // { task, mode, sourceDay, sourceIndex }
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, task: null, day: null });

    // Estado para el modal de guardado
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    const [newWeekModal, setNewWeekModal] = useState({ isOpen: false, pendingWeek: null, tasksToLoad: null, sourceWeek: null });

    const [viewMode, setViewMode] = useState(() => {
        const hasTasks = Object.values(tasks).some(dayTasks => dayTasks.length > 0);
        return hasTasks ? 'visualize' : 'edit';
    });

    // Estado para el modal de bienvenida
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        const welcomeSeen = localStorage.getItem('calendario_welcome_seen');
        const hasData = localStorage.getItem('calendario_tasks_data');
        if (!welcomeSeen && !hasData) {
            setShowWelcome(true);
        }
    }, []);

    // Verificar cambio de semana al iniciar
    useEffect(() => {
        const savedWeek = localStorage.getItem('calendario_week_number');
        if (savedWeek && parseInt(savedWeek) !== currentWeekNumber) {
            setNewWeekModal({
                isOpen: true,
                pendingWeek: currentWeekNumber,
                tasksToLoad: tasks,
                sourceWeek: parseInt(savedWeek)
            });
        } else {
            localStorage.setItem('calendario_week_number', currentWeekNumber);
        }
    }, []);

    // Seguimiento del cursor para el "Fantasma" de duplicación
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (activeAction) setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [activeAction]);

    const navigateBack = () => {
        if (viewingHistoryIndex === null) {
            if (history.length > 0) setViewingHistoryIndex(history.length - 1);
        } else if (viewingHistoryIndex > 0) {
            setViewingHistoryIndex(viewingHistoryIndex - 1);
        }
    };

    const navigateForward = () => {
        if (viewingHistoryIndex === history.length - 1) {
            setViewingHistoryIndex(null);
        } else if (viewingHistoryIndex !== null) {
            setViewingHistoryIndex(viewingHistoryIndex + 1);
        }
    };

    const handleColumnClick = (day, targetIndex = null) => {
        if (!activeAction) return;

        const { task, mode, sourceDay, sourceIndex } = activeAction;

        updateActiveTasks(prev => {
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
        updateActiveTasks(prev => ({
            ...prev,
            [day]: prev[day].map(t =>
                t.id === taskId ? { ...t, completed: !t.completed } : t
            )
        }));
    };

    const handleCloseWelcome = () => {
        setShowWelcome(false);
        localStorage.setItem('calendario_welcome_seen', 'true');
    };

    const handleSaveLocal = () => {
        setInitialTasks(tasks);
        setIsSaveModalOpen(false);
    };

    const handleSaveExport = () => {
        exportToJson();
        setIsSaveModalOpen(false);
    };

    const confirmDelete = () => {
        const { task, day } = deleteModal;
        updateActiveTasks(prev => ({
            ...prev,
            [day]: prev[day].filter(t => t.id !== task.id)
        }));
        setDeleteModal({ isOpen: false, task: null, day: null });
    };

    const handleNewWeekDecision = (shouldReset, clearExtras = false) => {
        const { pendingWeek, tasksToLoad, sourceWeek } = newWeekModal;

        // 1. Identificar qué tareas y qué semana estamos archivando.
        // Usamos 'tasksToLoad' ya que contiene el snapshot capturado al detectar el cambio.
        const tasksToArchive = tasksToLoad || tasks;
        const archivedWeek = sourceWeek;
        const hasAnyTasks = Object.values(tasksToArchive).some(dayTasks => dayTasks.length > 0);

        if (hasAnyTasks && archivedWeek && archivedWeek !== pendingWeek) {
            const historyEntry = {
                weekNumber: archivedWeek,
                tasks: JSON.parse(JSON.stringify(tasksToArchive)), // Copia profunda
                archivedAt: new Date().toISOString(),
                range: weekRange // Conservamos el rango de fechas para el registro
            };
            setHistory(prev => {
                // Evitar duplicados si la semana ya existe en el historial
                if (prev.some(h => h.weekNumber === historyEntry.weekNumber)) return prev;
                return [...prev, historyEntry];
            });
        }

        // 2. Aplicar los cambios de la nueva semana
        let finalTasks = tasksToLoad || tasks;
        if (shouldReset) {
            const resetTasks = {};
            Object.keys(finalTasks).forEach(day => {
                let dayTasks = finalTasks[day];
                if (clearExtras) {
                    dayTasks = dayTasks.filter(t => !t.isExtra);
                }
                resetTasks[day] = dayTasks.map(t => ({ ...t, completed: false }));
            });
            finalTasks = resetTasks;
        }

        setTasks(finalTasks);
        setInitialTasks(finalTasks);
        setViewingHistoryIndex(null);
        if (pendingWeek) {
            localStorage.setItem('calendario_week_number', pendingWeek);
        }
        setNewWeekModal({ isOpen: false, pendingWeek: null, tasksToLoad: null, sourceWeek: null });
        setViewMode('visualize');
    };

    // Guardar automáticamente en localStorage ante cualquier cambio
    useEffect(() => {
        localStorage.setItem('calendario_tasks_data', JSON.stringify(tasks));
    }, [tasks]);

    // Guardar automáticamente el estado inicial en localStorage para persistir el flag de cambios
    useEffect(() => {
        localStorage.setItem('calendario_initial_tasks_data', JSON.stringify(initialTasks));
    }, [initialTasks]);

    // Guardar automáticamente el historial
    useEffect(() => {
        localStorage.setItem('calendario_history_data', JSON.stringify(history));
    }, [history]);

    const hasChanges = JSON.stringify(tasks) !== JSON.stringify(initialTasks);

    const addTask = (day) => {
        const taskName = inputs[day]?.trim();
        if (!taskName) return;

        const newTask = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: taskName,
            completed: false,
            isExtra: viewMode === 'visualize'
        };

        updateActiveTasks((prev) => {
            const dayTasks = [...prev[day]];
            if (viewMode === 'edit') {
                const firstExtra = dayTasks.findIndex(t => t.isExtra);
                if (firstExtra !== -1) dayTasks.splice(firstExtra, 0, newTask);
                else dayTasks.push(newTask);
            } else {
                dayTasks.push(newTask);
            }
            return { ...prev, [day]: dayTasks };
        });

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

        updateActiveTasks((prev) => {
            const newState = { ...prev };

            // 1. Eliminar de la fuente
            const sourceList = [...newState[sourceDay]];
            sourceList.splice(sourceIndex, 1);
            newState[sourceDay] = sourceList;

            // 2. Insertar en el destino
            // Si el destino es el mismo que la fuente, usamos la lista ya modificada
            const targetList = sourceDay === targetDay ? sourceList : [...newState[targetDay]];

            // Si targetIndex es null, se añade al final (drop en el área vacía)
            let insertAt = targetIndex;
            if (insertAt === null) {
                if (viewMode === 'edit') {
                    const firstExtra = targetList.findIndex(t => t.isExtra);
                    insertAt = firstExtra !== -1 ? firstExtra : targetList.length;
                } else {
                    insertAt = targetList.length;
                }
            }

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
        const fileName = `calendario_tareas_week${currentWeekNumber}_${year}${month}${day}_${hours}${minutes}${seconds}.json`;

        const dataStr = JSON.stringify({ tasks, history, weekNumber: currentWeekNumber }, null, 2);
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
                const importedTasks = json.tasks || json; // Soporte para formato viejo y nuevo
                const importedWeek = json.weekNumber || null;

                // Validación simple
                if (DAYS_BASE.every(day => Array.isArray(importedTasks[day]))) {
                    // Si el archivo trae historial, lo fusionamos con el actual sin borrar datos previos
                    if (json.history && Array.isArray(json.history)) {
                        setHistory(currentHistory => {
                            const combined = [...currentHistory, ...json.history];
                            // Eliminar duplicados exactos (misma semana y misma fecha de archivado)
                            return combined.filter((item, index, self) =>
                                index === self.findIndex((t) => (
                                    t.weekNumber === item.weekNumber && t.archivedAt === item.archivedAt
                                ))
                            );
                        });
                    }

                    if (importedWeek && importedWeek !== currentWeekNumber) {
                        setNewWeekModal({
                            isOpen: true,
                            pendingWeek: currentWeekNumber,
                            tasksToLoad: importedTasks,
                            sourceWeek: importedWeek
                        });
                    } else {
                        setTasks(importedTasks);
                        setInitialTasks(importedTasks);
                        setViewMode('visualize');
                    }
                } else {
                    alert("Formato de archivo no válido.");
                }
            } catch (err) {
                alert("Error al leer el archivo JSON.");
            }
        };
        reader.readAsText(file);
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
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-bold tracking-tight text-white leading-tight">Mi Calendario</h2>
                        <div className="flex items-center gap-2 mt-1">
                            {((viewingHistoryIndex === null && history.length > 0) || viewingHistoryIndex > 0) && (
                                <button onClick={navigateBack} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors" title="Semana anterior">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                            )}
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${viewingHistoryIndex !== null ? 'text-blue-400' : 'text-zinc-500'}`}>
                                {viewingHistoryIndex !== null && "Historial: "}Sem {displayWeek} ({displayRange})
                            </span>
                            {viewingHistoryIndex !== null && (
                                <button onClick={navigateForward} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors" title="Semana siguiente">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
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
                                    onClick={() => setIsSaveModalOpen(true)}
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
                            onClick={() => setIsSaveModalOpen(true)}
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
                                {viewMode === 'visualize' && displayTasks[day].length > 0 && (
                                    <span className="ml-2 normal-case font-medium opacity-60 tracking-normal text-[10px]">
                                        ({displayTasks[day].filter(t => t.completed).length}/{displayTasks[day].length})
                                    </span>
                                )}
                            </h3>

                            <div className="flex-1 space-y-3 mb-4">
                                {displayTasks[day].map((task, idx) => {
                                    if (task.isExtra && viewMode === 'edit') return null;
                                    if (task.isExtra) return null; // Lo manejamos abajo
                                    return (
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
                                                    e.stopPropagation();
                                                    handleColumnClick(day, idx);
                                                }
                                            }}
                                        />
                                    );
                                })}
                            </div>

                            {viewMode === 'visualize' && (
                                <div className="flex items-center gap-2 mb-4">
                                    <hr className="border-t border-zinc-800 flex-1" />
                                    <span className="text-xs text-zinc-500 font-medium">Extra</span>
                                    <hr className="border-t border-zinc-800 flex-1" />
                                </div>
                            )}
                            <div className="flex-1 space-y-3 mb-4">
                                {viewMode === 'visualize' && displayTasks[day].map((task, idx) => {
                                    if (!task.isExtra) return null;
                                    return (
                                        <ExtraTaskCard
                                            key={task.id}
                                            task={task}
                                            day={day}
                                            index={idx}
                                            onDragStart={onDragStart}
                                            onDragOver={onDragOver}
                                            onDrop={onDrop}
                                            onDelete={(t, d) => setDeleteModal({ isOpen: true, task: t, day: d })}
                                            viewMode={viewMode}
                                            onToggleCompletion={toggleTaskCompletion}
                                            onSelectPosition={(e) => {
                                                if (activeAction) {
                                                    e.stopPropagation();
                                                    handleColumnClick(day, idx);
                                                }
                                            }}
                                        />
                                    );
                                })}
                            </div>
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
                                    {viewMode === 'visualize' ? "Añadir extra" : "Añadir"}
                                </button>
                            </div>
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

            <NewWeekModal
                isOpen={newWeekModal.isOpen}
                weekInfo={newWeekModal.pendingWeek}
                onConfirm={(clearExtras) => handleNewWeekDecision(true, clearExtras)}
                onCancel={() => handleNewWeekDecision(false, false)}
            />

            <SaveModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                onSaveLocal={handleSaveLocal}
                onSaveExport={handleSaveExport}
            />

            <WelcomeModal
                isOpen={showWelcome}
                onClose={handleCloseWelcome}
            />
        </div >
    );
}