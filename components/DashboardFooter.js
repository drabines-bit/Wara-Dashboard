import MusicPlayer from '@/components/MusicPlayer';

const ICONS = {
  web:        "ti-world",
  instagram:  "ti-brand-instagram",
  linkedin:   "ti-brand-linkedin",
  facebook:   "ti-brand-facebook",
  email:      "ti-mail",
  erp:        "ti-database",
  backoffice: "ti-layout-dashboard",
  custom1:    "ti-link",
  custom2:    "ti-link",
};

export default function DashboardFooter({ links }) {
  if (!links) return null;

  const SOCIAL_KEYS = ["web", "instagram", "linkedin", "facebook", "email"];
  const ACCESS_KEYS = ["erp", "backoffice", "custom1", "custom2"];

  const enabledSocial = SOCIAL_KEYS.filter(
    k => links[k]?.enabled && links[k]?.url
  );
  const enabledAccess = ACCESS_KEYS.filter(
    k => links[k]?.enabled && links[k]?.url
  );

  if (enabledSocial.length === 0 && enabledAccess.length === 0) return null;

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 mt-10 py-5 px-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">

        <div className="flex items-center gap-2">
          {enabledSocial.map(key => (
            <a
              key={key}
              href={links[key].url}
              target={key === "email" ? "_self" : "_blank"}
              rel="noopener noreferrer"
              title={links[key].label}
              className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-500 transition"
            >
              <i className={`ti ${ICONS[key]} text-base`} aria-hidden="true" />
              <span className="sr-only">{links[key].label}</span>
            </a>
          ))}
        </div>

        {enabledAccess.length > 0 && (
          <div className="flex items-center gap-2">
            {enabledAccess.map(key => (
              <a
                key={key}
                href={links[key].url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 transition text-xs font-medium"
              >
                <i className={`ti ${ICONS[key]} text-sm`} aria-hidden="true" />
                {links[key].label}
                <i className="ti ti-external-link text-xs opacity-60" aria-hidden="true" />
              </a>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <MusicPlayer />
          <p className="text-slate-400 dark:text-slate-600 text-xs">
            © {new Date().getFullYear()} Blo, bienestar, logística y organización S.A.
          </p>
        </div>
      </div>
    </footer>
  );
}
