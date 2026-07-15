import { buildMapEmbedUrl } from "../lib/calculations";

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

export default ItineraryMap;
