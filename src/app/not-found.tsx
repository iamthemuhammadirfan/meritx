import Link from "next/link";
import { Arrow } from "@/components/icons";
export default function NotFound() {
  return (
    <main id="main" className="container section">
      <p className="eyebrow">MeritX / 404</p>
      <h1>A missing connection.</h1>
      <p className="large-copy">
        This page may have moved. Let’s get you back on track.
      </p>
      <div className="button-row">
        <Link className="button" href="/">
          Back to home <Arrow />
        </Link>
        <Link className="text-link" href="/services/">
          Explore our services <Arrow />
        </Link>
      </div>
    </main>
  );
}
