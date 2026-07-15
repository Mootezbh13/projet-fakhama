import { useEffect } from "react";

const Notification = ({ message, type = "info", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);
  const variants = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
  };
  return (
    <div className={`fixed top-4 right-4 left-4 md:left-auto z-50 md:min-w-80 ${variants[type]} border rounded-lg p-4 shadow-lg`}>
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium">{message}</p>
        <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600">✕</button>
      </div>
    </div>
  );
};

// ── MODALE DE CONFIRMATION ─────────────────────────────────────────────────────

export default Notification;
