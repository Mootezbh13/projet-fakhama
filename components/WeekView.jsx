import { useState, useEffect } from "react";
import { timeToMinutes, getStartOfWeek, formatBookingItineraire } from "../lib/calculations";

const WeekView = ({ bookings, onDayClick, highlightDate }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    getStartOfWeek(highlightDate ? new Date(highlightDate) : new Date())
  );

  useEffect(() => {
    if (highlightDate) {
      const d = new Date(highlightDate);
      if (!isNaN(d)) setCurrentWeekStart(getStartOfWeek(d));
    }
  }, [highlightDate]);

  const navigateWeek = (direction) => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + direction * 7);
    setCurrentWeekStart(next);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getBookingsForDate = (d) =>
    bookings
      .filter((b) => {
        const bd = new Date(b.date);
        return (
          bd.getDate() === d.getDate() &&
          bd.getMonth() === d.getMonth() &&
          bd.getFullYear() === d.getFullYear()
        );
      })
      .sort((a, b) => timeToMinutes(a.heure) - timeToMinutes(b.heure));

  const isSameDay = (a, b) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  const today = new Date();
  const selectedDate = highlightDate ? new Date(highlightDate) : null;

  const weekLabel = `${weekDays[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${weekDays[6].toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">📅 Semaine du {weekLabel}</h3>
        <div className="flex space-x-2">
          <button onClick={() => navigateWeek(-1)} className="px-3 py-1 border rounded-md hover:bg-gray-50 text-gray-700">←</button>
          <button
            onClick={() => setCurrentWeekStart(getStartOfWeek(new Date()))}
            className="px-3 py-1 border rounded-md hover:bg-gray-50 text-gray-700 text-sm"
          >
            Aujourd'hui
          </button>
          <button onClick={() => navigateWeek(1)} className="px-3 py-1 border rounded-md hover:bg-gray-50 text-gray-700">→</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {weekDays.map((d, i) => {
          const dayBookings = getBookingsForDate(d);
          const isToday = isSameDay(d, today);
          const isSelected = selectedDate && isSameDay(d, selectedDate);
          return (
            <div
              key={i}
              className={`border rounded-lg p-2 min-h-40 flex flex-col ${
                isSelected
                  ? "bg-rose-100 border-2 border-rose-500 ring-2 ring-rose-300"
                  : isToday
                  ? "bg-amber-50 border-amber-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className={`text-xs font-semibold mb-1 flex items-center justify-between ${isToday ? "text-rose-600" : "text-gray-700"}`}>
                <span>{["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"][d.getDay()]} {d.getDate()}</span>
                {dayBookings.length > 0 && (
                  <span className="bg-rose-500 text-white rounded-full px-1.5 text-[10px] leading-4">{dayBookings.length}</span>
                )}
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {dayBookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => onDayClick && onDayClick(dayBookings)}
                    className="text-[11px] bg-white border border-rose-200 rounded px-1.5 py-1 cursor-pointer hover:bg-rose-50 shadow-sm"
                    title={b.client}
                  >
                    <p className="font-semibold text-gray-800 truncate">{b.heure} · {b.client}</p>
                    <p className="text-gray-500 truncate">
                      {formatBookingItineraire(b)}
                    </p>
                  </div>
                ))}
                {dayBookings.length === 0 && (
                  <p className="text-[11px] text-gray-300 italic mt-2 text-center">Libre</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── CALENDAR VIEW ─────────────────────────────────────────────────────────────

export default WeekView;
