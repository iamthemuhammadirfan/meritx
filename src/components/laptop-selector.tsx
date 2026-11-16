"use client";
import { useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Calculator,
  PenTool,
  Plane,
  Check,
} from "lucide-react";
const profiles = [
  {
    label: "Office & operations",
    Icon: BriefcaseBusiness,
    title: "A dependable everyday workhorse.",
    text: "For email, documents, browser-based tools and video meetings. Match the configuration to the number of applications people keep open, and the screens and accessories they use.",
    checks: [
      "Full processor model, memory and SSD capacity",
      "Display quality, webcam and meeting audio",
      "Docking, external screens and office connectivity",
    ],
  },
  {
    label: "Finance & accounts",
    Icon: Calculator,
    title: "Room for the work behind the numbers.",
    text: "Large workbooks, accounting tools and multiple business applications can place different demands on a laptop. Start with the actual software and typical files, then compare suitable configurations.",
    checks: [
      "Application requirements and multitasking headroom",
      "Keyboard layout, number pad and external display needs",
      "Backup arrangements and access to business systems",
    ],
  },
  {
    label: "Design & engineering",
    Icon: PenTool,
    title: "Specify around the application.",
    text: "CAD, visualisation and design software should drive the choice of processor, graphics, memory and display. Share the software version and project size so workstation options can be considered properly.",
    checks: [
      "Software-vendor hardware and graphics requirements",
      "Memory expansion and sustained cooling",
      "Display requirements, storage and power arrangements",
    ],
  },
  {
    label: "Mobile teams",
    Icon: Plane,
    title: "A setup that travels well.",
    text: "For people moving between sites, meetings and remote work. Weight, battery requirements, connectivity and how the device is supported deserve as much attention as raw performance.",
    checks: [
      "Weight, charger size and stated battery conditions",
      "Ports, Wi-Fi and practical on-site connectivity",
      "Warranty coverage and a plan for device downtime",
    ],
  },
];
export function LaptopSelector() {
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const profile = profiles[active];
  return (
    <div className="laptop-selector">
      <div
        role="tablist"
        aria-label="Laptop requirements by type of work"
        className="workload-tabs"
      >
        {profiles.map(({ label, Icon }, i) => (
          <button
            ref={(el) => {
              buttons.current[i] = el;
            }}
            id={`workload-tab-${i}`}
            key={label}
            role="tab"
            aria-selected={active === i}
            tabIndex={active === i ? 0 : -1}
            aria-controls="workload-panel"
            onClick={() => setActive(i)}
            onKeyDown={(event) => {
              let next = i;
              if (event.key === "ArrowRight") next = (i + 1) % profiles.length;
              else if (event.key === "ArrowLeft")
                next = (i + profiles.length - 1) % profiles.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = profiles.length - 1;
              else return;
              event.preventDefault();
              setActive(next);
              buttons.current[next]?.focus();
            }}
          >
            <Icon size={23} strokeWidth={1.4} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div
        id="workload-panel"
        role="tabpanel"
        aria-labelledby={`workload-tab-${active}`}
        tabIndex={0}
        className="workload-panel"
      >
        <div>
          <p className="eyebrow">Choose by the work, not just the model name</p>
          <h3>{profile.title}</h3>
          <p>{profile.text}</p>
        </div>
        <ul>
          {profile.checks.map((check) => (
            <li key={check}>
              <Check size={17} />
              {check}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
