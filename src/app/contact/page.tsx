import { pageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import {
  Mail,
  Phone,
  MessageCircle,
  ArrowUpRight,
  CodeXml,
  Boxes,
  FileText,
} from "lucide-react";
import { Arrow } from "@/components/icons";
import { ContactForm } from "@/components/contact-form";
import { business } from "@/lib/business";
import engineering from "@/components/engineering-pages.module.css";
import styles from "@/components/contact.module.css";

export const metadata: Metadata = pageMetadata(
  "Contact Us in Lahore",
  "Send MeritX a software project brief, equipment list or tender requirement. Contact our engineers at info@meritxsc.com, +92 330 2503787 or 544-G1 Johar Town, Lahore.",
  "/contact/",
);
export default function ContactPage() {
  return (
    <main id="main">
      <section className={engineering.hero}>
        <div className={`container ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className="eyebrow">Contact MeritX</p>
            <h1>
              Discuss your
              <br />
              <span className="gradient-text">technical requirements.</span>
            </h1>
            <p>
              Send a software brief, equipment list or tender requirement. Our
              engineers will review the scope and contact you using the details
              you provide.
            </p>
            <div className="button-row">
              <a className="button" href="#enquiry">
                Send an enquiry <Arrow />
              </a>
              <a className="text-link" href={`tel:${business.phoneHref}`}>
                Call our team <ArrowUpRight size={18} />
              </a>
            </div>
          </div>
          <div className={styles.brief}>
            <h2>What to include in your brief</h2>
            <ul>
              {[
                {
                  Icon: CodeXml,
                  title: "Software projects",
                  detail: "The workflow, users and tools you need to connect.",
                },
                {
                  Icon: Boxes,
                  title: "Equipment supply",
                  detail:
                    "Items, quantities, specifications and delivery location.",
                },
                {
                  Icon: FileText,
                  title: "Tenders & BOQs",
                  detail:
                    "The reference, technical scope and submission deadline.",
                },
              ].map(({ Icon, title, detail }) => (
                <li key={title}>
                  <Icon size={24} aria-hidden="true" />
                  <div>
                    <strong>{title}</strong>
                    <span>{detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section
        className={`container ${styles.layout}`}
        aria-label="Contact details and enquiry form"
      >
        <aside className={styles.details}>
          <h2>Contact our team</h2>
          {[
            {
              Icon: Mail,
              title: "Email",
              value: business.email,
              href: `mailto:${business.email}`,
            },
            {
              Icon: Phone,
              title: "Phone",
              value: business.phone,
              href: `tel:${business.phoneHref}`,
            },
            {
              Icon: MessageCircle,
              title: "WhatsApp",
              value: "Message MeritX",
              href: business.whatsapp,
            },
          ].map(({ Icon, title, value, href }) => (
            <a
              className={styles.method}
              key={title}
              href={href}
              {...(title === "WhatsApp"
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              <Icon size={23} />
              <span>
                <small>{title}</small>
                <strong>{value}</strong>
              </span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          ))}
          <div className={styles.office}>
            <h3>Lahore office</h3>
            <p>
              {business.address}
              <br />
              Pakistan
            </p>
            <a
              href="https://www.google.com/maps/search/?api=1&query=544-G1+Johar+Town+Lahore"
              className="text-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Google Maps <ArrowUpRight size={18} />
            </a>
          </div>
          <div className={styles.documents}>
            <h3>Sending a BOQ or specification?</h3>
            <p>
              Email documents to{" "}
              <a href={`mailto:${business.email}`}>{business.email}</a>. If you
              have already sent the form, include your enquiry reference so we
              can match the documents to your request.
            </p>
          </div>
        </aside>
        <ContactForm />
      </section>
    </main>
  );
}
