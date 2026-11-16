// Field definitions drive the generic add/edit forms and the server-side save action.

export type FieldType = "text" | "number" | "money" | "date" | "select" | "textarea" | "checkbox";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  wide?: boolean;
  /** default for checkboxes on new records */
  checked?: boolean;
};

const opt = (pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }));

export const CATEGORIES = opt([
  ["insurance", "Insurance"],
  ["subscription", "Subscription"],
  ["utility", "Utilities (gas, electric, water)"],
  ["phone_broadband", "Phone & broadband"],
  ["council_tax", "Council tax"],
  ["mortgage_rent", "Mortgage / rent"],
  ["rental", "Rental property"],
  ["home", "Home"],
  ["loan_finance", "Loan / finance"],
  ["savings", "Savings / investments"],
  ["car", "Car"],
  ["kids", "Kids"],
  ["pets", "Pets"],
  ["charity", "Charity"],
  ["other", "Other"],
]);

export const FREQUENCIES = opt([
  ["weekly", "Weekly"],
  ["fortnightly", "Fortnightly"],
  ["four_weekly", "Every 4 weeks"],
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["six_monthly", "Every 6 months"],
  ["annually", "Yearly"],
  ["one_off", "One-off"],
]);

export const INCOME_CATEGORIES = opt([
  ["wages", "Wages / salary"],
  ["dividends", "Dividends"],
  ["rent", "Rent received"],
  ["benefits", "Benefits"],
  ["pension", "Pension"],
  ["other", "Other"],
]);
export const incomeCategoryLabel = (v?: string | null) => INCOME_CATEGORIES.find((c) => c.value === v)?.label ?? "Other";

export const categoryLabel = (v?: string | null) => CATEGORIES.find((c) => c.value === v)?.label ?? "Other";
export const frequencyLabel = (v?: string | null) => FREQUENCIES.find((c) => c.value === v)?.label ?? v ?? "";

export const FORMS: Record<string, Field[]> = {
  commitments: [
    { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Pet insurance" },
    { name: "provider", label: "Provider", type: "text", placeholder: "e.g. Petplan" },
    { name: "category", label: "Category", type: "select", options: CATEGORIES },
    { name: "amount", label: "Amount (£)", type: "money" },
    { name: "frequency", label: "How often", type: "select", options: FREQUENCIES },
    { name: "payment_day", label: "Day it comes out", type: "number", placeholder: "1-31" },
    { name: "payment_method", label: "Paid by", type: "text", placeholder: "Direct debit, card..." },
    { name: "reference", label: "Policy / account number", type: "text" },
    { name: "start_date", label: "Started", type: "date" },
    { name: "end_date", label: "Renews / deal ends", type: "date", help: "Shows on the dashboard when it's coming up" },
    { name: "auto_renews", label: "Auto-renews", type: "checkbox", checked: true },
    { name: "active", label: "Still paying this", type: "checkbox", checked: true },
    { name: "website", label: "Website", type: "text" },
    { name: "phone", label: "Phone", type: "text" },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ],
  vehicles: [
    { name: "registration", label: "Registration", type: "text", required: true, placeholder: "AB12 CDE" },
    { name: "make", label: "Make", type: "text" },
    { name: "model", label: "Model", type: "text" },
    { name: "year", label: "Year", type: "number" },
    { name: "colour", label: "Colour", type: "text" },
    { name: "mot_due", label: "MOT due", type: "date" },
    { name: "tax_due", label: "Tax due", type: "date" },
    { name: "service_due", label: "Service due", type: "date" },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ],
  warranties: [
    { name: "item", label: "Item", type: "text", required: true, placeholder: "e.g. DeWalt strimmer" },
    { name: "brand", label: "Brand", type: "text" },
    { name: "retailer", label: "Bought from", type: "text" },
    { name: "purchase_date", label: "Bought on", type: "date" },
    { name: "expiry_date", label: "Warranty ends", type: "date" },
    { name: "cost", label: "Cost (£)", type: "money" },
    { name: "serial_number", label: "Serial number", type: "text" },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ],
  energy_tariffs: [
    { name: "supplier", label: "Supplier", type: "text", required: true },
    { name: "tariff_name", label: "Tariff name", type: "text" },
    { name: "fuel", label: "Fuel", type: "select", options: opt([["electricity", "Electricity"], ["gas", "Gas"]]) },
    { name: "tariff_type", label: "Tariff type", type: "text", placeholder: "Fixed, variable, EV..." },
    { name: "unit_rate_p", label: "Unit rate (p/kWh)", type: "number" },
    { name: "night_rate_p", label: "Night / off-peak rate (p/kWh)", type: "number" },
    { name: "standing_charge_p", label: "Standing charge (p/day)", type: "number" },
    { name: "monthly_payment", label: "Monthly direct debit (£)", type: "money" },
    { name: "annual_usage_kwh", label: "Yearly usage (kWh)", type: "number" },
    { name: "start_date", label: "Started", type: "date" },
    { name: "end_date", label: "Fix ends", type: "date" },
    { name: "exit_fee", label: "Exit fee (£)", type: "money" },
    { name: "account_number", label: "Account number", type: "text" },
    { name: "meter_number", label: "Meter serial", type: "text" },
    { name: "mpan_mprn", label: "MPAN / MPRN", type: "text" },
    { name: "is_current", label: "Current tariff", type: "checkbox", checked: true },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ],
  loans: [
    { name: "item", label: "What", type: "text", required: true, placeholder: "e.g. Soldering iron" },
    { name: "person", label: "Who", type: "text", required: true, placeholder: "e.g. Dan" },
    { name: "direction", label: "Direction", type: "select", options: opt([["lent", "I lent it to them"], ["borrowed", "I borrowed it from them"]]) },
    { name: "date_out", label: "Date", type: "date" },
    { name: "expected_back", label: "Due back", type: "date" },
    { name: "returned_on", label: "Returned on", type: "date" },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ],
  key_dates: [
    { name: "title", label: "What", type: "text", required: true, placeholder: "e.g. Passport expires" },
    { name: "category", label: "Category", type: "text", placeholder: "Home, ID, health..." },
    { name: "due_date", label: "Date", type: "date", required: true },
    { name: "repeat_months", label: "Repeats every (months)", type: "number", help: "e.g. 12 for a yearly boiler service" },
    { name: "done", label: "Done", type: "checkbox" },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ],
  income: [
    { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Wages" },
    { name: "source", label: "From", type: "text", placeholder: "e.g. MELW Properties Ltd" },
    { name: "category", label: "Type", type: "select", options: INCOME_CATEGORIES },
    { name: "amount", label: "Amount (£)", type: "money" },
    { name: "frequency", label: "How often", type: "select", options: FREQUENCIES },
    { name: "payment_day", label: "Day it comes in", type: "number", placeholder: "1-31" },
    { name: "start_date", label: "Started", type: "date" },
    { name: "end_date", label: "Ends (e.g. tenancy end)", type: "date", help: "Shows on the dashboard when it's coming up" },
    { name: "active", label: "Still coming in", type: "checkbox", checked: true },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ],
  income_history: [
    { name: "effective_date", label: "From", type: "date", required: true },
    { name: "amount", label: "Amount (£)", type: "money", required: true },
    { name: "frequency", label: "How often", type: "select", options: FREQUENCIES },
    { name: "note", label: "Note", type: "text" },
  ],
  price_history: [
    { name: "effective_date", label: "From", type: "date", required: true },
    { name: "amount", label: "Amount (£)", type: "money", required: true },
    { name: "frequency", label: "How often", type: "select", options: FREQUENCIES },
    { name: "note", label: "Note", type: "text" },
  ],
};

export const TABLES = Object.keys(FORMS);
export type TableName = keyof typeof FORMS;
