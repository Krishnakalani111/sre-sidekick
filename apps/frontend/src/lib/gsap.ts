import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

// Exact easing curves pulled from godaylight.com's production CSS.
CustomEase.create("expo-out", "0.16, 1.08, 0.38, 0.98");
CustomEase.create("quart-out", "0.26, 1.04, 0.54, 1");
CustomEase.create("expo-inout", "0.9, 0, 0.1, 1");
CustomEase.create("quart-inout", "0.77, 0, 0.175, 1");

export const EASE = {
  expoOut: "expo-out",
  quartOut: "quart-out",
  expoInOut: "expo-inout",
  quartInOut: "quart-inout",
};

export { gsap, ScrollTrigger, SplitText };
