import { requireUser } from "@/lib/supabase/server";
import { frequencyLabel, incomeCategoryLabel } from "@/lib/fields";
import { fmtDate, money, monthly, ordinal, priceTrend, yearly } from "@/lib/money";
import RecordForm from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";
import { Card, DueBadge, Empty, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Income() {
  const { supabase } = await requireUser();
  const [{ data: inc }, { data: hist }, { data: bills }] = await Promise.all([
    supabase.from("income").select("*").order("active", { ascending: false }).order("amount", { ascending: false }),
    supabase.from("income_history").select("*").order("effective_date"),
    supabase.from("commitments").select("name, amount, frequency, category").eq("active", true),
  ]);
  const list = inc ?? [];
  const active = list.filter((i) => i.active);
  const inMonth = active.reduce((s, i) => s + monthly(i.amount, i.frequency), 0);
  const outMonth = (bills ?? []).reduce((s, b) => s + monthly(b.amount, b.frequency), 0);
  const left = inMonth - outMonth;

  // Rental property: rent received vs bills in the "Rental property" category
  const rentIn = active.filter((i) => i.category === "rent").reduce((s, i) => s + monthly(i.amount, i.frequency), 0);
  const rentalCosts = (bills ?? []).filter((b) => b.category === "rental");
  const rentOut = rentalCosts.reduce((s, b) => s + monthly(b.amount, b.frequency), 0);
  const profit = rentIn - rentOut;

  return (
    <div className="space-y-6">
      <PageHeader title="Money in" subtitle="Wages, rent and anything else coming in, against what goes out">
        <RecordForm table="income" label="Add income" title="Add money coming in" />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="In / month" value={money(inMonth, true)} sub={`${money(inMonth * 12, true)} a year`} />
        <Stat label="Bills out / month" value={money(outMonth, true)} sub={`${money(outMonth * 12, true)} a year`} href="/bills" />
        <Stat label="Left after bills" value={money(left, true)} sub={`${money(left * 12, true)} a year, before day-to-day spending`} />
        <Stat label="Bills take up" value={inMonth ? `${Math.round((outMonth / inMonth) * 100)}%` : "—"} sub="of what comes in" />
      </div>

      {(rentIn > 0 || rentOut > 0) && (
        <Card title="Rental property">
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-stone-500">Rent in</p>
              <p className="text-xl font-semibold tabular-nums">{money(rentIn)}<span className="text-xs text-stone-500 font-normal">/mo</span></p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Costs out</p>
              <p className="text-xl font-semibold tabular-nums">{money(rentOut)}<span className="text-xs text-stone-500 font-normal">/mo</span></p>
              <ul className="text-xs text-stone-500 mt-1">
                {rentalCosts.map((b) => (
                  <li key={b.name}>{b.name}: {money(monthly(b.amount, b.frequency))}/mo</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs text-stone-500">Profit</p>
              <p className={`text-xl font-semibold tabular-nums ${profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{money(profit)}<span className="text-xs text-stone-500 font-normal">/mo</span></p>
              <p className="text-xs text-stone-500">{money(profit * 12, true)} a year, before tax, repairs and fees</p>
            </div>
          </div>
          <p className="text-xs text-stone-500 mt-3">Add any other property costs (repairs, safety certificates, agent fees) as bills in the &quot;Rental property&quot; category and they&apos;ll come off here.</p>
        </Card>
      )}

      {list.length === 0 ? (
        <Empty>Nothing added yet.</Empty>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map((i) => {
            const h = (hist ?? []).filter((x) => x.income_id === i.id);
            const t = priceTrend(h);
            return (
              <Card key={i.id} className={i.active ? "" : "opacity-60"}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-stone-500">
                      {[i.source, incomeCategoryLabel(i.category), i.payment_day ? `around the ${ordinal(i.payment_day)}` : null, !i.active ? "stopped" : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex">
                    <RecordForm table="income" record={i} variant="icon" title={`Edit ${i.name}`} />
                    <DeleteButton table="income" id={i.id} what={i.name} />
                  </div>
                </div>
                <p className="text-2xl font-semibold tabular-nums mt-2">
                  {money(i.amount)} <span className="text-sm text-stone-500 font-normal">{frequencyLabel(i.frequency).toLowerCase()}</span>
                </p>
                <p className="text-xs text-stone-500">{money(yearly(i.amount, i.frequency), true)} a year</p>
                {i.end_date && <div className="text-xs mt-2">Ends: <DueBadge date={i.end_date} /></div>}
                {t && (
                  <p className={`text-xs mt-2 ${t.avgPct >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {t.avgPct >= 0 ? "Up" : "Down"} {Math.abs(t.totalPct).toFixed(0)}% since {fmtDate(t.first.date)}
                  </p>
                )}
                <details className="mt-2">
                  <summary className="text-xs text-stone-500 cursor-pointer">History ({h.length})</summary>
                  <ul className="text-xs mt-1 divide-y divide-stone-100">
                    {h.map((x) => (
                      <li key={x.id} className="py-1 flex justify-between items-center">
                        <span>{fmtDate(x.effective_date)}</span>
                        <span className="tabular-nums">{money(x.amount)}</span>
                        <DeleteButton table="income_history" id={x.id} what="this entry" />
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1">
                    <RecordForm table="income_history" variant="ghost" label="Add past amount" title="Add a past amount" hidden={{ income_id: i.id }} defaults={{ frequency: i.frequency }} />
                  </div>
                </details>
                {i.notes && <p className="text-xs text-stone-600 mt-2 whitespace-pre-wrap">{i.notes}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
