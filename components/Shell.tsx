"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, LogOut, Wrench, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const BASE_NAV = [
  { label: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  { label: "見積", href: "/quotes", icon: FileText },
];
// Owner-only management screen (invite codes + employee approvals).
const OWNER_NAV = [{ label: "メンバー", href: "/team", icon: Users }];

export default function Shell({
  companyName,
  userName,
  role,
  children,
}: {
  companyName: string;
  userName: string;
  role: "owner" | "employee";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const NAV_ITEMS = role === "owner" ? [...BASE_NAV, ...OWNER_NAV] : BASE_NAV;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <Wrench size={16} className="text-white" />
          </div>
          <span className="font-semibold text-slate-800 text-sm truncate">{companyName}</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-slate-100">
          <p className="px-3 text-xs text-slate-400 mb-2 truncate">{userName}さん</p>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <LogOut size={18} />
            ログアウト
          </button>
        </div>
      </aside>

      <main className="md:ml-56 min-h-screen pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                active ? "text-slate-900" : "text-slate-400"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
        <button
          onClick={handleSignOut}
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium text-slate-400"
        >
          <LogOut size={20} />
          ログアウト
        </button>
      </nav>
    </div>
  );
}
