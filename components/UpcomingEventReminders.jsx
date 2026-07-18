import { buildRappelMessage, formatBookingItineraire } from "../lib/calculations";
import Badge from "./Badge";

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

  const sendRappel = (b) => {
    const msg = buildRappelMessage(b);
    const phone = b.phone ? b.phone.replace(/\D/g, "") : "";
    const url = phone
      ? `https://wa.me/${phone.startsWith("216") ? phone : "216" + phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-2 mb-4">
      {upcoming.map((b) => {
        const isUrgent = b.daysLeft <= 3;
        const itineraire = formatBookingItineraire(b);
        const showRappel = b.daysLeft === 1 && b.phone;
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
            {showRappel && (
              <button
                onClick={() => sendRappel(b)}
                className="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg font-semibold shrink-0"
                title={`Envoyer rappel J-1 à ${b.client}`}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Rappel J-1
              </button>
            )}
            <Badge variant={b.daysLeft === 0 ? "destructive" : isUrgent ? "destructive" : "warning"}>
              {b.daysLeft === 0 ? "AUJOURD'HUI" : `J-${b.daysLeft}`}
            </Badge>
          </div>
        );
      })}
    </div>
  );
};


export default UpcomingEventReminders;
