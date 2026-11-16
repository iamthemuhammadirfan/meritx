import { pageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/icons";
import { CtaSection } from "@/components/cta-section";
import {
  Building2,
  HardHat,
  Landmark,
  Focus,
  Layers3,
  Handshake,
} from "lucide-react";

export const metadata: Metadata = pageMetadata(
  "About MeritX Solutions & Consultants",
  "Meet MeritX, a Lahore-based solutions and consultancy business connecting software, IT equipment, networking, security and installation for organisations.",
  "/about/",
);
export default function AboutPage() {
  return (
    <main id="main">
      <section className="page-hero container">
        <p className="eyebrow">About MeritX</p>
        <h1>
          <span className="line-clip">
            <span data-hero-line>Technology is the tool.</span>
          </span>
          <span className="line-clip">
            <span className="gradient-text" data-hero-line>
              Your business is the point.
            </span>
          </span>
        </h1>
        <div className="page-hero-bottom">
          <p>
            We’re MeritX Solutions & Consultants. Based in Lahore, we bring
            practical thinking to the software, equipment and infrastructure
            your organisation depends on.
          </p>
          <span className="page-index">Clear advice. Considered delivery.</span>
        </div>
      </section>
      <div className="container about-panorama">
        <Image
          src="/images/connected-workspace.webp"
          alt="AI-generated architectural concept showing a network cabinet integrated into a modern workspace"
          width={1672}
          height={941}
          loading="eager"
          data-parallax
        />
        <span>Illustrative workspace concept</span>
      </div>
      <section className="section container about-story">
        <div data-reveal>
          <p className="eyebrow">Why MeritX</p>
          <h2>
            Different systems.
            <br />
            <span className="text-muted">One shared purpose.</span>
          </h2>
        </div>
        <div data-reveal>
          <p className="large-copy">
            Businesses rarely need technology in isolation. A new office needs
            devices, connectivity and secure access. A project team needs the
            right equipment and someone to get it working.
          </p>
          <p>
            MeritX brings those requirements together. We work across software
            solutions, IT equipment supply, networking, surveillance and
            technical implementation, helping you move from a requirement to a
            practical plan.
          </p>
          <p>
            Some projects begin with a tender. Others start with a referral or a
            conversation. In every case, we look closely at what you need,
            define the scope and keep the commercial and technical details
            clear.
          </p>
          <Link className="text-link" href="/services/">
            Explore what we do <Arrow />
          </Link>
        </div>
      </section>
      <section className="principles-section">
        <div className="container">
          <div className="section-heading" data-reveal>
            <div>
              <p className="eyebrow">How we think</p>
              <h2>
                Good work starts
                <br />
                with good principles.
              </h2>
            </div>
            <p className="section-intro">
              The practical choices that guide how we approach a requirement and
              work with your team.
            </p>
          </div>
          <div className="principle-grid">
            {[
              {
                Icon: Focus,
                title: "Understand before recommending.",
                text: "We ask about the people, site, budget and operational needs behind a specification. The right solution starts with the right questions.",
              },
              {
                Icon: Layers3,
                title: "See the whole setup.",
                text: "Supply, installation and everyday use belong in the same conversation. We consider how the pieces will work together.",
              },
              {
                Icon: Handshake,
                title: "Make the details clear.",
                text: "Specifications, quotations, responsibilities and support terms should be understandable. We define them before the work begins.",
              },
            ].map(({ Icon, title, text }) => (
              <article key={title} data-reveal>
                <Icon size={30} strokeWidth={1.4} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section container sectors-section">
        <div data-reveal>
          <p className="eyebrow">Who we work with</p>
          <h2>
            For the people
            <br />
            moving business forward.
          </h2>
          <p>
            Different organisations. Different requirements. The same need for
            technology that does its job.
          </p>
        </div>
        <div className="sector-list">
          {[
            {
              Icon: Building2,
              title: "Corporate organisations",
              text: "Workplace equipment, business applications and connected office infrastructure.",
            },
            {
              Icon: HardHat,
              title: "Construction & project teams",
              text: "Site mobilisation, IT equipment, networking and surveillance for project locations.",
            },
            {
              Icon: Landmark,
              title: "Public-sector buyers",
              text: "Specification-led quotations, tender requirements and clearly scoped supply and installation.",
            },
          ].map(({ Icon, title, text }) => (
            <article key={title} data-reveal>
              <Icon size={25} strokeWidth={1.4} />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <CtaSection title="A better setup starts\nwith a conversation." />
    </main>
  );
}
