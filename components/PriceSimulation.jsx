import { useState } from "react";
import { formatCurrency, calculateShootingCost, calculateTotalPrice, calculateAcompte } from "../lib/calculations";
import ItineraryMap from "./ItineraryMap";
import MultiStopSelector from "./MultiStopSelector";

const PriceSimulation = ({ bookings = [] }) => {
  const [stops, setStops] = useState(["Tunis"]);
  const [retour, setRetour] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [shootingHeures, setShootingHeures] = useState(1);
  const [checkDate, setCheckDate] = useState("");

  // Vérifie la disponibilité de la date saisie
  const dateStatus = (() => {
    if (!checkDate) return null;
    const matches = bookings.filter((b) => b.date === checkDate && b.paiement !== "Non payé");
    if (matches.length === 0) return { free: true };
    return { free: false, bookings: matches };
  })();

  const { distance, prixBase, shootingCost, prix } = calculateTotalPrice(
    stops,
    retour,
    shooting ? shootingHeures : 0
  );
  const acompte = calculateAcompte(prix);
  const solde = prix - acompte;

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
                  <li>• BMW Série 3 2026</li>
                  <li>• Chauffeur professionnel</li>
                  <li>• Décoration nuptiale luxe</li>
                  <li>• Service durant la cérémonie</li>
                  <li>• Rafraîchissements offerts</li>
                </ul>
              </div>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-xl p-6 border border-rose-200">
              <div className="text-center mb-4">
              {distance > 0 && (
                <div className="bg-white/70 rounded-lg p-3 mb-4 border border-rose-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-rose-700 font-medium uppercase tracking-wide">Acompte à la réservation (30%)</p>
                    <p className="text-lg font-bold text-rose-700">{formatCurrency(acompte)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Solde restant</p>
                    <p className="text-sm font-semibold text-gray-700">{formatCurrency(solde)}</p>
                  </div>
                </div>
              )}
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
                      ? "1,650 DT/km (> 200 km)"
                      : "2,0 DT/km (≤ 200 km)"}
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

      {/* ── Vérification de disponibilité ── */}
      <div className="bg-white rounded-lg shadow-lg border border-rose-100">
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 px-6 py-4 border-b border-rose-200">
          <h2 className="text-xl font-bold text-rose-800">📅 Vérifier une disponibilité</h2>
          <p className="text-sm text-rose-600 mt-0.5">Entrez une date pour voir si elle est libre ou déjà réservée</p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <input
              type="date"
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
              className="px-4 py-2 border-2 border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900 text-base"
            />
            {checkDate && (
              <span className="text-sm text-gray-500">
                {new Date(checkDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </span>
            )}
          </div>

          {dateStatus && (
            <div className={`mt-4 rounded-xl p-4 border ${dateStatus.free ? "bg-green-50 border-green-200" : dateStatus.bookings?.every((b) => b.paiement === "En attente") ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200"}`}>
              {dateStatus.free ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-green-800">Date disponible !</p>
                    <p className="text-sm text-green-700">Aucune réservation confirmée ce jour-là.</p>
                  </div>
                </div>
              ) : (
                <div>
                  {(() => {
                    const allPending = dateStatus.bookings.every((b) => b.paiement === "En attente");
                    const hasPending = dateStatus.bookings.some((b) => b.paiement === "En attente");
                    const hasConfirmed = dateStatus.bookings.some((b) => b.paiement !== "En attente");
                    return (
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{allPending ? "🟠" : "🚫"}</span>
                        <div>
                          <p className={`font-semibold ${allPending ? "text-orange-800" : "text-red-800"}`}>
                            {allPending ? "À vérifier — devis en attente de confirmation" : "Date déjà réservée"}
                          </p>
                          <p className={`text-sm ${allPending ? "text-orange-700" : "text-red-700"}`}>
                            {dateStatus.bookings.length} entrée{dateStatus.bookings.length > 1 ? "s" : ""} ce jour-là
                            {hasPending && hasConfirmed ? " (dont des devis non confirmés)" : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="space-y-2">
                    {dateStatus.bookings.map((b) => {
                      const isPending = b.paiement === "En attente";
                      return (
                      <div key={b.id} className={`bg-white rounded-lg px-4 py-2 border flex items-center justify-between ${isPending ? "border-orange-200" : "border-red-200"}`}>
                        <div>
                          <span className="font-medium text-gray-900">{b.client}</span>
                          {b.phone && <span className="text-sm text-gray-500 ml-2">· {b.phone}</span>}
                          <span className="text-sm text-gray-500 ml-2">· {b.heure}</span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.paiement === "Payé" ? "bg-green-100 text-green-700" : b.paiement === "Avance" ? "bg-amber-100 text-amber-700" : b.paiement === "En attente" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                          {b.paiement}
                        </span>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── WEEK VIEW (nouveau) ──────────────────────────────────────────────────────────
// Vue hebdomadaire du calendrier, utile en haute saison pour voir tous les
// évènements de la semaine sans être limité par l'espace réduit des cases du mois.

export default PriceSimulation;
