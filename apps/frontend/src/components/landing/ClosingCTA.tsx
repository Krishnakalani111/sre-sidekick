import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { SplitLines } from "@/components/SplitLines";
import { Reveal } from "@/components/Reveal";

export function ClosingCTA() {
  return (
    <section className="gradient-panel-warm gradient-noise relative overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
        <SplitLines
          as="h2"
          className="font-display mx-auto max-w-3xl overflow-hidden text-4xl font-medium text-white italic md:text-6xl"
        >
          The next incident won't need you at 3am.
        </SplitLines>
        <Reveal delay={0.6} className="mt-10">
          <Link to="/dashboard">
            <Button
              size="cta"
              className="bg-white text-primary transition-transform duration-300 ease-out hover:scale-[1.03] hover:bg-white/90"
            >
              View Dashboard
              <ArrowRight />
            </Button>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
