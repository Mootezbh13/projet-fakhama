import { useState } from "react";
import { RESERVATION_TARGET_MENSUEL } from "../lib/constants";
import { getMonthName } from "../lib/calculations";

const ReservationsVsTarget = ({ bookings, target = RESERVATION_TARGET_MENSUEL }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const years = [...new Set(bookings.map((b) => new Date(b.date).getFullYear()))].sort((a, b) => b - a);

  const monthlyCounts = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const count = bookings.filter((b) => {
      const d = new Date(b.date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === month;
    }).length;
    return { month: getMonthName(month).slice(0, 3), count };
  });

  const totalReal = monthlyCounts.reduce((s, m) => s + m.count, 0);
  const totalTarget = target * 12;
  const maxVal = Math.max(...monthlyCounts.map((m) => m.count), target, 1);

  const width = 700;
  const height = 180;
  const padding = 20;
  const stepX = (width - padding * 2) / 11;

  const coords = monthlyCounts.map((m, i) => ({
    x: padding + i * stepX,
    y: height - padding - (m.count / maxVal) * (height - padding * 2),
  }));
  const pointsReal = coords.map((p) => `${p.x},${p.y}`).join(" ");
  const targetY = height - padding - (target / maxVal) * (height - padding * 2);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">📈 Réservations vs Objectif</h3>
          <p className="text-sm text-gray-500">Objectif : {target} réservations / mois</p>
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

      <div className="flex gap-6 mb-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">{totalReal}</p>
          <p className="text-xs text-gray-500">Réservations réelles</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-400">{totalTarget}</p>
          <p className="text-xs text-gray-500">Objectif annuel</p>
        </div>
        <div>
          <p className={`text-2xl font-bold ${totalReal >= totalTarget ? "text-green-600" : "text-amber-600"}`}>
            {totalTarget > 0 ? Math.round((totalReal / totalTarget) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-500">Taux d'atteinte</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        <line x1={padding} y1={targetY} x2={width - padding} y2={targetY} stroke="#d1d5db" strokeWidth="2" strokeDasharray="6 5" />
        <defs>
          <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e11d48" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`${padding},${height - padding} ${pointsReal} ${width - padding},${height - padding}`}
          fill="url(#roseGradient)"
        />
        <polyline points={pointsReal} fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#e11d48" />)}
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
        {monthlyCounts.map((m, i) => <span key={i}>{m.month}</span>)}
      </div>
    </div>
  );
};

// ── REVENUS PAR VILLE (nouveau) ──────────────────────────────────────────────────

export default ReservationsVsTarget;
