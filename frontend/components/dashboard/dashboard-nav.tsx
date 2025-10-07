"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3, FileText, RefreshCw, Home, Warehouse } from "lucide-react";
const navItems = [
    {
        title: "Overview",
        href: "/dashboard",
        icon: Home,
    },
    {
        title: "Products",
        href: "/dashboard/stock",
        icon: Warehouse,
    },
    {
        title: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
    },
    {
        title: "Restock",
        href: "/dashboard/restock",
        icon: RefreshCw,
    },
];
export function DashboardNav() {
    const pathname = usePathname();
    return (<nav className="w-54 border-r border-sidebar-border bg-sidebar backdrop-blur supports-[backdrop-filter]:bg-sidebar/90">
      <div className="p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (<Link key={item.href} href={item.href} className={cn("group flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-sidebar-accent/20 hover:text-sidebar-accent", isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/20"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground")}>
                <Icon className={cn("h-4 w-4 transition-transform duration-200 group-hover:scale-110", isActive ? "text-sidebar-primary-foreground" : "")}/>
                <span className="font-medium">{item.title}</span>
                {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground"/>}
              </Link>);
        })}
        </div>

        <div className="mt-8 pt-4 border-t border-sidebar-border">
          <div className="px-3 py-2">
            <p className="text-xs text-sidebar-foreground/60 font-medium">Stock Manager Pro</p>
            <p className="text-xs text-sidebar-foreground/40">v2.1.0</p>
          </div>
        </div>
      </div>
    </nav>);
}
