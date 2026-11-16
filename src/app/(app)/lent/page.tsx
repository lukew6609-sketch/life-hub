import { requireUser } from "@/lib/supabase/server";
import { fmtDate, daysUntil } from "@/lib/money";
import { markReturned } from "@/lib/actions";
import RecordForm from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";
import ActionButton from "@/components/ActionButton";
import { Card, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

type Loan = { id: string; item: string; person: string; direction: string; date_out: string; expected_back: string | null; returned_on: string | null; notes: string | null };

function List({ items, empty }: { items: Loan[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-stone-500">{empty}</p>;
  return (
    <ul className="divide-y divide-stone-100">
      {items.map((l) => {
        const out = -daysUntil(l.date_out);
        return (
          <li key={l.id} className="py-2.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                {l.item} <span className="text-stone-500 font-normal">· {l.person}</span>
              </p>
              <p className="text-xs text-stone-500">
                {fmtDate(l.date_out)} ({out === 0 ? "today" : `${out} days ago`})
                {l.expected_back ? ` · due back ${fmtDate(l.expected_back)}` : ""}
                {l.notes ? ` · ${l.notes}` : ""}
              </p>
            </div>
            <ActionButton action={markReturned.bind(null, l.id)}>Returned</ActionButton>
            <RecordForm table="loans" record={l} variant="icon" title="Edit" />
            <DeleteButton table="loans" id={l.id} what={l.item} />
          </li>
        );
      })}
    </ul>
  );
}

export default async function Lent() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("loans").select("*").order("date_out", { ascending: false });
  const all = (data ?? []) as Loan[];
  const open = all.filter((l) => !l.returned_on);
  const history = all.filter((l) => l.returned_on).slice(0, 30);

  return (
    <div className="space-y-6">
      <PageHeader title="Lent & borrowed" subtitle="Who's got your soldering iron?">
        <RecordForm table="loans" label="Lent something" title="Log something you've lent or borrowed" />
      </PageHeader>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Out with other people">
          <List items={open.filter((l) => l.direction === "lent")} empty="Everything's home." />
        </Card>
        <Card title="Things you've borrowed">
          <List items={open.filter((l) => l.direction === "borrowed")} empty="Nothing to give back." />
        </Card>
      </div>

      <Card title="Returned">
        {history.length === 0 ? (
          <Empty>Returned items will show here.</Empty>
        ) : (
          <ul className="text-sm divide-y divide-stone-100">
            {history.map((l) => (
              <li key={l.id} className="py-2 flex justify-between gap-2 text-stone-600">
                <span>{l.item} · {l.direction === "lent" ? "lent to" : "borrowed from"} {l.person}</span>
                <span className="text-xs flex items-center gap-1">
                  back {fmtDate(l.returned_on)} <DeleteButton table="loans" id={l.id} what={l.item} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
