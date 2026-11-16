import { requireUser } from "@/lib/supabase/server";
import { completeKeyDate } from "@/lib/actions";
import RecordForm from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";
import ActionButton from "@/components/ActionButton";
import { Card, DueBadge, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const IDEAS: [string, string, number | null][] = [
  ["Passport expires", "ID", null],
  ["Driving licence photocard renewal", "ID", null],
  ["Boiler service", "Home", 12],
  ["TV licence renewal", "Home", 12],
  ["Chimney sweep", "Home", 12],
  ["Dentist check-up", "Health", 6],
  ["Opticians", "Health", 24],
  ["Pet vaccinations", "Pets", 12],
  ["Smoke alarm batteries", "Home", 12],
  ["Tax return deadline (31 Jan)", "Money", 12],
];

export default async function Dates() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("key_dates").select("*").order("done").order("due_date");
  const list = data ?? [];
  const have = new Set(list.map((d) => d.title.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader title="Key dates" subtitle="Everything else with a deadline. Repeating ones roll forward when you tick them off.">
        <RecordForm table="key_dates" label="Add date" title="Add a key date" />
      </PageHeader>

      <Card>
        {list.length === 0 ? (
          <Empty>No dates yet. Try one of the ideas below.</Empty>
        ) : (
          <ul className="divide-y divide-stone-100">
            {list.map((d) => (
              <li key={d.id} className={`py-2.5 flex items-center gap-3 ${d.done ? "opacity-50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{d.title}</p>
                  <p className="text-xs text-stone-500">{[d.category, d.repeat_months ? `every ${d.repeat_months} months` : null, d.notes].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="text-xs"><DueBadge date={d.due_date} /></div>
                {!d.done && <ActionButton action={completeKeyDate.bind(null, d.id)}>{d.repeat_months ? "Done → next" : "Done"}</ActionButton>}
                <RecordForm table="key_dates" record={d} variant="icon" title="Edit date" />
                <DeleteButton table="key_dates" id={d.id} what={d.title} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Ideas">
        <div className="flex flex-wrap gap-2">
          {IDEAS.filter(([t]) => !have.has(t.toLowerCase())).map(([title, category, repeat]) => (
            <RecordForm key={title} table="key_dates" variant="ghost" label={title} title={`Add: ${title}`} defaults={{ title, category, repeat_months: repeat, done: false }} />
          ))}
        </div>
      </Card>
    </div>
  );
}
