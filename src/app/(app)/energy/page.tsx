import Link from "next/link";
import { Upload } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { money } from "@/lib/money";
import RecordForm from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";
import EnergyCompare from "@/components/EnergyCompare";
import { Card, DueBadge, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const n = (v: unknown) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("en-GB", { maximumFractionDigits: 3 }));

export default async function Energy() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("energy_tariffs").select("*").order("is_current", { ascending: false }).order("start_date", { ascending: false, nullsFirst: false });
  const list = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Gas & electric" subtitle="Your exact rates in one place, ready for when you want to switch">
        <Link href="/documents" className="btn-ghost"><Upload size={15} /> Upload a bill</Link>
        <RecordForm table="energy_tariffs" label="Add tariff" title="Add a tariff" />
      </PageHeader>

      {list.length === 0 && <Empty>Upload your latest energy bill and the AI will pull out the unit rates, standing charges, meter numbers and fix end date.</Empty>}

      {(["electricity", "gas"] as const).map((fuel) => {
        const tariffs = list.filter((t) => t.fuel === fuel);
        if (!tariffs.length) return null;
        const cur = tariffs.find((t) => t.is_current);
        const annual = cur && cur.unit_rate_p && cur.standing_charge_p && cur.annual_usage_kwh
          ? (Number(cur.unit_rate_p) * Number(cur.annual_usage_kwh) + Number(cur.standing_charge_p) * 365) / 100
          : null;
        return (
          <div key={fuel} className="grid lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3" title={fuel === "gas" ? "🔥 Gas" : "⚡ Electricity"}>
              {tariffs.map((t) => (
                <div key={t.id} className={`rounded-xl p-3 mb-3 ${t.is_current ? "bg-emerald-50/70 border border-emerald-200" : "bg-stone-50 opacity-70"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{t.supplier} {t.is_current && <span className="pill bg-emerald-100 text-emerald-800 ml-1">current</span>}</p>
                      <p className="text-xs text-stone-600">{[t.tariff_name, t.tariff_type].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div className="flex">
                      <RecordForm table="energy_tariffs" record={t} variant="icon" title="Edit tariff" />
                      <DeleteButton table="energy_tariffs" id={t.id} what="this tariff" />
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                    <div><dt className="text-xs text-stone-500">Unit rate</dt><dd className="tabular-nums">{n(t.unit_rate_p)}p/kWh</dd></div>
                    {t.night_rate_p && <div><dt className="text-xs text-stone-500">Night rate</dt><dd className="tabular-nums">{n(t.night_rate_p)}p/kWh</dd></div>}
                    <div><dt className="text-xs text-stone-500">Standing charge</dt><dd className="tabular-nums">{n(t.standing_charge_p)}p/day</dd></div>
                    <div><dt className="text-xs text-stone-500">Direct debit</dt><dd className="tabular-nums">{money(t.monthly_payment)}/mo</dd></div>
                    <div><dt className="text-xs text-stone-500">Usage</dt><dd className="tabular-nums">{n(t.annual_usage_kwh)} kWh/yr</dd></div>
                    <div><dt className="text-xs text-stone-500">Fix ends</dt><dd className="text-xs"><DueBadge date={t.end_date} /></dd></div>
                    <div><dt className="text-xs text-stone-500">Exit fee</dt><dd>{money(t.exit_fee)}</dd></div>
                    <div><dt className="text-xs text-stone-500">{fuel === "gas" ? "MPRN" : "MPAN"}</dt><dd className="font-mono text-xs break-all">{t.mpan_mprn ?? "—"}</dd></div>
                    <div><dt className="text-xs text-stone-500">Meter</dt><dd className="font-mono text-xs break-all">{t.meter_number ?? "—"}</dd></div>
                    <div><dt className="text-xs text-stone-500">Account</dt><dd className="font-mono text-xs break-all">{t.account_number ?? "—"}</dd></div>
                  </dl>
                  {t.is_current && annual && <p className="text-xs text-stone-600 mt-2">Estimated {money(annual, true)} a year at your usage.</p>}
                </div>
              ))}
            </Card>
            <Card className="lg:col-span-2" title="Compare a quote">
              <EnergyCompare
                fuel={fuel}
                current={cur && cur.unit_rate_p && cur.standing_charge_p ? { unit: Number(cur.unit_rate_p), standing: Number(cur.standing_charge_p), usage: Number(cur.annual_usage_kwh) || 0 } : null}
              />
            </Card>
          </div>
        );
      })}
    </div>
  );
}
