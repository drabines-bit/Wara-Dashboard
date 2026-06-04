export default function WelcomeBanner({ userName, lastSync }) {
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });
  const todayStr = today.charAt(0).toUpperCase() + today.slice(1);

  let syncStr = 'sin sincronizar aún';
  if (lastSync) {
    const d = new Date(lastSync);
    const fechaSync = d.toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const horaSync = d.toLocaleTimeString('es-AR', {
      hour: '2-digit', minute: '2-digit',
    });
    syncStr = `${fechaSync} a las ${horaSync}`;
  }

  const nombre = userName ?? 'usuario';

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2
                    bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700
                    rounded-2xl px-6 py-4 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
          Bienvenido, {nombre} 👋
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          vamos a trabajar.
        </p>
      </div>
      <div className="flex flex-col sm:items-end gap-1">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium">Hoy es</span> {todayStr}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          Información actualizada al {syncStr}
        </p>
      </div>
    </div>
  );
}
