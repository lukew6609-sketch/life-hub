import Link from "next/link";
import { FileText } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { fmtDate, money } from "@/lib/money";
import RecordForm from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";
import { Card, DueBadge, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Warranties() {
  const { supabase } = await requireUser();
  const [{ data: list }, { data: docs }] = await Promise.all([
    supabase.from("warranties").select("*").order("expiry_date", { ascending: true, nullsFirst: false }),
    supabase.from("documents").select("id, title, warranty_id").not("warranty_id", "is", null),
  ]);
  return (
    <div>
      <PageHeader title="Warranties" subtitle="Receipts and guarantees, so you know if something's still covered">
        <Link href="/documents" className="btn-ghost">Upload receipt</Link>
        <RecordForm table="warranties" label="Add warranty" title="Add a warranty" />
      </PageHeader>
      {(list ?? []).length === 0 ? (
        <Empty>Nothing yet. Upload a receipt or warranty card and the AI will offer to add it here.</Empty>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Item</th><th>Bought</th><th>Cost</th><th>Covered until</th><th></th></tr>
              </thead>
              <tbody>
                {list!.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <p className="font-medium">{w.item}</p>
                      <p className="text-xs text-stone-500">{[w.brand, w.retailer, w.serial_number && `S/N ${w.serial_number}`].filter(Boolean).join(" · ")}</p>
                      {(docs ?? []).filter((d) => d.warranty_id === w.id).map((d) => (
                        <Link key={d.id} href={`/documents/${d.id}`} className="text-xs text-emerald-700 inline-flex items-center gap-1 mr-2"><FileText size={12} />{d.title}</Link>
                      ))}
                    </td>
                    <td className="text-xs whitespace-nowrap">{fmtDate(w.purchase_date)}</td>
                    <td className="tabular-nums">{money(w.cost)}</td>
                    <td className="text-xs"><DueBadge date={w.expiry_date} /></td>
                    <td className="whitespace-nowrap">
                      <RecordForm table="warranties" record={w} variant="icon" title={`Edit ${w.item}`} />
                      <DeleteButton table="warranties" id={w.id} what={w.item} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
