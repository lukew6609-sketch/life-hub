import Link from "next/link";
import { AlertTriangle, ArrowRight, Bot, Car, FileText, Flame, Handshake, Receipt, ShieldCheck, CalendarClock } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { getAlertDays, getAttention, type AttentionItem } from "@/lib/attention";
import { categoryLabel } from "@/lib/fields";
import { fmtDate, money, monthly, relDays } from "@/lib/money";
import { Card, Empty, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

const ICONS = { renewal: Receipt, car: Car, warranty: ShieldCheck, energy: Flame, date: CalendarClock, loan: Handshake };

function tone(days: number) {
  if (days < 0) return "border-l-red-500 bg-red-50/60";
  if (days <= 14) return "border-l-amber-500 bg-amber-50/60";
  return "border-l-sky-500 bg-sky-50/40";
}

function AttentionRow({ a }: { a: AttentionItem }) {
  const Icon = ICONS[a.kind];
  return (
    <Link href={a.href} className={`flex gap-3 items-start border-l-4 rounded-r-xl p-3 hover:brightness-95 transition ${tone(a.days)}`}>
      <Icon size={18} className="mt-0.5 shrink-0 text-stone-600" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">{a.title}</p>
        {a.detail && <p className="text-xs text-stone-600 mt-0.5">{a.detail}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-medium">{a.kind === "loan" && a.days === 0 ? "" : relDays(a.days)}</p>
        <p className="text-[11px] text-stone-500">{a.kind === "loan" && a.days === 0 ? "" : fmtDate(a.date)}</p>
      </div>
    </Link>
  );
}

export default async function Dashboard() {
  const { supabase, user } = await requireUser();

  // make sure the user has a settings row (calendar token etc.)
  await supabase.from("settings").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  const alertDays = await getAlertDays(supabase);
  const [attention, { data: bills }, { data: income }] = await Promise.all([
    getAttention(supabase, alertDays),
    supabase.from("commitments").select("name, amount, frequency, category, bill_group").eq("active", true),
    supabase.from("income").select("amount, frequency").eq("active", true),
  ]);

  const perMonth = (bills ?? []).reduce((s, b) => s + monthly(b.amount, b.frequency), 0);
  const inMonth = (income ?? []).reduce((s, i) => s + monthly(i.amount, i.frequency), 0);
  const byGroup = (g: string) => (bills ?? []).filter((b) => b.bill_group === g).reduce((s, b) => s + monthly(b.amount, b.frequency), 0);
  const byCat = new Map<string, number>();
  for (const b of bills ?? []) byCat.set(b.category, (byCat.get(b.category) ?? 0) + monthly(b.amount, b.frequency));
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const urgent = attention.filter((a) => a.days <= 14).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hi there 👋</h1>
        <p className="text-stone-500 text-sm">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Going out / month" value={money(perMonth, true)} sub={`Household ${money(byGroup("household"), true)} · Personal ${money(byGroup("personal"), true)} · Rental ${money(byGroup("rental"), true)}`} href="/bills" />
        <Stat label="Coming in / month" value={inMonth ? money(inMonth, true) : "—"} sub={inMonth ? `${money(inMonth * 12, true)}/yr` : "add your income"} href="/income" />
        <Stat label="Left after bills" value={inMonth ? money(inMonth - perMonth, true) : "—"} sub="per month" href="/income" />
        <Stat label="Needs attention" value={String(attention.length)} sub={urgent ? `${urgent} within 2 weeks` : `next ${alertDays} days`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card
          className="lg:col-span-2"
          title="Needs your attention"
          action={<span className="text-xs text-stone-500">next {alertDays} days</span>}
        >
          {attention.length === 0 ? (
            <Empty>
              <AlertTriangle className="mx-auto mb-2 text-stone-300" />
              Nothing coming up. Add your bills, cars and key dates and anything renewing will show here.
            </Empty>
          ) : (
            <div className="space-y-2">
              {attention.map((a) => (
                <AttentionRow key={a.key} a={a} />
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Ask about your stuff">
            <form action="/assistant" className="flex gap-2">
              <input name="q" className="input" placeholder="What's my pet insurance policy number?" />
              <button className="btn" aria-label="Ask">
                <Bot size={16} />
              </button>
            </form>
          </Card>

          <Card title="Monthly spend by category" action={<Link href="/review" className="text-xs text-emerald-700 inline-flex items-center gap-1">Review <ArrowRight size={12} /></Link>}>
            {cats.length === 0 ? (
              <p className="text-sm text-stone-500">No bills yet.</p>
            ) : (
              <ul className="space-y-2">
                {cats.map(([c, v]) => (
                  <li key={c}>
                    <div className="flex justify-between text-sm">
                      <span>{categoryLabel(c)}</span>
                      <span className="tabular-nums">{money(v)}</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full mt-1">
                      <div className="h-1.5 bg-emerald-600 rounded-full" style={{ width: `${Math.max(3, (v / (cats[0][1] || 1)) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Quick add">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["/bills", "Bill", Receipt],
                ["/documents", "Document", FileText],
                ["/cars", "Car", Car],
                ["/lent", "Lent item", Handshake],
              ].map(([href, label, Icon]) => {
                const I = Icon as typeof Receipt;
                return (
                  <Link key={href as string} href={href as string} className="btn-ghost justify-center">
                    <I size={15} /> {label as string}
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
