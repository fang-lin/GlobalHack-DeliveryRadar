import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { Radar, Github, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Overview from "@/pages/Overview";
import DashboardLayout from "@/pages/DashboardLayout";
import { DashboardView } from "@/components/DashboardView";
import { DASHBOARDS } from "@/data/dashboards";
import Evidence from "@/pages/Evidence";
import EvidenceLayout from "@/pages/EvidenceLayout";
import EvidenceExample from "@/pages/EvidenceExample";

const NAV = [
  { to: "/", label: "Overview", end: true },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/evidence", label: "Evidence" },
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      <header id="site-header" className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-5">
          <NavLink to="/" id="nav-logo" className="flex items-center gap-2 font-semibold" onClick={() => setMenuOpen(false)}>
            <Radar className="h-5 w-5 text-primary" />
            <span>Delivery Radar</span>
            <span className="ml-1 hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              IIAC
            </span>
          </NavLink>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                id={`nav-${n.label.toLowerCase()}`}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
            <a
              id="nav-github"
              href="https://github.com/fang-lin/GlobalHack-DeliveryRadar"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 inline-flex rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="GitHub repository"
            >
              <Github className="h-4 w-4" />
            </a>
          </nav>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground sm:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <nav id="mobile-nav" className="border-t border-border bg-background px-4 py-2 sm:hidden">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                id={`mobile-nav-${n.label.toLowerCase()}`}
                to={n.to}
                end={n.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "block rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
            <a
              id="mobile-nav-github"
              href="https://github.com/fang-lin/GlobalHack-DeliveryRadar"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              GitHub ↗
            </a>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-5">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardView data={DASHBOARDS["shop-demo"]} />} />
            <Route path="backstage" element={<DashboardView data={DASHBOARDS.backstage} />} />
          </Route>
          <Route path="/evidence" element={<EvidenceLayout />}>
            <Route index element={<Evidence />} />
            <Route path="example" element={<EvidenceExample />} />
          </Route>
        </Routes>
      </main>

      <footer id="site-footer" className="mt-12 border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-5 py-6 text-center text-xs text-muted-foreground sm:justify-between sm:text-left">
          <span>Delivery Radar — Intent–Implementation Alignment &amp; Convergence · advisory, never blocks</span>
          <span className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
            <span className="whitespace-nowrap">built at</span>
            <img
              src="https://www.thoughtworks.com/etc.clientlibs/thoughtworks/clientlibs/clientlib-site/resources/images/thoughtworks-logo.svg"
              alt="Thoughtworks"
              className="h-3.5"
              style={{ filter: "brightness(0) invert(0.8)" }}
            />
            <span className="whitespace-nowrap italic">Innovation that AI/works™</span>
            <span className="whitespace-nowrap">· Global Hackathon 2026</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
