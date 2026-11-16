import { pageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/icons";
import { CtaSection } from "@/components/cta-section";
import { EngineeringDiagram } from "@/components/engineering-diagram";
import { Building2, HardHat, Landmark } from "lucide-react";
import styles from "@/components/engineering-pages.module.css";

export const metadata: Metadata = pageMetadata(
  "About MeritX Solutions & Consultants",
  "MeritX is an engineering-led technology company in Lahore. We develop software, supply IT equipment and install networks and CCTV for corporate, construction and public-sector requirements.",
  "/about/",
);
export default function AboutPage() {
  return (
    <main id="main">
      <section className={styles.hero}>
        <div className={`container ${styles.heroGrid}`}>
          <div>
            <p className="eyebrow">About MeritX</p>
            <h1>
              We design, supply
              <br />
              <span className="gradient-text">and install IT systems.</span>
            </h1>
            <p>
              MeritX Solutions & Consultants is an engineering-led team based in
              Lahore. We work on business software, IT equipment, networking and
              CCTV—from the initial requirement through installation and
              testing.
            </p>
            <Link className="button" href="/services/">
              See our engineering services <Arrow />
            </Link>
          </div>
          <EngineeringDiagram />
        </div>
      </section>
      <section className={`container ${styles.story}`}>
        <div data-reveal>
          <p className="eyebrow">What we do</p>
          <h2>
            The software and
            <br />
            the systems behind it.
          </h2>
        </div>
        <div data-reveal>
          <p>
            An office rollout can involve laptops, network points, Wi-Fi and
            business applications. A construction site may need an IT setup and
            cameras before the team moves in. We scope these requirements
            together so equipment selection, software and installation are
            coordinated.
          </p>
          <p>
            Our work includes developing web applications and internal tools,
            sourcing equipment against technical specifications, running network
            cabling, configuring devices and setting up camera recording and
            viewing.
          </p>
          <p>
            We take enquiries through direct contact, referrals and tender
            requests. Bring us a problem, a site plan or a BOQ. We review the
            requirements with your team and prepare a technical and commercial
            proposal.
          </p>
        </div>
      </section>
      <section className={styles.process}>
        <div className="container">
          <div className={styles.processHeader} data-reveal>
            <div>
              <p className="eyebrow">How we deliver</p>
              <h2>
                Engineering work,
                <br />
                with a defined scope.
              </h2>
            </div>
            <p>
              Before work begins, we agree what is being supplied or built, how
              it will be installed and what will be tested at handover.
            </p>
          </div>
          <div className={styles.processGrid}>
            {[
              {
                title: "Review the requirement",
                text: "We discuss the users, applications, site conditions and budget. For site installations, we confirm layout, cable routes, equipment positions and access.",
              },
              {
                title: "Specify & quote",
                text: "The proposal sets out equipment or software features, quantities, configuration work and delivery dates. Supply and installation costs are identified.",
              },
              {
                title: "Build & install",
                text: "We develop the agreed software or source and configure the equipment. On-site work is scheduled around access and operating requirements.",
              },
              {
                title: "Test & hand over",
                text: "We check the agreed functions and connections, provide the relevant configuration or user guidance, and confirm support responsibilities.",
              },
            ].map((step, i) => (
              <article key={step.title} data-reveal>
                <span className={styles.step}>{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className={`container ${styles.sectors}`}>
        <div data-reveal>
          <p className="eyebrow">Who we work with</p>
          <h2>
            Offices, project sites
            <br />
            and procurement teams.
          </h2>
          <p>
            We scope work for the location, the people using the system and the
            way the organisation buys.
          </p>
        </div>
        <div>
          {[
            {
              Icon: Building2,
              title: "Corporate teams",
              text: "Business applications, staff equipment, office networks and equipment refreshes. We can include device setup and deployment in the supply proposal.",
            },
            {
              Icon: HardHat,
              title: "Construction groups",
              text: "Site-office IT equipment, network connections and CCTV installation. Access, power, cabling and the mobilisation schedule are part of the installation brief.",
            },
            {
              Icon: Landmark,
              title: "Public-sector procurement",
              text: "BOQ-based quotations and specification-led supply. We review the technical requirements, quantities, required documentation and submission dates before quoting.",
            },
          ].map(({ Icon, title, text }) => (
            <article className={styles.sector} key={title} data-reveal>
              <Icon size={29} strokeWidth={1.5} />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className={`container ${styles.location}`}>
        <p>
          <strong>Based in Lahore</strong>
          <br />
          544-G1 Johar Town, Lahore
        </p>
        <Link className="text-link" href="/contact/">
          Contact our team <Arrow />
        </Link>
      </div>
      <CtaSection title="Discuss your software\nor site requirements." />
    </main>
  );
}
