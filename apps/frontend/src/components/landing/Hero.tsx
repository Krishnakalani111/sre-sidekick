import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { SplitLines } from "@/components/SplitLines";
import { gsap, EASE } from "@/lib/gsap";

export function Hero() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (bodyRef.current) {
        gsap.from(bodyRef.current.children, {
          opacity: 0,
          y: 16,
          duration: 1,
          delay: 0.5,
          stagger: 0.12,
          ease: EASE.expoOut,
        });
      }
      if (visualRef.current) {
        gsap.from(visualRef.current, {
          opacity: 0,
          y: 24,
          scale: 0.97,
          duration: 1.2,
          delay: 0.6,
          ease: EASE.expoOut,
        });
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative min-h-svh overflow-hidden">
      <div className="gradient-panel-warm gradient-noise absolute -top-40 -right-20 size-[640px] rounded-full opacity-40 blur-3xl dark:opacity-25" />
      <div className="gradient-panel-cool gradient-noise absolute -bottom-40 -left-40 size-[520px] rounded-full opacity-20 blur-3xl dark:opacity-25" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 pt-36 pb-20 lg:grid-cols-12 lg:pt-32 lg:pb-24">
        <div className="lg:col-span-7">
          <SplitLines
            as="p"
            className="font-mono-label mb-6 overflow-hidden text-primary"
            delay={0.1}
            onScroll={false}
          >
            [ AI SRE Sidekick ]
          </SplitLines>

          <SplitLines
            as="h1"
            className="font-display max-w-xl text-5xl leading-[1.05] font-medium tracking-tight text-balance md:text-7xl"
            delay={0.25}
            onScroll={false}
          >
            From alert to verified fix,
            <br />
            <span className="italic text-primary">without waking anyone up.</span>
          </SplitLines>

          <div ref={bodyRef}>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              An AI reliability engineer that watches your telemetry, finds the root cause,
              proposes a fix, and verifies recovery — with a human always in the loop.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/dashboard">
                <Button size="cta" className="transition-transform duration-300 ease-out hover:scale-[1.03]">
                  View Dashboard
                  <ArrowRight />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  size="cta"
                  variant="outline"
                  className="transition-transform duration-300 ease-out hover:scale-[1.03]"
                >
                  How it works
                </Button>
              </a>
            </div>
          </div>
        </div>

        <div ref={visualRef} className="lg:col-span-5">
          <div className="gradient-panel-warm gradient-noise relative aspect-[4/5] w-full overflow-hidden rounded-2xl shadow-2xl">
            <div className="absolute inset-0 flex flex-col justify-between p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono-label rounded-full border border-white/30 bg-black/10 px-3 py-1 text-white/90">
                  Live
                </span>
                <span className="size-2 animate-pulse rounded-full bg-white" />
              </div>

              <div className="glass-card w-full rounded-xl p-5 shadow-xl">
                <p className="font-mono-label mb-4 text-muted-foreground">Live status</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="font-mono text-2xl font-medium text-foreground">4m 32s</p>
                    <p className="font-mono-label mt-1 text-muted-foreground">MTTR</p>
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-medium text-foreground">2</p>
                    <p className="font-mono-label mt-1 text-muted-foreground">Active</p>
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-medium text-emerald-500">87%</p>
                    <p className="font-mono-label mt-1 text-muted-foreground">Confidence</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
