import { formatCurrency } from "../lib/calculations";

const RevenueByCity = ({ bookings }) => {
  const revenueByCity = bookings.reduce((acc, b) => {
    const destinations = b.trajetStops && b.trajetStops.length ? b.trajetStops : [b.trajet || "Tunis"];
    const revenue = b.paiement === "Payé" ? b.prix : b.paiement === "Avance" ? (b.avance || 0) : 0;
    const share = revenue / destinations.length;
    destinations.forEach((city) => {
      acc[city] = (acc[city] || 0) + share;
    });
    return acc;
  }, {});

  const sorted = Object.entries(revenueByCity).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const totalRevenue = sorted.reduce((s, [, v]) => s + v, 0);
  const maxVal = Math.max(...sorted.map(([, v]) => v), 1);
  const colors = ["bg-rose-500", "bg-amber-500", "bg-teal-500", "bg-indigo-400", "bg-pink-400", "bg-gray-400"];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">🗺️ Revenus par Ville</h3>
        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
        <p className="text-xs text-gray-500">Total encaissé (top villes)</p>
      </div>

      {sorted.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">Aucune donnée pour le moment</p>
      ) : (
        <div className="space-y-3">
          {sorted.map(([city, value], i) => (
            <div key={city}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{city}</span>
                <span className="text-gray-500">{formatCurrency(value)}</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors[i % colors.length]} rounded-full transition-all`}
                  style={{ width: `${(value / maxVal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────

export default RevenueByCity;
