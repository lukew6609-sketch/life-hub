import type { SupabaseClient } from "@supabase/supabase-js";
import { daysUntil, money, priceTrend, yearly } from "./money";

export type AttentionItem = {
  key: string;
  title: string;
  detail: string;
  date: string;
  days: number;
  href: string;
  kind: "renewal" | "car" | "warranty" | "energy" | "date" | "loan";
};

/** Everything with a date coming up (or overdue) inside `windowDays`. */
export async function getAttention(supabase: SupabaseClient, windowDays: number) {
  const [c, ph, v, w, e, k, inc, prot] = await Promise.all([
    supabase.from("commitments").select("*").eq("active", true).not("end_date", "is", null),
    supabase.from("price_history").select("commitment_id, effective_date, amount, frequency"),
    supabase.from("vehicles").select("*"),
    supabase.from("warranties").select("*").not("expiry_date", "is", null),
    supabase.from("energy_tariffs").select("*").eq("is_current", true).not("end_date", "is", null),
    supabase.from("key_dates").select("*").eq("done", false),
    supabase.from("income").select("*").eq("active", true).not("end_date", "is", null),
    supabase.from("protection").select("*").eq("status", "active").not("end_date", "is", null),
  ]);

  const items: AttentionItem[] = [];
  const within = (d?: string | null) => !!d && daysUntil(d) <= windowDays;

  for (const x of c.data ?? []) {
    if (!within(x.end_date)) continue;
    const hist = (ph.data ?? []).filter((p) => p.commitment_id === x.id);
    const trend = priceTrend(hist);
    const bits = [
      x.provider,
      x.amount ? `currently ${money(yearly(x.amount, x.frequency))}/yr` : null,
      trend ? `avg ${trend.avgPct >= 0 ? "+" : ""}${trend.avgPct.toFixed(1)}%/yr over ${trend.points.length} prices` : null,
      x.auto_renews ? "auto-renews: shop around first" : "won't auto-renew",
    ].filter(Boolean);
    items.push({
      key: "c" + x.id,
      title: `${x.name} ${daysUntil(x.end_date) < 0 ? "ended" : "renews / ends"}`,
      detail: bits.join(" · "),
      date: x.end_date,
      days: daysUntil(x.end_date),
      href: `/bills/${x.id}`,
      kind: "renewal",
    });
  }

  for (const car of v.data ?? []) {
    const label = [car.registration, car.make, car.model].filter(Boolean).join(" ");
    for (const [field, name] of [
      ["mot_due", "MOT due"],
      ["tax_due", "Car tax due"],
      ["service_due", "Service due"],
    ] as const) {
      const d = car[field];
      if (within(d)) items.push({ key: field + car.id, title: `${name}: ${car.registration}`, detail: label, date: d, days: daysUntil(d), href: "/cars", kind: "car" });
    }
  }

  for (const x of w.data ?? []) {
    if (within(x.expiry_date))
      items.push({ key: "w" + x.id, title: `Warranty ends: ${x.item}`, detail: [x.brand, x.retailer].filter(Boolean).join(" · "), date: x.expiry_date, days: daysUntil(x.expiry_date), href: "/warranties", kind: "warranty" });
  }

  for (const x of e.data ?? []) {
    if (within(x.end_date))
      items.push({
        key: "e" + x.id,
        title: `${x.fuel === "gas" ? "Gas" : "Electric"} fix ends: ${x.supplier}`,
        detail: [x.tariff_name, x.exit_fee ? `exit fee ${money(x.exit_fee)}` : null, "compare deals before it rolls onto a variable rate"].filter(Boolean).join(" · "),
        date: x.end_date,
        days: daysUntil(x.end_date),
        href: "/energy",
        kind: "energy",
      });
  }

  for (const x of k.data ?? []) {
    if (within(x.due_date))
      items.push({ key: "k" + x.id, title: x.title, detail: x.notes ?? x.category ?? "", date: x.due_date, days: daysUntil(x.due_date), href: "/dates", kind: "date" });
  }

  for (const x of inc.data ?? []) {
    if (within(x.end_date))
      items.push({ key: "i" + x.id, title: `${x.name} ends`, detail: [x.source, x.amount ? `${money(x.amount)} ${x.frequency}` : null].filter(Boolean).join(" · "), date: x.end_date, days: daysUntil(x.end_date), href: "/income", kind: "date" });
  }

  for (const x of prot.data ?? []) {
    if (within(x.end_date))
      items.push({ key: "p" + x.id, title: `Cover ends: ${x.name}`, detail: [x.insurer, x.people_covered].filter(Boolean).join(" · "), date: x.end_date, days: daysUntil(x.end_date), href: "/cover", kind: "renewal" });
  }

  return items.sort((a, b) => a.days - b.days);
}

export async function getAlertDays(supabase: SupabaseClient) {
  const { data } = await supabase.from("settings").select("alert_days").maybeSingle();
  return data?.alert_days ?? 45;
}
