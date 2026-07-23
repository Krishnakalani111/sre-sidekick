import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { gsap, ScrollTrigger, EASE } from "@/lib/gsap";

export function NavBar() {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.set(el, { yPercent: -150 });
    gsap.to(el, { yPercent: 0, duration: 1, delay: 0.2, ease: EASE.expoOut });

    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        if (self.scroll() < 80) {
          gsap.to(el, { yPercent: 0, duration: 0.4, ease: EASE.quartOut });
          return;
        }
        gsap.to(el, {
          yPercent: self.direction === 1 ? -150 : 0,
          duration: 0.4,
          ease: EASE.quartOut,
        });
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <header ref={ref} className="fixed inset-x-0 top-4 z-40 flex justify-center px-4 md:top-6">
      <div className="glass-card flex w-full max-w-3xl items-center justify-between gap-4 rounded-full py-2 pr-2 pl-4 shadow-xl md:gap-8 md:pl-5">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            S
          </span>
          <span className="font-display text-base">Sidekick</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <a href="/#how-it-works" className="text-sm font-medium text-foreground/80 transition-opacity hover:opacity-60">
            How it works
          </a>
          <a href="/#why" className="text-sm font-medium text-foreground/80 transition-opacity hover:opacity-60">
            Why Sidekick
          </a>
          <a href="/#stack" className="text-sm font-medium text-foreground/80 transition-opacity hover:opacity-60">
            Stack
          </a>
        </nav>

        <Link to="/dashboard" className="shrink-0">
          <Button className="h-9 rounded-full px-4 text-sm transition-transform duration-300 ease-out hover:scale-[1.03]">
            View Dashboard
          </Button>
        </Link>
      </div>
    </header>
  );
}
