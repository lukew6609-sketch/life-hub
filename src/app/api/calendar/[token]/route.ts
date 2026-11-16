import { createClient } from "@supabase/supabase-js";

// Public iCal feed protected by a secret token. Subscribe to it from Google / Apple Calendar.
export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const raw = token.replace(/\.ics$/, "");
  if (!/^[0-9a-f-]{36}$/i.test(raw)) return new Response("Not found", { status: 404 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const { data, error } = await supabase.rpc("calendar_events", { p_token: raw });
  if (error) return new Response("Error", { status: 500 });

  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Life Hub//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Life Hub", "REFRESH-INTERVAL;VALUE=DURATION:PT12H"];
  for (const e of data ?? []) {
    const d = String(e.event_date).replace(/-/g, "");
    const next = new Date(e.event_date + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@life-hub`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, "")}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(e.details ?? "")}`,
      "BEGIN:VALARM",
      "TRIGGER:-P14D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(e.title)} in 2 weeks`,
      "END:VALARM",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n"), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
}
