import {
  Baby, Car, CircleDollarSign, CreditCard, HandHeart, Home, KeyRound, Landmark, PawPrint, PiggyBank, Repeat, ShieldCheck, Sofa, Wifi, Zap,
  type LucideIcon,
} from "lucide-react";

/** Colour + icon for each bill category, used across the app. */
export const CATEGORY_STYLE: Record<string, { icon: LucideIcon; color: string }> = {
  insurance: { icon: ShieldCheck, color: "#7fb4ff" },
  subscription: { icon: Repeat, color: "#b79cff" },
  utility: { icon: Zap, color: "#f2b84b" },
  phone_broadband: { icon: Wifi, color: "#5ed0e6" },
  council_tax: { icon: Landmark, color: "#a9b6d1" },
  mortgage_rent: { icon: Home, color: "#5fe0b8" },
  rental: { icon: KeyRound, color: "#ff9e7a" },
  home: { icon: Sofa, color: "#e6a3d6" },
  loan_finance: { icon: CreditCard, color: "#ff8f8f" },
  savings: { icon: PiggyBank, color: "#8fe388" },
  car: { icon: Car, color: "#ffd166" },
  kids: { icon: Baby, color: "#ff9fc4" },
  pets: { icon: PawPrint, color: "#d8b48a" },
  charity: { icon: HandHeart, color: "#f79b9b" },
  other: { icon: CircleDollarSign, color: "#93a0bd" },
};

export const catStyle = (c?: string | null) => CATEGORY_STYLE[c ?? "other"] ?? CATEGORY_STYLE.other;

export function CatIcon({ category, size = 36 }: { category?: string | null; size?: number }) {
  const { icon: Icon, color } = catStyle(category);
  return (
    <span
      className="inline-grid place-items-center rounded-xl shrink-0"
      style={{ width: size, height: size, background: `${color}1f`, color, boxShadow: `inset 0 0 0 1px ${color}33` }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.5)} />
    </span>
  );
}

export const GROUP_COLOR: Record<string, string> = { household: "#5fe0b8", personal: "#b79cff", rental: "#ff9e7a" };
