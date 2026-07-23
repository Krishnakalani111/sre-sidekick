import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap, EASE } from "@/lib/gsap";

export function Reveal({
  children,
  className,
  y = 32,
  delay = 0,
  stagger,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = stagger ? Array.from(el.children) : el;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          delay,
          stagger,
          ease: EASE.quartOut,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            once: true,
          },
        }
      );
    }, ref);

    return () => ctx.revert();
  }, [y, delay, stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
