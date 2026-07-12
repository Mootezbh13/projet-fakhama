// supabase/functions/whatsapp-rappels/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Edge Function Supabase — envoi automatique des rappels WhatsApp J-1 (veille).
//
// DÉPLOIEMENT :
//   1. Installer la CLI Supabase : https://supabase.com/docs/guides/cli
//   2. supabase login
//   3. supabase functions deploy whatsapp-rappels --project-ref tcakgvztbvtisgegqxch
//
// CRON (planification quotidienne à 9h00 UTC) :
//   Dashboard Supabase → Edge Functions → whatsapp-rappels → Schedule
//   Ou via SQL dans le Dashboard SQL Editor :
//
//   select cron.schedule(
//     'rappels-whatsapp-quotidien',
//     '0 9 * * *',
//     $$
//       select net.http_post(
//         url := 'https://tcakgvztbvtisgegqxch.supabase.co/functions/v1/whatsapp-rappels',
//         headers := '{"Authorization": "Bearer <SUPABASE_ANON_KEY>", "Content-Type": "application/json"}'::jsonb,
//         body := '{}'::jsonb
//       );
//     $$
//   );
//
// VARIABLE D'ENVIRONNEMENT requise (Dashboard → Settings → Edge Functions) :
//   CALLMEBOT_APIKEY  — clé API gratuite CallMeBot (https://www.callmebot.com/blog/free-api-whatsapp-messages/)
//   PHONE_OVERRIDE    — (optionnel) numéro par défaut si le client n'a pas de téléphone
//   FAKHAMA_PHONE     — +21693993619 (pour les notifications admin)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CALLMEBOT_APIKEY = Deno.env.get("CALLMEBOT_APIKEY") ?? "";
const FAKHAMA_PHONE = Deno.env.get("FAKHAMA_PHONE") ?? "21693993619";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatCurrency = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 0 }).format(n);

const addDays = (dateStr: string, n: number): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

const todayStr = () => new Date().toISOString().split("T")[0];

// ── Construire le message de rappel ──────────────────────────────────────────
function buildMessage(booking: Record<string, unknown>): string {
  const itineraire = Array.isArray(booking.trajet_stops) && booking.trajet_stops.length > 0
    ? ["Tunis", ...booking.trajet_stops as string[]].join(" → ")
    : String(booking.trajet ?? "Tunis");

  return `🌸 *Fakhama Weddings & Events* 🌸
_BMW Série 3 2026_

🔔 *Rappel — votre événement est demain !*

👤 *Client :* ${booking.client}
📅 *Date :* ${booking.date} à ${booking.heure}
📍 *Itinéraire :* ${itineraire}
🔄 *Retour :* ${booking.retour ? "Oui" : "Non"}${booking.retour && booking.lieu_retour ? ` (${booking.lieu_retour})` : ""}
${booking.shooting_heures ? `📸 *Shooting :* ${booking.shooting_heures}h\n` : ""}
💰 *Reste à payer :* ${formatCurrency(Number(booking.reste) || 0)}

📞 Pour toute question : +216 93 993 619
_À très bientôt ✨_`.trim();
}

// ── Envoyer via CallMeBot (WhatsApp gratuit) ─────────────────────────────────
async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!CALLMEBOT_APIKEY) {
    console.warn("CALLMEBOT_APIKEY non défini — simulation uniquement");
    console.log(`[SIMULATION] → ${phone}: ${message.substring(0, 80)}...`);
    return true;
  }
  // CallMeBot : https://api.callmebot.com/whatsapp.php?phone=PHONE&text=TEXT&apikey=KEY
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${CALLMEBOT_APIKEY}`;
  try {
    const res = await fetch(url);
    return res.ok;
  } catch (err) {
    console.error("Erreur envoi WhatsApp:", err);
    return false;
  }
}

// ── Handler principal ────────────────────────────────────────────────────────
Deno.serve(async (_req) => {
  const today = todayStr();
  const j1 = addDays(today, 1); // événement demain

  // Récupérer uniquement les réservations de demain, statut ≠ Non payé
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("date", j1)
    .neq("paiement", "Non payé");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results: { client: string; phone: string; sent: boolean }[] = [];

  for (const booking of bookings ?? []) {
    if (!booking.phone) {
      console.warn(`Pas de téléphone pour ${booking.client} — rappel ignoré`);
      continue;
    }

    const rawPhone = String(booking.phone).replace(/\D/g, "");
    const phone = rawPhone.startsWith("216") ? rawPhone : `216${rawPhone}`;
    const message = buildMessage(booking);
    const sent = await sendWhatsApp(phone, message);

    results.push({ client: booking.client, phone, sent });
    console.log(`[J-1] ${booking.client} → ${sent ? "✅ envoyé" : "❌ échec"}`);
  }

  // Notifier l'admin Fakhama du récapitulatif
  if (results.length > 0) {
    const recap = `🌸 *Fakhama — Rappels J-1 du ${j1}*\n${results.map((r) =>
      `${r.sent ? "✅" : "❌"} ${r.client}`
    ).join("\n")}`;
    await sendWhatsApp(FAKHAMA_PHONE, recap);
  }

  return new Response(
    JSON.stringify({ date: today, evenements_demain: j1, rappels_envoyés: results.length, détail: results }),
    { headers: { "Content-Type": "application/json" } }
  );
});
