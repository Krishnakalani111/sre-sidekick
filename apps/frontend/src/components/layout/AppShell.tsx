/**
 * Shell for the signed-in pages: fixed left sidebar + scrolling content, after
 * the Stitch dashboard mockup.
 *
 * Icons are Lucide (already a dependency) rather than the mockup's Material
 * Symbols, which would need a webfont from a CDN — the app self-hosts its
 * fonts via @fontsource.
 *
 * Separate from components/layout/NavBar, which is the landing page's animated
 * floating nav.
 */
import { Link, NavLink } from "react-router-dom";
import { Activity, Bot, Siren } from "lucide-react";
import { cn } from "@/lib/utils";

const primaryNav = [
  { to: "/dashboard", label: "Incidents", icon: Siren },
  { to: "/ask", label: "AI Sidekick", icon: Bot },
];

const itemBase =
  "flex items-center gap-3 rounded-lg px-3 py-2 font-mono-label transition-colors";

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh md:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col justify-between border-r border-border/60 bg-sidebar/80 px-4 py-6 backdrop-blur-md md:flex">
        <div className="space-y-8">
          <Link to="/" className="flex items-center gap-3 px-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="size-4" />
            </span>
            <span>
              <span className="block font-display text-lg leading-none">Sidekick</span>
              <span className="font-mono-label text-muted-foreground/70">Vigilant Mode</span>
            </span>
          </Link>

          <nav className="space-y-1">
            {primaryNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    itemBase,
                    isActive
                      ? "bg-primary/10 font-bold text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Sidebar is desktop-only; small screens get the tabs inline instead. */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center gap-1 px-4">
          {primaryNav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-1.5 font-mono-label transition-colors",
                  isActive ? "bg-muted text-foreground" : "text-muted-foreground",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
