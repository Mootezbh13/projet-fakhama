import Badge from "./Badge";

const InsuranceExpiryWarning = ({ assurances }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiringSoon = assurances
    .map(a => {
      const expiryDate = new Date(a.dateFin);
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      return { ...a, daysUntilExpiry };
    })
    .filter(a => a.daysUntilExpiry <= 30 && a.daysUntilExpiry >= 0)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  if (expiringSoon.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {expiringSoon.map(a => (
        <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium shadow-sm bg-yellow-50 border-yellow-300 text-yellow-800">
          <span className="text-xl">⚠️</span>
          <span className="flex-1">
            Assurance {a.compagnie} expire le {a.dateFin}
            {a.daysUntilExpiry === 0 ? " (AUJOURD'HUI)" : ` (J-${a.daysUntilExpiry})`}
          </span>
          <Badge variant="warning">Expire bientôt</Badge>
        </div>
      ))}
    </div>
  );
};

// Génère le message WhatsApp de rappel J-1 (veille de l'événement)

export default InsuranceExpiryWarning;
