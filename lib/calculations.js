import {
  PRIX_SHOOTING_HEURE,
  PRIX_BASE_EVENEMENT,
  PRIX_PAR_KM_NORMAL,
  PRIX_PAR_KM_REDUIT,
  SUPPLEMENT_RETOUR,
  ACOMPTE_PERCENTAGE,
  DECORATION_OPTIONS,
  cityCoords,
} from "./constants";

// ── HELPERS ───────────────────────────────────────────────────────────────────
export const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};


export const calculateDistance = (from, to) => {
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

export const calculateItineraryDistance = (stops) => {
  if (!stops || stops.length === 0) return 0;
  const fullRoute = ["Tunis", ...stops];
  let total = 0;
  for (let i = 0; i < fullRoute.length - 1; i++) {
    total += calculateDistance(fullRoute[i], fullRoute[i + 1]);
  }
  return total;
};

export const arrondirPrix = (prix) => Math.ceil(prix / 10) * 10;

export const formatCurrency = (amount) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(amount);

export const getMonthName = (month) => {
  const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  return months[month - 1];
};

// Mappe un statut de paiement vers un variant de Badge (cohérent partout dans l'app).
export const paiementVariant = (status) => {
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

export const calculateItineraryPrice = (stops, retour) => {
  const distance = calculateItineraryDistance(stops);
  let prix = PRIX_BASE_EVENEMENT;
  if (distance > 0) {
    if (stops.length > 1) {
      prix += distance * 2;
    } else {
      prix += distance > 150 ? distance * PRIX_PAR_KM_REDUIT : distance * PRIX_PAR_KM_NORMAL;
    }
  }
  if (retour) prix += SUPPLEMENT_RETOUR;
  return { distance, prix: arrondirPrix(prix) };
};

export const calculateShootingCost = (heures) => (Number(heures) || 0) * PRIX_SHOOTING_HEURE;

export const calculateTotalPrice = (stops, retour, shootingHeures) => {
  const { distance, prix } = calculateItineraryPrice(stops, retour);
  const shootingCost = calculateShootingCost(shootingHeures);
  return { distance, prixBase: prix, shootingCost, prix: prix + shootingCost };
};

// Calcule le montant de l'acompte (30% par défaut) à partir du prix total.
export const calculateAcompte = (prix, pct = ACOMPTE_PERCENTAGE) => arrondirPrix(prix * pct);

// ── SMALL UI COMPONENTS ───────────────────────────────────────────────────────

export const buildMapEmbedUrl = (stops) => {
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


export const buildRappelMessage = (b) => {
  const decorationLabel = DECORATION_OPTIONS.find((d) => d.value === b.decoration)?.label || "Rubans traditionnels";
  const itineraire = b.trajetStops ? ["Tunis", ...b.trajetStops].join(" → ") : b.trajet || "Tunis";
  return `🌸 *Fakhama Weddings & Events* 🌸
_BMW Série 3 2026_

🔔 *Rappel — votre événement est demain !*

👤 *Client :* ${b.client}
📅 *Date :* ${b.date} à ${b.heure}
📍 *Itinéraire :* ${itineraire}
🔄 *Retour :* ${b.retour ? "Oui" : "Non"}${b.retour && b.lieuRetour ? ` (${b.lieuRetour})` : ""}
${b.shooting ? `📸 *Shooting :* ${b.shootingHeures}h${b.lieuShooting ? ` — ${b.lieuShooting}` : ""}\n` : ""}
💍 *Détails :*
- Marié : ${b.lieuMarie || "À confirmer"}
- Mariée : ${b.lieuMariee || "À confirmer"}
- Salle : ${b.salleFetes || "À confirmer"}
- Décoration : ${decorationLabel}

💰 *Reste à payer :* ${formatCurrency(b.reste || 0)}

📞 Pour toute question : +216 93 993 619
_À très bientôt ✨_`.trim();
};


export const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = dimanche
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

