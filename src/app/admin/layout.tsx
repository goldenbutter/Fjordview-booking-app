import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  BedDouble,
  CalendarDays,
  ClipboardList,
  FileText,
  Gauge,
  Hotel,
  Settings,
  Sparkles,
  Tags,
  Users,
} from "lucide-react";
import { demoProperty } from "@/lib/db/seed";

const nav = [
  { href: "/admin", label: "Dashboard", icon: Gauge },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/guests", label: "Guests", icon: Users },
  { href: "/admin/rooms", label: "Rooms", icon: BedDouble },
  { href: "/admin/pricing", label: "Pricing", icon: Tags },
  { href: "/admin/cleaning", label: "Cleaning", icon: Sparkles },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/invoices", label: "Invoices", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-600 text-white">
            <Hotel className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">{demoProperty.name}</div>
            <div className="text-xs text-slate-500">Admin prototype</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <div className="text-sm text-slate-500">Signed in as</div>
            <div className="font-semibold">Demo Admin</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/book/fjordview" className="rounded-md border border-teal-200 px-3 py-2 font-semibold text-teal-700">
              Public booking
            </Link>
            <button className="rounded-md bg-slate-100 px-3 py-2 font-semibold text-slate-700">EN</button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
