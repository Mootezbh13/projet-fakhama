// lib/constants.js
// Constantes métier Fakhama — prix, statuts, villes, décoration.

export const CITY_NAMES = ["Tunis", "Sousse", "Monastir", "Sfax", "Mahdia", "Bizerte", "Nabeul", "Beja", "Zaghouan"];

export const PRIX_BASE_EVENEMENT   = 350;
export const PRIX_PAR_KM_NORMAL    = 2.1;
export const PRIX_PAR_KM_REDUIT    = 1.7;
export const SUPPLEMENT_RETOUR     = 100;
export const PRIX_SHOOTING_HEURE   = 50;
export const RESERVATION_TARGET_MENSUEL = 6;
export const ACOMPTE_PERCENTAGE    = 0.3;

export const PAIEMENT_STATUSES = ["En attente", "Payé", "Avance", "Non payé"];

export const DECORATION_OPTIONS = [
  { value: "rubans", label: "Rubans traditionnels" },
  { value: "fleurs", label: "Fleurs fraîches" },
  { value: "mixte", label: "Mixte rubans et fleurs" },
];

export const cityCoords = {
  Tunis:    [36.8065, 10.1815],
  Sousse:   [35.8256, 10.6084],
  Monastir: [35.7771, 10.8262],
  Sfax:     [34.7406, 10.7603],
  Mahdia:   [35.5047, 11.0622],
  Bizerte:  [37.2746,  9.8739],
  Nabeul:   [36.4333, 10.7333],
  Beja:     [36.7256,  9.1817],
  Zaghouan: [36.4028, 10.1428],
};

export const maintenancePlan = [
  { kilometrage: 10000,  type: "Vidange",      description: "Vidange d'huile moteur, Remplacement filtre à air et filtre à huile" },
  { kilometrage: 20000,  type: "Filtres",       description: "Filtre d'habitacle" },
  { kilometrage: 80000,  type: "Distribution",  description: "Contrôle courroie de distribution" },
  { kilometrage: 100000, type: "Révision",      description: "Révision générale complète" },
];
