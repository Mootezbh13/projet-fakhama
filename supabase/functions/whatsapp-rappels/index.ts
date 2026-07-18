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
//   WHATSAPP_CLOUD_API_TOKEN      — jeton d'accès WhatsApp Cloud API
//   WHATSAPP_CLOUD_PHONE_NUMBER_ID — ID du numéro WhatsApp Cloud API
//   PHONE_OVERRIDE                — (optionnel) numéro par défaut si le client n'a pas de téléphone
//   FAKHAMA_PHONE                 — +21693993619 (pour les notifications admin)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_CLOUD_API_TOKEN = Deno.env.get("WHATSAPP_CLOUD_API_TOKEN") ?? "";
const WHATSAPP_CLOUD_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_CLOUD_PHONE_NUMBER_ID") ?? "";
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

const normalizePhone = (phoneRaw: unknown): string => {
  const digits = String(phoneRaw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00216")) return digits.slice(2);
  if (digits.startsWith("216")) return digits;
  if (digits.startsWith("0")) return `216${digits.slice(1)}`;
  return digits;
};

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

// ── Envoyer via WhatsApp Cloud API ────────────────────────────────────────
async function sendWhatsAppCloudAPI(phone: string, message: string): Promise<boolean> {
  if (!WHATSAPP_CLOUD_API_TOKEN || !WHATSAPP_CLOUD_PHONE_NUMBER_ID) {
    console.error("WhatsApp Cloud API non configurée.");
    return false;
  }

  const url = `https://graph.facebook.com/v17.0/${WHATSAPP_CLOUD_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: {
      body: message,
      preview_url: false,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_CLOUD_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("WhatsApp Cloud API erreur:", res.status, data);
      return false;
    }
    console.log("WhatsApp Cloud API envoyé:", data);
    return true;
  } catch (err) {
    console.error("Erreur WhatsApp Cloud API:", err);
    return false;
  }
}

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  return sendWhatsAppCloudAPI(phone, message);
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

    const phone = normalizePhone(booking.phone);
    if (!phone) {
      console.warn(`Numéro invalide pour ${booking.client} (${booking.phone}) — rappel ignoré`);
      continue;
    }

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
