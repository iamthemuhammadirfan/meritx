import { pageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { Mail, Phone, MapPin, MessageCircle, ArrowUpRight } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { business } from "@/lib/business";

export const metadata: Metadata = pageMetadata(
  "Contact Us in Lahore",
  "Talk to MeritX about software, IT equipment, networking, CCTV or tender requirements. Visit 544-G1 Johar Town, Lahore, call +92 330 2503787 or email info@meritxsc.com.",
  "/contact/",
);
export default function ContactPage() {
  return (
    <main id="main">
      <section className="page-hero container contact-hero">
        <p className="eyebrow">Contact us</p>
        <h1>
          <span className="line-clip">
            <span data-hero-line>Good things start</span>
          </span>
          <span className="line-clip">
            <span data-hero-line className="gradient-text">
              with a conversation.
            </span>
          </span>
        </h1>
        <p>
          Have a project, a procurement requirement or a question?
          <br />
          Let’s work out what you need.
        </p>
      </section>
      <section className="container contact-layout">
        <aside className="contact-details" data-reveal>
          <p className="eyebrow">Get in touch</p>
          <a className="contact-method" href={`mailto:${business.email}`}>
            <Mail />
            <span>
              <small>Email us</small>
              <strong>{business.email}</strong>
            </span>
            <ArrowUpRight />
          </a>
          <a className="contact-method" href={`tel:${business.phoneHref}`}>
            <Phone />
            <span>
              <small>Call us</small>
              <strong>{business.phone}</strong>
            </span>
            <ArrowUpRight />
          </a>
          <a
            className="contact-method"
            href={business.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle />
            <span>
              <small>Message us</small>
              <strong>Chat on WhatsApp</strong>
            </span>
            <ArrowUpRight />
          </a>
          <div className="contact-office">
            <MapPin size={23} />
            <p className="eyebrow">Visit MeritX</p>
            <h2>
              Based in Lahore.
              <br />
              Ready to connect.
            </h2>
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
              Open in Google Maps <ArrowUpRight size={17} />
            </a>
            <div className="map-art" aria-hidden="true">
              <span className="map-road road-one" />
              <span className="map-road road-two" />
              <span className="map-road road-three" />
              <span className="map-marker">
                <MapPin size={28} />
              </span>
              <span className="map-label">Johar Town · Lahore</span>
            </div>
          </div>
          <p className="contact-tip">
            Sharing a BOQ or tender? Include the submission deadline and key
            specifications in your message. We can arrange document sharing when
            we follow up.
          </p>
        </aside>
        <ContactForm />
      </section>
    </main>
  );
}
