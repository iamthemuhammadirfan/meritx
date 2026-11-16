import { pageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, Check, Building2, HardHat, Landmark } from "lucide-react";
import { Arrow, ServiceIcon } from "@/components/icons";
import { TechnologyScene } from "@/components/technology-scene";
import { CtaSection } from "@/components/cta-section";
import { services, processSteps } from "@/lib/services";
import { site } from "@/lib/site";
import { business } from "@/lib/business";

export const metadata: Metadata = pageMetadata(
  site.title,
  site.description,
  "/",
);

export default function Home() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: business.fullName,
    url: site.url,
    email: business.email,
    telephone: business.phoneHref,
    address: {
      "@type": "PostalAddress",
      streetAddress: "544-G1 Johar Town",
      addressLocality: "Lahore",
      addressCountry: "PK",
    },
    description: site.description,
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <main id="main">
        <section className="home-hero">
          <div className="hero-wash" aria-hidden="true" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="status-dot" /> MeritX Solutions & Consultants
              </p>
              <h1>
                <span className="line-clip">
                  <span data-hero-line>Technology.</span>
                </span>
                <span className="line-clip">
                  <span data-hero-line>Working</span>
                </span>
                <span className="line-clip">
                  <span data-hero-line className="gradient-text">
                    for you.
                  </span>
                </span>
              </h1>
              <p className="hero-description">
                Software that simplifies. Equipment that delivers.
                Infrastructure that connects it all.
              </p>
              <div className="button-row">
                <Link className="button" href="/services/">
                  Explore our solutions <Arrow />
                </Link>
                <Link className="text-link" href="/contact/">
                  Talk about your project <Arrow />
                </Link>
              </div>
              <div className="hero-footnote">
                <span className="mini-line" /> From the right specification to
                the final installation.
              </div>
            </div>
            <TechnologyScene />
          </div>
          <div className="hero-bottom container">
            <span>Better connected. Better equipped.</span>
            <a href="#capabilities" aria-label="Scroll to our capabilities">
              Discover MeritX <ArrowDown size={16} />
            </a>
          </div>
        </section>
        <section className="audience-strip" aria-label="Who we work with">
          <div className="container audience-inner">
            <p>
              Technology for organisations
              <br />
              <strong>with work to do.</strong>
            </p>
            <span>
              <Building2 />
              Corporate teams
            </span>
            <span>
              <HardHat />
              Construction groups
            </span>
            <span>
              <Landmark />
              Public-sector organisations
            </span>
          </div>
        </section>
        <section id="capabilities" className="section capabilities container">
          <div className="section-heading" data-reveal>
            <div>
              <p className="eyebrow">The complete picture</p>
              <h2>
                One partner.
                <br />
                <span className="text-muted">Every layer of technology.</span>
              </h2>
            </div>
            <div className="section-intro">
              <p>
                Your business runs on more than a single system. We bring
                software, equipment, networks and on-site implementation into
                one considered plan.
              </p>
              <Link className="text-link" href="/services/">
                See all services <Arrow />
              </Link>
            </div>
          </div>
          <div className="capability-grid">
            <Link
              href="/services/software-solutions/"
              className="capability-card software-card"
              data-reveal
            >
              <div className="card-top">
                <span className="icon-tile">
                  <ServiceIcon name="code" />
                </span>
                <Arrow />
              </div>
              <div className="software-window" aria-hidden="true">
                <div className="window-bar">
                  <i />
                  <i />
                  <i />
                  <span>Work, simplified.</span>
                </div>
                <div className="window-body">
                  <div className="window-sidebar">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="window-content">
                    <div className="ui-heading" />
                    <div className="ui-cards">
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="ui-chart">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                </div>
                <div className="window-tag">
                  <Check size={13} /> Built around your workflow
                </div>
              </div>
              <div className="card-copy">
                <p className="eyebrow">Think beyond the spreadsheet</p>
                <h3>
                  Software &<br />
                  business systems
                </h3>
                <p>
                  Custom applications, connected workflows and digital
                  experiences made for the way you work.
                </p>
              </div>
            </Link>
            <Link
              href="/services/it-equipment/"
              className="capability-card equipment-card"
              data-reveal
            >
              <Image
                src="/images/technology-suite.webp"
                alt="Illustrative servers, laptop, network switch and CCTV camera"
                width={1536}
                height={1024}
              />
              <div className="card-top">
                <span className="icon-tile">
                  <ServiceIcon name="monitor" />
                </span>
                <Arrow />
              </div>
              <div className="card-copy">
                <p className="eyebrow">Specify. Source. Supply.</p>
                <h3>
                  Right equipment.
                  <br />
                  Real business value.
                </h3>
                <p>
                  IT essentials and project supply, matched to your needs and
                  budget.
                </p>
              </div>
            </Link>
            {services.slice(2).map((s) => (
              <Link
                className={`capability-card compact-card tint-${s.color}`}
                href={`/services/${s.slug}/`}
                key={s.slug}
                data-reveal
              >
                <div className="card-top">
                  <span className="icon-tile">
                    <ServiceIcon name={s.icon} />
                  </span>
                  <Arrow />
                </div>
                <div className="card-copy">
                  <h3>{s.name}</h3>
                  <p>{s.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="image-story">
          <Image
            src="/images/connected-workspace.webp"
            alt="AI-generated concept of a contemporary office with an integrated network cabinet"
            width={1672}
            height={941}
            data-parallax
          />
          <div className="image-shade" />
          <div className="container image-story-content" data-reveal>
            <p className="eyebrow">Connected thinking. Practical delivery.</p>
            <h2>
              Built to work.
              <br />
              Ready for what’s next.
            </h2>
            <p>
              From a new office to an active project site, the details behind
              the scenes make the difference.
            </p>
            <Link href="/about/" className="button button-white">
              Meet MeritX <Arrow />
            </Link>
          </div>
          <span className="image-caption">Illustrative workspace concept</span>
        </section>
        <section className="section container process-section">
          <div className="process-intro" data-reveal>
            <p className="eyebrow">From brief to handover</p>
            <h2>
              A clear plan.
              <br />
              <span className="text-muted">A working solution.</span>
            </h2>
            <p>
              Whether you come to us through a tender, a referral or a direct
              requirement, the goal stays the same: make the next step clear.
            </p>
            <Link className="text-link" href="/contact/">
              Tell us what you need <Arrow />
            </Link>
          </div>
          <div className="process-steps">
            <span className="process-track" aria-hidden="true">
              <span className="process-progress" />
            </span>
            {processSteps.map((step, i) => (
              <article className="process-step" key={step.label} data-reveal>
                <span className="step-number">0{i + 1}</span>
                <p className="eyebrow">{step.label}</p>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="procurement-section">
          <div className="container procurement-inner" data-reveal>
            <span className="procurement-icon">
              <ServiceIcon name="monitor" size={36} />
            </span>
            <div>
              <p className="eyebrow">Have a BOQ or tender requirement?</p>
              <h2>Let’s get the specification right.</h2>
              <p>
                Share your equipment list, technical scope and deadline. We’ll
                help you work through the details and prepare a considered
                quotation.
              </p>
            </div>
            <Link className="button button-outline" href="/contact/">
              Discuss your requirement <Arrow />
            </Link>
          </div>
        </section>
        <CtaSection />
      </main>
    </>
  );
}
