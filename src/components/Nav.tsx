"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Wallet, HeartPulse, LifeBuoy, Bot, CalendarClock, Car, FileText, Flame, Handshake, LayoutDashboard, Receipt, Settings, ShieldCheck } from "lucide-react";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bills", label: "Bills & renewals", icon: Receipt },
  { href: "/income", label: "Money in", icon: Wallet },
  { href: "/cover", label: "Life cover", icon: HeartPulse },
  { href: "/review", label: "Yearly review", icon: BarChart3 },
  { href: "/cars", label: "Cars", icon: Car },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/assistant", label: "Ask AI", icon: Bot },
  { href: "/energy", label: "Gas & electric", icon: Flame },
  { href: "/warranties", label: "Warranties", icon: ShieldCheck },
  { href: "/lent", label: "Lent & borrowed", icon: Handshake },
  { href: "/dates", label: "Key dates", icon: CalendarClock },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/if-something-happens", label: "If something happens", icon: LifeBuoy },
];

export default function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      {/* desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-stone-200 bg-white/60 backdrop-blur h-screen sticky top-0 p-4">
        <Link href="/" className="flex items-center gap-2 px-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-emerald-700 text-white grid place-items-center font-bold font-display">L</div>
          <span className="font-display font-semibold text-lg">Life Hub</span>
        </Link>
        <nav className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${href === "/if-something-happens" ? "!mt-4 " : ""}flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${active(href) ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"}`}
            >
              <Icon size={17} /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      {/* mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="flex gap-1 overflow-x-auto px-2 py-2 no-scrollbar">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${active(href) ? "bg-emerald-700 text-white font-semibold" : "bg-stone-100 text-stone-700"}`}
            >
              <Icon size={14} /> {label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
