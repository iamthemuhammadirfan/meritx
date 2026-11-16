"use client";

import { useEffect, useRef, useState } from "react";
import { Boxes, Camera, CodeXml, Network, Pause, Play } from "lucide-react";
import styles from "./hero-solution.module.css";

const capabilities = [
  {
    key: "software",
    label: "Software",
    detail: "Applications & automation",
    Icon: CodeXml,
  },
  {
    key: "infrastructure",
    label: "Infrastructure",
    detail: "Networks & integration",
    Icon: Network,
  },
  {
    key: "equipment",
    label: "Equipment",
    detail: "Specification & supply",
    Icon: Boxes,
  },
  {
    key: "security",
    label: "Security",
    detail: "Cameras & recording",
    Icon: Camera,
  },
];

const routes = [
  "M320 270 H230 Q214 270 214 254 V136 Q214 120 198 120 H140",
  "M320 270 H410 Q426 270 426 254 V191 Q426 175 442 175 H510",
  "M320 270 H216 Q200 270 200 286 V364 Q200 380 184 380 H125",
  "M320 270 H410 Q426 270 426 286 V399 Q426 415 442 415 H495",
];

export function HeroSolution() {
  const root = useRef<HTMLDivElement>(null);
  const manualPause = useRef(false);
  const sync = useRef<(() => void) | null>(null);
  const [paused, setPaused] = useState(false);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    async function setup() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      const element = root.current;
      if (cancelled || !element) return;
      const visual = element.querySelector<HTMLElement>(
        "[data-solution-visual]",
      )!;
      const hero = element.closest<HTMLElement>(".home-hero")!;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      media.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
          fine: "(hover: hover) and (pointer: fine)",
          compact: "(max-width: 650px)",
        },
        (context) => {
          const { motion, fine, compact } = context.conditions!;
          if (!motion) {
            setAnimated(false);
            return;
          }
          let inView = false;
          const scene = element.querySelector("[data-solution-scroll]");
          const pointer = element.querySelector("[data-solution-pointer]");
          const planes = element.querySelectorAll("[data-solution-plane]");
          const nodes = element.querySelectorAll("[data-solution-node]");
          // Intro, pointer and scroll each own separate transforms.
          const intro = gsap
            .timeline({ defaults: { ease: "power3.out" } })
            .from(planes, {
              opacity: 0,
              duration: 0.8,
              stagger: 0.1,
              clearProps: "opacity",
            })
            .from(
              nodes,
              {
                opacity: 0,
                duration: 0.6,
                stagger: 0.08,
                clearProps: "opacity",
              },
              0.25,
            )
            .from(
              element.querySelectorAll("[data-solution-route]"),
              {
                strokeDasharray: 550,
                strokeDashoffset: 550,
                duration: 1.1,
                stagger: 0.08,
              },
              0.35,
            );
          const signals = gsap.fromTo(
            element.querySelectorAll("[data-solution-signal]"),
            { strokeDashoffset: 560 },
            {
              strokeDashoffset: 0,
              duration: 4,
              ease: "none",
              stagger: 0.6,
              repeat: -1,
              delay: 1.2,
            },
          );
          let bounds: DOMRect | undefined;
          const distance = compact ? 0.35 : 1;
          const scroll = gsap
            .timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: compact ? visual : hero,
                start: compact ? "top 65%" : "top top",
                end: compact ? "bottom 15%" : "bottom top",
                scrub: compact ? 0.35 : 0.65,
                invalidateOnRefresh: true,
                onUpdate: () => {
                  bounds = undefined;
                },
              },
            })
            .to(
              scene,
              {
                y: -32 * distance,
                rotationX: 8 * distance,
                rotationZ: -3 * distance,
              },
              0,
            )
            .to(planes[0], { y: 28 * distance, x: 10 * distance }, 0)
            .to(planes[1], { y: 2 * distance }, 0)
            .to(planes[2], { y: -34 * distance, x: -8 * distance }, 0)
            .to(
              nodes,
              {
                x: (i) => (i % 2 ? 16 : -16) * distance,
                y: (i) => (i < 2 ? -12 : 12) * distance,
              },
              0,
            );

          // Reuse four tweens; pointer movement creates no new timelines or React renders.
          const moveX = fine
            ? gsap.quickTo(pointer, "x", { duration: 0.8, ease: "power3.out" })
            : null;
          const moveY = fine
            ? gsap.quickTo(pointer, "y", { duration: 0.8, ease: "power3.out" })
            : null;
          const tiltX = fine
            ? gsap.quickTo(pointer, "rotationX", {
                duration: 0.8,
                ease: "power3.out",
              })
            : null;
          const tiltY = fine
            ? gsap.quickTo(pointer, "rotationY", {
                duration: 0.8,
                ease: "power3.out",
              })
            : null;
          const neutral = () => {
            moveX?.(0);
            moveY?.(0);
            tiltX?.(0);
            tiltY?.(0);
          };
          const measure = () => {
            bounds = hero.getBoundingClientRect();
          };
          const onMove = (event: PointerEvent) => {
            if (
              event.pointerType !== "mouse" ||
              manualPause.current ||
              !inView ||
              document.hidden
            )
              return;
            if (!bounds) measure();
            const x = gsap.utils.clamp(
              -1,
              1,
              ((event.clientX - bounds!.left) / bounds!.width - 0.5) * 2,
            );
            const y = gsap.utils.clamp(
              -1,
              1,
              ((event.clientY - bounds!.top) / bounds!.height - 0.5) * 2,
            );
            moveX?.(x * 12);
            moveY?.(y * 8);
            tiltX?.(-y * 7);
            tiltY?.(x * 10);
          };
          if (fine) {
            hero.addEventListener("pointerenter", measure, { passive: true });
            hero.addEventListener("pointermove", onMove, { passive: true });
            hero.addEventListener("pointerleave", neutral, { passive: true });
            ScrollTrigger.addEventListener("refresh", measure);
          }
          let scrollEnabled = true;
          const playback = () => {
            const stop = manualPause.current || !inView || document.hidden;
            [intro, signals].forEach((animation) =>
              stop ? animation.pause() : animation.resume(),
            );
            const trigger = scroll.scrollTrigger!;
            const freezeScroll = manualPause.current || document.hidden;
            if (freezeScroll && scrollEnabled) {
              scrollEnabled = false;
              trigger.getTween()?.pause();
              trigger.disable(false);
            } else if (!freezeScroll && !scrollEnabled) {
              scrollEnabled = true;
              trigger.enable(false, false);
              trigger.update();
            }
            if (stop) neutral();
          };
          if (manualPause.current) intro.progress(1);
          sync.current = playback;
          const observer = new IntersectionObserver(
            ([entry]) => {
              inView = entry.isIntersecting;
              playback();
            },
            { threshold: 0.1 },
          );
          observer.observe(visual);
          document.addEventListener("visibilitychange", playback);
          setAnimated(true);
          playback();
          document.fonts.ready.then(() => {
            if (!cancelled && element.isConnected) ScrollTrigger.refresh();
          });
          return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", playback);
            hero.removeEventListener("pointerenter", measure);
            hero.removeEventListener("pointermove", onMove);
            hero.removeEventListener("pointerleave", neutral);
            ScrollTrigger.removeEventListener("refresh", measure);
            sync.current = null;
          };
        },
      );
      cleanup = () => media.revert();
    }
    setup().catch(() => {
      /* The complete diagram remains visible without motion. */
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <div className={styles.stage} ref={root}>
      <div
        className={styles.visual}
        data-solution-visual
        role="img"
        aria-label="MeritX engineering and integration: software, networks, equipment and security connected in one system."
      >
        <div className={styles.scrollScene} data-solution-scroll>
          <div className={styles.pointerScene} data-solution-pointer>
            <div className={styles.grid} aria-hidden="true" />
            <svg
              className={styles.connections}
              viewBox="0 0 640 550"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="solution-route-color"
                  x1="80"
                  y1="100"
                  x2="540"
                  y2="430"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#078edc" />
                  <stop offset=".6" stopColor="#72b7e6" />
                  <stop offset="1" stopColor="#ff9c39" />
                </linearGradient>
              </defs>
              {routes.map((path, i) => (
                <g key={path}>
                  <path
                    d={path}
                    stroke="#89a9c2"
                    strokeWidth="1.2"
                    data-solution-route
                  />
                  <path
                    d={path}
                    stroke="url(#solution-route-color)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="22 538"
                    data-solution-signal
                  />
                  <circle
                    cx={i === 0 ? 140 : i === 1 ? 510 : i === 2 ? 125 : 495}
                    cy={i === 0 ? 120 : i === 1 ? 175 : i === 2 ? 380 : 415}
                    r="4"
                    fill="#f5faff"
                    stroke="#7e9fb9"
                  />
                </g>
              ))}
            </svg>
            <div className={styles.core} aria-hidden="true">
              <div
                className={`${styles.plane} ${styles.planeBase}`}
                data-solution-plane
              />
              <div
                className={`${styles.plane} ${styles.planeMiddle}`}
                data-solution-plane
              />
              <div
                className={`${styles.plane} ${styles.planeFace}`}
                data-solution-plane
              >
                <div className={styles.mounts}>
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className={styles.coreContent}>
                  <strong>
                    MERIT<span>X</span>
                  </strong>
                  <span className={styles.coreRule} />
                  <span className={styles.coreDetail}>
                    Engineering
                    <br />& integration
                  </span>
                </div>
              </div>
            </div>
            {capabilities.map(({ key, label, detail, Icon }) => (
              <div
                key={key}
                className={`${styles.node} ${styles[key]}`}
                data-solution-node
                aria-hidden="true"
              >
                <span className={styles.nodeIcon}>
                  <Icon size={22} strokeWidth={1.45} />
                </span>
                <div>
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {animated && (
        <button
          type="button"
          className={styles.control}
          aria-label={paused ? "Play hero animation" : "Pause hero animation"}
          aria-pressed={paused}
          onClick={() => {
            const next = !paused;
            manualPause.current = next;
            setPaused(next);
            sync.current?.();
          }}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          <span>{paused ? "Play motion" : "Pause motion"}</span>
        </button>
      )}
    </div>
  );
}
