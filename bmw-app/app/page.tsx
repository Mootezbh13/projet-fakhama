"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const CITY_NAMES = ["Tunis", "Sousse", "Monastir", "Sfax", "Mahdia", "Bizerte", "Nabeul", "Beja", "Zaghouan"];
const PRIX_BASE_EVENEMENT = 350;
const PRIX_PAR_KM_NORMAL = 2.1;
const PRIX_PAR_KM_REDUIT = 1.7;
const SUPPLEMENT_RETOUR = 100;

const DECORATION_OPTIONS = [
  { value: "rubans", label: "Rubans traditionnels" },
  { value: "fleurs", label: "Fleurs fraîches" },
  { value: "mixte", label: "Mixte rubans et fleurs" }
];

const maintenancePlan = [
  { kilometrage: 10000, type: "Vidange", description: "Vidange d'huile moteur, Remplacement filtre à air et filtre à huile" },
  { kilometrage: 20000, type: "Filtres", description: "Filtre d'habitacle" },
  { kilometrage: 80000, type: "Distribution", description: "Contrôle courroie de distribution" },
  { kilometrage: 100000, type: "Révision", description: "Révision générale complète" },
];

const cityCoords = {
  Tunis: [36.8065, 10.1815],
  Sousse: [35.8256, 10.6084],
  Monastir: [35.7771, 10.8262],
  Sfax: [34.7406, 10.7603],
  Mahdia: [35.5047, 11.0622],
  Bizerte: [37.2746, 9.8739],
  Nabeul: [36.4333, 10.7333],
  Beja: [36.7256, 9.1817],
  Zaghouan: [36.4028, 10.1428],
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const calculateDistance = (from, to) => {
  if (from === to) return 0;
  const [lat1, lon1] = cityCoords[from] || [0, 0];
  const [lat2, lon2] = cityCoords[to] || [0, 0];
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const calculateItineraryDistance = (stops) => {
  if (!stops || stops.length === 0) return 0;
  const fullRoute = ["Tunis", ...stops];
  let total = 0;
  for (let i = 0; i < fullRoute.length - 1; i++) {
    total += calculateDistance(fullRoute[i], fullRoute[i + 1]);
  }
  return total;
};

const arrondirPrix = (prix) => Math.ceil(prix / 10) * 10;

const formatCurrency = (amount) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(amount);

const getMonthName = (month) => {
  const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  return months[month - 1];
};

const calculateItineraryPrice = (stops, retour) => {
  const distance = calculateItineraryDistance(stops);
  let prix = PRIX_BASE_EVENEMENT;
  if (distance > 0) {
    if (stops.length > 1) {
      prix += distance * 2;
    } else {
      prix += distance > 200 ? distance * PRIX_PAR_KM_REDUIT : distance * PRIX_PAR_KM_NORMAL;
    }
  }
  if (retour) prix += SUPPLEMENT_RETOUR;
  return { distance, prix: arrondirPrix(prix) };
};

// ── SMALL UI COMPONENTS ───────────────────────────────────────────────────────
const Badge = ({ children, variant = "default" }) => {
  const variants = {
    default: "bg-blue-100 text-blue-800",
    secondary: "bg-gray-100 text-gray-800",
    destructive: "bg-red-100 text-red-800",
    outline: "border border-gray-300 text-gray-700",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${variants[variant]}`}>
      {children}
    </span>
  );
};

const Notification = ({ message, type = "info", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);
  const variants = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
  };
  return (
    <div className={`fixed top-4 right-4 z-50 min-w-80 ${variants[type]} border rounded-lg p-4 shadow-lg`}>
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium">{message}</p>
        <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600">✕</button>
      </div>
    </div>
  );
};

// ── NEW: InsuranceExpiryWarning Component ──────────────────────────────────────
const InsuranceExpiryWarning = ({ assurances }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiringSoon = assurances
    .map(a => {
      const expiryDate = new Date(a.dateFin);
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      return { ...a, daysUntilExpiry };
    })
    .filter(a => a.daysUntilExpiry <= 30 && a.daysUntilExpiry >= 0)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  if (expiringSoon.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {expiringSoon.map(a => (
        <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium shadow-sm bg-yellow-50 border-yellow-300 text-yellow-800">
          <span className="text-xl">⚠️</span>
          <span className="flex-1">
            Assurance {a.compagnie} expire le {a.dateFin} 
            {a.daysUntilExpiry === 0 ? " (AUJOURD'HUI)" : ` (J-${a.daysUntilExpiry})`}
          </span>
          <Badge variant="warning">Expire bientôt</Badge>
        </div>
      ))}
    </div>
  );
};

const UpcomingEventReminders = ({ bookings }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = bookings
    .map((b) => {
      const eventDate = new Date(b.date);
      eventDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      return { ...b, daysLeft };
    })
    .filter((b) => b.daysLeft >= 0 && b.daysLeft <= 10)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (upcoming.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {upcoming.map((b) => {
        const isUrgent = b.daysLeft <= 3;
        const itineraire = b.trajetStops
          ? ["Tunis", ...b.trajetStops].join(" → ")
          : b.trajet || "Tunis";
        return (
          <div
            key={b.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium shadow-sm ${
              b.daysLeft === 0
                ? "bg-red-100 border-red-400 text-red-900"
                : isUrgent
                ? "bg-red-50 border-red-300 text-red-800"
                : "bg-amber-50 border-amber-300 text-amber-800"
            }`}
          >
            <span className="text-xl">
              {b.daysLeft === 0 ? "🚨" : isUrgent ? "⚠️" : "🔔"}
            </span>
            <span className="flex-1">
              {b.daysLeft === 0
                ? `AUJOURD'HUI — ${b.client} à ${b.heure} · ${itineraire}`
                : `${b.client} · ${b.date} à ${b.heure} · ${itineraire}`}
            </span>
            <Badge
              variant={
                b.daysLeft === 0
                  ? "destructive"
                  : isUrgent
                  ? "destructive"
                  : "warning"
              }
            >
              {b.daysLeft === 0 ? "AUJOURD'HUI" : `J-${b.daysLeft}`}
            </Badge>
          </div>
        );
      })}
    </div>
  );
};

const AllReminders = ({ bookings, assurances }) => (
  <>
    <UpcomingEventReminders bookings={bookings} />
    <InsuranceExpiryWarning assurances={assurances} />
  </>
);

const WhatsAppButton = ({ booking }) => {
  const handleWhatsApp = () => {
    const decorationLabel =
      DECORATION_OPTIONS.find((d) => d.value === booking.decoration)?.label || "Rubans traditionnels";

    const message = `
🌸 *Fakhama Weddings & Events* 🌸
_BMW Série 3 320i 2026_

✅ *Confirmation de Réservation*

👤 *Client :* ${booking.client}
📅 *Date :* ${booking.date}
⏰ *Heure :* ${booking.heure}
📍 *Itinéraire :* ${booking.trajetStops ? ["Tunis", ...booking.trajetStops].join(" → ") : booking.trajet}
🛣️ *Distance totale :* ${booking.distance} km
🔄 *Service retour :* ${booking.retour ? "Oui" : "Non"}

💍 *Détails évenement :*
• Cérémonie : ${booking.lieuCeremonie || "À confirmer"}
• Réception : ${booking.lieuReception || "À confirmer"}
• Décoration : ${decorationLabel}

💰 *Détail financier :*
• Prix total : ${formatCurrency(booking.prix)}
• Avance versée : ${formatCurrency(booking.avance || 0)}
• Reste à payer : ${formatCurrency(booking.reste || 0)}
• Statut : ${booking.paiement}

📞 *Contact :* +216 93 993 619
_Merci pour votre confiance ✨_
`.trim();

    const phone = booking.phone ? booking.phone.replace(/\D/g, "") : "";
    const url = phone
      ? `https://wa.me/${phone.startsWith("216") ? phone : "216" + phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <button
      onClick={handleWhatsApp}
      className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs flex items-center gap-1"
      title="Envoyer via WhatsApp"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      WhatsApp
    </button>
  );
};

const MultiStopSelector = ({ stops, onChange }) => {
  const addStop = () => {
    if (stops.length < 4) onChange([...stops, "Tunis"]);
  };
  const removeStop = (idx) => onChange(stops.filter((_, i) => i !== idx));
  const updateStop = (idx, val) => onChange(stops.map((s, i) => (i === idx ? val : s)));

  const fullRoute = ["Tunis (départ)", ...stops];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        🗺️ Itinéraire des arrêts
        <span className="text-xs text-gray-400 ml-2">(départ toujours depuis Tunis)</span>
      </label>

      <div className="flex flex-wrap items-center gap-1 text-xs text-gray-600 bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">
        {fullRoute.map((city, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className={`font-semibold ${i === 0 ? "text-rose-600" : "text-gray-800"}`}>
              {i === 0 ? "📍 " : ""}{city}
            </span>
            {i < fullRoute.length - 1 && <span className="text-rose-300">→</span>}
          </span>
        ))}
        {stops.length > 0 && (
          <>
            <span className="text-rose-300">→</span>
            <span className="text-gray-400 italic">fin</span>
          </>
        )}
      </div>

      <div className="space-y-2">
        {stops.map((stop, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16 shrink-0">Arrêt {idx + 1}</span>
            <select
              value={stop}
              onChange={(e) => updateStop(idx, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900 bg-white text-sm"
            >
              {CITY_NAMES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            {idx > 0 && (
              <button
                onClick={() => removeStop(idx)}
                className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                title="Supprimer cet arrêt"
              >
                ×
              </button>
            )}
            {idx === 0 && <span className="w-5" />}
          </div>
        ))}
      </div>

      {stops.length < 4 && (
        <button
          onClick={addStop}
          className="text-sm text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium"
        >
          <span className="text-lg leading-none">+</span> Ajouter un arrêt
        </button>
      )}
    </div>
  );
};

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
    <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
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

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const LoginForm = ({ onLogin, error }) => {
  const [password, setPassword] = useState("");
  const handleSubmit = (e) => { e.preventDefault(); onLogin(password); };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-amber-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <div className="flex flex-col items-center space-y-3 mb-8">
          <div className="h-16 w-16 bg-gradient-to-r from-rose-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold text-white">FWE</span>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900">Fakhama Weddings & Events</h1>
          <p className="text-sm text-gray-500 text-center">BMW Série 3 320i 2026</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mot de passe</label>
          <input id="password" type="password" placeholder="Entrez le mot de passe" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900 placeholder-gray-400" required />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-gradient-to-r from-rose-600 to-amber-600 text-white py-2 px-4 rounded-md hover:from-rose-700 hover:to-amber-700 transition-all">
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
};

// ── PRICE SIMULATION ──────────────────────────────────────────────────────────
const PriceSimulation = () => {
  const [stops, setStops] = useState(["Tunis"]);
  const [retour, setRetour] = useState(false);

  const { distance, prix } = calculateItineraryPrice(stops, retour);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-rose-100">
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 px-6 py-4 border-b border-rose-200">
          <h2 className="text-xl font-bold text-rose-800">💰 Simulation de Prix Evenement</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <MultiStopSelector stops={stops} onChange={setStops} />
              <div className="flex items-center space-x-3">
                <input type="checkbox" id="retour-simulation" checked={retour}
                  onChange={(e) => setRetour(e.target.checked)}
                  className="w-4 h-4 text-rose-600 border-gray-300 rounded" />
                <label htmlFor="retour-simulation" className="text-gray-700 cursor-pointer">🔄 Service avec retour (+100 DT)</label>
              </div>
              <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
                <h3 className="font-semibold text-rose-800 mb-2">ℹ️ Prestations incluses :</h3>
                <ul className="text-sm text-rose-700 space-y-1">
                  <li>• BMW Série 3 320i 2026</li>
                  <li>• Chauffeur professionnel</li>
                  <li>• Décoration nuptiale luxe</li>
                  <li>• Service durant la cérémonie</li>
                  <li>• Rafraîchissements offerts</li>
                </ul>
              </div>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-xl p-6 border border-rose-200">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-rose-600 mb-2">{formatCurrency(prix)}</div>
                <p className="text-rose-700 font-medium">Forfait Evenement Prestige</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-rose-200">
                  <span className="text-gray-600">Distance totale estimée :</span>
                  <span className="font-semibold text-gray-900">{distance} km</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-rose-200">
                  <span className="text-gray-600">Tarif km :</span>
                  <span className="font-semibold text-gray-900">
                    {stops.length > 1
                      ? "1,000 DT/km (multi-arrêts)"
                      : distance > 200
                      ? "1,700 DT/km (> 200 km)"
                      : "2,100 DT/km (≤ 200 km)"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-rose-200">
                  <span className="text-gray-600">Itinéraire :</span>
                  <span className="font-semibold text-gray-900 text-right max-w-32 truncate">
                    {["Tunis", ...stops].join(" → ")}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-rose-200">
                  <span className="text-gray-600">Nb. arrêts :</span>
                  <span className="font-semibold text-gray-900">{stops.length}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Service retour :</span>
                  <span className="font-semibold text-gray-900">{retour ? "Oui (+100 DT)" : "Non"}</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-rose-100 rounded-lg border border-rose-200">
                <p className="text-rose-700 text-sm text-center">💡 Prix indicatif - Contactez-nous pour confirmation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── CALENDAR VIEW ─────────────────────────────────────────────────────────────
const CalendarView = ({ bookings, onDayClick, highlightDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">📅 Calendrier des Réservations</h3>
          {highlightDate && (
            <p className="text-xs text-orange-600 mt-0.5 font-medium">
              🟠 Jours avec réservation existante — vérifiez les disponibilités
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          <button onClick={() => navigateMonth(-1)} className="px-3 py-1 border rounded-md hover:bg-gray-50 text-gray-700">←</button>
          <span className="px-4 py-1 font-medium text-gray-900">{currentMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
          <button onClick={() => navigateMonth(1)} className="px-3 py-1 border rounded-md hover:bg-gray-50 text-gray-700">→</button>
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
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
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
        <div className="bg-white p-6 rounded-lg shadow">
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
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-semibold text-gray-900 mb-4">💰 Revenus par Statut</h4>
          <div className="space-y-3">
            {Object.entries(revenueByStatus).map(([status, revenue]) => (
              <div key={status} className="flex justify-between items-center">
                <Badge variant={status === "Payé" ? "success" : status === "Avance" ? "secondary" : "destructive"}>{status}</Badge>
                <span className="font-semibold text-gray-900">{formatCurrency(revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── REAL TIME STATS ───────────────────────────────────────────────────────────
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
    <div className="bg-white p-6 rounded-lg shadow">
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
export default function CarRentalManagement() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [correctPassword] = useState("kchiefos1332");
  const [bookings, setBookings] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [assurances, setAssurances] = useState([]);
  const [vignettes, setVignettes] = useState([]);
  const [carburants, setCarburants] = useState([]);
  const [editBooking, setEditBooking] = useState(null);
  const [notification, setNotification] = useState(null);
  const [filter, setFilter] = useState({});
  const [activeTab, setActiveTab] = useState("simulation");
  const [selectedDayBookings, setSelectedDayBookings] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [draftBooking, setDraftBooking] = useState(null);
  const autoSaveTimer = useRef(null);

  const [newBookingStops, setNewBookingStops] = useState(["Tunis"]);
  const [editBookingStops, setEditBookingStops] = useState(["Tunis"]);

  const [newBooking, setNewBooking] = useState({
    client: "", phone: "", date: "", heure: "20:00",
    retour: false, paiement: "Non payé", avance: "",
    lieuCeremonie: "", lieuReception: "", decoration: "rubans", commentaires: ""
  });

  const [newMaintenance, setNewMaintenance] = useState({
    date: new Date().toISOString().split("T")[0], kilometrage: "", type: "", description: "", cout: ""
  });
  const [newAssurance, setNewAssurance] = useState({
    dateDebut: "", dateFin: "", compagnie: "", cout: "", numeroContrat: ""
  });
  const [newVignette, setNewVignette] = useState({
    annee: new Date().getFullYear(), cout: "", datePaiement: new Date().toISOString().split("T")[0]
  });
  const [newCarburant, setNewCarburant] = useState({
    date: new Date().toISOString().split("T")[0], quantite: "", prixLitre: "", kilometrage: "", station: ""
  });

  useEffect(() => {
    const savedBookings = localStorage.getItem("fakhama-bookings");
    const savedMaintenances = localStorage.getItem("fakhama-maintenances");
    const savedAssurances = localStorage.getItem("fakhama-assurances");
    const savedVignettes = localStorage.getItem("fakhama-vignettes");
    const savedCarburants = localStorage.getItem("fakhama-carburants");
    const savedDraft = localStorage.getItem("fakhama-draft");
    if (savedBookings) setBookings(JSON.parse(savedBookings));
    if (savedMaintenances) setMaintenances(JSON.parse(savedMaintenances));
    if (savedAssurances) setAssurances(JSON.parse(savedAssurances));
    if (savedVignettes) setVignettes(JSON.parse(savedVignettes));
    if (savedCarburants) setCarburants(JSON.parse(savedCarburants));
    if (savedDraft) setDraftBooking(JSON.parse(savedDraft));
  }, []);

  useEffect(() => { localStorage.setItem("fakhama-bookings", JSON.stringify(bookings)); }, [bookings]);
  useEffect(() => { localStorage.setItem("fakhama-maintenances", JSON.stringify(maintenances)); }, [maintenances]);
  useEffect(() => { localStorage.setItem("fakhama-assurances", JSON.stringify(assurances)); }, [assurances]);
  useEffect(() => { localStorage.setItem("fakhama-vignettes", JSON.stringify(vignettes)); }, [vignettes]);
  useEffect(() => { localStorage.setItem("fakhama-carburants", JSON.stringify(carburants)); }, [carburants]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (newBooking.client || newBooking.date || newBooking.lieuCeremonie) {
        localStorage.setItem("fakhama-draft", JSON.stringify({ ...newBooking, stops: newBookingStops }));
        showNotification("Brouillon sauvegardé automatiquement", "info");
      }
    }, 3000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [newBooking, newBookingStops]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setActiveTab("reservations");
        showNotification("Nouvelle réservation - Formulaire prêt", "success");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (editBooking) handleSaveEdit();
        else if (activeTab === "reservations") handleAddBooking();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editBooking, newBooking, newBookingStops, activeTab]);

  const showNotification = (message, type = "info") => setNotification({ message, type });

  const calculatePrice = useCallback((stops, retour) => {
    return calculateItineraryPrice(stops, retour);
  }, []);

  const calculateRest = (prix, avance, paiement) => {
    if (paiement === "Payé") return 0;
    if (paiement === "Non payé") return prix;
    return Math.max(0, prix - avance);
  };

  const validateField = (field, value) => {
    const errors = {};
    switch (field) {
      case "client":
        if (!value.trim()) errors.client = "Le nom du client est requis";
        else if (value.trim().length < 2) errors.client = "Minimum 2 caractères";
        break;
      case "date":
        if (!value) errors.date = "La date est requise";
        else {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate < today) errors.date = "La date ne peut pas être dans le passé";
        }
        break;
      case "heure":
        if (!value) errors.heure = "L'heure est requise";
        break;
      case "avance":
        if (value < 0) errors.avance = "L'avance ne peut pas être négative";
        if (value > 10000) errors.avance = "Avance trop élevée";
        break;
      case "phone":
        if (value && !/^[0-9+\s]{8,15}$/.test(value)) errors.phone = "Format téléphone invalide";
        break;
    }
    return errors;
  };

  const validateBookingComplete = (booking, stops) => {
    const errors = {};
    if (!booking.client.trim()) errors.client = "Le nom du client est requis";
    if (!booking.date) errors.date = "La date est requise";
    if (!booking.heure) errors.heure = "L'heure est requise";
    if (booking.avance < 0) errors.avance = "L'avance ne peut pas être négative";
    const isDuplicate = bookings.some(
      (b) => b.date === booking.date && b.heure === booking.heure && b.client !== booking.client
    );
    if (isDuplicate) errors.duplicate = "Cette date et heure est déjà réservée";
    return errors;
  };

  const handleFieldChange = (field, value) => {
    setNewBooking((prev) => ({ ...prev, [field]: value }));
    const errors = validateField(field, value);
    setValidationErrors((prev) => {
      const next = { ...prev, ...errors };
      if (!errors[field]) delete next[field];
      return next;
    });
  };

  const generateInvoiceEvenementPDF = (booking) => {
    const dateFacture = new Date().toLocaleDateString("fr-FR");
    const heureFacture = new Date().toLocaleTimeString("fr-FR");
    const decorationLabel = DECORATION_OPTIONS.find((d) => d.value === booking.decoration)?.label || "Rubans traditionnels";
    const itineraire = booking.trajetStops
      ? ["Tunis", ...booking.trajetStops].join(" → ")
      : booking.trajet || "Tunis";

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Facture Fakhama Weddings - ${booking.client}</title>
        <style>
          body { font-family: 'Times New Roman', serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .invoice-container { max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #be185d, #d97706); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; letter-spacing: 2px; }
          .header p { margin: 5px 0 0; opacity: 0.9; }
          .content { padding: 30px; }
          .title { text-align: center; font-size: 24px; color: #be185d; margin-bottom: 30px; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; }
          .info-section { margin-bottom: 20px; }
          .info-section h3 { color: #be185d; margin-bottom: 10px; border-left: 4px solid #d97706; padding-left: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          .info-item { padding: 8px; background: #f9fafb; border-radius: 5px; }
          .info-label { font-weight: bold; color: #374151; }
          .info-value { color: #111827; margin-top: 5px; }
          .price-section { background: linear-gradient(135deg, #fef2f2, #fffbeb); padding: 20px; border-radius: 10px; margin: 20px 0; }
          .price-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fca5a5; }
          .price-total { font-size: 20px; font-weight: bold; color: #be185d; margin-top: 10px; padding-top: 10px; border-top: 2px solid #be185d; display: flex; justify-content: space-between; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .terms { font-size: 11px; margin-top: 20px; padding: 10px; background: #fef3c7; border-radius: 5px; }
          .route-badge { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 8px 12px; font-weight: bold; color: #be185d; text-align: center; margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <h1>FAKHAMA WEDDINGS & EVENTS</h1>
            <p>Prestige & Excellence pour votre Evenement</p>
            <p>BMW Série 3 320i 2026</p>
          </div>
          <div class="content">
            <div class="title">FACTURE</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">N° Facture</div>
                <div class="info-value">FWE-${booking.id}-${new Date().getFullYear()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date d'émission</div>
                <div class="info-value">${dateFacture} à ${heureFacture}</div>
              </div>
            </div>
            <div class="info-section">
              <h3>👤 Informations Client</h3>
              <div class="info-grid">
                <div class="info-item"><div class="info-label">Client</div><div class="info-value">${booking.client}</div></div>
                <div class="info-item"><div class="info-label">Contact</div><div class="info-value">${booking.phone || "Non renseigné"}</div></div>
              </div>
            </div>
            <div class="info-section">
              <h3>💍 Détails de l'évenement</h3>
              <div class="info-grid">
                <div class="info-item"><div class="info-label">Date</div><div class="info-value">${booking.date}</div></div>
                <div class="info-item"><div class="info-label">Heure</div><div class="info-value">${booking.heure}</div></div>
                <div class="info-item"><div class="info-label">Distance totale</div><div class="info-value">${booking.distance} km</div></div>
                <div class="info-item"><div class="info-label">Service retour</div><div class="info-value">${booking.retour ? "Oui" : "Non"}</div></div>
                <div class="info-item"><div class="info-label">Lieu Cérémonie</div><div class="info-value">${booking.lieuCeremonie || "Non spécifié"}</div></div>
                <div class="info-item"><div class="info-label">Lieu Réception</div><div class="info-value">${booking.lieuReception || "Non spécifié"}</div></div>
                <div class="info-item"><div class="info-label">Décoration</div><div class="info-value">${decorationLabel}</div></div>
              </div>
              <div class="route-badge">🗺️ Itinéraire : ${itineraire}</div>
            </div>
            <div class="price-section">
              <h3 style="margin-top:0">💰 Détails Financiers</h3>
              <div class="price-row"><span>Forfait Evenement Complet</span><span>${formatCurrency(booking.prix)}</span></div>
              <div class="price-row"><span>Avance versée</span><span>${formatCurrency(booking.avance || 0)}</span></div>
              <div class="price-total"><span>Reste à payer</span><span>${formatCurrency(booking.reste || 0)}</span></div>
              <div style="margin-top:10px">
                <span style="font-weight:bold">Statut : </span>
                <span style="color:${booking.paiement === "Payé" ? "#10b981" : booking.paiement === "Avance" ? "#f59e0b" : "#ef4444"}">${booking.paiement}</span>
              </div>
            </div>
            <div class="terms">
              <strong>📋 Conditions Générales</strong><br/>
              • Annulation : Le montant de l'avance ne sera pas remboursé en cas d'annulation moins de 7 jours avant la date prévue.<br/>
              • Retard : Majoration de 50 DT par heure de retard.<br/>
              • Paiement : Le contrat sera annulé si le montant total n'est pas payé à l'arrivée du chauffeur.<br/>
              • Sécurité : Les jeux d'artifice doivent être utilisés à une distance minimale de 5 mètres.<br/>
              • Itinéraire : En cas de circuit non sécurisé ou non asphalté, le chauffeur se réserve le droit de modifier l'itinéraire.<br/>
              • Assistance : En cas de problème mécanique, l'agence fournira une autre voiture de même gamme ou supérieure.<br/>
              • Départ : 24h avant le départ, le locataire doit fournir à l'agence le point de départ via WhatsApp avec localisation Maps.<br/>
              • Propreté : Une pénalité de 100 DT sera appliquée en cas de salissures importantes constatées.
            </div>
          </div>
          <div class="footer">
            <p>Fakhama Weddings & Events - Tél: +216 93 993 619 - Email: contact@fakhama.tn</p>
            <p>Merci pour votre confiance ✨ Faites de votre évenement un jour inoubliable</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([invoiceHTML], { type: "text/html; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facture-FWE-${booking.client}-${booking.date}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Facture prestige générée avec succès", "success");
  };

  const handleAddBooking = async () => {
    const errors = validateBookingComplete(newBooking, newBookingStops);
    if (Object.keys(errors).length > 0) {
      alert(Object.values(errors).join("\n"));
      return;
    }
    const { distance, prix } = calculatePrice(newBookingStops, newBooking.retour);
    const avance = Number(newBooking.avance) || 0;
    const reste = calculateRest(prix, avance, newBooking.paiement);
    const newBookingComplete = {
      ...newBooking,
      id: Date.now(),
      distance,
      prix,
      reste,
      avance,
      trajetStops: [...newBookingStops],
      trajet: newBookingStops.join(", "),
    };
    setBookings((prev) => [...prev, newBookingComplete]);
    localStorage.removeItem("fakhama-draft");
    setDraftBooking(null);
    setNewBooking({ client: "", phone: "", date: "", heure: "20:00", retour: false, paiement: "Non payé", avance: "", lieuCeremonie: "", lieuReception: "", decoration: "rubans", commentaires: "" });
    setNewBookingStops(["Tunis"]);
    showNotification("Réservation évenement ajoutée avec succès !", "success");
  };

  const handleSaveEdit = async () => {
    if (!editBooking) return;
    const errors = validateBookingComplete(editBooking, editBookingStops);
    if (Object.keys(errors).length > 0) {
      alert(Object.values(errors).join("\n"));
      return;
    }
    const { distance, prix } = calculatePrice(editBookingStops, editBooking.retour);
    const avance = Number(editBooking.avance) || 0;
    const reste = calculateRest(prix, avance, editBooking.paiement);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === editBooking.id
          ? { ...editBooking, distance, prix, reste, avance, trajetStops: [...editBookingStops], trajet: editBookingStops.join(", ") }
          : b
      )
    );
    setEditBooking(null);
    showNotification("Réservation modifiée avec succès", "success");
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette réservation ?")) return;
    setBookings((prev) => prev.filter((b) => b.id !== id));
    showNotification("Réservation supprimée", "info");
  };

  const handleAddMaintenance = async () => {
    if (!newMaintenance.date || !newMaintenance.kilometrage || !newMaintenance.cout || !newMaintenance.type) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setMaintenances((prev) => [...prev, { id: Date.now(), ...newMaintenance, kilometrage: parseInt(newMaintenance.kilometrage), cout: parseInt(newMaintenance.cout) }]);
    setNewMaintenance({ date: new Date().toISOString().split("T")[0], kilometrage: "", type: "", description: "", cout: "" });
    showNotification("Maintenance ajoutée", "success");
  };
  const handleDeleteMaintenance = async (id) => {
    if (!window.confirm("Supprimer cette maintenance ?")) return;
    setMaintenances((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddAssurance = async () => {
    if (!newAssurance.dateDebut || !newAssurance.dateFin || !newAssurance.cout || !newAssurance.compagnie) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setAssurances((prev) => [...prev, { id: Date.now(), ...newAssurance, cout: parseInt(newAssurance.cout) }]);
    setNewAssurance({ dateDebut: "", dateFin: "", compagnie: "", cout: "", numeroContrat: "" });
    showNotification("Assurance ajoutée", "success");
  };
  const handleDeleteAssurance = async (id) => {
    if (!window.confirm("Supprimer cette assurance ?")) return;
    setAssurances((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddVignette = async () => {
    if (!newVignette.annee || !newVignette.cout) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setVignettes((prev) => [...prev, { id: Date.now(), ...newVignette, annee: parseInt(newVignette.annee), cout: parseInt(newVignette.cout) }]);
    setNewVignette({ annee: new Date().getFullYear(), cout: "", datePaiement: new Date().toISOString().split("T")[0] });
    showNotification("Vignette ajoutée", "success");
  };
  const handleDeleteVignette = async (id) => {
    if (!window.confirm("Supprimer cette vignette ?")) return;
    setVignettes((prev) => prev.filter((v) => v.id !== id));
  };

  const handleAddCarburant = async () => {
    if (!newCarburant.date || !newCarburant.quantite || !newCarburant.prixLitre || !newCarburant.kilometrage) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setCarburants((prev) => [...prev, {
      id: Date.now(), ...newCarburant,
      quantite: parseFloat(newCarburant.quantite),
      prixLitre: parseFloat(newCarburant.prixLitre),
      kilometrage: parseInt(newCarburant.kilometrage),
      coutTotal: parseFloat(newCarburant.quantite) * parseFloat(newCarburant.prixLitre),
    }]);
    setNewCarburant({ date: new Date().toISOString().split("T")[0], quantite: "", prixLitre: "", kilometrage: "", station: "" });
    showNotification("Plein ajouté", "success");
  };
  const handleDeleteCarburant = async (id) => {
    if (!window.confirm("Supprimer cet enregistrement ?")) return;
    setCarburants((prev) => prev.filter((c) => c.id !== id));
  };

  const calculateStats = () => {
    const totalMaintenanceCost = maintenances.reduce((sum, m) => sum + m.cout, 0);
    const totalAssuranceCost = assurances.reduce((sum, a) => sum + a.cout, 0);
    const totalVignetteCost = vignettes.reduce((sum, v) => sum + v.cout, 0);
    const totalCarburantCost = carburants.reduce((sum, c) => sum + c.coutTotal, 0);
    const totalDepenses = totalMaintenanceCost + totalAssuranceCost + totalVignetteCost + totalCarburantCost;
    const totalRevenue = bookings.reduce((sum, b) => {
      if (b.paiement === "Payé") return sum + b.prix;
      if (b.paiement === "Avance") return sum + (b.avance || 0);
      return sum;
    }, 0);
    return {
      totalRevenue, totalDepenses, totalMaintenanceCost, totalAssuranceCost,
      totalVignetteCost, totalCarburantCost, netProfit: totalRevenue - totalDepenses,
      totalBookings: bookings.length,
      paidBookings: bookings.filter((b) => b.paiement === "Payé").length,
      pendingBookings: bookings.filter((b) => b.paiement === "Avance").length,
      unpaidBookings: bookings.filter((b) => b.paiement === "Non payé").length,
    };
  };

  // Sort: date desc (newest first), then time desc (later times first, earliest at bottom)
  const filteredBookings = bookings
    .filter((b) => {
      if (filter.date && b.date !== filter.date) return false;
      if (filter.status && b.paiement !== filter.status) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.date;
      const dateB = b.date;
      if (dateA !== dateB) {
        return dateA < dateB ? 1 : -1;
      }
      return timeToMinutes(b.heure) - timeToMinutes(a.heure);
    });

  const stats = calculateStats();

  if (!authenticated) {
    return (
      <LoginForm
        onLogin={(pwd) => {
          if (pwd === correctPassword) { setAuthenticated(true); setLoginError(""); }
          else setLoginError("Mot de passe incorrect !");
        }}
        error={loginError}
      />
    );
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900 placeholder-gray-400 bg-white";
  const inputErrorClass = "w-full px-3 py-2 border border-red-500 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 placeholder-gray-400 bg-white";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-700 to-amber-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-md">
              <span className="text-lg font-bold text-rose-600">FWE</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Fakhama Weddings & Events</h1>
              <p className="text-xs text-rose-100">BMW Série 3 320i 2026 - Location Evenements</p>
            </div>
          </div>
          <button onClick={() => setAuthenticated(false)} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md text-white transition-all">
            Déconnexion
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b shadow-sm overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-4 min-w-max">
            {[
              { id: "simulation", label: "💰 Simulation" },
              { id: "reservations", label: "💍 Réservations" },
              { id: "dashboard", label: "📊 Dashboard" },
              { id: "maintenance", label: "🔧 Maintenance" },
              { id: "assurances", label: "🛡️ Assurances" },
              { id: "vignettes", label: "📋 Vignettes" },
              { id: "carburant", label: "⛽ Carburant" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.id ? "border-rose-500 text-rose-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto py-6 px-4">

        {activeTab === "simulation" && <PriceSimulation />}

        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">📊 Dashboard Financier</h2>
            <AllReminders bookings={bookings} assurances={assurances} />
            <RealTimeStats bookings={bookings} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-rose-500">
                <p className="text-sm font-medium text-gray-600">Revenus Totaux</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-gray-500 mt-2">{stats.totalBookings} réservations</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                <p className="text-sm font-medium text-gray-600">Dépenses Totales</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalDepenses)}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Maintenance: {formatCurrency(stats.totalMaintenanceCost)}<br />
                  Assurance: {formatCurrency(stats.totalAssuranceCost)}<br />
                  Vignette: {formatCurrency(stats.totalVignetteCost)}<br />
                  Carburant: {formatCurrency(stats.totalCarburantCost)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <p className="text-sm font-medium text-gray-600">Bénéfice Net</p>
                <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(stats.netProfit)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Marge: {stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-500">
                <p className="text-sm font-medium text-gray-600">En Attente</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingBookings}</p>
                <p className="text-xs text-gray-500 mt-2">Réservations avec avance</p>
              </div>
            </div>
            <AnnualSummaryChart bookings={bookings} />
            <CalendarView bookings={bookings} onDayClick={(dayBookings) => setSelectedDayBookings(dayBookings)} />
            <AdvancedStats bookings={bookings} />
          </div>
        )}

        {selectedDayBookings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="bg-gradient-to-r from-rose-600 to-amber-600 px-6 py-3 rounded-t-lg">
                <h3 className="text-lg font-bold text-white">Réservations du {selectedDayBookings[0]?.date}</h3>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                {selectedDayBookings.map((booking) => (
                  <div key={booking.id} className="border-b py-3 last:border-0">
                    <p className="font-semibold text-gray-900">{booking.client}</p>
                    <p className="text-sm text-gray-600">Heure: {booking.heure}</p>
                    <p className="text-sm text-gray-600">
                      Itinéraire: {booking.trajetStops ? ["Tunis", ...booking.trajetStops].join(" → ") : booking.trajet}
                    </p>
                    <Badge variant={booking.paiement === "Payé" ? "success" : booking.paiement === "Avance" ? "secondary" : "destructive"}>
                      {booking.paiement}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t">
                <button onClick={() => setSelectedDayBookings(null)} className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Fermer</button>
              </div>
            </div>
          </div>
        )}

        {/* RESERVATIONS TAB */}
        {activeTab === "reservations" && (
          <>
            <AllReminders bookings={bookings} assurances={assurances} />

            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par date</label>
                  <input type="date" value={filter.date || ""} onChange={(e) => setFilter((prev) => ({ ...prev, date: e.target.value || undefined }))} className={inputClass} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par statut</label>
                  <select value={filter.status || ""} onChange={(e) => setFilter((prev) => ({ ...prev, status: e.target.value || undefined }))} className={inputClass}>
                    <option value="">Tous les statuts</option>
                    <option value="Payé">Payé</option>
                    <option value="Non payé">Non payé</option>
                    <option value="Avance">Avance</option>
                  </select>
                </div>
                <button onClick={() => setFilter({})} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">Réinitialiser</button>
              </div>
            </div>

            {/* NEW BOOKING FORM */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">💍 Nouvelle Réservation Evenement</h2>
                {draftBooking && (
                  <button onClick={() => {
                    setNewBooking(draftBooking);
                    if (draftBooking.stops) setNewBookingStops(draftBooking.stops);
                    showNotification("Brouillon restauré", "info");
                  }} className="text-sm text-rose-600 hover:underline">
                    Restaurer brouillon
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                  <input placeholder="Nom du client" value={newBooking.client}
                    onChange={(e) => handleFieldChange("client", e.target.value)}
                    className={validationErrors.client ? inputErrorClass : inputClass} />
                  {validationErrors.client && <p className="text-red-500 text-xs mt-1">{validationErrors.client}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input placeholder="Numéro de téléphone" value={newBooking.phone}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                    className={validationErrors.phone ? inputErrorClass : inputClass} />
                  {validationErrors.phone && <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" value={newBooking.date}
                    onChange={(e) => handleFieldChange("date", e.target.value)}
                    className={validationErrors.date ? inputErrorClass : inputClass} />
                  {validationErrors.date && <p className="text-red-500 text-xs mt-1">{validationErrors.date}</p>}
                  {newBooking.date && bookings.some((b) => b.date === newBooking.date) && (
                    <p className="text-orange-600 text-xs mt-1 font-medium flex items-center gap-1">
                      🟠 Ce jour a déjà {bookings.filter((b) => b.date === newBooking.date).length} réservation(s)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heure *</label>
                  <input type="time" value={newBooking.heure}
                    onChange={(e) => handleFieldChange("heure", e.target.value)}
                    className={validationErrors.heure ? inputErrorClass : inputClass} />
                  {validationErrors.heure && <p className="text-red-500 text-xs mt-1">{validationErrors.heure}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Avance (DT)</label>
                  <input type="number" placeholder="Montant de l'avance" value={newBooking.avance}
                    onChange={(e) => handleFieldChange("avance", Number(e.target.value))}
                    className={validationErrors.avance ? inputErrorClass : inputClass} />
                  {validationErrors.avance && <p className="text-red-500 text-xs mt-1">{validationErrors.avance}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut Paiement</label>
                  <select value={newBooking.paiement} onChange={(e) => setNewBooking({ ...newBooking, paiement: e.target.value })} className={inputClass}>
                    <option value="Payé">Payé</option>
                    <option value="Non payé">Non payé</option>
                    <option value="Avance">Avance</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2 mt-6">
                  <input type="checkbox" id="retour" checked={newBooking.retour}
                    onChange={(e) => setNewBooking({ ...newBooking, retour: e.target.checked })}
                    className="rounded border-gray-300" />
                  <label htmlFor="retour" className="text-sm font-medium text-gray-700 cursor-pointer">Avec retour (+100 DT)</label>
                </div>
              </div>

              {newBooking.date && (
                <div className="mb-4 border rounded-xl overflow-hidden shadow-sm">
                  <CalendarView
                    bookings={bookings}
                    onDayClick={(dayBookings) => setSelectedDayBookings(dayBookings)}
                    highlightDate={newBooking.date}
                  />
                </div>
              )}

              <div className="border-t pt-4 mb-4">
                <MultiStopSelector stops={newBookingStops} onChange={setNewBookingStops} />
                <div className="mt-3 flex items-center gap-3 bg-rose-50 rounded-lg px-4 py-3 border border-rose-100">
                  <span className="text-sm text-rose-700 font-medium">Prix estimé :</span>
                  <span className="text-xl font-bold text-rose-600">
                    {formatCurrency(calculateItineraryPrice(newBookingStops, newBooking.retour).prix)}
                  </span>
                  <span className="text-xs text-rose-500">
                    ({calculateItineraryPrice(newBookingStops, newBooking.retour).distance} km total)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <h3 className="md:col-span-2 text-lg font-semibold text-rose-600">💍 Détails de l'évenement</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de Cérémonie</label>
                  <input type="text" value={newBooking.lieuCeremonie}
                    onChange={(e) => setNewBooking({ ...newBooking, lieuCeremonie: e.target.value })}
                    placeholder="Mairie, mosquée, église..." className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de Réception</label>
                  <input type="text" value={newBooking.lieuReception}
                    onChange={(e) => setNewBooking({ ...newBooking, lieuReception: e.target.value })}
                    placeholder="Salle des fêtes, restaurant..." className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de Décoration</label>
                  <select value={newBooking.decoration}
                    onChange={(e) => setNewBooking({ ...newBooking, decoration: e.target.value })} className={inputClass}>
                    {DECORATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commentaires Spéciaux</label>
                  <textarea value={newBooking.commentaires}
                    onChange={(e) => setNewBooking({ ...newBooking, commentaires: e.target.value })}
                    placeholder="Demandes particulières..." className={`${inputClass} h-20`} />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleAddBooking}
                  className="bg-gradient-to-r from-rose-600 to-amber-600 text-white py-2 px-6 rounded-md hover:from-rose-700 hover:to-amber-700 transition-all">
                  💍 Ajouter la Réservation
                </button>
              </div>
            </div>

            {/* BOOKINGS TABLE */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">💍 Réservations Evenement ({filteredBookings.length})</h2>
                <p className="text-xs text-gray-500">Triées : date récente ↑ · même date : heure tardive ↑ / heure tôt ↓</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      {["Client","Téléphone","Date","Heure","Itinéraire","Km","Prix","Avance","Reste","Paiement","Retour","Actions"].map((h) => (
                        <th key={h} className="border border-gray-300 px-4 py-2 text-left text-sm text-gray-700">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.length === 0 ? (
                      <tr><td colSpan={12} className="border border-gray-300 px-4 py-8 text-center text-gray-500">Aucune réservation trouvée</td></tr>
                    ) : filteredBookings.map((b, idx) => {
                      const prevDate = idx > 0 ? filteredBookings[idx - 1].date : null;
                      const isNewDateGroup = b.date !== prevDate;
                      return (
                        <tr key={b.id} className={`hover:bg-gray-50 ${isNewDateGroup && idx > 0 ? "border-t-2 border-rose-200" : ""}`}>
                          <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">{b.client}</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{b.phone || "-"}</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700 whitespace-nowrap">
                            <span className={isNewDateGroup ? "font-semibold text-rose-700" : "text-gray-700"}>
                              {b.date}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700 font-mono">{b.heure}</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700 max-w-40">
                            <span className="text-xs">
                              {b.trajetStops ? ["Tunis", ...b.trajetStops].join(" → ") : b.trajet}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{b.distance || 0} km</td>
                          <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-900">{b.prix}</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{b.avance || 0}</td>
                          <td className={`border border-gray-300 px-4 py-2 font-semibold ${b.reste > 0 && b.paiement === "Avance" ? "text-amber-600" : b.paiement === "Payé" ? "text-green-600" : "text-red-600"}`}>
                            {b.reste}{b.paiement === "Payé" && " ✓"}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <Badge variant={b.paiement === "Payé" ? "success" : b.paiement === "Avance" ? "secondary" : "destructive"}>{b.paiement}</Badge>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <Badge variant={b.retour ? "default" : "outline"}>{b.retour ? "Oui" : "Non"}</Badge>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              <button onClick={() => generateInvoiceEvenementPDF(b)} className="px-2 py-1 bg-rose-600 text-white rounded hover:bg-rose-700 text-xs">💍 Facture</button>
                              <WhatsAppButton booking={b} />
                              <button onClick={() => {
                                setEditBooking(b);
                                setEditBookingStops(b.trajetStops || [b.trajet || "Tunis"]);
                              }} className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 text-xs">Modifier</button>
                              <button onClick={() => handleDeleteBooking(b.id)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs">Supprimer</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* MAINTENANCE TAB */}
        {activeTab === "maintenance" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">🔧 Maintenance</h2>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-rose-700">📋 Plan de Maintenance Recommandé BMW B48B20C</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-rose-50">
                      <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Kilométrage</th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Type</th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenancePlan.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-900">{item.kilometrage.toLocaleString()} km</td>
                        <td className="border border-gray-300 px-4 py-2"><Badge variant="default">{item.type}</Badge></td>
                        <td className="border border-gray-300 px-4 py-2 text-gray-700">{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">➕ Ajouter une Maintenance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date *</label><input type="date" value={newMaintenance.date} onChange={(e) => setNewMaintenance({ ...newMaintenance, date: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Kilométrage *</label><input type="number" placeholder="Ex: 25000" value={newMaintenance.kilometrage} onChange={(e) => setNewMaintenance({ ...newMaintenance, kilometrage: e.target.value })} className={inputClass} /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select value={newMaintenance.type} onChange={(e) => setNewMaintenance({ ...newMaintenance, type: e.target.value })} className={inputClass}>
                    <option value="">-- Choisir --</option>
                    {["Vidange","Filtres","Freins","Distribution","Révision","Pneus","Autre"].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Coût (DT) *</label><input type="number" placeholder="Coût en DT" value={newMaintenance.cout} onChange={(e) => setNewMaintenance({ ...newMaintenance, cout: e.target.value })} className={inputClass} /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><input type="text" placeholder="Détails" value={newMaintenance.description} onChange={(e) => setNewMaintenance({ ...newMaintenance, description: e.target.value })} className={inputClass} /></div>
              </div>
              <button onClick={handleAddMaintenance} className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">🔧 Ajouter</button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📜 Historique ({maintenances.length})</h3>
              {maintenances.length === 0 ? <p className="text-gray-500 text-center py-8">Aucune maintenance</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead><tr className="bg-gray-50">{["Date","Km","Type","Description","Coût","Action"].map((h) => <th key={h} className="border border-gray-300 px-4 py-2 text-left text-gray-700">{h}</th>)}</tr></thead>
                    <tbody>
                      {maintenances.sort((a, b) => new Date(b.date) - new Date(a.date)).map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{m.date}</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{m.kilometrage?.toLocaleString()} km</td>
                          <td className="border border-gray-300 px-4 py-2"><Badge variant="default">{m.type}</Badge></td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{m.description || "-"}</td>
                          <td className="border border-gray-300 px-4 py-2 font-semibold text-red-600">{formatCurrency(m.cout)}</td>
                          <td className="border border-gray-300 px-4 py-2"><button onClick={() => handleDeleteMaintenance(m.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Supprimer</button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="bg-gray-50 font-bold"><td colSpan={4} className="border border-gray-300 px-4 py-2 text-right text-gray-700">Total :</td><td className="border border-gray-300 px-4 py-2 text-red-600">{formatCurrency(maintenances.reduce((s, m) => s + m.cout, 0))}</td><td className="border border-gray-300 px-4 py-2"></td></tr></tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ASSURANCES TAB */}
        {activeTab === "assurances" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">🛡️ Assurances</h2>
            <AllReminders bookings={bookings} assurances={assurances} />
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">➕ Ajouter une Assurance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Compagnie *</label><input type="text" placeholder="Nom" value={newAssurance.compagnie} onChange={(e) => setNewAssurance({ ...newAssurance, compagnie: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">N° Contrat</label><input type="text" placeholder="Numéro" value={newAssurance.numeroContrat} onChange={(e) => setNewAssurance({ ...newAssurance, numeroContrat: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Coût (DT) *</label><input type="number" placeholder="Coût" value={newAssurance.cout} onChange={(e) => setNewAssurance({ ...newAssurance, cout: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date Début *</label><input type="date" value={newAssurance.dateDebut} onChange={(e) => setNewAssurance({ ...newAssurance, dateDebut: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date Fin *</label><input type="date" value={newAssurance.dateFin} onChange={(e) => setNewAssurance({ ...newAssurance, dateFin: e.target.value })} className={inputClass} /></div>
              </div>
              <button onClick={handleAddAssurance} className="mt-4 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">🛡️ Ajouter</button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📜 Historique ({assurances.length})</h3>
              {assurances.length === 0 ? <p className="text-gray-500 text-center py-8">Aucune assurance</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead><tr className="bg-gray-50">{["Compagnie","N° Contrat","Début","Fin","Statut","Coût","Action"].map((h) => <th key={h} className="border border-gray-300 px-4 py-2 text-left text-gray-700">{h}</th>)}</tr></thead>
                    <tbody>
                      {assurances.map((a) => {
                        const isActive = new Date(a.dateFin) >= new Date();
                        return (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">{a.compagnie}</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{a.numeroContrat || "-"}</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{a.dateDebut}</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{a.dateFin}</td>
                            <td className="border border-gray-300 px-4 py-2"><Badge variant={isActive ? "success" : "destructive"}>{isActive ? "Active" : "Expirée"}</Badge></td>
                            <td className="border border-gray-300 px-4 py-2 font-semibold text-red-600">{formatCurrency(a.cout)}</td>
                            <td className="border border-gray-300 px-4 py-2"><button onClick={() => handleDeleteAssurance(a.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Supprimer</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot><tr className="bg-gray-50 font-bold"><td colSpan={5} className="border border-gray-300 px-4 py-2 text-right text-gray-700">Total :</td><td className="border border-gray-300 px-4 py-2 text-red-600">{formatCurrency(assurances.reduce((s, a) => s + a.cout, 0))}</td><td className="border border-gray-300 px-4 py-2"></td></tr></tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIGNETTES TAB */}
        {activeTab === "vignettes" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">📋 Vignettes</h2>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">➕ Ajouter une Vignette</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Année *</label><input type="number" value={newVignette.annee} onChange={(e) => setNewVignette({ ...newVignette, annee: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Coût (DT) *</label><input type="number" placeholder="Coût" value={newVignette.cout} onChange={(e) => setNewVignette({ ...newVignette, cout: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date de Paiement</label><input type="date" value={newVignette.datePaiement} onChange={(e) => setNewVignette({ ...newVignette, datePaiement: e.target.value })} className={inputClass} /></div>
              </div>
              <button onClick={handleAddVignette} className="mt-4 bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700">📋 Ajouter</button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📜 Historique ({vignettes.length})</h3>
              {vignettes.length === 0 ? <p className="text-gray-500 text-center py-8">Aucune vignette</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead><tr className="bg-gray-50">{["Année","Date Paiement","Coût","Action"].map((h) => <th key={h} className="border border-gray-300 px-4 py-2 text-left text-gray-700">{h}</th>)}</tr></thead>
                    <tbody>
                      {vignettes.sort((a, b) => b.annee - a.annee).map((v) => (
                        <tr key={v.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-bold text-gray-900">{v.annee}</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{v.datePaiement}</td>
                          <td className="border border-gray-300 px-4 py-2 font-semibold text-red-600">{formatCurrency(v.cout)}</td>
                          <td className="border border-gray-300 px-4 py-2"><button onClick={() => handleDeleteVignette(v.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Supprimer</button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="bg-gray-50 font-bold"><td colSpan={2} className="border border-gray-300 px-4 py-2 text-right text-gray-700">Total :</td><td className="border border-gray-300 px-4 py-2 text-red-600">{formatCurrency(vignettes.reduce((s, v) => s + v.cout, 0))}</td><td className="border border-gray-300 px-4 py-2"></td></tr></tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CARBURANT TAB */}
        {activeTab === "carburant" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">⛽ Carburant</h2>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">➕ Ajouter un Plein</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date *</label><input type="date" value={newCarburant.date} onChange={(e) => setNewCarburant({ ...newCarburant, date: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantité (L) *</label><input type="number" step="0.1" placeholder="Ex: 45.5" value={newCarburant.quantite} onChange={(e) => setNewCarburant({ ...newCarburant, quantite: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Prix/Litre (DT) *</label><input type="number" step="0.001" placeholder="Ex: 2.350" value={newCarburant.prixLitre} onChange={(e) => setNewCarburant({ ...newCarburant, prixLitre: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Kilométrage *</label><input type="number" placeholder="Ex: 15000" value={newCarburant.kilometrage} onChange={(e) => setNewCarburant({ ...newCarburant, kilometrage: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Station</label><input type="text" placeholder="Nom de la station" value={newCarburant.station} onChange={(e) => setNewCarburant({ ...newCarburant, station: e.target.value })} className={inputClass} /></div>
                {newCarburant.quantite && newCarburant.prixLitre && (
                  <div className="flex items-end">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 w-full">
                      <p className="text-sm text-green-700">Coût total estimé :</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(parseFloat(newCarburant.quantite) * parseFloat(newCarburant.prixLitre))}</p>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={handleAddCarburant} className="mt-4 bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700">⛽ Ajouter</button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📜 Historique ({carburants.length})</h3>
              {carburants.length === 0 ? <p className="text-gray-500 text-center py-8">Aucun plein</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead><tr className="bg-gray-50">{["Date","Km","Qté","Prix/L","Station","Total","Action"].map((h) => <th key={h} className="border border-gray-300 px-4 py-2 text-left text-gray-700">{h}</th>)}</tr></thead>
                    <tbody>
                      {carburants.sort((a, b) => new Date(b.date) - new Date(a.date)).map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{c.date}</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{c.kilometrage?.toLocaleString()} km</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{c.quantite} L</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{c.prixLitre} DT</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{c.station || "-"}</td>
                          <td className="border border-gray-300 px-4 py-2 font-semibold text-red-600">{formatCurrency(c.coutTotal)}</td>
                          <td className="border border-gray-300 px-4 py-2"><button onClick={() => handleDeleteCarburant(c.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Supprimer</button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={2} className="border border-gray-300 px-4 py-2 text-gray-700">Total : {carburants.reduce((s, c) => s + c.quantite, 0).toFixed(1)} L</td>
                        <td colSpan={3} className="border border-gray-300 px-4 py-2 text-right text-gray-700">Total coût :</td>
                        <td className="border border-gray-300 px-4 py-2 text-red-600">{formatCurrency(carburants.reduce((s, c) => s + c.coutTotal, 0))}</td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {editBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Modifier la réservation</h2>
                  <button onClick={() => setEditBooking(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Client</label><input value={editBooking.client} onChange={(e) => setEditBooking({ ...editBooking, client: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label><input value={editBooking.phone || ""} onChange={(e) => setEditBooking({ ...editBooking, phone: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={editBooking.date} onChange={(e) => setEditBooking({ ...editBooking, date: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Heure</label><input type="time" value={editBooking.heure} onChange={(e) => setEditBooking({ ...editBooking, heure: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Avance (DT)</label><input type="number" value={editBooking.avance || 0} onChange={(e) => setEditBooking({ ...editBooking, avance: Number(e.target.value) })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Statut Paiement</label>
                    <select value={editBooking.paiement} onChange={(e) => setEditBooking({ ...editBooking, paiement: e.target.value })} className={inputClass}>
                      <option value="Payé">Payé</option><option value="Non payé">Non payé</option><option value="Avance">Avance</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="edit-retour" checked={editBooking.retour}
                      onChange={(e) => setEditBooking({ ...editBooking, retour: e.target.checked })} className="rounded border-gray-300" />
                    <label htmlFor="edit-retour" className="text-sm font-medium text-gray-700 cursor-pointer">Avec retour (+100 DT)</label>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <MultiStopSelector stops={editBookingStops} onChange={setEditBookingStops} />
                  <div className="mt-3 flex items-center gap-3 bg-rose-50 rounded-lg px-4 py-3 border border-rose-100">
                    <span className="text-sm text-rose-700 font-medium">Nouveau prix estimé :</span>
                    <span className="text-xl font-bold text-rose-600">
                      {formatCurrency(calculateItineraryPrice(editBookingStops, editBooking.retour).prix)}
                    </span>
                    <span className="text-xs text-rose-500">
                      ({calculateItineraryPrice(editBookingStops, editBooking.retour).distance} km)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                  <h3 className="md:col-span-2 text-lg font-semibold text-rose-600">💍 Détails</h3>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Lieu Cérémonie</label><input type="text" value={editBooking.lieuCeremonie || ""} onChange={(e) => setEditBooking({ ...editBooking, lieuCeremonie: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Lieu Réception</label><input type="text" value={editBooking.lieuReception || ""} onChange={(e) => setEditBooking({ ...editBooking, lieuReception: e.target.value })} className={inputClass} /></div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Décoration</label>
                    <select value={editBooking.decoration || "rubans"} onChange={(e) => setEditBooking({ ...editBooking, decoration: e.target.value })} className={inputClass}>
                      {DECORATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commentaires</label>
                    <textarea value={editBooking.commentaires || ""} onChange={(e) => setEditBooking({ ...editBooking, commentaires: e.target.value })} className={`${inputClass} h-20`} />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button onClick={() => setEditBooking(null)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">Annuler</button>
                  <button onClick={handleSaveEdit} className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 text-white rounded-md hover:from-rose-700 hover:to-amber-700">Enregistrer</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {notification && (
          <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
        )}
      </div>
    </div>
  );
}