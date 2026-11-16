import { pageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowDown } from "lucide-react";
import { services } from "@/lib/services";
import { Arrow, ServiceIcon } from "@/components/icons";
import { CtaSection } from "@/components/cta-section";
import { EngineeringDiagram } from "@/components/engineering-diagram";
import styles from "@/components/engineering-pages.module.css";

export const metadata: Metadata = pageMetadata(
  "Software, IT Equipment, Networking & CCTV Services",
  "Software development, IT equipment supply, structured cabling, Wi-Fi and CCTV installation in Lahore. MeritX engineers scope, source, configure and test business IT systems.",
  "/services/",
);
export default function ServicesPage() {
  return (
    <main id="main">
      <section className={styles.hero}>
        <div className={`container ${styles.heroGrid}`}>
          <div>
            <p className="eyebrow">Our services</p>
            <h1>
              Software, equipment
              <br />
              <span className="gradient-text">& infrastructure.</span>
            </h1>
            <p>
              We develop business software, supply IT equipment and install
              networks and CCTV systems. Our engineers handle the specification,
              configuration and site work required to put them into use.
            </p>
            <Link className="button" href="/contact/">
              Discuss your requirements <Arrow />
            </Link>
          </div>
          <EngineeringDiagram />
        </div>
      </section>
      <nav
        className={`container ${styles.serviceNav}`}
        aria-label="Browse services"
      >
        {services.map((s) => (
          <a href={`#${s.slug}`} key={s.slug}>
            {s.shortName}
            <ArrowDown size={16} />
          </a>
        ))}
      </nav>
      <section
        className={`container ${styles.directory}`}
        aria-label="MeritX services"
      >
        {services.map((s) => (
          <article
            className={styles.service}
            id={s.slug}
            key={s.slug}
            data-reveal
          >
            <div>
              <div className={styles.serviceTitle}>
                <div className={styles.serviceIcon}>
                  <ServiceIcon name={s.icon} size={30} />
                </div>
                <h2>{s.name}</h2>
              </div>
              <p>{s.summary}</p>
              <div className={styles.example}>
                <strong>Example requirement</strong>
                <p>{s.example}</p>
              </div>
              <Link className="text-link" href={`/services/${s.slug}/`}>
                View {s.shortName.toLowerCase()} service details <Arrow />
              </Link>
            </div>
            <div className={styles.scope}>
              <h3>Work we scope</h3>
              <ul>
                {s.scope.map((item) => (
                  <li key={item}>
                    <Check size={17} />
                    {item}
                  </li>
                ))}
              </ul>
              <div className={styles.handover}>
                <h3>Testing & handover</h3>
                <p>{s.acceptance}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
      <section className={`container ${styles.package}`}>
        <div>
          <p className="eyebrow">Procurement & tenders</p>
          <h2>
            Send us your BOQ
            <br />
            or technical brief.
          </h2>
          <p>
            We prepare quotations for direct purchases and tender requirements.
            Share the equipment list, quantities, location and deadline. If the
            specification needs work, we can help define it before sourcing.
          </p>
          <Link href="/contact/" className="button">
            Request a quotation <Arrow />
          </Link>
        </div>
        <div>
          <h3>What we confirm in the proposal</h3>
          <ul>
            {[
              "Equipment model, configuration and quantity",
              "Compliance with the requested specification; alternatives listed separately",
              "Supply, installation and configuration costs",
              "Delivery schedule and site access requirements",
              "Warranty coverage, acceptance checks and support scope",
            ].map((item) => (
              <li key={item}>
                <Check size={18} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <CtaSection title="Tell us what needs\nto be built or installed." />
    </main>
  );
}
