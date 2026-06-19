import { NavLink, Outlet } from "react-router-dom";
import { cn, slug } from "@/lib/utils";

const SUB = [
  { to: "/dashboard", label: "shop-demo", end: true },
  { to: "/dashboard/backstage", label: "Backstage", end: false },
];

export default function DashboardLayout() {
  return (
    <div className="space-y-6">
      <div id="dashboard-subnav" className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Dashboard ·</span>
        {SUB.map((s) => (
          <NavLink
            key={s.to}
            id={`dashboard-tab-${slug(s.label)}`}
            to={s.to}
            end={s.end}
            className={({ isActive }) =>
              cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )
            }
          >
            {s.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
