import { headers } from "next/headers";
import { requireUser } from "@/lib/supabase/server";
import { resetCalendarToken, saveSettings, signOut } from "@/lib/actions";
import { Card, PageHeader } from "@/components/ui";
import CopyField from "@/components/CopyField";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const { supabase, user } = await requireUser();
  await supabase.from("settings").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  const { data: s } = await supabase.from("settings").select("*").single();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const feed = `https://${host}/api/calendar/${s?.calendar_token}.ics`;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Settings" subtitle={`Signed in as ${user.email}`} />

      <Card title="Dashboard alerts">
        <form action={saveSettings} className="flex items-end gap-2">
          <div>
            <label className="label">Show things due within (days)</label>
            <input name="alert_days" type="number" min={7} max={365} defaultValue={s?.alert_days ?? 45} className="input w-32" />
          </div>
          <button className="btn">Save</button>
        </form>
      </Card>

      <Card title="Reminders on your phone">
        <p className="text-sm text-stone-600 mb-3">
          Subscribe to this calendar link in Google Calendar (Settings → Add calendar → From URL) or on iPhone (Settings → Calendar → Accounts → Add Subscribed Calendar).
          Every renewal, MOT, tax date and key date appears in your calendar with a reminder 2 weeks before.
        </p>
        <CopyField value={feed} />
        <form action={resetCalendarToken} className="mt-3">
          <button className="text-xs text-stone-500 underline">Reset link (old link stops working)</button>
        </form>
      </Card>

      <Card title="Account">
        <form action={signOut}>
          <button className="btn-ghost">Sign out</button>
        </form>
      </Card>
    </div>
  );
}
