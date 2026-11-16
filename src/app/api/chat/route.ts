import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AI_MODEL } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  // Structured records are small, so give the model all of them up front.
  const [c, v, w, e, l, k, d] = await Promise.all([
    supabase.from("commitments").select("name, provider, category, amount, frequency, payment_day, payment_method, start_date, end_date, auto_renews, reference, phone, website, notes, active"),
    supabase.from("vehicles").select("registration, make, model, year, mot_due, tax_due, service_due, notes"),
    supabase.from("warranties").select("item, brand, retailer, purchase_date, expiry_date, cost, serial_number, notes"),
    supabase.from("energy_tariffs").select("supplier, tariff_name, fuel, unit_rate_p, night_rate_p, standing_charge_p, start_date, end_date, exit_fee, monthly_payment, annual_usage_kwh, meter_number, mpan_mprn, account_number, is_current"),
    supabase.from("loans").select("item, person, direction, date_out, expected_back, returned_on, notes"),
    supabase.from("key_dates").select("title, category, due_date, repeat_months, done, notes"),
    supabase.from("documents").select("id, title, doc_type, provider, reference, start_date, end_date").eq("status", "ready").order("created_at", { ascending: false }).limit(300),
  ]);

  const strip = (rows: Record<string, unknown>[] | null) => (rows ?? []).map((r) => Object.fromEntries(Object.entries(r).filter(([, x]) => x !== null && x !== "")));

  const system = `You are the assistant inside "Life Hub", a private app where a UK household keeps its bills, insurance, warranties, car details, energy tariffs, documents and notes.
Today is ${new Date().toISOString().slice(0, 10)}. Money is GBP. Be brief and direct, like a helpful friend who's read all the paperwork.
Answer from the data below and from documents (use the tools to search and read them). Quote exact numbers/references as written. Say which document or record the answer came from.
If you can't find something, say so plainly and suggest where it might be — never invent policy numbers, dates or prices.
Energy rates: unit rates are p/kWh, standing charges p/day.

BILLS & POLICIES: ${JSON.stringify(strip(c.data))}
CARS: ${JSON.stringify(strip(v.data))}
WARRANTIES: ${JSON.stringify(strip(w.data))}
ENERGY TARIFFS: ${JSON.stringify(strip(e.data))}
LENT / BORROWED: ${JSON.stringify(strip(l.data))}
KEY DATES: ${JSON.stringify(strip(k.data))}
DOCUMENT INDEX (use read_document with id for full text): ${JSON.stringify(strip(d.data))}`;

  const result = streamText({
    model: AI_MODEL,
    system,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(6),
    tools: {
      search_documents: tool({
        description: "Full-text search across all uploaded documents (policy schedules, bills, receipts, letters). Returns matching documents with summaries and key facts.",
        inputSchema: z.object({ query: z.string().describe("keywords, e.g. 'pet insurance policy number'") }),
        execute: async ({ query }) => {
          const words = query.split(/\s+/).filter((x) => x.length > 2).join(" or ");
          const { data } = await supabase
            .from("documents")
            .select("id, title, doc_type, provider, reference, start_date, end_date, amount, amount_frequency, summary, key_facts")
            .textSearch("search", words || query, { type: "websearch", config: "english" })
            .limit(8);
          return data ?? [];
        },
      }),
      read_document: tool({
        description: "Read the full extracted text of one document by id.",
        inputSchema: z.object({ id: z.string() }),
        execute: async ({ id }) => {
          const { data } = await supabase.from("documents").select("title, summary, key_facts, extracted_text").eq("id", id).maybeSingle();
          if (!data) return { error: "not found" };
          return { ...data, extracted_text: (data.extracted_text ?? "").slice(0, 60000) };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
