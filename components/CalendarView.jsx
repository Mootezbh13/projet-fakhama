import { useState, useEffect } from "react";
import WeekView from "./WeekView";

const CalendarView = ({ bookings, onDayClick, highlightDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState("mois"); // "mois" | "semaine"

  useEffect(() => {
    if (highlightDate) {
      const d = new Date(highlightDate);
      if (!isNaN(d)) {
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  }, [highlightDate]);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const getBookingsForDay = (day) => bookings.filter((booking) => {
    const bookingDate = new Date(booking.date);
    return bookingDate.getDate() === day &&
      bookingDate.getMonth() === currentMonth.getMonth() &&
      bookingDate.getFullYear() === currentMonth.getFullYear();
  });

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const selectedDay = (() => {
    if (!highlightDate) return null;
    const d = new Date(highlightDate);
    if (isNaN(d)) return null;
    if (d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear()) {
      return d.getDate();
    }
    return null;
  })();

  const ViewToggle = () => (
    <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
      <button
        onClick={() => setViewMode("mois")}
        className={`px-3 py-1 rounded-md font-medium transition-all ${viewMode === "mois" ? "bg-white shadow-sm text-rose-600" : "text-gray-500"}`}
      >
        Mois
      </button>
      <button
        onClick={() => setViewMode("semaine")}
        className={`px-3 py-1 rounded-md font-medium transition-all ${viewMode === "semaine" ? "bg-white shadow-sm text-rose-600" : "text-gray-500"}`}
      >
        Semaine
      </button>
    </div>
  );

  if (viewMode === "semaine") {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <ViewToggle />
        </div>
        <WeekView bookings={bookings} onDayClick={onDayClick} highlightDate={highlightDate} />
      </div>
    );
  }

  const days = [];
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="min-h-20"></div>);

  for (let day = 1; day <= daysInMonth; day++) {
    const dayBookings = getBookingsForDay(day);
    const isToday =
      new Date().getDate() === day &&
      new Date().getMonth() === currentMonth.getMonth() &&
      new Date().getFullYear() === currentMonth.getFullYear();
    const isSelected = selectedDay === day;
    const hasBookings = dayBookings.length > 0;

    let cellClass = "";
    if (isSelected) {
      cellClass = "bg-rose-100 border-2 border-rose-500 shadow-md ring-2 ring-rose-300";
    } else if (hasBookings && highlightDate) {
      cellClass = "bg-orange-100 border-2 border-orange-400 hover:bg-orange-200 hover:shadow-md cursor-pointer";
    } else if (hasBookings) {
      cellClass = "bg-rose-50 border-rose-200 hover:bg-rose-100 hover:shadow-md cursor-pointer";
    } else if (isToday) {
      cellClass = "bg-amber-50 border-amber-200";
    } else {
      cellClass = "bg-gray-50 hover:bg-gray-100";
    }

    days.push(
      <div
        key={day}
        onClick={() => hasBookings && onDayClick(dayBookings)}
        className={`border rounded-lg p-2 min-h-20 transition-all ${cellClass}`}
      >
        <div className={`text-sm font-medium flex items-center gap-1 ${isToday ? "text-rose-600" : isSelected ? "text-rose-700" : "text-gray-900"}`}>
          {day}
          {isToday && <span className="text-xs">(Auj.)</span>}
          {hasBookings && highlightDate && !isSelected && (
            <span className="ml-auto text-xs bg-orange-500 text-white rounded-full px-1.5 py-0.5 font-bold leading-none">
              {dayBookings.length}
            </span>
          )}
        </div>
        {dayBookings.slice(0, 2).map((booking) => (
          <div key={booking.id} className={`text-xs rounded px-1 mt-1 truncate shadow-sm ${hasBookings && highlightDate && !isSelected ? "bg-orange-50 border border-orange-200 text-orange-800" : "bg-white"}`}>
            {booking.client} - {booking.heure}
          </div>
        ))}
        {dayBookings.length > 2 && (
          <div className="text-xs text-gray-500 mt-1 text-center">+{dayBookings.length - 2} autres</div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">📅 Calendrier des Réservations</h3>
          {highlightDate && (
            <p className="text-xs text-orange-600 mt-0.5 font-medium">
              🟠 Jours avec réservation existante — vérifiez les disponibilités
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle />
          <div className="flex space-x-2">
            <button onClick={() => navigateMonth(-1)} className="px-3 py-1 border rounded-md hover:bg-gray-50 text-gray-700">←</button>
            <span className="px-4 py-1 font-medium text-gray-900">{currentMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
            <button onClick={() => navigateMonth(1)} className="px-3 py-1 border rounded-md hover:bg-gray-50 text-gray-700">→</button>
          </div>
        </div>
      </div>

      {highlightDate && (
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400 border border-orange-500 inline-block"></span> Jour déjà réservé</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-100 border-2 border-rose-500 inline-block"></span> Date sélectionnée</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block"></span> Disponible</span>
        </div>
      )}

      <div className="grid grid-cols-7 gap-2">
        {["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"].map((day) => (
          <div key={day} className="text-center font-semibold text-sm py-2 bg-gray-100 rounded text-gray-700">{day}</div>
        ))}
        {days}
      </div>
    </div>
  );
};

// ── ADVANCED STATS ─────────────────────────────────────────────────────────────

export default CalendarView;
