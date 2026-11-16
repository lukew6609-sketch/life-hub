import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { CATEGORIES, frequencyLabel } from "@/lib/fields";
import { money, monthly, ordinal } from "@/lib/money";
import RecordForm from "@/components/RecordForm";
import GroupTabs from "@/components/GroupTabs";
import { Card, DueBadge, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Bills({ searchParams }: { searchParams: Promise<{ show?: string; group?: string }> }) {
  const { show, group = "household" } = await searchParams;
  const { supabase } = await requireUser();
  let q = supabase.from("commitments").select("*").order("name");
  if (show !== "all") q = q.eq("active", true);
  const { data: bills } = await q;
  const everything = bills ?? [];
  const totals: Record<string, number> = { all: 0 };
  for (const b of everything.filter((x) => x.active)) {
    const m = monthly(b.amount, b.frequency);
    totals[b.bill_group] = (totals[b.bill_group] ?? 0) + m;
    totals.all += m;
  }
  const list = group === "all" ? everything : everything.filter((b) => b.bill_group === group);
  const total = list.filter((b) => b.active).reduce((s, b) => s + monthly(b.amount, b.frequency), 0);

  const groups = CATEGORIES.map((c) => ({ ...c, items: list.filter((b) => b.category === c.value) })).filter((g) => g.items.length);

  return (
    <div>
      <PageHeader title="Bills & renewals" subtitle={`Direct debits, subscriptions and insurance. ${money(total)} a month, ${money(total * 12, true)} a year.`}>
        <Link href={show === "all" ? `/bills?group=${group}` : `/bills?group=${group}&show=all`} className="btn-ghost">
          {show === "all" ? "Hide cancelled" : "Show cancelled"}
        </Link>
        <RecordForm table="commitments" label="Add bill" title="Add a bill / subscription / policy" defaults={{ bill_group: group === "all" ? "household" : group }} />
      </PageHeader>

      <GroupTabs base="/bills" current={group} totals={totals} extra={show === "all" ? "&show=all" : ""} />

      {groups.length === 0 ? (
        <Empty>No bills in this group yet.</Empty>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => {
            const sub = g.items.filter((b) => b.active).reduce((s, b) => s + monthly(b.amount, b.frequency), 0);
            return (
              <Card key={g.value} title={g.label} action={<span className="text-sm tabular-nums text-stone-600">{money(sub)}/mo</span>}>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Amount</th>
                        <th className="hidden sm:table-cell">Per month</th>
                        <th>Renews / ends</th>
                        <th className="hidden md:table-cell">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((b) => (
                        <tr key={b.id} className={b.active ? "" : "opacity-50"}>
                          <td>
                            <Link href={`/bills/${b.id}`} className="font-medium hover:text-emerald-700">
                              {b.name}
                            </Link>
                            <div className="text-xs text-stone-500">{[b.provider, b.payment_day ? `on the ${ordinal(b.payment_day)}` : null, !b.active ? "cancelled" : null].filter(Boolean).join(" · ")}</div>
                          </td>
                          <td className="tabular-nums whitespace-nowrap">
                            {money(b.amount)} <span className="text-xs text-stone-500">{frequencyLabel(b.frequency).toLowerCase()}</span>
                          </td>
                          <td className="tabular-nums hidden sm:table-cell">{money(monthly(b.amount, b.frequency))}</td>
                          <td className="text-xs">
                            <DueBadge date={b.end_date} />
                          </td>
                          <td className="hidden md:table-cell text-xs text-stone-600 font-mono">{b.reference ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
