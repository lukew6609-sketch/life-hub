const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const gbp0 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

export const money = (n?: number | string | null, whole = false) =>
  n === null || n === undefined || n === "" ? "—" : (whole ? gbp0 : gbp).format(Number(n));

const PER_YEAR: Record<string, number> = {
  weekly: 52,
  fortnightly: 26,
  four_weekly: 13,
  monthly: 12,
  ten_monthly: 10,
  quarterly: 4,
  six_monthly: 2,
  annually: 1,
  one_off: 0,
};

export const yearly = (amount?: number | string | null, frequency?: string | null) =>
  Number(amount ?? 0) * (PER_YEAR[frequency ?? "monthly"] ?? 12);

export const monthly = (amount?: number | string | null, frequency?: string | null) => yearly(amount, frequency) / 12;

export const fmtDate = (d?: string | null) =>
  d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function daysUntil(d: string) {
  const a = new Date(todayISO() + "T00:00:00").getTime();
  const b = new Date(d + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

export function relDays(n: number) {
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n < 0) return `${-n} days overdue`;
  if (n < 60) return `in ${n} days`;
  return `in ${Math.round(n / 30.4)} months`;
}

type PricePoint = { effective_date: string; amount: number | string; frequency: string };

/** Average yearly % change across a commitment's price history (annualised cost). */
export function priceTrend(history: PricePoint[]) {
  const pts = [...history]
    .filter((p) => p.amount !== null)
    .sort((a, b) => a.effective_date.localeCompare(b.effective_date))
    .map((p) => ({ date: p.effective_date, yearly: yearly(p.amount, p.frequency) }));
  if (pts.length < 2 || pts[0].yearly <= 0) return null;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const years = Math.max((new Date(last.date).getTime() - new Date(first.date).getTime()) / (365.25 * 86400000), 0.5);
  const totalPct = (last.yearly / first.yearly - 1) * 100;
  const avgPct = (Math.pow(last.yearly / first.yearly, 1 / years) - 1) * 100;
  return { first, last, totalPct, avgPct, points: pts };
}

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
