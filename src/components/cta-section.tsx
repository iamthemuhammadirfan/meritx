import Link from "next/link";
import { Arrow } from "./icons";
export function CtaSection({
  title = "Discuss your\nproject requirements.",
}: {
  title?: string;
}) {
  return (
    <section className="cta-section">
      <div className="container cta-inner">
        <div data-reveal>
          <p className="eyebrow">Project enquiries</p>
          <h2>
            {title
              .replace(/\\n/g, "\n")
              .split("\n")
              .map((line, i) => (
                <span key={line}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
          </h2>
          <p>
            Share your equipment list, site details or software requirements.
            Our team will review the scope and contact you to discuss it.
          </p>
        </div>
        <Link
          href="/contact/"
          className="cta-orbit"
          aria-label="Start a conversation with MeritX"
        >
          <Arrow />
          <span>Let’s talk</span>
        </Link>
      </div>
    </section>
  );
}
