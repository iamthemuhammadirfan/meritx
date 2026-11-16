"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Arrow } from "./icons";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/services/", label: "Services" },
  { href: "/about/", label: "About us" },
  { href: "/contact/", label: "Contact" },
];

export function BrandLogo() {
  return (
    <Link
      className="brand-logo"
      href="/"
      aria-label="MeritX Solutions & Consultants home"
    >
      <Image
        src="/images/meritx-logo.webp"
        alt="MeritX Solutions & Consultants"
        width={1600}
        height={800}
        loading="eager"
      />
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <BrandLogo />
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                link.href === "/"
                  ? pathname === "/"
                    ? "page"
                    : undefined
                  : pathname.startsWith(link.href)
                    ? "page"
                    : undefined
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link href="/contact/" className="button button-small header-cta">
          Let’s talk <Arrow />
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          className="mobile-nav"
          aria-label="Mobile navigation"
        >
          {navigation.map((link) => (
            <Link
              href={link.href}
              key={link.href}
              onClick={() => setOpen(false)}
            >
              {link.label}
              <Arrow />
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
