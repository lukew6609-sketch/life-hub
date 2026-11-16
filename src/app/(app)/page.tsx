import Link from "next/link";
import { Bot, Car, CalendarClock, Flame, Receipt, ShieldCheck, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { getAlertDays, getAttention, type AttentionItem } from "@/lib/attention";
import { categoryLabel } from "@/lib/fields";
import { money, monthly, relDays } from "@/lib/money";
import { CatIcon, GROUP_COLOR } from "@/lib/categories";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const KIND_ICON = { renewal: Receipt, car: Car, warranty: ShieldCheck, energy: Flame, date: CalendarClock, loan: CalendarClock };

function urgency(days: number) {
  if (days < 0) return { ring: "#ff6b6b", bg: "rgba(255,107,107,0.12)", text: "text-red-600" };
  if (days <= 14) return { ring: "#f2b84b", bg: "rgba(242,184,75,0.12)", text: "text-amber-700" };
  return { ring: "#5aaeff", bg: "rgba(90,174,255,0.10)", text: "text-sky-800" };
}

/** Calendar-page style date tile. */
function DateTile({ date, days }: { date: string; days: number }) {
  const d = new Date(date + "T00:00:00");
  const u = urgency(days);
  return (
    <div className="w-14 shrink-0 rounded-xl overflow-hidden text-center bg-white" style={{ boxShadow: `inset 0 0 0 1.5px ${u.ring}` }}>
      <div className="text-[10px] font-semibold py-0.5" style={{ background: u.ring, color: "#111a2c" }}>
        {d.toLocaleDateString("en-GB", { month: "short" })}
      </div>
      <div className="font-display text-2xl font-bold leading-8" style={{ background: u.bg }}>{d.getDate()}</div>
      <div className="text-[10px] text-stone-500 pb-1" style={{ background: u.bg }}>{d.getFullYear()}</div>
    </div>
  );
}

function Timeline({ items }: { items: AttentionItem[] }) {
  return (
    <ol className="relative space-y-4 before:absolute before:left-7 before:top-3 before:bottom-3 before:w-px before:bg-stone-200">
      {items.map((a) => {
        const Icon = KIND_ICON[a.kind];
        const u = urgency(a.days);
        return (
          <li key={a.key} className="relative">
            <Link href={a.href} className="flex gap-4 items-start rounded-2xl p-2 -m-2 hover:bg-stone-50 transition-colors">
              <DateTile date={a.date} days={a.days} />
              <div className="min-w-0 flex-1 pt-1">
                <p className="font-semibold leading-snug flex items-center gap-2">
                  <Icon size={15} className="text-stone-500 shrink-0" /> {a.title}
                </p>
                {a.detail && <p className="text-sm text-stone-500 mt-0.5">{a.detail}</p>}
                <p className={`text-xs font-semibold mt-1 ${u.text}`}>{relDays(a.days)}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function greeting() {
  const h = Number(new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/London" }));
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
}

export default async function Dashboard() {
  const { supabase, user } = await requireUser();
  await supabase.from("settings").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  const alertDays = await getAlertDays(supabase);
  const [attention, { data: bills }, { data: income }] = await Promise.all([
    getAttention(supabase, alertDays),
    supabase.from("commitments").select("name, amount, frequency, category, bill_group").eq("active", true),
    supabase.from("income").select("amount, frequency").eq("active", true),
  ]);

  const list = bills ?? [];
  const out = list.reduce((s, b) => s + monthly(b.amount, b.frequency), 0);
  const inMonth = (income ?? []).reduce((s, i) => s + monthly(i.amount, i.frequency), 0);
  const groups = (["household", "personal", "rental"] as const).map((g) => ({
    key: g,
    label: g === "rental" ? "Rental" : g[0].toUpperCase() + g.slice(1),
    value: list.filter((b) => b.bill_group === g).reduce((s, b) => s + monthly(b.amount, b.frequency), 0),
  }));
  const left = inMonth - out;
  const scale = Math.max(inMonth, out, 1);

  const cats = new Map<string, number>();
  for (const b of list.filter((x) => x.bill_group === "household")) cats.set(b.category, (cats.get(b.category) ?? 0) + monthly(b.amount, b.frequency));
  const catRows = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
  const urgent = attention.filter((a) => a.days <= 14).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-stone-500 text-sm">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" })}</p>
        <h1 className="text-3xl sm:text-4xl font-bold mt-1">{greeting()}.</h1>
        <p className="text-stone-600 mt-1">
          {attention.length === 0
            ? "Nothing needs you right now."
            : `${attention.length} thing${attention.length === 1 ? "" : "s"} coming up in the next ${alertDays} days${urgent ? `, ${urgent} within two weeks` : ""}.`}
        </p>
      </header>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 className="font-semibold text-lg">Each month</h2>
          <Link href="/income" className="text-sm text-emerald-700 hover:underline">Money in</Link>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-xs text-stone-500">Coming in</p>
            <p className="num text-xl sm:text-3xl text-emerald-700">{inMonth ? money(inMonth, true) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Going out</p>
            <p className="num text-xl sm:text-3xl">{money(out, true)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">{left >= 0 ? "Left over" : "Short by"}</p>
            <p className={`num text-xl sm:text-3xl ${left >= 0 ? "text-emerald-700" : "text-red-600"}`}>{inMonth ? money(Math.abs(left), true) : "—"}</p>
          </div>
        </div>
        <div className="h-4 rounded-full bg-stone-100 flex overflow-hidden" role="img" aria-label="Monthly bills by group compared with income">
          {groups.map((g) => (
            <div key={g.key} style={{ width: `${(g.value / scale) * 100}%`, background: GROUP_COLOR[g.key] }} title={`${g.label}: ${money(g.value)}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm">
          {groups.map((g) => (
            <Link key={g.key} href={`/bills?group=${g.key}`} className="flex items-center gap-2 hover:underline">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: GROUP_COLOR[g.key] }} />
              <span className="text-stone-600">{g.label}</span>
              <span className="font-semibold">{money(g.value, true)}</span>
            </Link>
          ))}
          {left > 0 && (
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
              <span className="text-stone-600">Left over</span>
              <span className="font-semibold">{money(left, true)}</span>
            </span>
          )}
        </div>
        {left < 0 && inMonth > 0 && (
          <p className="text-xs text-stone-500 mt-3">Bills are more than the income you&apos;ve added. Add any dividends or other money in on the Money in page.</p>
        )}
      </Card>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3" title="Coming up">
          {attention.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">Renewals, MOT and tax dates, and key dates will appear here {alertDays} days before they&apos;re due.</p>
          ) : (
            <Timeline items={attention} />
          )}
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <form action="/assistant" className="space-y-3">
              <label htmlFor="ask" className="flex items-center gap-2 font-semibold">
                <Sparkles size={16} className="text-emerald-700" /> Ask about your stuff
              </label>
              <div className="flex gap-2">
                <input id="ask" name="q" className="input" placeholder="What's my van insurance policy number?" />
                <button className="btn" aria-label="Ask">
                  <Bot size={16} />
                </button>
              </div>
            </form>
          </Card>

          <Card title="Household bills" action={<Link href="/review?group=household" className="text-sm text-emerald-700 hover:underline">Yearly review</Link>}>
            <ul className="space-y-3">
              {catRows.map(([c, v]) => (
                <li key={c} className="flex items-center gap-3">
                  <CatIcon category={c} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm">
                      <span>{categoryLabel(c)}</span>
                      <span className="font-semibold">{money(v, true)}</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full mt-1.5">
                      <div className="h-1.5 rounded-full bg-stone-400" style={{ width: `${Math.max(3, (v / (catRows[0][1] || 1)) * 100)}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
