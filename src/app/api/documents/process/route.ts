import { generateObject } from "ai";
import { z } from "zod";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { AI_MODEL } from "@/lib/ai";

export const maxDuration = 120;

const date = z.string().nullable().describe("ISO date YYYY-MM-DD, or null if not stated");

const Extracted = z.object({
  title: z.string().describe("Short human title, e.g. 'Petplan pet insurance schedule 2026' or 'MOT certificate AB12 CDE'"),
  doc_type: z
    .enum(["insurance", "warranty", "receipt", "utility_bill", "energy_bill", "phone_broadband", "subscription", "mot", "vehicle_tax", "v5c", "car_finance", "bank_statement", "payslip", "tax", "medical", "contract", "manual", "id_document", "letter", "other"])
    .describe("Best fitting type"),
  provider: z.string().nullable().describe("Company / insurer / supplier / retailer name"),
  reference: z.string().nullable().describe("Main policy, account, customer or certificate number"),
  start_date: date.describe("Policy/contract/cover start, or purchase date"),
  end_date: date.describe("Renewal, expiry, fix end, MOT expiry, warranty end, etc."),
  amount: z.number().nullable().describe("Main price/premium/cost in GBP"),
  amount_frequency: z.enum(["weekly", "fortnightly", "four_weekly", "monthly", "quarterly", "six_monthly", "annually", "one_off"]).nullable(),
  previous_amount: z.number().nullable().describe("Last year's/previous price if the document states it (renewal letters often do)"),
  summary: z.string().describe("2-4 sentence plain-English summary of what this is and anything important (excesses, cover limits, what's not covered, deadlines)"),
  key_facts: z.array(z.object({ label: z.string(), value: z.string() })).describe("Up to 20 useful facts: policy numbers, phone numbers, excess, cover level, vehicle reg, serial numbers, named people/pets, claim lines, etc."),
  energy: z
    .object({
      fuel: z.enum(["electricity", "gas"]).nullable(),
      tariff_name: z.string().nullable(),
      tariff_type: z.string().nullable(),
      unit_rate_p: z.number().nullable().describe("pence per kWh incl. VAT"),
      night_rate_p: z.number().nullable(),
      standing_charge_p: z.number().nullable().describe("pence per day incl. VAT"),
      tariff_end_date: date,
      exit_fee: z.number().nullable(),
      annual_usage_kwh: z.number().nullable(),
      monthly_payment: z.number().nullable(),
      meter_number: z.string().nullable(),
      mpan_mprn: z.string().nullable(),
    })
    .nullable()
    .describe("Only for gas/electric bills or tariff letters. If both fuels are present, give electricity here and mention gas rates in key_facts."),
  vehicle_registration: z.string().nullable().describe("UK reg if this is a car document"),
  transcription: z.string().nullable().describe("Only if no text was supplied with the file: a faithful transcription of the readable text (max ~4000 words)"),
});

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
        const pdf = await getDocumentProxy(bytes);
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
          `The file is called "${doc.title}". Extract the details. Use null where something isn't in the document; never guess numbers. ` +
          (text.length > 200 ? `The extracted text is supplied, so set transcription to null.\n\n--- TEXT ---\n${text.slice(0, 120000)}` : "No usable text layer was found, so read the file itself and fill in transcription."),
      },
    ];
    // Send the actual file when there's no text layer (scans, photos) or the PDF is small enough to help with layout.
    if (canAttach && (text.length <= 200 || bytes.byteLength < 8_000_000)) content.push({ type: "file", data: bytes, mediaType: mime });
    if (!canAttach && text.length <= 200) throw new Error("Unsupported file type. Upload a PDF or a photo.");

    const { object: x } = await generateObject({ model: AI_MODEL, schema: Extracted, messages: [{ role: "user", content }] });

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
