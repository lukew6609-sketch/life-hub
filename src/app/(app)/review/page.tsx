import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { categoryLabel, frequencyLabel } from "@/lib/fields";
import { money, monthly, priceTrend, yearly } from "@/lib/money";
import { Card, Empty, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

type Bill = { id: string; name: string; amount: number | null; frequency: string; category: string; start_date: string | null; end_date: string | null; provider: string | null };

const MONTHS_BETWEEN: Record<string, number> = { quarterly: 3, six_monthly: 6, annually: 12 };

/** Project the next 12 months of payments, putting quarterly/yearly lumps in the month they land. */
function projectYear(bills: Bill[]) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-GB", { month: "short" }), regular: 0, lumps: [] as { name: string; amount: number }[] };
  });
  for (const b of bills) {
    if (!b.amount || b.frequency === "one_off") continue;
    const step = MONTHS_BETWEEN[b.frequency];
    const anchor = b.end_date ?? b.start_date;
    if (!step || !anchor) {
      months.forEach((m) => (m.regular += monthly(b.amount, b.frequency)));
      continue;
    }
    const a = new Date(anchor + "T00:00:00");
    months.forEach((m, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const diff = (d.getFullYear() - a.getFullYear()) * 12 + (d.getMonth() - a.getMonth());
      if (((diff % step) + step) % step === 0) m.lumps.push({ name: b.name, amount: Number(b.amount) });
    });
  }
  return months.map((m) => ({ ...m, total: m.regular + m.lumps.reduce((s, l) => s + l.amount, 0) }));
}

export default async function Review() {
  const { supabase } = await requireUser();
  const [{ data: bills }, { data: history }] = await Promise.all([
    supabase.from("commitments").select("id, name, amount, frequency, category, start_date, end_date, provider").eq("active", true),
    supabase.from("price_history").select("commitment_id, effective_date, amount, frequency"),
  ]);
  const list = (bills ?? []) as Bill[];
  if (list.length === 0)
    return (
      <div>
        <PageHeader title="Yearly review" />
        <Empty>Add some bills first and your yearly picture will build up here.</Empty>
      </div>
    );

  const perYear = list.reduce((s, b) => s + yearly(b.amount, b.frequency), 0);
  const year = projectYear(list);
  const peak = Math.max(...year.map((m) => m.total), 1);

  const cats = new Map<string, number>();
  for (const b of list) cats.set(b.category, (cats.get(b.category) ?? 0) + yearly(b.amount, b.frequency));
  const catRows = [...cats.entries()].sort((a, b) => b[1] - a[1]);

  const trends = list
    .map((b) => ({ b, t: priceTrend((history ?? []).filter((h) => h.commitment_id === b.id)) }))
    .filter((x) => x.t)
    .sort((a, b) => b.t!.avgPct - a.t!.avgPct);

  const biggest = [...list].sort((a, b) => yearly(b.amount, b.frequency) - yearly(a.amount, a.frequency)).slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader title="Yearly review" subtitle="Where the money goes, and what's creeping up" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Per year" value={money(perYear, true)} />
        <Stat label="Average month" value={money(perYear / 12, true)} />
        <Stat label="Biggest month ahead" value={money(peak, true)} sub={year.find((m) => m.total === peak)?.label} />
        <Stat label="Bills tracked" value={String(list.length)} sub={`${trends.length} with price history`} />
      </div>

      <Card title="Next 12 months" action={<span className="text-xs text-stone-500">yearly & quarterly payments land in their month</span>}>
        <div className="flex items-end gap-1.5 h-48">
          {year.map((m) => (
            <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <div className="w-full flex flex-col justify-end" style={{ height: `${(m.total / peak) * 100}%` }}>
                {m.lumps.length > 0 && <div className="bg-amber-400 rounded-t" style={{ height: `${((m.total - m.regular) / m.total) * 100}%` }} />}
                <div className={`bg-emerald-600 ${m.lumps.length ? "" : "rounded-t"}`} style={{ height: `${(m.regular / m.total) * 100}%` }} />
              </div>
              <span className="text-[11px] text-stone-500 mt-1">{m.label}</span>
              <div className="hidden group-hover:block absolute bottom-full mb-2 z-10 bg-stone-900 text-white text-xs rounded-lg p-2 w-48">
                <p className="font-medium">{money(m.total)}</p>
                {m.lumps.map((l) => (
                  <p key={l.name}>
                    {l.name}: {money(l.amount)}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-xs text-stone-500 mt-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 bg-emerald-600 rounded-sm" /> Regular</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 bg-amber-400 rounded-sm" /> Yearly / quarterly payments</span>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="By category">
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Month</th>
                <th className="text-right">Year</th>
                <th className="text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {catRows.map(([c, v]) => (
                <tr key={c}>
                  <td>{categoryLabel(c)}</td>
                  <td className="text-right tabular-nums">{money(v / 12)}</td>
                  <td className="text-right tabular-nums">{money(v, true)}</td>
                  <td className="text-right tabular-nums text-stone-500">{((v / perYear) * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Biggest bills">
          <table className="table">
            <tbody>
              {biggest.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/bills/${b.id}`} className="hover:text-emerald-700">{b.name}</Link>
                    <div className="text-xs text-stone-500">{money(b.amount)} {frequencyLabel(b.frequency).toLowerCase()}</div>
                  </td>
                  <td className="text-right tabular-nums">{money(yearly(b.amount, b.frequency), true)}/yr</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card title="Price rises">
        {trends.length === 0 ? (
          <p className="text-sm text-stone-500">
            Price changes are recorded every time you update a bill&apos;s amount. You can also add last year&apos;s prices on each bill&apos;s page to see the trend now.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Bill</th>
                <th className="text-right">Was</th>
                <th className="text-right">Now</th>
                <th className="text-right">Avg / year</th>
              </tr>
            </thead>
            <tbody>
              {trends.map(({ b, t }) => (
                <tr key={b.id}>
                  <td><Link href={`/bills/${b.id}`} className="hover:text-emerald-700">{b.name}</Link></td>
                  <td className="text-right tabular-nums">{money(t!.first.yearly, true)}</td>
                  <td className="text-right tabular-nums">{money(t!.last.yearly, true)}</td>
                  <td className={`text-right tabular-nums font-medium ${t!.avgPct > 5 ? "text-red-600" : t!.avgPct > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {t!.avgPct >= 0 ? "+" : ""}
                    {t!.avgPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
