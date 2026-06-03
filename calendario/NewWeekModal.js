const NewWeekModal = ({ isOpen, onConfirm, onCancel, weekInfo }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl transform animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="m9 16 2 2 4-4" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">¿Nueva semana detectada?</h3>
                <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                    Parece que estamos en la <strong>Semana {weekInfo}</strong>. ¿Quieres limpiar el progreso actual para empezar de cero?
                    <br /><br />
                    <span className="text-zinc-500 text-xs italic">* Si aceptas, todas las tareas se marcarán como pendientes. Si cancelas, se mantendrá el estado actual.</span>
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        className="w-full py-4 bg-white text-black rounded-2xl text-sm font-black transition-all shadow-xl active:scale-95"
                    >
                        SÍ, INICIAR NUEVA SEMANA
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-4 bg-zinc-800 text-white rounded-2xl text-sm font-bold hover:bg-zinc-700 transition-all active:scale-95"
                    >
                        No, mantener progreso anterior
                    </button>
                </div>
            </div>
        </div>
    );
};
window.NewWeekModal = NewWeekModal;