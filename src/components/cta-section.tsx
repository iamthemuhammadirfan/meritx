import Link from "next/link";
import { Arrow } from "./icons";
export function CtaSection({
  title = "What’s your next\ntechnology challenge?",
}: {
  title?: string;
}) {
  return (
    <section className="cta-section">
      <div className="container cta-inner">
        <div data-reveal>
          <p className="eyebrow">Let’s make it work</p>
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
            A new system, an equipment requirement or a project on the horizon.
            <br className="desktop-break" /> Start with a conversation. We’ll
            help you work out the next step.
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
