import { generateObject } from "ai";
import { z } from "zod";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { AI_MODEL } from "@/lib/ai";

export const maxDuration = 120;

// The AI service limits how many "may be null" fields a schema can have, so every field here is
// required and uses "" (or "unknown") for "not stated". normalise() turns those back into nulls.
const blank = (what: string) => z.string().describe(`${what}. Empty string if not stated.`);
const dateField = (what: string) => z.string().describe(`${what}, as YYYY-MM-DD. Empty string if not stated.`);
const numField = (what: string) => z.string().describe(`${what}, digits only e.g. "226.28". Empty string if not stated.`);

const Raw = z.object({
  title: z.string().describe("Short human title, e.g. 'Petplan pet insurance schedule 2026' or 'MOT certificate AB12 CDE'"),
  doc_type: z
    .enum(["insurance", "warranty", "receipt", "utility_bill", "energy_bill", "phone_broadband", "subscription", "mot", "vehicle_tax", "v5c", "car_finance", "bank_statement", "payslip", "tax", "medical", "contract", "manual", "id_document", "letter", "other"])
    .describe("Best fitting type"),
  provider: blank("Company / insurer / supplier / retailer name"),
  reference: blank("Main policy, account, customer or certificate number"),
  start_date: dateField("Policy/contract/cover start, or purchase date"),
  end_date: dateField("Renewal, expiry, fix end, MOT expiry, warranty end, etc."),
  amount: numField("Main price/premium/cost in GBP"),
  amount_frequency: z.enum(["weekly", "fortnightly", "four_weekly", "monthly", "quarterly", "six_monthly", "annually", "one_off", "unknown"]),
  previous_amount: numField("Last year's/previous price if the document states it (renewal letters often do)"),
  summary: z.string().describe("2-4 sentence plain-English summary of what this is and anything important (excesses, cover limits, what's not covered, deadlines)"),
  key_facts: z.array(z.object({ label: z.string(), value: z.string() })).describe("Up to 20 useful facts: policy numbers, phone numbers, excess, cover level, vehicle reg, serial numbers, named people/pets, claim lines, etc."),
  is_energy_bill: z.boolean().describe("True only for gas/electric bills or tariff letters"),
  energy: z
    .object({
      fuel: z.enum(["electricity", "gas", "unknown"]),
      tariff_name: blank("Tariff name"),
      tariff_type: blank("Fixed, variable, EV etc."),
      unit_rate_p: numField("Unit rate in pence per kWh incl. VAT"),
      night_rate_p: numField("Night/off-peak rate in pence per kWh incl. VAT"),
      standing_charge_p: numField("Standing charge in pence per day incl. VAT"),
      tariff_end_date: dateField("Date the fixed price ends"),
      exit_fee: numField("Exit fee in GBP"),
      annual_usage_kwh: numField("Estimated yearly usage in kWh"),
      monthly_payment: numField("Monthly direct debit in GBP"),
      meter_number: blank("Meter serial number"),
      mpan_mprn: blank("MPAN (electricity) or MPRN (gas)"),
    })
    .describe("Fill only if is_energy_bill, otherwise all empty strings and fuel 'unknown'. If both fuels are present, give electricity here and mention gas rates in key_facts."),
  vehicle_registration: blank("UK reg if this is a car document"),
  transcription: z.string().describe("Only if no text was supplied with the file: a faithful transcription of the readable text (max ~4000 words). Otherwise empty string."),
});

const str = (v: string) => (v && v.trim() ? v.trim() : null);
const num = (v: string) => {
  const n = parseFloat(String(v).replace(/[£,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const isoDate = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v?.trim() ?? "") ? v.trim() : null);

function normalise(r: z.infer<typeof Raw>) {
  const e = r.energy;
  return {
    title: r.title,
    doc_type: r.doc_type,
    provider: str(r.provider),
    reference: str(r.reference),
    start_date: isoDate(r.start_date),
    end_date: isoDate(r.end_date),
    amount: num(r.amount),
    amount_frequency: r.amount_frequency === "unknown" ? null : r.amount_frequency,
    previous_amount: num(r.previous_amount),
    summary: r.summary,
    key_facts: r.key_facts,
    energy: r.is_energy_bill
      ? {
          fuel: e.fuel === "unknown" ? null : e.fuel,
          tariff_name: str(e.tariff_name),
          tariff_type: str(e.tariff_type),
          unit_rate_p: num(e.unit_rate_p),
          night_rate_p: num(e.night_rate_p),
          standing_charge_p: num(e.standing_charge_p),
          tariff_end_date: isoDate(e.tariff_end_date),
          exit_fee: num(e.exit_fee),
          annual_usage_kwh: num(e.annual_usage_kwh),
          monthly_payment: num(e.monthly_payment),
          meter_number: str(e.meter_number),
          mpan_mprn: str(e.mpan_mprn),
        }
      : null,
    vehicle_registration: str(r.vehicle_registration),
    transcription: str(r.transcription),
  };
}

export async function POST(req: Request) {
  const { id } = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { data: doc } = await supabase.from("documents").select("*").eq("id", id).single();
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const { data: file, error } = await supabase.storage.from("documents").download(doc.storage_path);
    if (error || !file) throw new Error(error?.message ?? "Download failed");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = doc.mime_type || file.type || "application/octet-stream";

    let text = "";
    if (mime === "application/pdf") {
      try {
        // pdf.js takes ownership of the buffer it is given, so pass a copy and keep `bytes` for the AI call
        const pdf = await getDocumentProxy(bytes.slice());
        const res = await extractText(pdf, { mergePages: true });
        text = (Array.isArray(res.text) ? res.text.join("\n") : res.text).trim();
      } catch {
        text = "";
      }
    } else if (mime.startsWith("text/")) {
      text = new TextDecoder().decode(bytes);
    }

    const canAttach = mime === "application/pdf" || mime.startsWith("image/");
    const content: Array<{ type: "text"; text: string } | { type: "file"; data: Uint8Array; mediaType: string }> = [
      {
        type: "text",
        text:
          `You are filing a UK household document for the owner. Today is ${new Date().toISOString().slice(0, 10)}. ` +
          `The file is called "${doc.title}". Extract the details. Use an empty string where something isn't in the document; never guess numbers. ` +
          (text.length > 200 ? `The extracted text is supplied, so set transcription to null.\n\n--- TEXT ---\n${text.slice(0, 120000)}` : "No usable text layer was found, so read the file itself and fill in transcription."),
      },
    ];
    // Send the actual file when there's no text layer (scans, photos) or the PDF is small enough to help with layout.
    if (canAttach && (text.length <= 200 || bytes.byteLength < 8_000_000)) content.push({ type: "file", data: bytes, mediaType: mime });
    if (!canAttach && text.length <= 200) throw new Error("Unsupported file type. Upload a PDF or a photo.");

    const { object: raw } = await generateObject({ model: AI_MODEL, schema: Raw, messages: [{ role: "user", content }] });
    const x = normalise(raw);

    // try to link to a car automatically
    let vehicle_id = doc.vehicle_id;
    if (!vehicle_id && x.vehicle_registration) {
      const reg = x.vehicle_registration.replace(/\s/g, "").toUpperCase();
      const { data: cars } = await supabase.from("vehicles").select("id, registration");
      vehicle_id = cars?.find((c) => c.registration.replace(/\s/g, "").toUpperCase() === reg)?.id ?? null;
      if (vehicle_id && x.doc_type === "mot" && x.end_date) await supabase.from("vehicles").update({ mot_due: x.end_date }).eq("id", vehicle_id);
      if (vehicle_id && x.doc_type === "vehicle_tax" && x.end_date) await supabase.from("vehicles").update({ tax_due: x.end_date }).eq("id", vehicle_id);
    }

    const facts = [...x.key_facts];
    if (x.previous_amount) facts.unshift({ label: "Previous price", value: `£${x.previous_amount}` });

    await supabase
      .from("documents")
      .update({
        status: "ready",
        error: null,
        title: x.title || doc.title,
        doc_type: x.doc_type,
        provider: x.provider,
        reference: x.reference,
        start_date: x.start_date,
        end_date: x.end_date,
        amount: x.amount,
        amount_frequency: x.amount_frequency,
        summary: x.summary,
        key_facts: facts,
        energy: x.energy,
        extracted_text: text.length > 200 ? text : x.transcription ?? text,
        vehicle_id,
      })
      .eq("id", id);

    // If it's linked to a bill and states last year's price, add it to the price history.
    if (doc.commitment_id && x.previous_amount && x.start_date) {
      const prev = new Date(x.start_date + "T00:00:00");
      prev.setFullYear(prev.getFullYear() - 1);
      await supabase.from("price_history").insert({ commitment_id: doc.commitment_id, amount: x.previous_amount, frequency: x.amount_frequency ?? "annually", effective_date: prev.toISOString().slice(0, 10), note: "From renewal letter" });
    }

    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Processing failed";
    await supabase.from("documents").update({ status: "error", error: msg }).eq("id", id);
    return Response.json({ error: msg }, { status: 500 });
  }
}
