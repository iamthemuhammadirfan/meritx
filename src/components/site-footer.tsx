import Link from "next/link";
import { business } from "@/lib/business";
import { services } from "@/lib/services";
import { BrandLogo } from "./site-header";
import { Arrow } from "./icons";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <BrandLogo />
            <p>
              Software, equipment and infrastructure.
              <br />
              Brought together, thoughtfully.
            </p>
            <a href={`mailto:${business.email}`} className="footer-email">
              {business.email}
              <Arrow />
            </a>
          </div>
          <div>
            <h2>Explore</h2>
            <Link href="/services/">Services</Link>
            <Link href="/it-equipment/business-laptops/">Business laptops</Link>
            <Link href="/guides/business-laptop-buying-guide/">
              Laptop buying guide
            </Link>
            <Link href="/about/">About MeritX</Link>
            <Link href="/contact/">Contact us</Link>
          </div>
          <div>
            <h2>What we do</h2>
            {services.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}/`}>
                {s.shortName === "Support" ? "Installation & support" : s.name}
              </Link>
            ))}
          </div>
          <div>
            <h2>Let’s connect</h2>
            <a href={`tel:${business.phoneHref}`}>{business.phone}</a>
            <a
              href={business.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat on WhatsApp <Arrow />
            </a>
            <p className="footer-address">
              {business.address}
              <br />
              Pakistan
            </p>
            <a
              href="https://www.google.com/maps/search/?api=1&query=544-G1+Johar+Town+Lahore"
              target="_blank"
              rel="noopener noreferrer"
            >
              Find us on the map <Arrow />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} {business.fullName}.
          </p>
          <p>Built around your business.</p>
          <Link href="/privacy/">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
