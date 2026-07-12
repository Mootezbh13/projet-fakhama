// lib/helpers.js
// Fonctions utilitaires pures — calculs, formatage.
import {
  PRIX_BASE_EVENEMENT, PRIX_PAR_KM_NORMAL, PRIX_PAR_KM_REDUIT,
  SUPPLEMENT_RETOUR, PRIX_SHOOTING_HEURE, ACOMPTE_PERCENTAGE,
  cityCoords,
} from "./constants";

export const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const calculateDistance = (from, to) => {
  if (from === to) return 0;
  const [lat1, lon1] = cityCoords[from] || [0, 0];
  const [lat2, lon2] = cityCoords[to]   || [0, 0];
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
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

export const calculateItineraryPrice = (stops, retour) => {
  const distance = calculateItineraryDistance(stops);
  let prix = PRIX_BASE_EVENEMENT;
  if (distance > 0) {
    prix += stops.length > 1
      ? distance * 2
      : distance > 200 ? distance * PRIX_PAR_KM_REDUIT : distance * PRIX_PAR_KM_NORMAL;
  }
  if (retour) prix += SUPPLEMENT_RETOUR;
  return { distance, prix: arrondirPrix(prix) };
};

export const calculateShootingCost  = (heures) => (Number(heures) || 0) * PRIX_SHOOTING_HEURE;

export const calculateTotalPrice = (stops, retour, shootingHeures) => {
  const { distance, prix } = calculateItineraryPrice(stops, retour);
  const shootingCost = calculateShootingCost(shootingHeures);
  return { distance, prixBase: prix, shootingCost, prix: prix + shootingCost };
};

export const calculateAcompte = (prix, pct = ACOMPTE_PERCENTAGE) => arrondirPrix(prix * pct);

export const calculateRest = (prix, avance, status) => {
  if (status === "Payé")      return 0;
  if (status === "Non payé")  return prix;
  return Math.max(0, prix - (Number(avance) || 0));
};

export const paiementVariant = (status) => {
  switch (status) {
    case "Payé":        return "success";
    case "Avance":      return "secondary";
    case "En attente":  return "warning";
    default:            return "destructive";
  }
};
