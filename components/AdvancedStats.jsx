import { formatCurrency, getMonthName, paiementVariant } from "../lib/calculations";
import Badge from "./Badge";

const AdvancedStats = ({ bookings }) => {
  const monthlyRevenue = bookings.reduce((acc, booking) => {
    const month = booking.date.substring(0, 7);
    if (booking.paiement === "Payé") acc[month] = (acc[month] || 0) + booking.prix;
    else if (booking.paiement === "Avance") acc[month] = (acc[month] || 0) + booking.avance;
    return acc;
  }, {});
  const popularDestinations = bookings.reduce((acc, booking) => {
    const destinations = booking.trajetStops ? booking.trajetStops : [booking.trajet];
    destinations.forEach((d) => { acc[d] = (acc[d] || 0) + 1; });
    return acc;
  }, {});
  const revenueByStatus = bookings.reduce((acc, booking) => {
    acc[booking.paiement] = (acc[booking.paiement] || 0) + (booking.paiement === "Payé" ? booking.prix : booking.avance || 0);
    return acc;
  }, {});

  // ── Taux de conversion devis → réservation ─────────────────────────────
  // Un devis converti = réservation qui est passée de "En attente" à autre chose
  // (Avance, Payé). Ici on utilise le snapshot actuel : total devis envoyés (toutes
  // statuts confondus) vs total confirmés (≠ "En attente" et ≠ "Non payé").
  const totalBookings   = bookings.length;
  const totalDevis      = bookings.filter((b) => b.paiement === "En attente").length;
  const totalConvertis  = bookings.filter((b) => b.paiement === "Avance" || b.paiement === "Payé").length;
  const totalNonPayes   = bookings.filter((b) => b.paiement === "Non payé").length;
  // Taux de conversion : confirmés / (confirmés + non payés + en attente)
  const baseConversion  = totalConvertis + totalNonPayes + totalDevis;
  const tauxConversion  = baseConversion > 0 ? Math.round((totalConvertis / baseConversion) * 100) : 0;
  // Valeur perdue : réservations "Non payé" × prix moyen
  const avgPrix         = totalBookings > 0 ? bookings.reduce((s, b) => s + b.prix, 0) / totalBookings : 0;
  const valeurPerdue    = totalNonPayes * avgPrix;
  // Délai moyen de conversion : non calculable sans historique de changement de statut,
  // on affiche donc le nombre de jours restants avant l'événement pour les devis en cours.
  const devisEnCours = bookings
    .filter((b) => b.paiement === "En attente")
    .map((b) => {
      const jours = Math.ceil((new Date(b.date) - new Date()) / (1000 * 60 * 60 * 24));
      return { client: b.client, date: b.date, jours };
    })
    .filter((b) => b.jours >= 0)
    .sort((a, b) => a.jours - b.jours);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-4">📈 Revenus par Mois</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {Object.entries(monthlyRevenue).sort((a, b) => b[0].localeCompare(a[0])).map(([month, revenue]) => (
              <div key={month} className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-700">{getMonthName(parseInt(month.split("-")[1]))} {month.split("-")[0]}</span>
                <span className="font-semibold text-green-600">{formatCurrency(revenue)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-4">🗺️ Destinations Populaires</h4>
          <div className="space-y-2">
            {Object.entries(popularDestinations).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([city, count]) => (
              <div key={city} className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-700">{city}</span>
                <Badge variant="default">{count} fois</Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-4">💰 Revenus par Statut</h4>
          <div className="space-y-3">
            {Object.entries(revenueByStatus).map(([status, revenue]) => (
              <div key={status} className="flex justify-between items-center">
                <Badge variant={paiementVariant(status)}>{status}</Badge>
                <span className="font-semibold text-gray-900">{formatCurrency(revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Taux de conversion ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-4">🎯 Taux de Conversion Devis → Réservation</h4>
          {/* Barre de progression */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Confirmés ({totalConvertis})</span>
              <span className="font-bold text-gray-900">{tauxConversion}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${tauxConversion >= 70 ? "bg-green-500" : tauxConversion >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${tauxConversion}%` }}
              />
            </div>
          </div>
          {/* Détail */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{totalConvertis}</p>
              <p className="text-xs text-gray-500 mt-0.5">Confirmés (Avance + Payé)</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-500">{totalNonPayes}</p>
              <p className="text-xs text-gray-500 mt-0.5">Non payés (perdus)</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{totalDevis}</p>
              <p className="text-xs text-gray-500 mt-0.5">Devis en attente</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-rose-600">{formatCurrency(valeurPerdue)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Valeur estimée perdue</p>
            </div>
          </div>
        </div>

        {/* Devis urgents — événement proche */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-4">⏳ Devis en Attente — par urgence</h4>
          {devisEnCours.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun devis en attente avec date future</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {devisEnCours.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.client}</p>
                    <p className="text-xs text-gray-500">{d.date}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    d.jours <= 3  ? "bg-red-100 text-red-700" :
                    d.jours <= 7  ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    J-{d.jours}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── REAL TIME STATS ───────────────────────────────────────────────────────────

export default AdvancedStats;
