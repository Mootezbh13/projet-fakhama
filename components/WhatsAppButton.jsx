"use client";
// components/WhatsAppButton.jsx
// Bouton WhatsApp unique — visible uniquement pour les statuts "Avance" ou "Payé".
// Envoie les détails de réservation + récapitulatif de la facture en un seul message.
import React from "react";
import { DECORATION_OPTIONS } from "@/lib/constants";
import { formatCurrency } from "@/lib/helpers";

export default function WhatsAppButton({ booking, docNum }) {
  if (booking.paiement !== "Avance" && booking.paiement !== "Payé") return null;

  const handleWhatsApp = () => {
    const decorationLabel =
      DECORATION_OPTIONS.find((d) => d.value === booking.decoration)?.label ||
      "Rubans traditionnels";

    const message = `🌸 *Fakhama Weddings & Events* 🌸
_BMW Série 3 2026_

✅ *Confirmation de Réservation*

👤 *Client :* ${booking.client}
📅 *Date :* ${booking.date} à ${booking.heure}
📍 *Itinéraire :* ${booking.trajetStops ? ["Tunis", ...booking.trajetStops].join(" → ") : booking.trajet}
🛣️ *Distance totale :* ${booking.distance} km
🔄 *Service retour :* ${booking.retour ? "Oui" : "Non"}${booking.retour && booking.lieuRetour ? ` (${booking.lieuRetour})` : ""}
${booking.shootingHeures ? `📸 *Shooting :* ${booking.shootingHeures}h (${formatCurrency(booking.shootingCost || 0)})${booking.lieuShooting ? ` — ${booking.lieuShooting}` : ""}\n` : ""}
💍 *Détails événement :*
- Marié : ${booking.lieuMarie || "À confirmer"}
- Mariée : ${booking.lieuMariee || "À confirmer"}
- Salle : ${booking.salleFetes || "À confirmer"}
- Décoration : ${decorationLabel}

📄 *Facture N° ${docNum || "—"}*
💰 Prix total : ${formatCurrency(booking.prix)}
✅ Avance versée : ${formatCurrency(booking.avance || 0)}
${booking.reste > 0 ? `⏳ Reste à payer : ${formatCurrency(booking.reste)}\n` : ""}🏷️ Statut : ${booking.paiement}

📞 Contact : +216 93 993 619
_Merci pour votre confiance ✨_`.trim();

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
      title="Envoyer détails + facture via WhatsApp"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      WhatsApp
    </button>
  );
}
