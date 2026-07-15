import { CITY_NAMES } from "../lib/constants";

const MultiStopSelector = ({ stops, onChange }) => {
  const addStop = () => {
    if (stops.length < 4) onChange([...stops, "Tunis"]);
  };
  const removeStop = (idx) => onChange(stops.filter((_, i) => i !== idx));
  const updateStop = (idx, val) => onChange(stops.map((s, i) => (i === idx ? val : s)));

  const fullRoute = ["Tunis (départ)", ...stops];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        🗺️ Itinéraire des arrêts
        <span className="text-xs text-gray-400 ml-2">(départ toujours depuis Tunis)</span>
      </label>

      <div className="flex flex-wrap items-center gap-1 text-xs text-gray-600 bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">
        {fullRoute.map((city, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className={`font-semibold ${i === 0 ? "text-rose-600" : "text-gray-800"}`}>
              {i === 0 ? "📍 " : ""}{city}
            </span>
            {i < fullRoute.length - 1 && <span className="text-rose-300">→</span>}
          </span>
        ))}
        {stops.length > 0 && (
          <>
            <span className="text-rose-300">→</span>
            <span className="text-gray-400 italic">fin</span>
          </>
        )}
      </div>

      <div className="space-y-2">
        {stops.map((stop, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16 shrink-0">Arrêt {idx + 1}</span>
            <select
              value={stop}
              onChange={(e) => updateStop(idx, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900 bg-white text-sm"
            >
              {CITY_NAMES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            {idx > 0 && (
              <button
                onClick={() => removeStop(idx)}
                className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                title="Supprimer cet arrêt"
              >
                ×
              </button>
            )}
            {idx === 0 && <span className="w-5" />}
          </div>
        ))}
      </div>

      {stops.length < 4 && (
        <button
          onClick={addStop}
          className="text-sm text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium"
        >
          <span className="text-lg leading-none">+</span> Ajouter un arrêt
        </button>
      )}
    </div>
  );
};


export default MultiStopSelector;
