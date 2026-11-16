"use client";

import { useEffect, useRef, useState } from "react";
import { Boxes, Camera, CodeXml, Network, Pause, Play } from "lucide-react";
import styles from "./hero-solution.module.css";

const capabilities = [
  {
    key: "software",
    label: "Software",
    detail: "Workflows & applications",
    Icon: CodeXml,
  },
  {
    key: "infrastructure",
    label: "Infrastructure",
    detail: "Networks & connected systems",
    Icon: Network,
  },
  {
    key: "equipment",
    label: "Equipment",
    detail: "The right tools for the job",
    Icon: Boxes,
  },
  {
    key: "security",
    label: "Security",
    detail: "Visibility & peace of mind",
    Icon: Camera,
  },
];

const routes = [
  "M320 270 C230 270 260 120 140 120",
  "M320 270 C440 270 400 175 510 175",
  "M320 270 C200 270 250 380 125 380",
  "M320 270 C430 270 370 415 495 415",
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
      const { gsap } = await import("gsap");
      const element = root.current;
      if (cancelled || !element) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        let inView = true;
        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        intro
          .from(element.querySelectorAll("[data-solution-plane]"), {
            y: 38,
            opacity: 0,
            scale: 0.88,
            duration: 1.05,
            stagger: 0.12,
            clearProps: "opacity",
          })
          .from(
            element.querySelectorAll("[data-solution-node]"),
            {
              y: 18,
              opacity: 0,
              scale: 0.96,
              duration: 0.65,
              stagger: 0.12,
              clearProps: "all",
            },
            0.35,
          )
          .from(
            element.querySelectorAll("[data-solution-route]"),
            {
              strokeDasharray: 550,
              strokeDashoffset: 550,
              opacity: 0,
              duration: 1.1,
              stagger: 0.1,
            },
            0.7,
          );

        const signals = gsap.fromTo(
          element.querySelectorAll("[data-solution-signal]"),
          { strokeDashoffset: 560 },
          {
            strokeDashoffset: 0,
            duration: 3.2,
            ease: "none",
            stagger: 0.55,
            repeat: -1,
            delay: 1.6,
          },
        );
        const meter = element.querySelector("[data-solution-meter]");
        const cycle = gsap.timeline({
          repeat: -1,
          repeatDelay: 0.8,
          delay: 1.8,
        });
        for (let phase = 0; phase < 3; phase++) {
          cycle
            .call(() => {
              element.dataset.phase = String(phase);
            })
            .fromTo(
              meter,
              { scaleX: 0 },
              { scaleX: 1, duration: 3.3, ease: "none" },
            );
        }
        const playback = () => {
          const stop = manualPause.current || !inView || document.hidden;
          [intro, signals, cycle].forEach((animation) =>
            stop ? animation.pause() : animation.resume(),
          );
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
        observer.observe(element);
        document.addEventListener("visibilitychange", playback);
        setAnimated(true);
        playback();
        return () => {
          observer.disconnect();
          document.removeEventListener("visibilitychange", playback);
          sync.current = null;
        };
      });
      media.add("(prefers-reduced-motion: reduce)", () => {
        element.dataset.phase = "0";
        setAnimated(false);
      });
      cleanup = () => media.revert();
    }
    setup().catch(() => {
      /* The complete solution illustration remains visible. */
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <div className={styles.stage} ref={root} data-phase="0">
      <div
        className={styles.visual}
        role="img"
        aria-label="MeritX brings software, infrastructure, equipment and security together: understand the challenge, design the solution and put it to work."
      >
        <div className={styles.kicker} aria-hidden="true">
          <span /> Your challenge. Our connected thinking.
        </div>
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
                stroke="#a3bfd6"
                strokeWidth="1.4"
                data-solution-route
              />
              <path
                d={path}
                stroke="url(#solution-route-color)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="22 538"
                data-solution-signal
              />
              <circle
                cx={i === 0 ? 140 : i === 1 ? 510 : i === 2 ? 125 : 495}
                cy={i === 0 ? 120 : i === 1 ? 175 : i === 2 ? 380 : 415}
                r="4"
                fill={i > 1 ? "#ffad58" : "#58b9ed"}
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
            <div className={styles.coreContent}>
              <span className={styles.coreEyebrow}>One connected solution</span>
              <strong>
                MERIT<span>X</span>
              </strong>
              <span className={styles.coreRule} />
              <span className={styles.coreDetail}>
                Built around
                <br />
                your business.
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
            <i />
          </div>
        ))}
        <div className={styles.deliverable} aria-hidden="true">
          <span className={styles.check}>✓</span>
          <div>
            <strong>A practical way forward.</strong>
            <span>Plan. Implement. Support.</span>
          </div>
        </div>
      </div>
      <div className={styles.sequence} aria-hidden="true">
        <div className={styles.sequenceLabels}>
          <span>Understand</span>
          <span>Design</span>
          <span>Deliver</span>
        </div>
        <div className={styles.sequenceTrack}>
          <i data-solution-meter />
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
          {paused ? <Play size={12} /> : <Pause size={12} />}
          <span>{paused ? "Play motion" : "Pause motion"}</span>
        </button>
      )}
    </div>
  );
}
