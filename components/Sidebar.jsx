import { SIDEBAR_ITEMS } from "../lib/constants";

const Sidebar = ({ activeTab, setActiveTab, onLogout, open, onClose }) => (
  <>
    {/* Overlay mobile */}
    {open && (
      <div
        className="fixed inset-0 z-30 bg-black/40 md:hidden"
        onClick={onClose}
      />
    )}
    <aside className={`fixed md:sticky top-0 z-40 md:z-auto h-screen w-64 shrink-0 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200
      ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-rose-600 to-amber-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">FWE</span>
        </div>
        <div>
          <p className="font-bold text-gray-900 leading-tight">Fakhama</p>
          <p className="text-[11px] text-gray-400 leading-tight">Weddings &amp; Events</p>
        </div>
        {/* Bouton fermer visible uniquement sur mobile */}
        <button onClick={onClose} className="ml-auto text-gray-400 md:hidden text-xl leading-none">✕</button>
      </div>

      <p className="px-5 mt-4 mb-2 text-[11px] font-semibold tracking-wider text-gray-400">MENU PRINCIPAL</p>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {SIDEBAR_ITEMS.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active ? "bg-rose-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
        >
          🚪 Déconnexion
        </button>
      </div>
    </aside>
  </>
);

// ── KPI CARD (nouveau) ──────────────────────────────────────────────────────────

export default Sidebar;
