import { NavLink, Route, Routes } from "react-router-dom";
import { Radar, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import Overview from "@/pages/Overview";
import Dashboard from "@/pages/Dashboard";
import Evidence from "@/pages/Evidence";
import EvidenceLayout from "@/pages/EvidenceLayout";
import EvidenceExample from "@/pages/EvidenceExample";

const NAV = [
  { to: "/", label: "Overview", end: true },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/evidence", label: "Evidence" },
];

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <Radar className="h-5 w-5 text-primary" />
            <span>Delivery Radar</span>
            <span className="ml-1 hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              IIAC
            </span>
          </NavLink>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
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
              href="https://github.com/fang-lin/GlobalHack-DeliveryRadar"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="GitHub repository"
            >
              <Github className="h-4 w-4" />
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/evidence" element={<EvidenceLayout />}>
            <Route index element={<Evidence />} />
            <Route path="example" element={<EvidenceExample />} />
          </Route>
        </Routes>
      </main>

      <footer className="mt-12 border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground">
          <span>Delivery Radar — Intent–Implementation Alignment &amp; Convergence · advisory, never blocks</span>
          <span className="flex items-center gap-1.5">
            built at
            <img
              src="https://www.thoughtworks.com/etc.clientlibs/thoughtworks/clientlibs/clientlib-site/resources/images/thoughtworks-logo.svg"
              alt="Thoughtworks"
              className="h-3.5"
              style={{ filter: "brightness(0) invert(0.8)" }}
            />
            <span className="italic">Innovation that AI/works™</span>
            · Global Hackathon 2026
          </span>
        </div>
      </footer>
    </div>
  );
}
