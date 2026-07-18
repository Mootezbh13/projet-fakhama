import { PAIEMENT_STATUSES } from "../lib/constants";
import { formatBookingItineraire, formatCurrency, paiementVariant } from "../lib/calculations";
import Badge from "./Badge";
import WhatsAppButton from "./WhatsAppButton";

const BookingCard = ({ booking: b, onEdit, onDelete, onDevis, onFacture, docNum, onStatusChange, onArchive }) => {
  const itineraire = formatBookingItineraire(b);
  const handleActionClick = (event, callback, payload) => {
    event.preventDefault();
    event.stopPropagation();
    callback?.(payload);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3 relative z-10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{b.client}</p>
          {b.phone && <p className="text-xs text-gray-500">{b.phone}</p>}
        </div>
        {onStatusChange ? (
          <select
            value={b.paiement}
            onChange={(e) => onStatusChange?.(b, e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className={`text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer appearance-auto focus:outline-none focus:ring-2 focus:ring-rose-400 ${
              b.paiement === "Payé" ? "bg-green-100 text-green-800" :
              b.paiement === "Avance" ? "bg-gray-100 text-gray-800" :
              b.paiement === "En attente" ? "bg-amber-100 text-amber-800" :
              "bg-red-100 text-red-800"
            }`}
          >
            {PAIEMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <Badge variant={paiementVariant(b.paiement)}>{b.paiement}</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Date</p>
          <p className="text-gray-800">{b.date} · {b.heure}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Distance</p>
          <p className="text-gray-800">{b.distance || 0} km{b.retour ? " · retour" : ""}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Itinéraire</p>
          <p className="text-gray-800 text-xs">{itineraire}</p>
        </div>
        {b.shootingHeures ? (
          <div className="col-span-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Shooting</p>
            <p className="text-gray-800">{b.shootingHeures}h — {formatCurrency(b.shootingCost || 0)}</p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Prix</p>
          <p className="font-bold text-gray-900">{formatCurrency(b.prix)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Avance / Reste</p>
          <p className="text-gray-800">{formatCurrency(b.avance || 0)} / <span className={b.reste > 0 && b.paiement === "Avance" ? "text-amber-600 font-semibold" : b.paiement === "Payé" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>{formatCurrency(b.reste || 0)}</span></p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1 relative z-10">
        {onDevis && b.paiement === "En attente" ? (
          <button type="button" onClick={(e) => handleActionClick(e, onDevis, b)} className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs">📝 Devis</button>
        ) : (
          onFacture && <button type="button" onClick={(e) => handleActionClick(e, onFacture, b)} className="px-2 py-1 bg-rose-600 text-white rounded hover:bg-rose-700 text-xs">💍 Facture</button>
        )}
        <WhatsAppButton booking={b} docNum={docNum} onFacture={onFacture} />
        {onEdit && <button type="button" onClick={(e) => handleActionClick(e, onEdit, b)} className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 text-xs">Modifier</button>}
        {onDelete && <button type="button" onClick={(e) => handleActionClick(e, onDelete, b.id)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs">Supprimer</button>}
      </div>
    </div>
  );
};

export default BookingCard;