import { BreadcrumbData } from "@/components/breadcrumb-data";
import Image from "next/image";
import { serviceContent } from "@/lib/service-content";
import { pageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { services } from "@/lib/services";
import { Arrow, ServiceIcon } from "@/components/icons";
import { CtaSection } from "@/components/cta-section";
import { site } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) return {};
  const content = serviceContent[slug];
  return pageMetadata(
    content.seoTitle,
    content.description,
    `/services/${slug}/`,
  );
}
export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) notFound();
  const content = serviceContent[slug];
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: content.description,
    areaServed: { "@type": "City", name: "Lahore" },
    url: `${site.url}/services/${slug}/`,
    provider: {
      "@type": "Organization",
      name: "MeritX Solutions & Consultants",
      url: site.url,
    },
  };
  return (
    <main id="main">
      <BreadcrumbData
        items={[
          { name: "Home", path: "/" },
          { name: "Services", path: "/services/" },
          { name: service.name, path: `/services/${slug}/` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <section className={`detail-hero tint-${service.color}`}>
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/services/">Services</Link>
            <span>/</span>
            <span aria-current="page">{service.shortName}</span>
          </nav>
          <div className="detail-hero-grid">
            <div>
              <p className="eyebrow">{service.name}</p>
              <h1 data-hero-line>{content.heading}</h1>
              <p>{service.summary}</p>
              <Link className="button" href="/contact/">
                Discuss your project <Arrow />
              </Link>
            </div>
            <figure className="detail-photograph">
              <Image
                src={content.image}
                alt={content.alt}
                width={1536}
                height={1024}
                loading="eager"
              />
              <figcaption>Illustrative service concept</figcaption>
            </figure>
          </div>
        </div>
      </section>
      <section className="section container detail-intro">
        <p className="eyebrow" data-reveal>
          Designed around the requirement
        </p>
        <div data-reveal>
          <h2>
            A practical solution starts
            <br />
            with a closer look.
          </h2>
          <p className="large-copy">{service.intro}</p>
          <p className="fit-note">{service.fit}</p>
        </div>
      </section>
      <section className="container service-planning">
        <div data-reveal>
          <p className="eyebrow">Planning your requirement in Lahore</p>
          <h2>{content.planningTitle}</h2>
          <p>{content.planningText}</p>
        </div>
        <ul data-reveal>
          {content.checks.map((check) => (
            <li key={check}>
              <Check size={18} />
              {check}
            </li>
          ))}
        </ul>
      </section>
      <section className="scope-section">
        <div className="container scope-grid">
          <div data-reveal>
            <p className="eyebrow">The scope</p>
            <h2>What we can help with.</h2>
            <ul className="scope-list">
              {service.scope.map((item) => (
                <li key={item}>
                  <ServiceIcon name={service.icon} size={22} />
                  <h3>{item}</h3>
                </li>
              ))}
            </ul>
          </div>
          <div className="deliverables" data-reveal>
            <p className="eyebrow">A clear handover</p>
            <h3>
              What your proposal
              <br />
              can include.
            </h3>
            <ul>
              {service.deliverables.map((item) => (
                <li key={item}>
                  <Check size={18} />
                  {item}
                </li>
              ))}
            </ul>
            <p>
              Every project is scoped individually. The final specification,
              delivery schedule and support terms are confirmed in your
              quotation.
            </p>
          </div>
        </div>
      </section>
      <section className="container service-depth section">
        {content.sections.map((section) => (
          <article key={section.title} data-reveal>
            <h2>{section.title}</h2>
            <p>{section.text}</p>
          </article>
        ))}
        {slug === "it-equipment" && (
          <div className="service-category-link">
            <div>
              <p className="eyebrow">A closer look at laptop supply</p>
              <h3>Equipping an office or a whole team?</h3>
              <p>
                Review business laptop requirements, rollout options and the
                information to include in a quotation request.
              </p>
            </div>
            <Link className="button" href="/it-equipment/business-laptops/">
              Explore business laptops
              <Arrow />
            </Link>
          </div>
        )}
      </section>
      <section className="section container faq-section">
        <div data-reveal>
          <p className="eyebrow">A few things to know</p>
          <h2>Before we get started.</h2>
        </div>
        <div>
          {service.questions.map(({ q, a }) => (
            <details key={q} data-reveal>
              <summary>
                {q}
                <ChevronDown size={18} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="container related-services">
        <h2>Part of a bigger picture.</h2>
        <div>
          {services
            .filter((s) => s.slug !== slug)
            .slice(0, 2)
            .map((s) => (
              <Link href={`/services/${s.slug}/`} key={s.slug}>
                <ServiceIcon name={s.icon} />
                <span>{s.name}</span>
                <Arrow />
              </Link>
            ))}
        </div>
      </section>
      <CtaSection title="Let’s turn your requirement\ninto a working solution." />
    </main>
  );
}
