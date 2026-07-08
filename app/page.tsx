
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

// TODO (amélioration distance) : cette fonction utilise Haversine (vol d'oiseau).
// Pour un prix plus juste, remplacer par un appel à une API de distance routière
// (Google Distance Matrix ou OSRM auto-hébergé), avec fallback sur Haversine
// en cas d'échec réseau ou d'absence de clé API. Exemple de point d'intégration :
//
//   async function fetchRouteDistanceKm(from, to) {
//     try {
//       const res = await fetch(`https://your-osrm-server/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`);
//       const data = await res.json();
//       return Math.round(data.routes[0].distance / 1000);
//     } catch {
//       return calculateDistance(from, to); // fallback
//     }
//   }
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

// Mappe un statut de paiement vers un variant de Badge (cohérent partout dans l'app).
const paiementVariant = (status) => {
  switch (status) {
    case "Payé":
      return "success";
    case "Avance":
      return "secondary";
    case "En attente":
      return "warning";
    default:
      return "destructive"; // "Non payé"
  }
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

const calculateShootingCost = (heures) => (Number(heures) || 0) * PRIX_SHOOTING_HEURE;

const calculateTotalPrice = (stops, retour, shootingHeures) => {
  const { distance, prix } = calculateItineraryPrice(stops, retour);
  const shootingCost = calculateShootingCost(shootingHeures);
  return { distance, prixBase: prix, shootingCost, prix: prix + shootingCost };
};

// Calcule le montant de l'acompte (30% par défaut) à partir du prix total.
const calculateAcompte = (prix, pct = ACOMPTE_PERCENTAGE) => arrondirPrix(prix * pct);

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

// ── ITINERARY MAP (nouveau) ─────────────────────────────────────────────────────
// Carte Google Maps (embed sans clé API) affichant le trajet départ (Tunis) → arrêts.
// NOTE: utilise le point d'entrée "google.com/maps?...&output=embed", qui ne
// nécessite pas de clé API contrairement à l'API "maps/embed/v1/directions".
// Pour une version avec clé API (plus fiable), remplacer buildMapEmbedUrl() par :
//   `https://www.google.com/maps/embed/v1/directions?key=VOTRE_CLE&origin=...&destination=...&waypoints=...`
const buildMapEmbedUrl = (stops) => {
  const route = ["Tunis", ...(stops && stops.length ? stops : [])];
  if (route.length < 2) {
    return `https://www.google.com/maps?q=${encodeURIComponent(route[0] + ", Tunisie")}&output=embed`;
  }
  const origin = encodeURIComponent(route[0] + ", Tunisie");
  const destination = encodeURIComponent(route[route.length - 1] + ", Tunisie");
  const waypoints = route
    .slice(1, -1)
    .map((s) => encodeURIComponent(s + ", Tunisie"))
    .join("+to:");
  const daddr = waypoints ? `${waypoints}+to:${destination}` : destination;
  return `https://www.google.com/maps?saddr=${origin}&daddr=${daddr}&output=embed`;
};

const ItineraryMap = ({ stops, title = "🗺️ Aperçu de l'itinéraire" }) => {
  const src = buildMapEmbedUrl(stops);
  return (
    <div className="space-y-2">
      {title && <p className="text-sm font-medium text-gray-700">{title}</p>}
      <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
        <iframe
          title="Itinéraire"
          src={src}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
};

// ── SIDEBAR (nouveau) ───────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { id: "simulation", label: "Simulation", icon: "💰" },
  { id: "reservations", label: "Réservations", icon: "💍" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "maintenance", label: "Maintenance", icon: "🔧" },
  { id: "assurances", label: "Assurances", icon: "🛡️" },
  { id: "vignettes", label: "Vignettes", icon: "📋" },
  { id: "carburant", label: "Carburant", icon: "⛽" },
];

const Sidebar = ({ activeTab, setActiveTab, onLogout }) => (
  <aside className="w-64 shrink-0 h-screen sticky top-0 bg-white border-r border-gray-100 flex flex-col">
    <div className="flex items-center gap-2 px-5 py-5">
      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-rose-600 to-amber-500 flex items-center justify-center">
        <span className="text-white text-xs font-bold">FWE</span>
      </div>
      <div>
        <p className="font-bold text-gray-900 leading-tight">Fakhama</p>
        <p className="text-[11px] text-gray-400 leading-tight">Weddings &amp; Events</p>
      </div>
    </div>

    <p className="px-5 mt-4 mb-2 text-[11px] font-semibold tracking-wider text-gray-400">MENU PRINCIPAL</p>
    <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
      {SIDEBAR_ITEMS.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              active ? "bg-rose-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </nav>

    <div className="p-3 border-t border-gray-100">
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
      >
        🚪 Déconnexion
      </button>
    </div>
  </aside>
);

// ── KPI CARD (nouveau) ──────────────────────────────────────────────────────────
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
🔄 *Service retour :* ${booking.retour ? "Oui" : "Non"}${booking.retour && booking.lieuRetour ? ` (${booking.lieuRetour})` : ""}
${booking.shootingHeures ? `📸 *Shooting photo/vidéo :* ${booking.shootingHeures}h (${formatCurrency(booking.shootingCost || 0)})${booking.lieuShooting ? ` — ${booking.lieuShooting}` : ""}\n` : ""}
💍 *Détails évenement :*
- Emplacement du marié : ${booking.lieuMarie || "À confirmer"}
- Emplacement de la mariée : ${booking.lieuMariee || "À confirmer"}
- Salle des fêtes : ${booking.salleFetes || "À confirmer"}
- Décoration : ${decorationLabel}

💰 *Détail financier :*
- Prix total : ${formatCurrency(booking.prix)}
- Avance versée : ${formatCurrency(booking.avance || 0)}
- Reste à payer : ${formatCurrency(booking.reste || 0)}
- Statut : ${booking.paiement}

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
  const [shooting, setShooting] = useState(false);
  const [shootingHeures, setShootingHeures] = useState(1);

  const { distance, prixBase, shootingCost, prix } = calculateTotalPrice(
    stops,
    retour,
    shooting ? shootingHeures : 0
  );

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
              <ItineraryMap stops={stops} />
              <div className="flex items-center space-x-3">
                <input type="checkbox" id="retour-simulation" checked={retour}
                  onChange={(e) => setRetour(e.target.checked)}
                  className="w-4 h-4 text-rose-600 border-gray-300 rounded" />
                <label htmlFor="retour-simulation" className="text-gray-700 cursor-pointer">🔄 Service avec retour (+100 DT)</label>
              </div>
              <div className="flex items-center space-x-3">
                <input type="checkbox" id="shooting-simulation" checked={shooting}
                  onChange={(e) => setShooting(e.target.checked)}
                  className="w-4 h-4 text-rose-600 border-gray-300 rounded" />
                <label htmlFor="shooting-simulation" className="text-gray-700 cursor-pointer">📸 Shooting photo/vidéo (50 DT/heure)</label>
              </div>
              {shooting && (
                <div className="flex items-center gap-3 pl-7">
                  <label className="text-sm text-gray-600">Nombre d'heures :</label>
                  <input type="number" min="1" step="0.5" value={shootingHeures}
                    onChange={(e) => setShootingHeures(Math.max(0, Number(e.target.value)))}
                    className="w-24 px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900" />
                  <span className="text-sm text-rose-600 font-medium">= {formatCurrency(calculateShootingCost(shootingHeures))}</span>
                </div>
              )}
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
                <div className="flex justify-between items-center py-2 border-b border-rose-200">
                  <span className="text-gray-600">Service retour :</span>
                  <span className="font-semibold text-gray-900">{retour ? "Oui (+100 DT)" : "Non"}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Shooting photo/vidéo :</span>
                  <span className="font-semibold text-gray-900">{shooting ? `${shootingHeures}h (+${formatCurrency(shootingCost)})` : "Non"}</span>
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

// ── WEEK VIEW (nouveau) ──────────────────────────────────────────────────────────
// Vue hebdomadaire du calendrier, utile en haute saison pour voir tous les
// évènements de la semaine sans être limité par l'espace réduit des cases du mois.
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = dimanche
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

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
                      {b.trajetStops ? ["Tunis", ...b.trajetStops].join(" → ") : b.trajet}
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
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("simulation");
  const [selectedDayBookings, setSelectedDayBookings] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [draftBooking, setDraftBooking] = useState(null);
  const autoSaveTimer = useRef(null);

  // Pagination du tableau des réservations
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [newBookingStops, setNewBookingStops] = useState(["Tunis"]);
  const [editBookingStops, setEditBookingStops] = useState(["Tunis"]);

  const [newBooking, setNewBooking] = useState({
    // Par défaut, une nouvelle réservation est un devis "En attente" de confirmation
    // du client. On la fait basculer manuellement en "Avance" ou "Payé" une fois
    // le client confirmé.
    client: "", phone: "", date: "", heure: "20:00",
    retour: false, paiement: "En attente", avance: "",
    lieuMarie: "", lieuMariee: "", salleFetes: "", lieuRetour: "", lieuShooting: "", decoration: "rubans", commentaires: "",
    shooting: false, shootingHeures: 1
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

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  const loadAllData = useCallback(async () => {
    setDataLoading(true);
    setDataError("");
    try {
      const [b, m, a, v, c] = await Promise.all([
        supabase.from("bookings").select("*").order("date", { ascending: false }),
        supabase.from("maintenances").select("*").order("date", { ascending: false }),
        supabase.from("assurances").select("*").order("date_fin", { ascending: false }),
        supabase.from("vignettes").select("*").order("annee", { ascending: false }),
        supabase.from("carburants").select("*").order("date", { ascending: false }),
      ]);
      if (b.error) throw b.error;
      if (m.error) throw m.error;
      if (a.error) throw a.error;
      if (v.error) throw v.error;
      if (c.error) throw c.error;
      setBookings((b.data || []).map(rowToBooking));
      setMaintenances((m.data || []).map(rowToMaintenance));
      setAssurances((a.data || []).map(rowToAssurance));
      setVignettes((v.data || []).map(rowToVignette));
      setCarburants((c.data || []).map(rowToCarburant));
    } catch (err) {
      console.error(err);
      setDataError("Impossible de charger les données depuis Supabase. Vérifiez la connexion et la configuration (URL/clé).");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    loadAllData();
    const savedDraft = localStorage.getItem("fakhama-draft");
    if (savedDraft) setDraftBooking(JSON.parse(savedDraft));
  }, [authenticated, loadAllData]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (newBooking.client || newBooking.date || newBooking.salleFetes) {
        localStorage.setItem("fakhama-draft", JSON.stringify({ ...newBooking, stops: newBookingStops }));
        showNotification("Brouillon sauvegardé automatiquement", "info");
      }
    }, 3000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [newBooking, newBookingStops]);

  // Auto-remplissage de l'avance : dès que l'itinéraire, le retour ou le
  // shooting changent alors que le statut "Avance" est sélectionné, on
  // recalcule automatiquement le montant de l'acompte (30% du prix total).
  useEffect(() => {
    if (newBooking.paiement === "Avance") {
      const { prix } = calculateTotalPrice(
        newBookingStops,
        newBooking.retour,
        newBooking.shooting ? newBooking.shootingHeures : 0
      );
      const acompte = calculateAcompte(prix);
      setNewBooking((prev) =>
        prev.paiement === "Avance" && prev.avance !== acompte ? { ...prev, avance: acompte } : prev
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newBookingStops, newBooking.retour, newBooking.shooting, newBooking.shootingHeures, newBooking.paiement]);

  // Même logique pour le formulaire de modification d'une réservation existante.
  useEffect(() => {
    if (editBooking && editBooking.paiement === "Avance") {
      const { prix } = calculateTotalPrice(
        editBookingStops,
        editBooking.retour,
        editBooking.shooting ? editBooking.shootingHeures : 0
      );
      const acompte = calculateAcompte(prix);
      setEditBooking((prev) =>
        prev && prev.paiement === "Avance" && prev.avance !== acompte ? { ...prev, avance: acompte } : prev
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBookingStops, editBooking?.retour, editBooking?.shooting, editBooking?.shootingHeures, editBooking?.paiement]);

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

  // Réinitialise la pagination dès que les filtres ou la recherche changent,
  // pour éviter d'atterrir sur une page vide.
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  const showNotification = (message, type = "info") => setNotification({ message, type });

  const calculatePrice = useCallback((stops, retour, shootingHeures = 0) => {
    return calculateTotalPrice(stops, retour, shootingHeures);
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

  // Change le statut de paiement d'une nouvelle réservation. Si le statut passe à
  // "Avance", calcule automatiquement 30% du prix total comme montant d'acompte.
  const handleNewBookingPaiementChange = (value) => {
    setNewBooking((prev) => {
      const updated = { ...prev, paiement: value };
      if (value === "Avance") {
        const { prix } = calculateTotalPrice(newBookingStops, prev.retour, prev.shooting ? prev.shootingHeures : 0);
        updated.avance = calculateAcompte(prix);
      }
      return updated;
    });
  };

  // Idem pour l'édition d'une réservation existante.
  const handleEditBookingPaiementChange = (value) => {
    setEditBooking((prev) => {
      const updated = { ...prev, paiement: value };
      if (value === "Avance") {
        const { prix } = calculateTotalPrice(editBookingStops, prev.retour, prev.shooting ? prev.shootingHeures : 0);
        updated.avance = calculateAcompte(prix);
      }
      return updated;
    });
  };

  // ── Facture évènement — format A4, imprimable directement ────────────────────
  // TODO (facture PDF réelle) : cette fonction génère un fichier .html téléchargeable
  // et imprimable depuis le navigateur (fonctionne partout, sans dépendance). Pour un
  // vrai fichier PDF généré côté serveur : Supabase Edge Function + Puppeteer, ou
  // jsPDF côté client (npm install jspdf, puis construire le PDF programmatiquement
  // plutôt que via du HTML).
  //
  // documentType: "facture" (par défaut) ou "devis". Le devis reprend la même mise
  // en page mais avec un habillage visuel distinct (bandeau bleu/gris "DEVIS", pas
  // de mention "Reste à payer" définitive, note de validité limitée) afin de ne
  // jamais être confondu avec une facture définitive envoyée après confirmation.
  const generateInvoiceEvenementPDF = (booking, documentType = "facture") => {
    const isDevis = documentType === "devis";
    const dateFacture = new Date().toLocaleDateString("fr-FR");
    const heureFacture = new Date().toLocaleTimeString("fr-FR");
    const decorationLabel =
      DECORATION_OPTIONS.find((d) => d.value === booking.decoration)?.label || "Rubans traditionnels";
    const itineraire = booking.trajetStops
      ? ["Tunis", ...booking.trajetStops].join(" → ")
      : booking.trajet || "Tunis";

    // Date de l'évènement découpée pour l'affichage "MOIS | JOUR | ANNÉE"
    const eventDateObj = new Date(booking.date);
    const eventMonth = isNaN(eventDateObj)
      ? ""
      : getMonthName(eventDateObj.getMonth() + 1).toUpperCase();
    const eventDay = isNaN(eventDateObj) ? "" : String(eventDateObj.getDate()).padStart(2, "0");
    const eventYear = isNaN(eventDateObj) ? "" : eventDateObj.getFullYear();

    const prixBaseAffiche =
      booking.prixBase != null ? booking.prixBase : booking.prix - (booking.shootingCost || 0);

    const shootingRow = booking.shootingHeures
      ? `<div class="price-line"><span class="lab">Shooting photo/vidéo (${booking.shootingHeures}h)</span><span>${formatCurrency(booking.shootingCost || 0)}</span></div>`
      : "";

    const lieuRetourItem = booking.retour
      ? `<div><p class="block-label">Lieu du retour</p><p class="block-value small">${booking.lieuRetour || "À confirmer"}</p></div>`
      : "";
    const lieuShootingItem = booking.shootingHeures
      ? `<div><p class="block-label">Lieu du shooting</p><p class="block-value small">${booking.lieuShooting || "À confirmer"}</p></div>`
      : "";

    const statusColors = {
      "Payé": { bg: "#1f4d33", fg: "#8fe3af" },
      "Avance": { bg: "#5a4a1a", fg: "#f0d488" },
      "Non payé": { bg: "#5a1f1f", fg: "#f0a3a3" },
      "En attente": { bg: "#4a3f1a", fg: "#e0c98a" },
    };
    const statusColor = isDevis
      ? { bg: "#1f3a5a", fg: "#a9cdf0" }
      : (statusColors[booking.paiement] || statusColors["Non payé"]);

    // Habillage visuel : le devis utilise une palette bleu/gris "administratif",
    // bien distincte du carton d'invitation doré de la facture définitive.
    const accentMain = isDevis ? "#2c4a6b" : "#3d2f1c";
    const accentSoft = isDevis ? "#5c7a99" : "#9c8a5c";
    const accentBg = isDevis ? "#eef2f6" : "#f7f2e7";
    const accentDivider = isDevis ? "#8aa6c2" : "#c6a869";
    const docTitle = isDevis ? "Devis évènement" : "Facture évènement";
    const docSubtitle = isDevis
      ? "Document non définitif — proposition tarifaire"
      : "";
    const rsvpTitle = isDevis ? "Estimation" : "Règlement";
    const totalLabel = isDevis ? "Total estimé — TTC" : "Reste à payer";
    const totalValue = isDevis ? booking.prix : (booking.reste || 0);

    const watermark = isDevis
      ? `<div style="position:absolute; top:44%; left:50%; transform:translate(-50%,-50%) rotate(-18deg); font-family:'Montserrat',sans-serif; font-size:52px; font-weight:700; letter-spacing:10px; color:rgba(44,74,107,0.08); pointer-events:none; z-index:0; white-space:nowrap;">DEVIS</div>`
      : "";

    const validityNote = isDevis
      ? `<div class="terms" style="border-color:${accentDivider};">
          <strong>Validité du devis</strong>
          Ce document est une proposition tarifaire valable 7 jours à compter de l'émission ci-dessus et ne constitue pas une facture ni une confirmation de réservation.
          La réservation n'est garantie qu'après confirmation écrite du client et versement de l'acompte (${Math.round(ACOMPTE_PERCENTAGE * 100)}% du montant total).
          Les tarifs peuvent évoluer selon la disponibilité à la date de confirmation.
        </div>`
      : `<div class="terms">
          <strong>Conditions générales</strong>
          Annulation : l'avance n'est pas remboursée en cas d'annulation moins de 7 jours avant la date prévue.
          Retard : majoration de 50 DT par heure de retard.
          Paiement : le contrat est annulé si le montant total n'est pas réglé à l'arrivée du chauffeur.
          Sécurité : les jeux d'artifice doivent être utilisés à une distance minimale de 5 mètres.
          Itinéraire : en cas de circuit non sécurisé ou non asphalté, le chauffeur se réserve le droit de le modifier.
          Assistance : en cas de problème mécanique, une voiture de même gamme ou supérieure sera fournie.
          Départ : 24h avant, les emplacements du marié et de la mariée doivent être communiqués via WhatsApp avec localisation Maps.
          Propreté : une pénalité de 100 DT s'applique en cas de salissures importantes constatées.
        </div>`;

    // Motif floral "gravé" réutilisé aux 4 coins (miroir via transform CSS).
    // Pour le devis, on garde une déco plus sobre (cercles) plutôt que le motif floral doré.
    const ornamentSVG = isDevis
      ? `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><g class="ornament-shape">
          <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" stroke-width="2"/>
          <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" stroke-width="1.5"/>
        </g></svg>`
      : `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><g class="ornament-shape">
        <path d="M8,8 C34,10 55,26 62,58 C44,52 18,40 8,8 Z"/>
        <path d="M8,8 C20,24 38,33 66,36 C48,20 30,12 8,8 Z"/>
        <path d="M13,18 C28,26 40,42 42,62 C28,55 14,44 13,18 Z"/>
        <circle cx="58" cy="58" r="15"/>
        <circle cx="50" cy="50" r="9"/>
        <circle cx="66" cy="52" r="8"/>
        <circle cx="52" cy="66" r="8"/>
        <circle cx="67" cy="66" r="7"/>
      </g></svg>`;

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${isDevis ? "Devis" : "Facture"} Fakhama Weddings - ${booking.client}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Great+Vibes&family=Montserrat:wght@300;400;500&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Cormorant Garamond', serif;
            margin: 0;
            padding: 48px 16px;
            background: ${isDevis ? "#d7dee6" : "#ded6c4"};
            color: #4a3f30;
          }
          .invoice-container {
            max-width: 640px;
            margin: 0 auto;
            background: ${accentBg};
            position: relative;
            box-shadow: 0 30px 80px rgba(50,40,20,0.25);
            padding: 56px 46px 44px;
            overflow: hidden;
          }
          .ornament { position: absolute; width: 130px; height: 130px; opacity: 0.9; color: ${accentSoft}; }
          .ornament svg { width: 100%; height: 100%; }
          .ornament path, .ornament circle { ${isDevis ? "" : `fill: ${accentBg};`} }
          .ornament-shape {
            filter: drop-shadow(1px 1.5px 0.5px rgba(110,90,55,0.4)) drop-shadow(-1px -1.5px 0.5px rgba(255,255,255,0.9));
          }
          .o-tl { top: 14px; left: 14px; }
          .o-tr { top: 14px; right: 14px; transform: scaleX(-1); }
          .o-bl { bottom: 14px; left: 14px; transform: scaleY(-1); }
          .o-br { bottom: 14px; right: 14px; transform: scale(-1,-1); }

          .content { text-align: center; position: relative; z-index: 1; }

          .doc-badge {
            display: inline-block;
            margin-bottom: 10px;
            padding: 4px 18px;
            border-radius: 20px;
            font-family: 'Montserrat', sans-serif;
            font-size: 11px;
            letter-spacing: 3px;
            text-transform: uppercase;
            font-weight: 600;
            background: ${isDevis ? "#2c4a6b" : "#8a6d1a"};
            color: white;
          }

          .brandline {
            font-family: 'Montserrat', sans-serif;
            font-size: 10px;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #9c8a5c;
            margin: 0 0 6px;
          }
          .logo {
            display: block;
            max-width: 260px;
            width: 100%;
            height: auto;
            margin: 0 auto 14px;
            ${isDevis ? "filter: grayscale(0.35);" : ""}
          }
          .intro {
            font-size: 15px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #6b5c3f;
            line-height: 1.9;
            margin: 26px 0 6px;
            font-weight: 500;
          }
          .doc-subtitle {
            font-family: 'Montserrat', sans-serif;
            font-size: 11px;
            letter-spacing: 1px;
            color: ${accentMain};
            margin-top: -4px;
            margin-bottom: 10px;
          }

          .clientname {
            font-family: 'Great Vibes', cursive;
            font-size: 50px;
            color: ${accentMain};
            margin: 6px 0 22px;
            line-height: 1;
            word-break: break-word;
          }

          .datewrap {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 14px;
            margin: 18px 0 4px;
          }
          .datewrap .dpart {
            font-size: 17px;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #4a3f30;
          }
          .datewrap .ddim { font-size: 24px; font-weight: 500; }
          .datewrap .bar { width: 1px; height: 22px; background: ${accentDivider}; }

          .timeline {
            font-size: 13px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #7a6f56;
            margin: 10px 0 26px;
          }

          .divider {
            width: 120px;
            height: 1px;
            margin: 22px auto;
            background: linear-gradient(90deg, transparent, ${accentDivider}, transparent);
          }

          .block-label {
            font-family: 'Montserrat', sans-serif;
            font-size: 10px;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #9c7f3f;
            margin: 0 0 8px;
          }
          .block-value {
            font-size: 16px;
            color: #3d2f1c;
            line-height: 1.6;
            margin: 0 0 4px;
          }
          .block-value.small { font-size: 14px; color: #6b5c3f; }

          .infogrid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px 10px;
            margin: 4px 0 8px;
            text-align: center;
          }

          .rsvp-title {
            font-family: 'Great Vibes', cursive;
            font-size: 34px;
            color: ${accentMain};
            margin: 4px 0 12px;
          }

          .price-line {
            display: flex;
            justify-content: center;
            gap: 10px;
            font-size: 14.5px;
            color: #5c5140;
            padding: 5px 0;
          }
          .price-line .lab { letter-spacing: 1px; text-transform: uppercase; font-size: 11.5px; color: #8a7a52; align-self: center; }
          .price-total {
            font-size: 24px;
            color: ${accentMain};
            margin: 14px 0 2px;
            font-weight: 600;
          }
          .status-pill {
            display: inline-block;
            margin-top: 10px;
            padding: 4px 16px;
            border-radius: 20px;
            font-family: 'Montserrat', sans-serif;
            font-size: 10.5px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            font-weight: 500;
          }

          .terms {
            margin-top: 30px;
            font-family: 'Montserrat', sans-serif;
            font-size: 9.5px;
            line-height: 1.9;
            color: #8a7a5c;
            text-align: left;
            padding: 16px 18px;
            background: ${isDevis ? "#e2e8ee" : "#efe7d4"};
            border: 1px dashed ${accentDivider};
          }
          .terms strong {
            display: block;
            letter-spacing: 2px;
            text-transform: uppercase;
            font-size: 10px;
            color: ${accentMain};
            margin-bottom: 8px;
            text-align: center;
          }

          .footer-sign {
            margin-top: 28px;
            font-family: 'Great Vibes', cursive;
            font-size: 24px;
            color: #4a3f28;
          }
          .footer-contact {
            font-family: 'Montserrat', sans-serif;
            font-size: 10.5px;
            letter-spacing: 1px;
            color: #8a7a5c;
            margin-top: 6px;
          }

          @media print {
            body { background: white; padding: 0; }
            .invoice-container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          ${watermark}

          <div class="ornament o-tl">${ornamentSVG}</div>
          <div class="ornament o-tr">${ornamentSVG}</div>
          <div class="ornament o-bl">${ornamentSVG}</div>
          <div class="ornament o-br">${ornamentSVG}</div>

          <div class="content">
            <span class="doc-badge">${isDevis ? "Devis — non définitif" : "Facture"}</span>
            <img class="logo" src="${FAKHAMA_LOGO_BASE64}" alt="Fakhama Weddings & Events" />
            <p class="brandline">Fakhama Weddings &amp; Events · BMW Série 3 320i 2026</p>

            <p class="intro">${docTitle}<br>émis${isDevis ? "" : "e"} pour</p>
            ${docSubtitle ? `<p class="doc-subtitle">${docSubtitle}</p>` : ""}

            <div class="clientname">${booking.client}</div>

            <div class="datewrap">
              <span class="dpart">${eventMonth}</span>
              <span class="bar"></span>
              <span class="dpart ddim">${eventDay}</span>
              <span class="bar"></span>
              <span class="dpart">${eventYear}</span>
            </div>
            <p class="timeline">à ${booking.heure} · N° FWE-${booking.id}-${new Date().getFullYear()}${isDevis ? "-DEV" : ""} · émis${isDevis ? "" : "e"} le ${dateFacture} à ${heureFacture}</p>

            <div class="divider"></div>

            <p class="block-label">Itinéraire</p>
            <p class="block-value">${itineraire}</p>
            <p class="block-value small">${booking.distance} km${booking.retour ? " · service retour inclus" : ""}</p>

            <div class="divider"></div>

            <div class="infogrid">
              <div>
                <p class="block-label">Emplacement du marié</p>
                <p class="block-value small">${booking.lieuMarie || "À confirmer"}</p>
              </div>
              <div>
                <p class="block-label">Emplacement de la mariée</p>
                <p class="block-value small">${booking.lieuMariee || "À confirmer"}</p>
              </div>
              <div>
                <p class="block-label">Salle des fêtes</p>
                <p class="block-value small">${booking.salleFetes || "À confirmer"}</p>
              </div>
              <div>
                <p class="block-label">Décoration</p>
                <p class="block-value small">${decorationLabel}</p>
              </div>
              ${lieuRetourItem}
              ${lieuShootingItem}
            </div>

            ${booking.commentaires ? `<p class="block-value small" style="margin-top:10px;">« ${booking.commentaires} »</p>` : ""}

            <div class="divider"></div>

            <div class="rsvp-title">${rsvpTitle}</div>

            <div class="price-line"><span class="lab">Forfait évènement</span><span>${formatCurrency(prixBaseAffiche)}</span></div>
            ${shootingRow}
            ${isDevis
              ? `<div class="price-line"><span class="lab">Acompte suggéré (${Math.round(ACOMPTE_PERCENTAGE * 100)}%)</span><span>${formatCurrency(calculateAcompte(booking.prix))}</span></div>`
              : `<div class="price-line"><span class="lab">Avance versée</span><span>${formatCurrency(booking.avance || 0)}</span></div>`
            }
            <div class="price-total">${totalLabel} — ${formatCurrency(totalValue)}</div>
            <span class="status-pill" style="background:${statusColor.bg}; color:${statusColor.fg};">${isDevis ? "En attente de confirmation" : booking.paiement}</span>

            ${validityNote}

            <p class="footer-sign">Avec toute notre estime</p>
            <p class="footer-contact">+216 93 993 619 · contact@fakhama.tn</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([invoiceHTML], { type: "text/html; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${isDevis ? "devis" : "facture"}-FWE-${booking.client}-${booking.date}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(isDevis ? "Devis généré avec succès" : "Facture prestige générée avec succès", "success");
  };

  // Raccourci dédié pour générer un devis (utilisé sur les réservations "En attente").
  const generateDevisPDF = (booking) => generateInvoiceEvenementPDF(booking, "devis");

  const handleAddBooking = async () => {
    const errors = validateBookingComplete(newBooking, newBookingStops);
    if (Object.keys(errors).length > 0) {
      alert(Object.values(errors).join("\n"));
      return;
    }
    const shootingHeures = newBooking.shooting ? Number(newBooking.shootingHeures) || 0 : 0;
    const { distance, prixBase, shootingCost, prix } = calculatePrice(newBookingStops, newBooking.retour, shootingHeures);
    const avance = Number(newBooking.avance) || 0;
    const reste = calculateRest(prix, avance, newBooking.paiement);
    const newBookingComplete = {
      ...newBooking,
      id: Date.now(),
      distance,
      prixBase,
      shootingHeures,
      shootingCost,
      prix,
      reste,
      avance,
      trajetStops: [...newBookingStops],
      trajet: newBookingStops.join(", "),
    };
    const { error } = await supabase.from("bookings").insert(bookingToRow(newBookingComplete));
    if (error) {
      console.error(error);
      showNotification("Erreur Supabase : réservation non enregistrée", "error");
      return;
    }
    setBookings((prev) => [...prev, newBookingComplete]);
    localStorage.removeItem("fakhama-draft");
    setDraftBooking(null);
    setNewBooking({ client: "", phone: "", date: "", heure: "20:00", retour: false, paiement: "En attente", avance: "", lieuMarie: "", lieuMariee: "", salleFetes: "", lieuRetour: "", lieuShooting: "", decoration: "rubans", commentaires: "", shooting: false, shootingHeures: 1 });
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
    const shootingHeures = editBooking.shooting ? Number(editBooking.shootingHeures) || 0 : 0;
    const { distance, prixBase, shootingCost, prix } = calculatePrice(editBookingStops, editBooking.retour, shootingHeures);
    const avance = Number(editBooking.avance) || 0;
    const reste = calculateRest(prix, avance, editBooking.paiement);
    const updatedBooking = { ...editBooking, distance, prixBase, shootingHeures, shootingCost, prix, reste, avance, trajetStops: [...editBookingStops], trajet: editBookingStops.join(", ") };
    const { error } = await supabase.from("bookings").update(bookingToRow(updatedBooking)).eq("id", editBooking.id);
    if (error) {
      console.error(error);
      showNotification("Erreur Supabase : modification non enregistrée", "error");
      return;
    }
    setBookings((prev) => prev.map((b) => (b.id === editBooking.id ? updatedBooking : b)));
    setEditBooking(null);
    showNotification("Réservation modifiée avec succès", "success");
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette réservation ?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      console.error(error);
      showNotification("Erreur Supabase : suppression impossible", "error");
      return;
    }
    setBookings((prev) => prev.filter((b) => b.id !== id));
    showNotification("Réservation supprimée", "info");
  };

  const handleAddMaintenance = async () => {
    if (!newMaintenance.date || !newMaintenance.kilometrage || !newMaintenance.cout || !newMaintenance.type) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const record = { id: Date.now(), ...newMaintenance, kilometrage: parseInt(newMaintenance.kilometrage), cout: parseInt(newMaintenance.cout) };
    const { error } = await supabase.from("maintenances").insert(maintenanceToRow(record));
    if (error) { console.error(error); showNotification("Erreur Supabase : maintenance non enregistrée", "error"); return; }
    setMaintenances((prev) => [...prev, record]);
    setNewMaintenance({ date: new Date().toISOString().split("T")[0], kilometrage: "", type: "", description: "", cout: "" });
    showNotification("Maintenance ajoutée", "success");
  };
  const handleDeleteMaintenance = async (id) => {
    if (!window.confirm("Supprimer cette maintenance ?")) return;
    const { error } = await supabase.from("maintenances").delete().eq("id", id);
    if (error) { console.error(error); showNotification("Erreur Supabase : suppression impossible", "error"); return; }
    setMaintenances((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddAssurance = async () => {
    if (!newAssurance.dateDebut || !newAssurance.dateFin || !newAssurance.cout || !newAssurance.compagnie) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const record = { id: Date.now(), ...newAssurance, cout: parseInt(newAssurance.cout) };
    const { error } = await supabase.from("assurances").insert(assuranceToRow(record));
    if (error) { console.error(error); showNotification("Erreur Supabase : assurance non enregistrée", "error"); return; }
    setAssurances((prev) => [...prev, record]);
    setNewAssurance({ dateDebut: "", dateFin: "", compagnie: "", cout: "", numeroContrat: "" });
    showNotification("Assurance ajoutée", "success");
  };
  const handleDeleteAssurance = async (id) => {
    if (!window.confirm("Supprimer cette assurance ?")) return;
    const { error } = await supabase.from("assurances").delete().eq("id", id);
    if (error) { console.error(error); showNotification("Erreur Supabase : suppression impossible", "error"); return; }
    setAssurances((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddVignette = async () => {
    if (!newVignette.annee || !newVignette.cout) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const record = { id: Date.now(), ...newVignette, annee: parseInt(newVignette.annee), cout: parseInt(newVignette.cout) };
    const { error } = await supabase.from("vignettes").insert(vignetteToRow(record));
    if (error) { console.error(error); showNotification("Erreur Supabase : vignette non enregistrée", "error"); return; }
    setVignettes((prev) => [...prev, record]);
    setNewVignette({ annee: new Date().getFullYear(), cout: "", datePaiement: new Date().toISOString().split("T")[0] });
    showNotification("Vignette ajoutée", "success");
  };
  const handleDeleteVignette = async (id) => {
    if (!window.confirm("Supprimer cette vignette ?")) return;
    const { error } = await supabase.from("vignettes").delete().eq("id", id);
    if (error) { console.error(error); showNotification("Erreur Supabase : suppression impossible", "error"); return; }
    setVignettes((prev) => prev.filter((v) => v.id !== id));
  };

  const handleAddCarburant = async () => {
    if (!newCarburant.date || !newCarburant.quantite || !newCarburant.prixLitre || !newCarburant.kilometrage) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const record = {
      id: Date.now(), ...newCarburant,
      quantite: parseFloat(newCarburant.quantite),
      prixLitre: parseFloat(newCarburant.prixLitre),
      kilometrage: parseInt(newCarburant.kilometrage),
      coutTotal: parseFloat(newCarburant.quantite) * parseFloat(newCarburant.prixLitre),
    };
    const { error } = await supabase.from("carburants").insert(carburantToRow(record));
    if (error) { console.error(error); showNotification("Erreur Supabase : plein non enregistré", "error"); return; }
    setCarburants((prev) => [...prev, record]);
    setNewCarburant({ date: new Date().toISOString().split("T")[0], quantite: "", prixLitre: "", kilometrage: "", station: "" });
    showNotification("Plein ajouté", "success");
  };
  const handleDeleteCarburant = async (id) => {
    if (!window.confirm("Supprimer cet enregistrement ?")) return;
    const { error } = await supabase.from("carburants").delete().eq("id", id);
    if (error) { console.error(error); showNotification("Erreur Supabase : suppression impossible", "error"); return; }
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

    // Rentabilité par réservation : on alloue le coût variable (carburant + maintenance)
    // au prorata des km parcourus par réservation, pour estimer une marge brute par
    // trajet (hors coûts fixes comme assurance/vignette, non liés à un trajet précis).
    const totalKmDriven = bookings.reduce((sum, b) => sum + (Number(b.distance) || 0), 0);
    const variableCosts = totalCarburantCost + totalMaintenanceCost;
    const costPerKm = totalKmDriven > 0 ? variableCosts / totalKmDriven : 0;
    const avgMargin = bookings.length > 0
      ? bookings.reduce((sum, b) => sum + (b.prix - (Number(b.distance) || 0) * costPerKm), 0) / bookings.length
      : 0;

    return {
      totalRevenue, totalDepenses, totalMaintenanceCost, totalAssuranceCost,
      totalVignetteCost, totalCarburantCost, netProfit: totalRevenue - totalDepenses,
      totalBookings: bookings.length,
      paidBookings: bookings.filter((b) => b.paiement === "Payé").length,
      pendingBookings: bookings.filter((b) => b.paiement === "Avance").length,
      unpaidBookings: bookings.filter((b) => b.paiement === "Non payé").length,
      quoteBookings: bookings.filter((b) => b.paiement === "En attente").length,
      costPerKm, avgMargin,
    };
  };

  const stats = calculateStats();

  // Filtre + recherche (nom client ou téléphone)
  const filteredBookings = bookings
    .filter((b) => {
      if (filter.date && b.date !== filter.date) return false;
      if (filter.status && b.paiement !== filter.status) return false;
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        const matchClient = (b.client || "").toLowerCase().includes(s);
        const matchPhone = (b.phone || "").toLowerCase().includes(s);
        if (!matchClient && !matchPhone) return false;
      }
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

  // Pagination client-side du tableau des réservations
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedBookings = filteredBookings.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  );

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

  if (dataLoading && bookings.length === 0 && !dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données depuis Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={() => setAuthenticated(false)} />

      <main className="flex-1 min-w-0">
        {dataError && (
          <div className="bg-red-600 text-white text-sm px-4 py-2 flex items-center justify-between">
            <span>⚠️ {dataError}</span>
            <button onClick={loadAllData} className="underline font-medium">Réessayer</button>
          </div>
        )}

        {/* Topbar façon "Good Morning" */}
        <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bonjour, Taz 👋</h1>
            <p className="text-sm text-gray-500">Bienvenue sur votre tableau de bord Fakhama</p>
          </div>
          <div className="flex items-center gap-4 text-gray-400 text-lg">
            <span title="Rechercher">🔍</span>
            <span title="Notifications">🔔</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-6 px-8">

          {activeTab === "simulation" && <PriceSimulation />}

          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <AllReminders bookings={bookings} assurances={assurances} />
              <RealTimeStats bookings={bookings} />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <KpiCard
                  label="Revenus"
                  value={formatCurrency(stats.totalRevenue)}
                  deltaLabel={`${stats.totalBookings} réservations`}
                  progress={stats.totalRevenue > 0 ? 70 : 0}
                  color="rose"
                />
                <KpiCard
                  label="Bénéfice net"
                  value={formatCurrency(stats.netProfit)}
                  deltaLabel={`Marge ${stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%`}
                  progress={stats.totalRevenue > 0 ? Math.max(0, (stats.netProfit / stats.totalRevenue) * 100) : 0}
                  color={stats.netProfit >= 0 ? "green" : "red"}
                />
                <KpiCard
                  label="Dépenses totales"
                  value={formatCurrency(stats.totalDepenses)}
                  deltaLabel="Maintenance, assurance, vignette, carburant"
                  progress={stats.totalRevenue > 0 ? Math.min(100, (stats.totalDepenses / stats.totalRevenue) * 100) : 0}
                  color="red"
                />
                <KpiCard
                  label="En attente (avance)"
                  value={stats.pendingBookings}
                  deltaLabel="Réservations avec avance"
                  progress={stats.totalBookings > 0 ? (stats.pendingBookings / stats.totalBookings) * 100 : 0}
                  color="amber"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <KpiCard
                  label="Devis en attente"
                  value={stats.quoteBookings}
                  deltaLabel="Réservations à confirmer par le client"
                  color="amber"
                />
                <KpiCard
                  label="Coût variable / km"
                  value={`${stats.costPerKm.toFixed(2)} DT/km`}
                  deltaLabel="Carburant + Maintenance, alloués aux km parcourus"
                  color="rose"
                />
                <KpiCard
                  label="Marge brute moy. / résa"
                  value={formatCurrency(stats.avgMargin)}
                  deltaLabel="Hors coûts fixes (assurance, vignette)"
                  color={stats.avgMargin >= 0 ? "green" : "red"}
                />
              </div>

              <AnnualSummaryChart bookings={bookings} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReservationsVsTarget bookings={bookings} />
                <RevenueByCity bookings={bookings} />
              </div>

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
                      <Badge variant={paiementVariant(booking.paiement)}>
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

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rechercher (nom ou téléphone)</label>
                    <input
                      type="text"
                      placeholder="Ex: Sami, 93993619..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par date</label>
                    <input type="date" value={filter.date || ""} onChange={(e) => setFilter((prev) => ({ ...prev, date: e.target.value || undefined }))} className={inputClass} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par statut</label>
                    <select value={filter.status || ""} onChange={(e) => setFilter((prev) => ({ ...prev, status: e.target.value || undefined }))} className={inputClass}>
                      <option value="">Tous les statuts</option>
                      {PAIEMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <button onClick={() => { setFilter({}); setSearch(""); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">Réinitialiser</button>
                </div>
              </div>

              {/* NEW BOOKING FORM */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
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

                {/* ── ÉTAPE 1 : Itinéraire (choisi en premier) ─────────────────── */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-rose-600 uppercase tracking-wide mb-3">1. Itinéraire</h3>
                  <MultiStopSelector stops={newBookingStops} onChange={setNewBookingStops} />
                  <div className="mt-3 flex flex-wrap items-center gap-3 bg-rose-50 rounded-lg px-4 py-3 border border-rose-100">
                    <span className="text-sm text-rose-700 font-medium">Prix estimé :</span>
                    <span className="text-xl font-bold text-rose-600">
                      {formatCurrency(calculateTotalPrice(newBookingStops, newBooking.retour, newBooking.shooting ? newBooking.shootingHeures : 0).prix)}
                    </span>
                    <span className="text-xs text-rose-500">
                      ({calculateTotalPrice(newBookingStops, newBooking.retour, newBooking.shooting ? newBooking.shootingHeures : 0).distance} km total
                      {newBooking.shooting ? ` + ${formatCurrency(calculateShootingCost(newBooking.shootingHeures))} shooting` : ""})
                    </span>
                  </div>
                  <div className="mt-3">
                    <ItineraryMap stops={newBookingStops} title="🗺️ Aperçu de l'itinéraire (marié → mariée → salle)" />
                  </div>
                </div>

                {/* ── ÉTAPE 2 : Données du client ───────────────────────────────── */}
                <h3 className="text-sm font-semibold text-rose-600 uppercase tracking-wide mb-3 border-t pt-4">2. Informations client</h3>
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
                    <div className="flex gap-2">
                      <input type="number" placeholder="Montant de l'avance" value={newBooking.avance}
                        onChange={(e) => handleFieldChange("avance", Number(e.target.value))}
                        className={validationErrors.avance ? inputErrorClass : inputClass} />
                      <button
                        type="button"
                        title={`Calculer ${Math.round(ACOMPTE_PERCENTAGE * 100)}% du prix total`}
                        onClick={() => {
                          const { prix } = calculateTotalPrice(newBookingStops, newBooking.retour, newBooking.shooting ? newBooking.shootingHeures : 0);
                          handleFieldChange("avance", calculateAcompte(prix));
                        }}
                        className="shrink-0 px-3 py-2 text-xs font-medium bg-rose-100 text-rose-700 rounded-md hover:bg-rose-200 whitespace-nowrap"
                      >
                        {Math.round(ACOMPTE_PERCENTAGE * 100)}%
                      </button>
                    </div>
                    {validationErrors.avance && <p className="text-red-500 text-xs mt-1">{validationErrors.avance}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      Acompte {Math.round(ACOMPTE_PERCENTAGE * 100)}% = {formatCurrency(calculateAcompte(calculateTotalPrice(newBookingStops, newBooking.retour, newBooking.shooting ? newBooking.shootingHeures : 0).prix))} · Solde avant l'événement = {formatCurrency(calculateTotalPrice(newBookingStops, newBooking.retour, newBooking.shooting ? newBooking.shootingHeures : 0).prix - calculateAcompte(calculateTotalPrice(newBookingStops, newBooking.retour, newBooking.shooting ? newBooking.shootingHeures : 0).prix))}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut Paiement</label>
                    <select value={newBooking.paiement} onChange={(e) => handleNewBookingPaiementChange(e.target.value)} className={inputClass}>
                      {PAIEMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {newBooking.paiement === "En attente" && (
                      <p className="text-xs text-amber-600 mt-1">Devis envoyé, en attente de confirmation du client.</p>
                    )}
                    {newBooking.paiement === "Avance" && (
                      <p className="text-xs text-rose-600 mt-1">Acompte {Math.round(ACOMPTE_PERCENTAGE * 100)}% calculé et mis à jour automatiquement selon l'itinéraire — modifiable ci-dessus.</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-6">
                    <input type="checkbox" id="retour" checked={newBooking.retour}
                      onChange={(e) => setNewBooking({ ...newBooking, retour: e.target.checked })}
                      className="rounded border-gray-300" />
                    <label htmlFor="retour" className="text-sm font-medium text-gray-700 cursor-pointer">Avec retour (+100 DT)</label>
                  </div>
                  <div className="flex items-center space-x-2 mt-6">
                    <input type="checkbox" id="shooting" checked={newBooking.shooting}
                      onChange={(e) => setNewBooking({ ...newBooking, shooting: e.target.checked })}
                      className="rounded border-gray-300" />
                    <label htmlFor="shooting" className="text-sm font-medium text-gray-700 cursor-pointer">📸 Shooting photo/vidéo (50 DT/h)</label>
                  </div>
                  {newBooking.shooting && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'heures de shooting</label>
                      <input type="number" min="0.5" step="0.5" value={newBooking.shootingHeures}
                        onChange={(e) => setNewBooking({ ...newBooking, shootingHeures: Math.max(0, Number(e.target.value)) })}
                        className={inputClass} />
                    </div>
                  )}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                  <h3 className="md:col-span-2 text-lg font-semibold text-rose-600">💍 Détails de l'évenement</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📍 Emplacement du Marié</label>
                    <input type="text" value={newBooking.lieuMarie}
                      onChange={(e) => setNewBooking({ ...newBooking, lieuMarie: e.target.value })}
                      placeholder="Adresse de prise en charge du marié" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📍 Emplacement de la Mariée</label>
                    <input type="text" value={newBooking.lieuMariee}
                      onChange={(e) => setNewBooking({ ...newBooking, lieuMariee: e.target.value })}
                      placeholder="Adresse de prise en charge de la mariée" className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">🎪 Salle des Fêtes</label>
                    <input type="text" value={newBooking.salleFetes}
                      onChange={(e) => setNewBooking({ ...newBooking, salleFetes: e.target.value })}
                      placeholder="Nom et adresse de la salle des fêtes" className={inputClass} />
                  </div>
                  {newBooking.retour && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">🔄 Lieu du Retour</label>
                      <input type="text" value={newBooking.lieuRetour}
                        onChange={(e) => setNewBooking({ ...newBooking, lieuRetour: e.target.value })}
                        placeholder="Adresse de dépose au retour" className={inputClass} />
                    </div>
                  )}
                  {newBooking.shooting && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">📸 Lieu du Shooting</label>
                      <input type="text" value={newBooking.lieuShooting}
                        onChange={(e) => setNewBooking({ ...newBooking, lieuShooting: e.target.value })}
                        placeholder="Lieu de la séance photo/vidéo" className={inputClass} />
                    </div>
                  )}
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
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">💍 Réservations Evenement ({filteredBookings.length})</h2>
                  <p className="text-xs text-gray-500">Triées : date récente ↑ · même date : heure tardive ↑ / heure tôt ↓</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        {["Client","Téléphone","Date","Heure","Itinéraire","Km","Shooting","Prix","Avance","Reste","Marge est.","Paiement","Retour","Actions"].map((h) => (
                          <th key={h} className="border border-gray-300 px-4 py-2 text-left text-sm text-gray-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBookings.length === 0 ? (
                        <tr><td colSpan={14} className="border border-gray-300 px-4 py-8 text-center text-gray-500">Aucune réservation trouvée</td></tr>
                      ) : paginatedBookings.map((b, idx) => {
                        const prevDate = idx > 0 ? paginatedBookings[idx - 1].date : null;
                        const isNewDateGroup = b.date !== prevDate;
                        const margin = b.prix - (Number(b.distance) || 0) * stats.costPerKm;
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
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{b.shootingHeures ? `${b.shootingHeures}h` : "-"}</td>
                            <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-900">{b.prix}</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{b.avance || 0}</td>
                            <td className={`border border-gray-300 px-4 py-2 font-semibold ${b.reste > 0 && b.paiement === "Avance" ? "text-amber-600" : b.paiement === "Payé" ? "text-green-600" : "text-red-600"}`}>
                              {b.reste}{b.paiement === "Payé" && " ✓"}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 font-semibold">
                              <span className={margin >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(margin)}</span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <Badge variant={paiementVariant(b.paiement)}>{b.paiement}</Badge>
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <Badge variant={b.retour ? "default" : "outline"}>{b.retour ? "Oui" : "Non"}</Badge>
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <div className="flex flex-wrap gap-1">
                                {b.paiement === "En attente" ? (
                                  <button onClick={() => generateDevisPDF(b)} className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs">📝 Devis</button>
                                ) : (
                                  <button onClick={() => generateInvoiceEvenementPDF(b)} className="px-2 py-1 bg-rose-600 text-white rounded hover:bg-rose-700 text-xs">💍 Facture</button>
                                )}
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

                {filteredBookings.length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                    <span>Page {safeCurrentPage} / {totalPages} — {filteredBookings.length} résultat(s)</span>
                    <div className="flex gap-2">
                      <button
                        disabled={safeCurrentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ← Précédent
                      </button>
                      <button
                        disabled={safeCurrentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Suivant →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* MAINTENANCE TAB */}
          {activeTab === "maintenance" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">🔧 Maintenance</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">➕ Ajouter une Vignette</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Année *</label><input type="number" value={newVignette.annee} onChange={(e) => setNewVignette({ ...newVignette, annee: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Coût (DT) *</label><input type="number" placeholder="Coût" value={newVignette.cout} onChange={(e) => setNewVignette({ ...newVignette, cout: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Date de Paiement</label><input type="date" value={newVignette.datePaiement} onChange={(e) => setNewVignette({ ...newVignette, datePaiement: e.target.value })} className={inputClass} /></div>
                </div>
                <button onClick={handleAddVignette} className="mt-4 bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700">📋 Ajouter</button>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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

                  <div>
                    <MultiStopSelector stops={editBookingStops} onChange={setEditBookingStops} />
                    <div className="mt-3 flex flex-wrap items-center gap-3 bg-rose-50 rounded-lg px-4 py-3 border border-rose-100">
                      <span className="text-sm text-rose-700 font-medium">Nouveau prix estimé :</span>
                      <span className="text-xl font-bold text-rose-600">
                        {formatCurrency(calculateTotalPrice(editBookingStops, editBooking.retour, editBooking.shooting ? editBooking.shootingHeures : 0).prix)}
                      </span>
                      <span className="text-xs text-rose-500">
                        ({calculateTotalPrice(editBookingStops, editBooking.retour, editBooking.shooting ? editBooking.shootingHeures : 0).distance} km)
                      </span>
                    </div>
                    <div className="mt-3">
                      <ItineraryMap stops={editBookingStops} title="🗺️ Aperçu de l'itinéraire" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Client</label><input value={editBooking.client} onChange={(e) => setEditBooking({ ...editBooking, client: e.target.value })} className={inputClass} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label><input value={editBooking.phone || ""} onChange={(e) => setEditBooking({ ...editBooking, phone: e.target.value })} className={inputClass} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={editBooking.date} onChange={(e) => setEditBooking({ ...editBooking, date: e.target.value })} className={inputClass} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Heure</label><input type="time" value={editBooking.heure} onChange={(e) => setEditBooking({ ...editBooking, heure: e.target.value })} className={inputClass} /></div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Avance (DT)</label>
                      <div className="flex gap-2">
                        <input type="number" value={editBooking.avance || 0} onChange={(e) => setEditBooking({ ...editBooking, avance: Number(e.target.value) })} className={inputClass} />
                        <button
                          type="button"
                          title={`Calculer ${Math.round(ACOMPTE_PERCENTAGE * 100)}% du prix total`}
                          onClick={() => {
                            const { prix } = calculateTotalPrice(editBookingStops, editBooking.retour, editBooking.shooting ? editBooking.shootingHeures : 0);
                            setEditBooking({ ...editBooking, avance: calculateAcompte(prix) });
                          }}
                          className="shrink-0 px-3 py-2 text-xs font-medium bg-rose-100 text-rose-700 rounded-md hover:bg-rose-200 whitespace-nowrap"
                        >
                          {Math.round(ACOMPTE_PERCENTAGE * 100)}%
                        </button>
                      </div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Statut Paiement</label>
                      <select value={editBooking.paiement} onChange={(e) => handleEditBookingPaiementChange(e.target.value)} className={inputClass}>
                        {PAIEMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="edit-retour" checked={editBooking.retour}
                        onChange={(e) => setEditBooking({ ...editBooking, retour: e.target.checked })} className="rounded border-gray-300" />
                      <label htmlFor="edit-retour" className="text-sm font-medium text-gray-700 cursor-pointer">Avec retour (+100 DT)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="edit-shooting" checked={!!editBooking.shooting}
                        onChange={(e) => setEditBooking({ ...editBooking, shooting: e.target.checked })} className="rounded border-gray-300" />
                      <label htmlFor="edit-shooting" className="text-sm font-medium text-gray-700 cursor-pointer">📸 Shooting photo/vidéo (50 DT/h)</label>
                    </div>
                    {editBooking.shooting && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'heures de shooting</label>
                        <input type="number" min="0.5" step="0.5" value={editBooking.shootingHeures || 1}
                          onChange={(e) => setEditBooking({ ...editBooking, shootingHeures: Math.max(0, Number(e.target.value)) })}
                          className={inputClass} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <h3 className="md:col-span-2 text-lg font-semibold text-rose-600">💍 Détails</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">📍 Emplacement du Marié</label>
                      <input type="text" value={editBooking.lieuMarie || ""} onChange={(e) => setEditBooking({ ...editBooking, lieuMarie: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">📍 Emplacement de la Mariée</label>
                      <input type="text" value={editBooking.lieuMariee || ""} onChange={(e) => setEditBooking({ ...editBooking, lieuMariee: e.target.value })} className={inputClass} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">🎪 Salle des Fêtes</label>
                      <input type="text" value={editBooking.salleFetes || ""} onChange={(e) => setEditBooking({ ...editBooking, salleFetes: e.target.value })} className={inputClass} />
                    </div>
                    {editBooking.retour && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">🔄 Lieu du Retour</label>
                        <input type="text" value={editBooking.lieuRetour || ""} onChange={(e) => setEditBooking({ ...editBooking, lieuRetour: e.target.value })} className={inputClass} />
                      </div>
                    )}
                    {editBooking.shooting && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">📸 Lieu du Shooting</label>
                        <input type="text" value={editBooking.lieuShooting || ""} onChange={(e) => setEditBooking({ ...editBooking, lieuShooting: e.target.value })} className={inputClass} />
                      </div>
                    )}
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
      </main>
    </div>
  );
}