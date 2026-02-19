"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Send,
  FileText,
  Bot,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OperatorOneMark } from "@/components/brand/operator-one-mark";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/requests", label: "Requests", icon: Send },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/operators", label: "Operators", icon: Bot },
  { href: "/dashboard/admin", label: "Admin", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-grid-border bg-grid-dark">
      {/* Logo area */}
      <div className="flex h-14 items-center border-b border-grid-border px-4">
        <div className="flex items-center gap-2">
          <OperatorOneMark size={24} />
          <span className="text-sm font-bold uppercase tracking-widest">
            <span className="text-text-primary">OPERATOR</span><span className="text-neon-cyan">ONE</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-wider transition-all duration-150",
                isActive
                  ? "border border-neon-cyan/20 bg-neon-cyan/5 text-neon-cyan shadow-[var(--shadow-glow-cyan-sm)]"
                  : "border border-transparent text-text-secondary hover:border-grid-border hover:text-text-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-grid-border p-3">
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2 text-xs uppercase tracking-wider text-text-muted transition-colors hover:text-neon-red"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
