import { createElement, useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap, SplitText, EASE } from "@/lib/gsap";

export function SplitLines({
  as = "div",
  className,
  children,
  delay = 0,
  onScroll = true,
}: {
  as?: "h1" | "h2" | "p" | "div";
  className?: string;
  children: ReactNode;
  delay?: number;
  /** Play when scrolled into view (default) vs. immediately on mount (hero headline). */
  onScroll?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let split: SplitText | undefined;
    const ctx = gsap.context(() => {
      split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "intro-line",
      });
      gsap.from(split.lines, {
        yPercent: 110,
        duration: 1.1,
        delay,
        stagger: 0.08,
        ease: EASE.expoOut,
        scrollTrigger: onScroll
          ? { trigger: el, start: "top 85%", once: true }
          : undefined,
      });
    });

    return () => {
      ctx.revert();
      split?.revert();
    };
  }, [delay, onScroll]);

  return createElement(as, { ref, className }, children);
}
