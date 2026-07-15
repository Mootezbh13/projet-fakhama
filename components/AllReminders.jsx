import InsuranceExpiryWarning from "./InsuranceExpiryWarning";
import UpcomingEventReminders from "./UpcomingEventReminders";

const AllReminders = ({ bookings, assurances }) => (
  <>
    <UpcomingEventReminders bookings={bookings} />
    <InsuranceExpiryWarning assurances={assurances} />
  </>
);

// Bouton WhatsApp — visible uniquement pour les statuts "Avance" ou "Payé".
// Un clic ouvre WhatsApp avec le message pré-rempli (détails + facture).
// Deux boutons sont affichés :
//   1. 📋 Détails   → confirmation de réservation + itinéraire
//   2. 📄 Facture   → récapitulatif financier complet (N°, prix, avance, reste)
// Séparés pour contourner la limite de longueur de l'URL wa.me (~2000 caractères encodés).

export default AllReminders;
