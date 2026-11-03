import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };

export const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
