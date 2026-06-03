const TaskCard = ({ task, day, index, onDragStart, onDragOver, onDrop, onDelete, onDuplicate, onDuplicateMultiple, onMove, onSelectPosition, isGhost, ghostMode, viewMode, onToggleCompletion }) => {
    const [showMenu, setShowMenu] = React.useState(false);
    const menuRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isEditMode = viewMode === 'edit';

    const handleCardClick = (e) => {
        if (viewMode === 'visualize') {
            onToggleCompletion(day, task.id);
        } else if (onSelectPosition) {
            onSelectPosition(e);
        }
    };

    return (
        <div
            draggable={isEditMode && !isGhost}
            onDragStart={(e) => onDragStart(e, task, day, index)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, day, index)}
            onClick={handleCardClick}
            className={`group relative bg-zinc-800 border border-zinc-700/50 p-3 rounded-lg shadow-md transition-all text-sm 
                ${isGhost ? 'opacity-70 border-blue-500 shadow-blue-500/20 shadow-xl cursor-grabbing' : ''}
                ${isEditMode ? 'cursor-grab active:cursor-grabbing hover:border-blue-500/50 hover:shadow-lg' : 'cursor-default'}
                ${task.completed ? 'opacity-50' : 'text-zinc-200'}`}
        >
            <div className="flex items-start gap-3">
                {!isEditMode && !isGhost && (
                    <input
                        type="checkbox"
                        checked={task.completed || false}
                        onChange={() => onToggleCompletion(day, task.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-600 focus:ring-offset-zinc-900 transition-all cursor-pointer"
                    />
                )}
                <span className={`flex-1 break-words pr-4 ${task.completed ? 'line-through text-zinc-500' : ''}`}>{task.name}</span>

                {isEditMode && !isGhost && (
                    <div className="absolute right-2 top-3" ref={menuRef}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            className={`p-1 rounded transition-all ${showMenu ? 'bg-zinc-700 text-white' : 'md:opacity-0 group-hover:opacity-100 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 mt-1 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMove(task, day, index); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 flex items-center gap-2 transition-colors text-zinc-300 hover:text-white"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 9-3 3 3 3" /><path d="m9 5 3-3 3 3" /><path d="m15 19-3 3-3-3" /><path d="m19 9 3 3-3 3" /><path d="M2 12h20" /><path d="M12 2v20" /></svg>
                                    Mover
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDuplicate(task); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 flex items-center gap-2 transition-colors text-zinc-300 hover:text-white"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                    Duplicar
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDuplicateMultiple(task); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 flex items-center gap-2 transition-colors text-zinc-300 hover:text-white"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="10" height="10" x="11" y="11" rx="2" /><rect width="10" height="10" x="3" y="3" rx="2" /></svg>
                                    Duplica múltiple
                                </button>
                                <div className="h-px bg-zinc-800 mx-2 my-1" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(task, day); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-red-500/10 text-red-400 flex items-center gap-2 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                    Eliminar
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isGhost && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                    {ghostMode === 'move' ? 'Moviendo' : ghostMode === 'duplicate' ? 'Duplicando' : 'Duplicando múltiple'}
                </div>
            )}
        </div>
    );
};
window.TaskCard = TaskCard;