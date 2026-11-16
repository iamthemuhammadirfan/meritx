import { pageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { services } from "@/lib/services";
import { Arrow, ServiceIcon } from "@/components/icons";
import { CtaSection } from "@/components/cta-section";

export const metadata: Metadata = pageMetadata(
  "Software, IT Equipment, Networking & CCTV Services",
  "Explore MeritX services: software development, IT equipment supply, networking, CCTV installation and technical support for businesses and project teams.",
  "/services/",
);
export default function ServicesPage() {
  return (
    <main id="main">
      <section className="page-hero container">
        <p className="eyebrow">Our services</p>
        <h1>
          <span className="line-clip">
            <span data-hero-line>All the right pieces.</span>
          </span>
          <span className="line-clip">
            <span data-hero-line className="gradient-text">
              Working together.
            </span>
          </span>
        </h1>
        <div className="page-hero-bottom">
          <p>
            From the software on your screen to the network behind your walls.
            Practical technology solutions, with supply and implementation
            brought into the picture.
          </p>
          <span className="page-index">
            Software / Hardware / Infrastructure
          </span>
        </div>
      </section>
      <section
        className="container service-directory"
        aria-label="MeritX services"
      >
        {services.map((s, i) => (
          <article
            className={`service-row tint-${s.color}`}
            key={s.slug}
            data-reveal
          >
            <div className="service-row-symbol">
              <ServiceIcon name={s.icon} size={56} />
              <span>{s.shortName}</span>
            </div>
            <div className="service-row-main">
              <p className="eyebrow">
                {i === 0
                  ? "Digital solutions"
                  : i === 1
                    ? "Technology procurement"
                    : i === 2
                      ? "Connected infrastructure"
                      : i === 3
                        ? "Site visibility"
                        : "Practical implementation"}
              </p>
              <h2>{s.name}</h2>
              <p>{s.summary}</p>
              <Link className="text-link" href={`/services/${s.slug}/`}>
                Explore this service <Arrow />
              </Link>
            </div>
            <ul>
              {s.scope.map((item) => (
                <li key={item}>
                  <Check size={16} />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <section className="section container tender-block">
        <div className="tender-image">
          <Image
            src="/images/technology-suite.webp"
            alt="Illustrative selection of business IT and security equipment"
            width={1536}
            height={1024}
          />
        </div>
        <div data-reveal>
          <p className="eyebrow">Direct requirements & tender-based supply</p>
          <h2>
            A clear specification.
            <br />A considered quotation.
          </h2>
          <p>
            Buying for a business, a construction project or a public-sector
            requirement? Share your technical specifications, quantities and
            timelines. We can work from an existing BOQ or help clarify what is
            needed.
          </p>
          <p>
            We focus on suitable equipment, competitive sourcing and an agreed
            installation scope. Warranty terms, alternatives and delivery
            arrangements are made clear in the proposal.
          </p>
          <Link href="/contact/" className="button">
            Request a quotation <Arrow />
          </Link>
        </div>
      </section>
      <CtaSection />
    </main>
  );
}
