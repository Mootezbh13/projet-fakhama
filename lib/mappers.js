// Conversion entre les noms de champs de l'app (camelCase) et ceux de la base
// Supabase (snake_case).
export const bookingToRow = (b) => ({
  id: b.id,
  client: b.client,
  phone: b.phone || null,
  date: b.date,
  heure: b.heure,
  retour: !!b.retour,
  paiement: b.paiement,
  avance: Number(b.avance) || 0,
  reste: Number(b.reste) || 0,
  lieu_marie: b.lieuMarie || null,
  lieu_mariee: b.lieuMariee || null,
  salle_fetes: b.salleFetes || null,
  lieu_retour: b.lieuRetour || null,
  lieu_shooting: b.lieuShooting || null,
  decoration: b.decoration || "rubans",
  commentaires: b.commentaires || null,
  shooting: !!b.shooting,
  shooting_heures: Number(b.shootingHeures) || 0,
  shooting_cost: Number(b.shootingCost) || 0,
  distance: Number(b.distance) || 0,
  prix_base: Number(b.prixBase) || 0,
  prix: Number(b.prix) || 0,
  trajet_stops: b.trajetStops || [],
  trajet: b.trajet || "",
});

export const rowToBooking = (r) => ({
  id: r.id,
  client: r.client,
  phone: r.phone || "",
  date: r.date,
  heure: r.heure,
  retour: r.retour,
  paiement: r.paiement,
  avance: r.avance,
  reste: r.reste,
  lieuMarie: r.lieu_marie || "",
  lieuMariee: r.lieu_mariee || "",
  salleFetes: r.salle_fetes || "",
  lieuRetour: r.lieu_retour || "",
  lieuShooting: r.lieu_shooting || "",
  decoration: r.decoration || "rubans",
  commentaires: r.commentaires || "",
  shooting: r.shooting,
  shootingHeures: r.shooting_heures,
  shootingCost: r.shooting_cost,
  distance: r.distance,
  prixBase: r.prix_base,
  prix: r.prix,
  trajetStops: r.trajet_stops || [],
  trajet: r.trajet || "",
});

export const maintenanceToRow = (m) => ({
  id: m.id, date: m.date, kilometrage: m.kilometrage, type: m.type,
  description: m.description || null, cout: m.cout,
});
export const rowToMaintenance = (r) => ({ ...r });

export const assuranceToRow = (a) => ({
  id: a.id, date_debut: a.dateDebut, date_fin: a.dateFin,
  compagnie: a.compagnie, cout: a.cout, numero_contrat: a.numeroContrat || null,
});
export const rowToAssurance = (r) => ({
  id: r.id, dateDebut: r.date_debut, dateFin: r.date_fin,
  compagnie: r.compagnie, cout: r.cout, numeroContrat: r.numero_contrat || "",
});

export const vignetteToRow = (v) => ({ id: v.id, annee: v.annee, cout: v.cout, date_paiement: v.datePaiement });
export const rowToVignette = (r) => ({ id: r.id, annee: r.annee, cout: r.cout, datePaiement: r.date_paiement });

export const carburantToRow = (c) => ({
  id: c.id, date: c.date, quantite: c.quantite, prix_litre: c.prixLitre,
  kilometrage: c.kilometrage, station: c.station || null, cout_total: c.coutTotal,
});
export const rowToCarburant = (r) => ({
  id: r.id, date: r.date, quantite: r.quantite, prixLitre: r.prix_litre,
  kilometrage: r.kilometrage, station: r.station || "", coutTotal: r.cout_total,
});

