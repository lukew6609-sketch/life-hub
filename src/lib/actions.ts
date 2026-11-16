"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FORMS, type TableName } from "./fields";
import { createClient, requireUser } from "./supabase/server";
import { todayISO } from "./money";

export type ActionState = { ok?: boolean; error?: string } | undefined;

/** Turn a FormData into a row using the field definitions for that table. */
function rowFrom(table: TableName, fd: FormData) {
  const row: Record<string, unknown> = {};
  for (const f of FORMS[table]) {
    if (f.type === "checkbox") {
      row[f.name] = fd.get(f.name) === "on";
      continue;
    }
    const raw = fd.get(f.name);
    if (raw === null) continue;
    const s = String(raw).trim();
    if (f.type === "number" || f.type === "money") row[f.name] = s === "" ? null : Number(s.replace(/[£,\s]/g, ""));
    else row[f.name] = s === "" ? null : s;
  }
  // extra hidden link fields
  for (const k of ["commitment_id", "vehicle_id", "income_id"]) {
    const v = fd.get(k);
    if (v !== null) row[k] = String(v) || null;
  }
  return row;
}

export async function saveRecord(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const table = String(fd.get("_table")) as TableName;
  if (!FORMS[table]) return { error: "Unknown record type" };
  const id = fd.get("_id") ? String(fd.get("_id")) : null;
  const { supabase } = await requireUser();
  const row = rowFrom(table, fd);

  for (const f of FORMS[table]) if (f.required && (row[f.name] === null || row[f.name] === undefined)) return { error: `${f.label} is required` };

  // Tables whose amount changes are logged automatically.
  const HIST: Record<string, [string, string]> = { commitments: ["price_history", "commitment_id"], income: ["income_history", "income_id"] };
  const hist = HIST[table];
  let before: { amount: number | null; frequency: string } | null = null;
  if (hist && id) {
    const { data } = await supabase.from(table).select("amount, frequency").eq("id", id).single();
    before = data;
  }

  const res = id
    ? await supabase.from(table).update(hist ? { ...row, updated_at: new Date().toISOString() } : row).eq("id", id).select("id").single()
    : await supabase.from(table).insert(row).select("id").single();
  if (res.error) return { error: res.error.message };

  // Keep a price history automatically so the yearly review can show increases.
  if (hist && row.amount !== null && row.amount !== undefined) {
    const changed = !before || Number(before.amount) !== Number(row.amount) || before.frequency !== row.frequency;
    if (changed)
      await supabase.from(hist[0]).insert({
        [hist[1]]: res.data.id,
        amount: row.amount,
        frequency: row.frequency ?? "monthly",
        effective_date: id ? todayISO() : (row.start_date as string) ?? todayISO(),
        note: id ? "Price changed" : "Added",
      });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteRecord(table: string, id: string) {
  if (!(table in FORMS) && table !== "documents") throw new Error("Unknown table");
  const { supabase } = await requireUser();
  if (table === "documents") {
    const { data } = await supabase.from("documents").select("storage_path").eq("id", id).single();
    if (data?.storage_path) await supabase.storage.from("documents").remove([data.storage_path]);
  }
  await supabase.from(table).delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function markReturned(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("loans").update({ returned_on: todayISO() }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function completeKeyDate(id: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("key_dates").select("*").eq("id", id).single();
  if (!data) return;
  if (data.repeat_months) {
    const d = new Date(data.due_date + "T00:00:00");
    d.setMonth(d.getMonth() + data.repeat_months);
    await supabase.from("key_dates").update({ due_date: d.toISOString().slice(0, 10) }).eq("id", id);
  } else {
    await supabase.from("key_dates").update({ done: true }).eq("id", id);
  }
  revalidatePath("/", "layout");
}

export async function linkDocument(docId: string, field: "commitment_id" | "vehicle_id" | "warranty_id", value: string | null) {
  const { supabase } = await requireUser();
  await supabase.from("documents").update({ [field]: value }).eq("id", docId);
  revalidatePath("/", "layout");
}

/** Create a bill (and energy tariff, if the doc is an energy bill) from what the AI pulled out of a document. */
export async function createFromDocument(docId: string) {
  const { supabase } = await requireUser();
  const { data: doc } = await supabase.from("documents").select("*").eq("id", docId).single();
  if (!doc) return;

  const isEnergy = !!doc.energy && (doc.energy.unit_rate_p || doc.energy.standing_charge_p);
  if (isEnergy) {
    const en = doc.energy;
    await supabase.from("energy_tariffs").insert({
      supplier: doc.provider ?? "Unknown supplier",
      tariff_name: en.tariff_name ?? null,
      fuel: en.fuel === "gas" ? "gas" : "electricity",
      tariff_type: en.tariff_type ?? null,
      unit_rate_p: en.unit_rate_p ?? null,
      night_rate_p: en.night_rate_p ?? null,
      standing_charge_p: en.standing_charge_p ?? null,
      end_date: en.tariff_end_date ?? doc.end_date ?? null,
      exit_fee: en.exit_fee ?? null,
      annual_usage_kwh: en.annual_usage_kwh ?? null,
      account_number: doc.reference ?? null,
      meter_number: en.meter_number ?? null,
      mpan_mprn: en.mpan_mprn ?? null,
      monthly_payment: en.monthly_payment ?? null,
    });
    revalidatePath("/", "layout");
    redirect("/energy");
  }

  const category =
    doc.doc_type === "insurance" ? "insurance" : doc.doc_type === "utility_bill" ? "utility" : doc.doc_type === "phone_broadband" ? "phone_broadband" : doc.doc_type === "subscription" ? "subscription" : "other";
  const { data: c, error } = await supabase
    .from("commitments")
    .insert({
      name: doc.title,
      provider: doc.provider,
      category,
      amount: doc.amount,
      frequency: doc.amount_frequency ?? "annually",
      reference: doc.reference,
      start_date: doc.start_date,
      end_date: doc.end_date,
    })
    .select("id")
    .single();
  if (error || !c) return;
  if (doc.amount)
    await supabase.from("price_history").insert({
      commitment_id: c.id,
      amount: doc.amount,
      frequency: doc.amount_frequency ?? "annually",
      effective_date: doc.start_date ?? todayISO(),
      note: "From document",
    });
  await supabase.from("documents").update({ commitment_id: c.id }).eq("id", docId);
  revalidatePath("/", "layout");
  redirect(`/bills/${c.id}`);
}

export async function saveSettings(fd: FormData) {
  const { supabase, user } = await requireUser();
  const alert_days = Number(fd.get("alert_days") || 45);
  await supabase.from("settings").upsert({ user_id: user.id, alert_days });
  revalidatePath("/", "layout");
}

export async function resetCalendarToken() {
  const { supabase, user } = await requireUser();
  await supabase.from("settings").upsert({ user_id: user.id, calendar_token: crypto.randomUUID() });
  revalidatePath("/settings");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
