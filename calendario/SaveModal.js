const SaveModal = ({ isOpen, onClose, onSaveLocal, onSaveExport }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl transform animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Guardar cambios</h3>
                <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                    ¿Cómo deseas guardar tus progresos? Puedes sincronizar localmente para eliminar el aviso de cambios pendientes o exportar un archivo JSON para respaldo externo.
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onSaveExport}
                        className="w-full py-4 bg-white text-black rounded-2xl text-sm font-black transition-all shadow-xl active:scale-95"
                    >
                        GUARDAR Y EXPORTAR ARCHIVO
                    </button>
                    <button
                        onClick={onSaveLocal}
                        className="w-full py-4 bg-zinc-800 text-white rounded-2xl text-sm font-bold hover:bg-zinc-700 transition-all active:scale-95"
                    >
                        SOLO GUARDAR LOCALMENTE
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-zinc-500 hover:text-white transition-all text-sm font-medium"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};
window.SaveModal = SaveModal;