import Link from "next/link";
import { Car, HeartPulse, Home, KeyRound, Phone, Scissors, Wallet } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { coverTypeLabel, frequencyLabel } from "@/lib/fields";
import { money, monthly } from "@/lib/money";
import { CatIcon } from "@/lib/categories";
import { saveEmergencyNotes } from "@/lib/actions";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

type Bill = { id: string; name: string; provider: string | null; category: string; bill_group: string; amount: number | null; frequency: string; reference: string | null; phone: string | null; payment_method: string | null };

function Section({ icon: Icon, title, intro, children }: { icon: typeof Phone; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="font-semibold text-lg flex items-center gap-2">
        <Icon size={18} className="text-emerald-700" /> {title}
      </h2>
      {intro && <p className="text-sm text-stone-500 mt-1 mb-4">{intro}</p>}
      <div className={intro ? "" : "mt-4"}>{children}</div>
    </Card>
  );
}

function BillRows({ bills }: { bills: Bill[] }) {
  return (
    <ul className="divide-y divide-stone-200/70">
      {bills.map((b) => (
        <li key={b.id} className="py-3 flex items-center gap-3">
          <CatIcon category={b.category} size={32} />
          <div className="flex-1 min-w-0">
            <p className="font-medium">{b.name}</p>
            <p className="text-sm text-stone-500">{[b.provider, b.reference && `ref ${b.reference}`].filter(Boolean).join(" · ")}</p>
          </div>
          <p className="text-sm text-right whitespace-nowrap">
            {b.amount !== null ? money(b.amount) : "—"}
            <span className="text-stone-500"> {frequencyLabel(b.frequency).toLowerCase()}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

export default async function IfSomethingHappens() {
  const { supabase, user } = await requireUser();
  await supabase.from("settings").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  const [{ data: cover }, { data: billsRaw }, { data: income }, { data: cars }, { data: settings }] = await Promise.all([
    supabase.from("protection").select("*").eq("status", "active").order("life_cover", { ascending: false }),
    supabase.from("commitments").select("id, name, provider, category, bill_group, amount, frequency, reference, phone, payment_method").eq("active", true).order("name"),
    supabase.from("income").select("name, source, category, amount, frequency").eq("active", true),
    supabase.from("vehicles").select("registration, make, model, notes"),
    supabase.from("settings").select("emergency_notes").maybeSingle(),
  ]);
  const bills = (billsRaw ?? []) as Bill[];
  const policies = cover ?? [];
  const totalCover = policies.reduce((s, p) => s + Number(p.life_cover ?? 0), 0);

  const homeBills = bills.filter((b) => b.bill_group === "household" && ["mortgage_rent", "council_tax", "utility", "insurance", "phone_broadband", "home"].includes(b.category));
  const rental = bills.filter((b) => b.bill_group === "rental");
  const carBills = bills.filter((b) => b.category === "car");
  const personal = bills.filter((b) => b.bill_group === "personal");
  const personalMonthly = personal.reduce((s, b) => s + monthly(b.amount, b.frequency), 0);
  const rent = (income ?? []).filter((i) => i.category === "rent");
  const wages = (income ?? []).filter((i) => i.category === "wages" || i.category === "dividends");

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="If something happens" subtitle="For Chantelle: who to call, what you're entitled to, and what to sort out. Everything here updates from the rest of the app." />

      <Card className="border-emerald-300/40">
        <h2 className="font-semibold text-lg">First steps</h2>
        <p className="text-sm text-stone-500 mt-1 mb-4">There&apos;s no rush on most of this. These are roughly in order.</p>
        <ol className="space-y-3 text-sm list-decimal pl-5 marker:text-stone-500">
          <li><b>Register the death</b> with the local register office (within 5 days in England). Ask for <b>several certified copies</b> of the death certificate: insurers and banks each want one.</li>
          <li><b>Use Tell Us Once.</b> The registrar gives you a reference; one form tells HMRC, DWP, the passport office, DVLA and the council at the same time.</li>
          <li><b>Claim the life cover</b> below. Each insurer will want the policy number and a death certificate. {totalCover > 0 && <>Together it comes to about <b>{money(totalCover, true)}</b>.</>}</li>
          <li><b>Call NatWest</b> about the mortgages, and <b>Lloyds</b> (Luke&apos;s bank), since most bills come out of his accounts by direct debit.</li>
          <li><b>Tell the accountant (TaxAssist)</b> about MELW Properties Ltd. Luke is a director, and the company and his tax affairs will need sorting.</li>
          <li><b>Cancel the personal subscriptions</b> listed at the bottom when you&apos;re ready.</li>
        </ol>
      </Card>

      <Section icon={HeartPulse} title="Life cover to claim" intro="Have the policy number ready when you call. Amounts that reduce or increase are estimates for today.">
        {policies.length === 0 ? (
          <p className="text-sm text-stone-500">No active policies saved yet.</p>
        ) : (
          <div className="space-y-3">
            {policies.map((p) => (
              <div key={p.id} className="rounded-xl bg-stone-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.insurer}</p>
                    <p className="text-sm text-stone-500">{[coverTypeLabel(p.cover_type), p.people_covered].filter(Boolean).join(" · ")}</p>
                  </div>
                  <p className="num text-xl">{p.life_cover ? `~${money(p.life_cover, true)}` : "Amount not known"}</p>
                </div>
                <dl className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
                  <div><dt className="text-xs text-stone-500">Policy number</dt><dd className="font-mono">{p.policy_number ?? "—"}</dd></div>
                  <div><dt className="text-xs text-stone-500">Paid to</dt><dd>{p.beneficiaries ?? (p.in_trust ? "The trustees" : "Luke's estate")}</dd></div>
                  <div>
                    <dt className="text-xs text-stone-500">Phone</dt>
                    <dd>{p.claims_phone ? <a className="text-emerald-700" href={`tel:${p.claims_phone.replace(/\s/g, "")}`}>{p.claims_phone}</a> : "See the Life cover page"}</dd>
                  </div>
                </dl>
              </div>
            ))}
            <p className="text-sm text-stone-500">
              Full details, documents and the small print are on the <Link href="/cover" className="text-emerald-700 hover:underline">Life cover</Link> page.
            </p>
          </div>
        )}
      </Section>

      <Section icon={Home} title="Home: mortgage and the main bills" intro="These keep the house running. Most come out of Luke's Lloyds account, so tell Lloyds and move them to your account.">
        <BillRows bills={homeBills} />
      </Section>

      {(rental.length > 0 || rent.length > 0) && (
        <Section icon={KeyRound} title="Regal Croft (the rental)" intro="The rent keeps coming in and the mortgage keeps going out. Tell the tenant where to pay from now on.">
          {rent.map((r, i) => (
            <p key={i} className="text-sm mb-3">
              Rent: <b>{money(r.amount)}</b> {frequencyLabel(r.frequency).toLowerCase()} from {r.source ?? "the tenant"}.
            </p>
          ))}
          <BillRows bills={rental} />
        </Section>
      )}

      {wages.length > 0 && (
        <Section icon={Wallet} title="Income that will stop">
          <ul className="text-sm space-y-1">
            {wages.map((w, i) => (
              <li key={i}>
                {w.name} from {w.source}: {money(w.amount)} {frequencyLabel(w.frequency).toLowerCase()}. This comes from Luke&apos;s company, so speak to the accountant.
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(cars ?? []).length > 0 && (
        <Section icon={Car} title="Vehicles" intro="Vehicles in Luke's name: tell the insurer and DVLA (Tell Us Once covers DVLA).">
          <ul className="text-sm space-y-1 mb-3">
            {cars!.map((c) => (
              <li key={c.registration}>
                <span className="plate text-sm mr-2">{c.registration}</span>
                {[c.make, c.model].filter(Boolean).join(" ")} {c.notes ? `(${c.notes})` : ""}
              </li>
            ))}
          </ul>
          <BillRows bills={carBills} />
        </Section>
      )}

      {personal.length > 0 && (
        <Section icon={Scissors} title="Luke's personal subscriptions" intro={`These can usually just be cancelled. Together about ${money(personalMonthly, true)} a month.`}>
          <BillRows bills={personal} />
        </Section>
      )}

      <Card>
        <h2 className="font-semibold text-lg">Notes from Luke</h2>
        <p className="text-sm text-stone-500 mt-1 mb-4">
          Anything that isn&apos;t in the app: where the will is and who the solicitor is, pensions, savings or other bank accounts, passwords or where they&apos;re kept, who to call for help, and anything you&apos;d want Chantelle to know.
        </p>
        <form action={saveEmergencyNotes} className="space-y-3">
          <textarea name="emergency_notes" defaultValue={settings?.emergency_notes ?? ""} rows={10} className="input" placeholder="e.g. The will is with ... Pension with ... Savings at ..." />
          <button className="btn">Save notes</button>
        </form>
      </Card>

    </div>
  );
}
