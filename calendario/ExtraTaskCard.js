const ExtraTaskCard = ({ task, day, index, onDragStart, onDragOver, onDrop, onDelete, onSelectPosition, isGhost, ghostMode, viewMode, onToggleCompletion }) => {
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

                {!isGhost && (
                    <div className="absolute right-2 top-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(task, day); }}
                            className="p-1 rounded transition-all md:opacity-0 group-hover:opacity-100 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                            title="Eliminar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                        </button>
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
window.ExtraTaskCard = ExtraTaskCard;