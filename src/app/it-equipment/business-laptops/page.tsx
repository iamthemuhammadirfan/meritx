import { BreadcrumbData } from "@/components/breadcrumb-data";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Laptop,
  PackageCheck,
  Settings2,
  FileText,
} from "lucide-react";
import { pageMetadata } from "@/lib/metadata";
import { LaptopSelector } from "@/components/laptop-selector";
import { CtaSection } from "@/components/cta-section";
import { Arrow } from "@/components/icons";
import { site } from "@/lib/site";
export const metadata: Metadata = pageMetadata(
  "Business Laptop Supplier in Lahore",
  "Source business laptops, workstations and office laptop rollouts with MeritX in Johar Town, Lahore. Get a specification-led quotation, warranty details and setup options.",
  "/it-equipment/business-laptops/",
);
const questions = [
  {
    q: "Can MeritX supply laptops for a complete office or project team?",
    a: "Yes. Share the number of users, their applications, budget range and required delivery schedule. We can prepare a quantity-based quotation and discuss whether a standard configuration or several user profiles would suit your rollout.",
  },
  {
    q: "Can we get a current laptop price or a specific model?",
    a: "Send the exact model and configuration, or the requirements it needs to meet. Availability, current price, condition, warranty and delivery arrangements are confirmed in the quotation. The images on this page illustrate equipment categories; they are not live stock listings.",
  },
  {
    q: "Do you supply against tender specifications or a BOQ?",
    a: "We can review the listed processor, memory, storage, display, warranty and quantity requirements. Include the tender deadline, required supporting documents and any restrictions on alternative models so the quotation can address them clearly.",
  },
  {
    q: "Can setup, accessories and installation be included?",
    a: "Device configuration, docks, monitors, peripherals and deployment support can be scoped with the supply. Software licensing and any required installation services are specified separately rather than assumed to be included.",
  },
  {
    q: "How do you handle warranty and after-sales requirements?",
    a: "The quotation should state the warranty provider, term, coverage and claim process for the proposed equipment. Ask about turnaround arrangements and any exclusions before ordering. Optional support from MeritX can be agreed separately.",
  },
];
export default function BusinessLaptops() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Business laptop supply in Lahore",
    serviceType: "Business laptop procurement and deployment",
    areaServed: { "@type": "City", name: "Lahore" },
    url: site.url + "/it-equipment/business-laptops/",
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
          { name: "IT equipment", path: "/services/it-equipment/" },
          { name: "Business laptops", path: "/it-equipment/business-laptops/" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <section className="container laptop-page-hero">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/services/it-equipment/">IT equipment</Link>
          <span>/</span>
          <span aria-current="page">Business laptops</span>
        </nav>
        <div className="laptop-page-grid">
          <div>
            <p className="eyebrow">Business laptop supply · Lahore</p>
            <h1 data-hero-line>
              Laptops that fit
              <br />
              <span className="gradient-text">the job.</span>
            </h1>
            <p>
              Equip a team, refresh your office fleet or meet a project
              specification. MeritX helps businesses in Lahore source laptops
              and workstations with the configuration, warranty and
              implementation scope made clear.
            </p>
            <Link className="button" href="/contact/">
              Request a laptop quotation
              <Arrow />
            </Link>
            <p className="quote-note">
              Quotation-based supply. Availability and current pricing are
              confirmed for each requirement.
            </p>
          </div>
          <figure>
            <Image
              src="/images/business-laptop-fleet.webp"
              alt="Illustrative office laptops, a mobile workstation and docking equipment"
              width={1536}
              height={1024}
              loading="eager"
            />
            <figcaption>
              Illustrative equipment. No specific model or stock availability is
              implied.
            </figcaption>
          </figure>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading" data-reveal>
          <div>
            <p className="eyebrow">Start with the user</p>
            <h2>
              Different work.
              <br />
              Different requirements.
            </h2>
          </div>
          <p className="section-intro">
            A laptop for office administration is not automatically the right
            device for engineering work or frequent travel. Use these profiles
            to shape the conversation before comparing quotations.
          </p>
        </div>
        <LaptopSelector />
      </section>
      <section className="purchase-scope">
        <div className="container">
          <div className="section-heading" data-reveal>
            <div>
              <p className="eyebrow">A clearer procurement process</p>
              <h2>
                More than a box
                <br />
                on a delivery note.
              </h2>
            </div>
            <p className="section-intro">
              The equipment price matters. So do the specification, setup,
              warranty and what happens after delivery.
            </p>
          </div>
          <div className="purchase-grid">
            {[
              {
                Icon: Laptop,
                title: "Specify the equipment",
                text: "Compare the exact processor model, memory, storage, display, ports and operating-system requirements. A product family name alone is not a complete specification.",
              },
              {
                Icon: FileText,
                title: "Compare the quotation",
                text: "Review the proposed model, quantities, condition, warranty, applicable taxes and delivery schedule. Any alternative should be clearly identified.",
              },
              {
                Icon: Settings2,
                title: "Plan the rollout",
                text: "Agree configuration, accessories, application licensing, account setup and on-site deployment responsibilities before the delivery date.",
              },
              {
                Icon: PackageCheck,
                title: "Prepare the handover",
                text: "Confirm the supplied items, relevant serial and warranty information, agreed checks and the point of contact for any support included in the scope.",
              },
            ].map(({ Icon, title, text }) => (
              <article key={title} data-reveal>
                <Icon size={28} strokeWidth={1.4} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section container quote-checklist">
        <div data-reveal>
          <p className="eyebrow">Get a useful quotation</p>
          <h2>
            Send us the brief.
            <br />
            We’ll work through the detail.
          </h2>
          <p>
            Contact our team at 544-G1 Johar Town, Lahore. An existing BOQ is
            useful, but you can also start with your users, software and budget.
          </p>
          <Link
            href="/guides/business-laptop-buying-guide/"
            className="text-link"
          >
            Read our business laptop buying guide
            <Arrow />
          </Link>
        </div>
        <ul data-reveal>
          {[
            "Number of devices and user roles",
            "Required applications and any exact technical specification",
            "Budget range and preferred alternatives, if applicable",
            "Delivery location and required dates",
            "Warranty, accessories and setup expectations",
            "Tender reference and submission deadline, where relevant",
          ].map((item) => (
            <li key={item}>
              <Check size={18} />
              {item}
            </li>
          ))}
        </ul>
      </section>
      <section className="container faq-section laptop-faq">
        <div>
          <p className="eyebrow">Business laptop procurement</p>
          <h2>Questions worth asking.</h2>
        </div>
        <div>
          {questions.map(({ q, a }) => (
            <details key={q}>
              <summary>
                {q}
                <ChevronDown size={18} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <CtaSection title="Ready to equip\nyour team?" />
    </main>
  );
}
