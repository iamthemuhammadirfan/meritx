"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { TechnologyScene } from "./technology-scene";
import { Arrow } from "./icons";

const chapters = [
  {
    label: "Equip",
    title: "Start with the right tools.",
    text: "Business laptops, workstations and servers, chosen around your team’s applications, budget and day-to-day workload.",
    link: "/it-equipment/business-laptops/",
    action: "Explore business laptops",
  },
  {
    label: "Connect",
    title: "Make every connection count.",
    text: "Cabling, switches and Wi-Fi bring people and systems together. A planned network turns separate devices into a working environment.",
    link: "/services/networking-infrastructure/",
    action: "Explore networking",
  },
  {
    label: "Protect",
    title: "Bring the site into view.",
    text: "Well-positioned cameras, suitable recording storage and controlled viewing access help your team see what matters at the premises.",
    link: "/services/cctv-surveillance/",
    action: "Explore CCTV installation",
  },
  {
    label: "Deliver",
    title: "Leave with a working setup.",
    text: "Configuration, testing and a clear handover connect the specification to the way your business actually operates.",
    link: "/services/installation-support/",
    action: "Explore installation & support",
  },
];

export function InfrastructureStory() {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0.25);
  useEffect(() => {
    let cancelled = false;
    let revert: (() => void) | undefined;
    async function setup() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const section = root.current;
      const media = gsap.matchMedia();
      media.add(
        "(min-width: 900px) and (prefers-reduced-motion: no-preference)",
        () => {
          section.classList.add("is-pinned");
          progress.current = 0;
          section.dataset.chapter = "0";
          const articles = Array.from(
            section.querySelectorAll<HTMLElement>(".infrastructure-chapter"),
          );
          let active = -1;
          const update = () => {
            const chapter = Math.min(3, Math.floor(progress.current * 4));
            section.dataset.chapter = String(chapter);
            section.style.setProperty(
              "--story-progress",
              String(progress.current),
            );
            section.dataset.progress = progress.current.toFixed(3);
            if (chapter !== active) {
              active = chapter;
              articles.forEach((article, index) => {
                article.inert = index !== chapter;
                article.setAttribute("aria-hidden", String(index !== chapter));
              });
            }
          };
          update();
          gsap.to(progress, {
            current: 1,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top 96px",
              end: "+=1800",
              pin: true,
              scrub: 0.65,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
            onUpdate: update,
          });
          return () => {
            section.classList.remove("is-pinned");
            section.removeAttribute("data-chapter");
            articles.forEach((article) => {
              article.inert = false;
              article.removeAttribute("aria-hidden");
            });
            progress.current = 0.65;
          };
        },
      );
      media.add(
        "(max-width: 899px) and (prefers-reduced-motion: no-preference)",
        () => {
          const visual = section.querySelector(".infrastructure-visual");
          if (!visual) return;
          progress.current = 0;
          gsap.to(progress, {
            current: 1,
            ease: "none",
            scrollTrigger: {
              trigger: visual,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.5,
            },
            onUpdate: () => {
              section.dataset.progress = progress.current.toFixed(3);
            },
          });
        },
      );
      revert = () => media.revert();
      document.fonts.ready.then(() => {
        if (!cancelled) ScrollTrigger.refresh();
      });
    }
    setup().catch(() => {
      /* The complete story stays readable without pinned animation. */
    });
    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);
  return (
    <section
      id="infrastructure"
      className="infrastructure-story"
      ref={root}
      aria-labelledby="infrastructure-title"
    >
      <div className="container">
        <div className="infrastructure-heading">
          <p className="eyebrow">See how it comes together</p>
          <h2 id="infrastructure-title">
            Separate pieces.
            <br />
            <span>One working environment.</span>
          </h2>
          <p>Scroll through the layers of a connected business.</p>
        </div>
        <div className="infrastructure-grid">
          <div className="infrastructure-visual">
            <TechnologyScene mode="story" storyProgress={progress} />
            <div className="infrastructure-caption">
              <span className="status-dot" /> A connected systems illustration
            </div>
          </div>
          <div className="infrastructure-chapters">
            {chapters.map((chapter, i) => (
              <article className="infrastructure-chapter" key={chapter.label}>
                <p className="eyebrow">
                  <span>0{i + 1}</span> / {chapter.label}
                </p>
                <h3>{chapter.title}</h3>
                <p>{chapter.text}</p>
                <Link className="text-link" href={chapter.link}>
                  {chapter.action}
                  <Arrow />
                </Link>
              </article>
            ))}
          </div>
        </div>
        <div className="infrastructure-nav" aria-hidden="true">
          {chapters.map((c, i) => (
            <span key={c.label} className={`chapter-marker marker-${i}`}>
              0{i + 1}
              <strong>{c.label}</strong>
            </span>
          ))}
          <i />
        </div>
      </div>
    </section>
  );
}
