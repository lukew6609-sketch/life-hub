/** Colour tiers for anything with a due date: red within a week (or overdue), amber within a month, blue within 3 months, grey after. */
export type Tier = { ring: string; bg: string; text: string; chip: string };

export function urgency(days: number): Tier {
  if (days <= 7) return { ring: "#ff6b6b", bg: "rgba(255,107,107,0.12)", text: "text-red-600", chip: "bg-red-50 text-red-700" };
  if (days <= 31) return { ring: "#f2b84b", bg: "rgba(242,184,75,0.12)", text: "text-amber-700", chip: "bg-amber-50 text-amber-700" };
  if (days <= 90) return { ring: "#5aaeff", bg: "rgba(90,174,255,0.10)", text: "text-sky-800", chip: "bg-sky-50 text-sky-800" };
  return { ring: "#6c7b9c", bg: "rgba(108,123,156,0.10)", text: "text-stone-500", chip: "bg-stone-100 text-stone-600" };
}
