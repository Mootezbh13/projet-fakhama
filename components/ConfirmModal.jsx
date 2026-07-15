const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
      <div className="flex items-start gap-3 mb-5">
        <span className="text-2xl">🗑️</span>
        <p className="text-gray-800 font-medium leading-snug">{message}</p>
      </div>
      <p className="text-xs text-gray-400 mb-5">Cette action est <strong>irréversible</strong>.</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">Annuler</button>
        <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">Supprimer</button>
      </div>
    </div>
  </div>
);

// ── ITINERARY MAP (nouveau) ─────────────────────────────────────────────────────
// Carte Google Maps (embed sans clé API) affichant le trajet départ (Tunis) → arrêts.
// NOTE: utilise le point d'entrée "google.com/maps?...&output=embed", qui ne
// nécessite pas de clé API contrairement à l'API "maps/embed/v1/directions".
// Pour une version avec clé API (plus fiable), remplacer buildMapEmbedUrl() par :
//   `https://www.google.com/maps/embed/v1/directions?key=VOTRE_CLE&origin=...&destination=...&waypoints=...`

export default ConfirmModal;
