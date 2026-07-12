"use client";
// components/CalendarView.jsx
// Calendrier mensuel/hebdomadaire des réservations. Réutilisé dans le Dashboard
// et dans l'onglet Réservations.
import React, { useState, useEffect } from "react";

// ── Vue Semaine ───────────────────────────────────────────────────────────────
function WeekView({ bookings, onDayClick, highlightDate }) {
  const getWeekDays = (referenceDate) => {
    const date = referenceDate ? new Date(referenceDate) : new Date();
    if (isNaN(date)) return [];
    const day = date.getDay();
    const diff = date.getDate() - day;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(date);
      d.setDate(diff + i);
      return d;
    });
  };

  const weekDays = getWeekDays(highlightDate);
  const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  const getBookingsForDate = (date) =>
    bookings.filter((b) => {
      const bd = new Date(b.date);
      return bd.getDate() === date.getDate() &&
        bd.getMonth() === date.getMonth() &&
        bd.getFullYear() === date.getFullYear();
    });

  const todayStr = new Date().toDateString();

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-base font-semibold text-gray-900 mb-3">📅 Semaine courante</h3>
      <div className="grid grid-cols-7 gap-1">
        {dayLabels.map((l) => (
          <div key={l} className="text-center text-xs font-semibold py-1 bg-gray-100 rounded text-gray-600">{l}</div>
        ))}
        {weekDays.map((date, i) => {
          const dayBookings = getBookingsForDate(date);
          const isToday = date.toDateString() === todayStr;
          const isHighlighted = highlightDate && new Date(highlightDate).toDateString() === date.toDateString();
          return (
            <div
              key={i}
              onClick={() => dayBookings.length > 0 && onDayClick(dayBookings)}
              className={`border rounded-lg p-1 min-h-16 text-center cursor-pointer transition-all ${
                isHighlighted ? "bg-rose-100 border-2 border-rose-500" :
                isToday       ? "bg-amber-50 border-amber-200" :
                dayBookings.length > 0 ? "bg-rose-50 border-rose-200 hover:bg-rose-100" :
                "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <p className={`text-xs font-medium ${isToday ? "text-rose-600" : "text-gray-700"}`}>
                {date.getDate()}
              </p>
              {dayBookings.map((b) => (
                <div key={b.id} className="text-xs bg-white rounded px-0.5 mt-0.5 truncate text-gray-700 border border-gray-100">
                  {b.client.split(" ")[0]}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vue Mois ──────────────────────────────────────────────────────────────────
export default function CalendarView({ bookings, onDayClick, highlightDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState("mois");

  useEffect(() => {
    if (highlightDate) {
      const d = new Date(highlightDate);
      if (!isNaN(d)) setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [highlightDate]);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const getBookingsForDay = (day) =>
    bookings.filter((b) => {
      const d = new Date(b.date);
      return d.getDate() === day && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    });

  const navigateMonth = (dir) => {
    const m = new Date(currentMonth);
    m.setMonth(currentMonth.getMonth() + dir);
    setCurrentMonth(m);
  };

  const selectedDay = (() => {
    if (!highlightDate) return null;
    const d = new Date(highlightDate);
    if (isNaN(d)) return null;
    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear()
      ? d.getDate() : null;
  })();

  const ViewToggle = () => (
    <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
      {["mois", "semaine"].map((m) => (
        <button
          key={m}
          onClick={() => setViewMode(m)}
          className={`px-3 py-1 rounded-md font-medium capitalize transition-all ${viewMode === m ? "bg-white shadow-sm text-rose-600" : "text-gray-500"}`}
        >
          {m.charAt(0).toUpperCase() + m.slice(1)}
        </button>
      ))}
    </div>
  );

  if (viewMode === "semaine") {
    return (
      <div className="space-y-3">
        <div className="flex justify-end"><ViewToggle /></div>
        <WeekView bookings={bookings} onDayClick={onDayClick} highlightDate={highlightDate} />
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay   = getFirstDayOfMonth(currentMonth);
  const cells = [];

  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} className="min-h-20" />);

  for (let day = 1; day <= daysInMonth; day++) {
    const dayBookings = getBookingsForDay(day);
    const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();
    const isSelected = selectedDay === day;
    const hasBookings = dayBookings.length > 0;

    const cellClass = isSelected
      ? "bg-rose-100 border-2 border-rose-500 shadow-md ring-2 ring-rose-300"
      : hasBookings && highlightDate
        ? "bg-orange-100 border-2 border-orange-400 hover:bg-orange-200 cursor-pointer"
        : hasBookings
          ? "bg-rose-50 border-rose-200 hover:bg-rose-100 cursor-pointer"
          : isToday
            ? "bg-amber-50 border-amber-200"
            : "bg-gray-50 hover:bg-gray-100";

    cells.push(
      <div
        key={day}
        onClick={() => hasBookings && onDayClick(dayBookings)}
        className={`border rounded-lg p-2 min-h-20 transition-all ${cellClass}`}
      >
        <div className={`text-sm font-medium flex items-center gap-1 ${isToday ? "text-rose-600" : isSelected ? "text-rose-700" : "text-gray-900"}`}>
          {day}
          {isToday && <span className="text-xs">(Auj.)</span>}
          {hasBookings && highlightDate && !isSelected && (
            <span className="ml-auto text-xs bg-orange-500 text-white rounded-full px-1.5 py-0.5 font-bold leading-none">{dayBookings.length}</span>
          )}
        </div>
        {dayBookings.slice(0, 2).map((b) => (
          <div key={b.id} className={`text-xs rounded px-1 mt-1 truncate shadow-sm ${hasBookings && highlightDate && !isSelected ? "bg-orange-50 border border-orange-200 text-orange-800" : "bg-white"}`}>
            {b.client} - {b.heure}
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
            <p className="text-xs text-orange-600 mt-0.5 font-medium">🟠 Jours avec réservation existante — vérifiez les disponibilités</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle />
          <div className="flex space-x-2">
            <button onClick={() => navigateMonth(-1)} className="px-3 py-1 border rounded-md hover:bg-gray-50 text-gray-700">←</button>
            <span className="px-4 py-1 font-medium text-gray-900">
              {currentMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </span>
            <button onClick={() => navigateMonth(1)} className="px-3 py-1 border rounded-md hover:bg-gray-50 text-gray-700">→</button>
          </div>
        </div>
      </div>

      {highlightDate && (
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400 border border-orange-500 inline-block" /> Jour déjà réservé</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-100 border-2 border-rose-500 inline-block" /> Date sélectionnée</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block" /> Disponible</span>
        </div>
      )}

      <div className="grid grid-cols-7 gap-2">
        {["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"].map((d) => (
          <div key={d} className="text-center font-semibold text-sm py-2 bg-gray-100 rounded text-gray-700">{d}</div>
        ))}
        {cells}
      </div>
    </div>
  );
}
