import { useState } from "react";
import { formatCurrency, getMonthName } from "../lib/calculations";

const AnnualSummaryChart = ({ bookings }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const years = [...new Set(bookings.map((b) => new Date(b.date).getFullYear()))].sort((a, b) => b - a);

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthBookings = bookings.filter((b) => {
      const d = new Date(b.date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === month;
    });
    const revenue = monthBookings.reduce((sum, b) => {
      if (b.paiement === "Payé") return sum + b.prix;
      if (b.paiement === "Avance") return sum + (b.avance || 0);
      return sum;
    }, 0);
    return {
      month: getMonthName(month).slice(0, 3),
      count: monthBookings.length,
      revenue,
      paid: monthBookings.filter((b) => b.paiement === "Payé").length,
      pending: monthBookings.filter((b) => b.paiement !== "Payé").length,
    };
  });

  const maxCount = Math.max(...monthlyData.map((d) => d.count), 1);
  const maxRevenue = Math.max(...monthlyData.map((d) => d.revenue), 1);
  const totalBookings = monthlyData.reduce((s, d) => s + d.count, 0);
  const totalRevenue = monthlyData.reduce((s, d) => s + d.revenue, 0);
  const bestMonth = monthlyData.reduce((best, d) => (d.count > best.count ? d : best), monthlyData[0]);

  const [hoveredMonth, setHoveredMonth] = useState(null);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">📊 Récapitulatif Annuel</h3>
          <p className="text-sm text-gray-500">Réservations et revenus mois par mois</p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
        >
          {years.length === 0
            ? <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            : years.map((y) => <option key={y} value={y}>{y}</option>)
          }
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-rose-50 rounded-lg p-3 text-center border border-rose-100">
          <p className="text-2xl font-bold text-rose-600">{totalBookings}</p>
          <p className="text-xs text-rose-700 mt-1">Réservations</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
          <p className="text-lg font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-green-700 mt-1">Revenus encaissés</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
          <p className="text-2xl font-bold text-amber-600">{bestMonth.month}</p>
          <p className="text-xs text-amber-700 mt-1">Meilleur mois ({bestMonth.count})</p>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-end gap-1.5 h-40">
          {monthlyData.map((d, i) => {
            const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
            const isHovered = hoveredMonth === i;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
                onMouseEnter={() => setHoveredMonth(i)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {isHovered && d.count > 0 && (
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10 pointer-events-none shadow-lg">
                    <div className="font-bold">{d.month}</div>
                    <div>{d.count} réservation(s)</div>
                    <div>{formatCurrency(d.revenue)}</div>
                  </div>
                )}
                {d.count > 0 && (
                  <span className="text-xs font-bold text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.count}
                  </span>
                )}
                <div className="w-full relative flex flex-col justify-end" style={{ height: "120px" }}>
                  <div
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      d.count === 0
                        ? "bg-gray-100"
                        : isHovered
                        ? "bg-rose-500"
                        : "bg-gradient-to-t from-rose-600 to-rose-400"
                    }`}
                    style={{ height: `${Math.max(heightPct, d.count > 0 ? 4 : 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5 mt-1">
          {monthlyData.map((d, i) => (
            <div key={i} className="flex-1 text-center text-xs text-gray-500">{d.month}</div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2 font-medium">Revenus encaissés par mois</p>
        <div className="flex items-end gap-1.5 h-10">
          {monthlyData.map((d, i) => {
            const heightPct = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col justify-end h-full">
                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    d.revenue === 0 ? "bg-gray-100" : "bg-gradient-to-t from-green-500 to-green-300"
                  }`}
                  style={{ height: `${Math.max(heightPct, d.revenue > 0 ? 8 : 2)}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {totalBookings === 0 && (
        <div className="text-center text-gray-400 text-sm mt-4 py-4">
          Aucune réservation pour {selectedYear}
        </div>
      )}
    </div>
  );
};

// ── RÉSERVATIONS VS OBJECTIF (nouveau) ──────────────────────────────────────────

export default AnnualSummaryChart;
