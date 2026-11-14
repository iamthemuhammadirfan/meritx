import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

const services = [
  {
    name: "Tender support",
    label: "Understand the opportunity",
    text: "Make sense of tender requirements, eligibility criteria and the steps needed to prepare a considered response.",
  },
  {
    name: "Bid documentation",
    label: "Bring the details together",
    text: "Organise supporting documents, review submission requirements and build a clearer, more complete bid.",
  },
  {
    name: "Solutions & consultancy",
    label: "Find a practical way forward",
    text: "Work through business challenges with focused guidance and solutions shaped around your requirements.",
  },
];

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    description: site.description,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <header className="site-header wrap">
        <Link href="/" className="wordmark" aria-label="MeritX home">
          Merit<span>X</span>
          <span className="brand-dot" />
        </Link>
        <nav aria-label="Main navigation">
          <a href="#services">Our services</a>
          <a href="#approach">
            Our approach <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>

      <main id="main">
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> Solutions. Consultancy. Clarity.
            </p>
            <h1 id="hero-title">
              Clear thinking.
              <br />
              <span>Confident bids.</span>
            </h1>
            <p className="hero-description">
              From understanding a tender to bringing your response together,
              MeritX helps you take the next step with purpose.
            </p>
            <a className="button" href="#services">
              Explore our services <span aria-hidden="true">↗</span>
            </a>
            <p className="hero-note">
              Thoughtful guidance. Practical solutions.
            </p>
          </div>
          <div className="tender-visual" aria-hidden="true">
            <div className="visual-label">Clarity at every stage</div>
            <div className="paper paper-back" />
            <div className="paper paper-front">
              <div className="paper-heading">
                <span className="paper-logo">
                  M<span>X</span>
                </span>
                <span>TENDER BRIEF</span>
              </div>
              <div className="paper-rule" />
              <div className="paper-title">
                A stronger bid.
                <br />A clearer plan.
              </div>
              <div className="check-row">
                <span>✓</span> Understand the requirements
              </div>
              <div className="check-row">
                <span>✓</span> Organise the documentation
              </div>
              <div className="check-row">
                <span>✓</span> Review the response
              </div>
              <div className="paper-footer">
                <span>Prepared with purpose</span>
                <span>↗</span>
              </div>
            </div>
            <div className="visual-caption">
              <span className="caption-line" /> Opportunity, thoughtfully
              approached.
            </div>
          </div>
        </section>

        <section
          id="services"
          className="services"
          aria-labelledby="services-title"
        >
          <div className="wrap">
            <div className="section-heading">
              <p className="eyebrow">How we can help</p>
              <h2 id="services-title">
                The right support.
                <br />
                Where it matters.
              </h2>
            </div>
            <div className="service-grid">
              {services.map((service) => (
                <article className="service" key={service.name}>
                  <span className="service-arrow" aria-hidden="true">
                    ↗
                  </span>
                  <p className="service-label">{service.label}</p>
                  <h3>{service.name}</h3>
                  <p>{service.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="approach"
          className="approach wrap"
          aria-labelledby="approach-title"
        >
          <div>
            <p className="eyebrow">The MeritX approach</p>
            <h2 id="approach-title">
              Start with understanding.
              <br />
              Move with confidence.
            </h2>
          </div>
          <div className="approach-copy">
            <p>
              Every requirement deserves a closer look. We start by
              understanding the opportunity and the challenges around it, then
              bring structure to what comes next.
            </p>
            <p>
              Our focus is straightforward: clear advice, considered
              documentation and practical support throughout your preparation.
            </p>
          </div>
        </section>
      </main>

      <footer className="site-footer wrap">
        <Link className="wordmark" href="/" aria-label="MeritX home">
          Merit<span>X</span>
          <span className="brand-dot" />
        </Link>
        <p>Solutions & consultancy</p>
        <a href={site.url}>
          meritxsc.com <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </>
  );
}
