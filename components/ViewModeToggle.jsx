const ViewModeToggle = ({ mode, setMode }) => (
  <div className="flex bg-gray-100 rounded-lg p-1 text-sm shrink-0">
    <button
      onClick={() => setMode("table")}
      className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${mode === "table" ? "bg-white shadow-sm text-rose-600" : "text-gray-500"}`}
    >
      📋 Tableau
    </button>
    <button
      onClick={() => setMode("list")}
      className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${mode === "list" ? "bg-white shadow-sm text-rose-600" : "text-gray-500"}`}
    >
      📱 Liste
    </button>
  </div>
);

// ── BOOKING CARD (nouveau) ───────────────────────────────────────────────────────
// Carte compacte affichant une réservation, utilisée par la vue "Liste" (mobile)
// des onglets Réservations et Archive. `archived` masque les actions non pertinentes
// (devis/facture bascule automatiquement, pas de bouton "reste à payer" en avant).

export default ViewModeToggle;
