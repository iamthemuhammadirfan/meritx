import { BreadcrumbData } from "@/components/breadcrumb-data";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import { Arrow } from "@/components/icons";
import { CtaSection } from "@/components/cta-section";
export const metadata: Metadata = pageMetadata(
  "How to Choose Business Laptops: A Procurement Guide",
  "A practical checklist for buying business laptops: workload, processor details, memory, storage, warranty, accessories, software licensing and deployment planning.",
  "/guides/business-laptop-buying-guide/",
);
const sections = [
  {
    id: "workload",
    title: "Start with the work people actually do.",
    paragraphs: [
      "List the applications, typical files, browser workloads, video meetings and external displays each user relies on. Group similar roles together. This gives you a better starting point than purchasing one expensive configuration for everyone or choosing purely by the lowest price.",
      "For specialist software such as CAD or design applications, check the software vendor’s current hardware requirements for the version you use. Share those requirements with the supplier, including any graphics or compatibility constraints.",
    ],
  },
  {
    id: "specification",
    title: "Compare complete configurations.",
    paragraphs: [
      "Ask for the exact processor model, memory capacity, storage type and capacity, display specification, ports and operating-system details. A family name such as “business laptop” or a processor badge is not enough to compare two quotations accurately.",
      "Also check whether memory and storage can be upgraded, which external displays or docks are supported, and whether the keyboard and webcam suit the intended use. For mobile teams, compare weight, charger requirements and the conditions attached to stated battery-life figures.",
    ],
  },
  {
    id: "ownership",
    title: "Look at the cost of the working setup.",
    paragraphs: [
      "The laptop is one part of a usable workstation. Include docks, screens, adapters, keyboards, headsets, software licences, configuration and delivery where needed. Ask the supplier to separate optional items so that you can compare the same scope across quotations.",
      "Clarify applicable taxes and any charges for phased delivery or on-site setup. A lower equipment price does not automatically represent a lower total cost if important accessories or implementation work are missing.",
    ],
  },
  {
    id: "warranty",
    title: "Read the warranty terms before ordering.",
    paragraphs: [
      "Confirm who provides the warranty, how long it lasts, what is covered, and how a claim is handled. Ask whether the quoted arrangement is carry-in, collection or on-site, and what information you need to retain to make a claim.",
      "Supplier support and manufacturer warranty are different things. If ongoing technical assistance is required, define the response arrangements and exclusions in a separate agreed support scope. Plan how the business will handle downtime while a device is being assessed or repaired.",
    ],
  },
  {
    id: "rollout",
    title: "Agree the rollout and handover.",
    paragraphs: [
      "Before delivery, decide who will configure devices, install properly licensed applications, set up accounts and connect printers, networks and security tools. Define any data migration requirements carefully, including responsibility for backups and access to sensitive files.",
      "At handover, check quantities and configurations against the agreed quotation. Keep the relevant invoice, model, serial and warranty details with your asset records. Test the agreed functions and document any outstanding work.",
    ],
  },
  {
    id: "quote",
    title: "Give the supplier a brief they can quote against.",
    paragraphs: [
      "A useful request includes the number of users, their workloads, required configurations, budget range, delivery location and deadlines. If the purchase relates to a tender, attach the BOQ and list the required compliance documents and submission conditions.",
      "MeritX Solutions & Consultants is based in Johar Town, Lahore. We can review a business laptop requirement, prepare a specification-led quotation and discuss equipment setup alongside the supply. Model availability, pricing and warranty are confirmed in the quotation.",
    ],
  },
];
export default function BuyingGuide() {
  return (
    <main id="main">
      <BreadcrumbData
        items={[
          { name: "Home", path: "/" },
          { name: "Business laptops", path: "/it-equipment/business-laptops/" },
          {
            name: "Buying guide",
            path: "/guides/business-laptop-buying-guide/",
          },
        ]}
      />
      <article className="container buying-guide">
        <header className="guide-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/it-equipment/business-laptops/">Business laptops</Link>
            <span>/</span>
            <span aria-current="page">Buying guide</span>
          </nav>
          <p className="eyebrow">MeritX procurement guide</p>
          <h1 data-hero-line>
            Buying business laptops?
            <br />
            Plan the whole setup.
          </h1>
          <p className="large-copy">
            A practical guide to buying laptops for an office, a growing team or
            a project location. The aim is a clear requirement and a comparable
            quotation.
          </p>
        </header>
        <figure className="guide-image">
          <Image
            src="/images/business-laptop-fleet.webp"
            alt="Illustrative range of office laptops and docking equipment"
            width={1536}
            height={1024}
          />
          <figcaption>
            Illustrative equipment categories, not live product listings.
          </figcaption>
        </figure>
        <div className="guide-body">
          <nav className="guide-contents" aria-label="In this guide">
            <p className="eyebrow">In this guide</p>
            {sections.map((s, i) => (
              <a key={s.id} href={`#${s.id}`}>
                <span>0{i + 1}</span>
                {s.title}
              </a>
            ))}
          </nav>
          <div className="guide-article">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id}>
                <p className="eyebrow">0{i + 1} / Procurement checklist</p>
                <h2>{s.title}</h2>
                {s.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </section>
            ))}
            <aside className="guide-action">
              <h2>Have a laptop requirement?</h2>
              <p>
                Share your quantity, applications, delivery dates and any
                technical specification with our team.
              </p>
              <Link href="/contact/" className="button">
                Request a quotation
                <Arrow />
              </Link>
            </aside>
          </div>
        </div>
      </article>
      <CtaSection />
    </main>
  );
}
