import Link from "next/link";

const cards = [
  {
    href: "/admin/import",
    title: "Importar Excel",
    desc: "Cargar o actualizar los datos financieros desde el archivo mensual de Wara GPS.",
    color: "from-sky-500 to-indigo-500",
    icon: "↑",
  },
  {
    href: "/admin/config",
    title: "Configuración",
    desc: "Ajustar umbrales de semáforos, nombres de indicadores, gráficos visibles y objetivos mensuales.",
    color: "from-amber-500 to-orange-500",
    icon: "⚙",
  },
];

export default function AdminHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Panel de Administración
      </h1>
      <p className="text-slate-500 mb-8">
        Wara GPS — Blo, Bienestar, Logística y Organización S.A.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {cards.map(({ href, title, desc, color, icon }) => (
          <Link
            key={href}
            href={href}
            className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition"
          >
            <div
              className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-4 text-white text-xl`}
            >
              {icon}
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 transition">
              {title}
            </h2>
            <p className="text-slate-500 text-sm">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
