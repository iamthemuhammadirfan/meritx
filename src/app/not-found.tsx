import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="wrap" style={{ paddingBlock: 100 }}>
      <p className="eyebrow">MeritX / 404</p>
      <h1>Page not found.</h1>
      <p className="hero-description">
        The page you are looking for may have moved.
      </p>
      <Link className="button" href="/">
        Return to MeritX <span aria-hidden="true">↗</span>
      </Link>
    </main>
  );
}
