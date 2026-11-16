"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function Motion() {
  const pathname = usePathname();
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    async function setup() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-hero-line]", {
          yPercent: 55,
          opacity: 0,
          duration: 0.8,
          stagger: 0.09,
          ease: "power3.out",
          clearProps: "all",
        });
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.from(element, {
            y: 38,
            opacity: 0,
            duration: 0.85,
            ease: "power2.out",
            clearProps: "all",
            scrollTrigger: { trigger: element, start: "top 92%", once: true },
          });
        });
        gsap.utils
          .toArray<HTMLElement>("[data-parallax]")
          .forEach((element) => {
            gsap.fromTo(
              element,
              { yPercent: -6 },
              {
                yPercent: 6,
                ease: "none",
                scrollTrigger: {
                  trigger: element.parentElement,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1,
                },
              },
            );
          });
        if (document.querySelector(".process-progress"))
          gsap.fromTo(
            ".process-progress",
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: "none",
              scrollTrigger: {
                trigger: ".process-steps",
                start: "top 70%",
                end: "bottom 70%",
                scrub: true,
              },
            },
          );
      });
      cleanup = () => media.revert();
      ScrollTrigger.refresh();
    }
    setup().catch(() => {
      /* Content stays visible if animation cannot initialise. */
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [pathname]);
  return null;
}
