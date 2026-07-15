const KpiCard = ({ label, value, delta, deltaLabel, progress, color = "rose" }) => {
  const colors = {
    rose: "bg-rose-500",
    green: "bg-green-500",
    red: "bg-red-400",
    amber: "bg-amber-500",
  };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {delta && (
          <span className={`text-xs font-medium ${delta.startsWith("-") ? "text-red-500" : "text-green-600"}`}>
            {delta}
          </span>
        )}
      </div>
      {deltaLabel && <p className="text-xs text-gray-400 mt-1">{deltaLabel}</p>}
      {progress != null && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
          <div className={`h-full ${colors[color]} rounded-full`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </div>
  );
};

// ── NEW: InsuranceExpiryWarning Component ──────────────────────────────────────

export default KpiCard;
