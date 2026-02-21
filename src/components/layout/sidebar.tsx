"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  HardHat,
  Coins,
  Users,
  Package,
  Wrench,
  BarChart3,
  ClipboardList,
  FileText,
} from "lucide-react";

const navItems = [
  { href: "currencies", label: "Currencies", icon: Coins },
  { href: "labor", label: "Labor", icon: Users },
  { href: "materials", label: "Materials", icon: Package },
  { href: "equipment", label: "Equipment", icon: Wrench },
  { href: "analysis", label: "Analysis", icon: BarChart3 },
  { href: "boq", label: "BoQ", icon: ClipboardList },
  { href: "reports", label: "Reports", icon: FileText },
];

export function Sidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <HardHat className="h-6 w-6 text-primary" />
        <span className="font-semibold">Unit Rate</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const href = `/projects/${projectId}/${item.href}`;
          const isActive = pathname === href || pathname.startsWith(href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
