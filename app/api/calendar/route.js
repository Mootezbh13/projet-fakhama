import { createClient } from "@supabase/supabase-js";

// Toujours recalculé à la demande, jamais mis en cache par Next.js/Vercel.
export const dynamic = "force-dynamic";

function pad(n) {
  return String(n).padStart(2, "0");
}

// "YYYY-MM-DD" -> "YYYYMMDD" (format DATE d'iCalendar)
function toIcsDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

// DTEND est exclusif en iCalendar pour un événement "journée entière" -> +1 jour
function addOneDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function escapeIcsText(str = "") {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function GET(request) {
  // Protection simple : sans le bon token, on ne révèle aucune date.
  const token = request.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.CALENDAR_FEED_SECRET) {
    return new Response("Accès refusé", { status: 403 });
  }

  // Clé service_role : contourne les policies RLS ("authenticated" uniquement)
  // car Google/Apple Calendar interrogent cette URL sans être connectés à l'app.
  // Ne JAMAIS préfixer cette variable d'env par NEXT_PUBLIC_.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select("id, date, heure, paiement")
    .order("date", { ascending: true });

  if (error) {
    return new Response("Erreur base de données", { status: 500 });
  }

  const now = new Date();
  const dtstamp =
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T` +
    `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const events = (bookings || [])
    .filter((b) => b.date)
    .map((b) => {
      // Pas de nom de client dans le titre : cette URL peut être interrogée
      // par des serveurs tiers (Google/Apple), donc on reste minimal côté vie privée.
      const label = b.paiement === "En attente" ? "Devis en attente" : "Réservé";
      const summary = b.heure ? `${label} — ${b.heure}` : label;

      return [
        "BEGIN:VEVENT",
        `UID:booking-${b.id}@fakhama.tn`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${toIcsDate(b.date)}`,
        `DTEND;VALUE=DATE:${addOneDay(b.date)}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        "TRANSP:OPAQUE",
        "STATUS:CONFIRMED",
        "END:VEVENT",
      ].join("\r\n");
    });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fakhama Weddings & Events//Calendrier Reservations//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Fakhama — Dates réservées",
    "X-WR-TIMEZONE:Africa/Tunis",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="fakhama-reservations.ics"',
      "Cache-Control": "no-store",
    },
  });
}