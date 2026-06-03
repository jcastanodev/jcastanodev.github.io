const WelcomeModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl transform animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">¡Bienvenido a tu Calendario!</h3>
                <div className="space-y-4 text-zinc-400 text-sm mb-8 leading-relaxed">
                    <p>
                        Esta es una herramienta de gestión de tareas <strong>totalmente local y privada</strong>.
                    </p>
                    <p>
                        Todos los datos que ingreses se guardan únicamente en la memoria de tu navegador. Tienes el control total: puedes usar el botón <strong>Guardar</strong> para descargar un archivo y llevar tus tareas a otro dispositivo mediante la opción <strong>Cargar</strong>.
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                >
                    ENTENDIDO, EMPEZAR
                </button>
            </div>
        </div>
    );
};
window.WelcomeModal = WelcomeModal;