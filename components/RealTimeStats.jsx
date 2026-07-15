import { useState, useEffect } from "react";
import { timeToMinutes, formatCurrency } from "../lib/calculations";

const RealTimeStats = ({ bookings }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const today = now.toISOString().split("T")[0];
  const todayBookings = bookings.filter((b) => b.date === today);
  const currentBookings = todayBookings.filter((b) => {
    const bookingTime = timeToMinutes(b.heure);
    const currentTime = now.getHours() * 60 + now.getMinutes();
    return Math.abs(bookingTime - currentTime) <= 60;
  });
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">⏰ Aujourd'hui</h3>
        <span className="text-sm text-gray-500">{now.toLocaleTimeString("fr-FR")}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-rose-600">{todayBookings.length}</p>
          <p className="text-sm text-gray-600">Réservations</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{formatCurrency(todayBookings.reduce((sum, b) => sum + b.prix, 0))}</p>
          <p className="text-sm text-gray-600">Chiffre du jour</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-600">{currentBookings.length}</p>
          <p className="text-sm text-gray-600">En cours</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">{todayBookings.filter((b) => b.paiement === "Payé").length}</p>
          <p className="text-sm text-gray-600">Payées</p>
        </div>
      </div>
      {currentBookings.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-semibold text-amber-800 mb-2">🚗 Réservations imminentes :</h4>
          {currentBookings.map((booking) => (
            <div key={booking.id} className="text-sm text-amber-700">
              • {booking.client} à {booking.heure} - {booking.trajetStops ? ["Tunis", ...booking.trajetStops].join(" → ") : booking.trajet}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default RealTimeStats;
