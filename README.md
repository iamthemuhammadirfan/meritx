# MeritX Solutions & Consultants

Website for **https://meritxsc.com**, built with Next.js App Router, TypeScript, Three.js and GSAP. Public pages are pre-rendered for Spaceship shared hosting. A small PHP endpoint receives contact enquiries on that hosting.

## Local development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Copy `.env.example` to `.env` in a new checkout and provide private MCP credentials separately. Never commit `.env`.

## Checks and production build

```sh
npm run check
SITE_INDEXABLE=true npm run build
npm run preview
```

The output is in `out/`. `npm run preview` serves the static pages locally. Next.js development and static preview **do not execute PHP**, so the form backend must be verified with a PHP runtime. On an ordinary static-only host, replace the endpoint with an appropriate form service before publishing.

The GitHub workflow installs from the lockfile, lints, typechecks and tests release handling. Development and pull-request builds have indexing disabled. Successful pushes to `main` build with indexing enabled and automatically deploy to Spaceship. ESLint 9 is retained for compatibility with the Next.js React/accessibility plugins. The targeted minimatch override uses the patched 11.x release in the TypeScript parser.

## Pages and content

- `/`: business overview, interactive technology scene, capabilities and delivery process.
- `/services/`: five service areas and tender/BOQ procurement information.
- `/services/[slug]/`: individual software, equipment, networking, CCTV and installation/support pages.
- `/about/`: company approach, principles and intended customer sectors.
- `/contact/`: confirmed address, telephone, WhatsApp, email and enquiry form.
- `/privacy/`: handling of enquiries and external service links.
- `/it-equipment/business-laptops/`: quote-led laptop supply, workload comparison and procurement FAQs.
- `/guides/business-laptop-buying-guide/`: a substantive business buying and deployment checklist.

Shared business details live in `src/lib/business.ts`; service content lives in `src/lib/services.ts`. The site does not claim customer logos, certifications, project counts, testimonials or guaranteed tender outcomes.

## Visuals and motion

The supplied logo is preserved in `docs/brand/`; an optimised copy is served from `public/images/`. Generated illustrative assets and their prompts are documented in `docs/visual-assets.json`. These images do not represent actual client installations.

The home page contains a dedicated scroll-driven Three.js story of interconnected servers, a laptop, a camera and network equipment. GSAP pins the story on desktop and drives assembly rotation, server separation, cable visibility and four content chapters from one progress value. Inactive chapters are inert and hidden from assistive technology. Mobile and reduced-motion layouts show the full chapter content without pinning. It loads near the viewport, caps rendering resolution, stops drawing when hidden/offscreen and exposes a pause control. A generated static image remains available if WebGL cannot initialise. Reduced-motion visitors get a still scene. Geometry, materials, observers and event handlers are cleaned up on navigation.

GSAP handles headline entrances, section reveals, image parallax and the delivery timeline. It honours reduced-motion preferences and reverts on route changes. Content remains visible when animation JavaScript is unavailable. Fonts are bundled locally.

## Contact enquiries

`public/api/enquiry.php` is served by Spaceship's PHP runtime. It validates input, restricts browser origins, requires consent, includes a honeypot and limits repeated submissions. It writes a private JSON record **outside the document root** under `~/.meritx-enquiries/`, with directory permissions `0700` and file permissions `0600`.

The endpoint returns a receipt only after the private record is saved. Email notification to `info@meritxsc.com` is best-effort; a successful `mail()` call is not proof of inbox delivery. The domain now uses Spacemail MX records. An owner-approved live test (MX-20261116-B611F743) was saved, accepted by the mail transport and confirmed received by the owner. A notification-status field records transport acceptance separately from inbox delivery. See `docs/enquiry-handling.txt` for reading emails and private backups. Use the hosting account/MCP to read private enquiry records; do not expose the directory or add it to Git. The site does not add submitters to a mailing list.

Backend validation was exercised in a separate private QA directory with email sending disabled, including invalid input, consent, origin checks, durable storage, private permissions and rate limiting. Do not use genuine customer information in tests.

## Spaceship deployment

Build with `NEXT_PUBLIC_SITE_URL=https://meritxsc.com` and `SITE_INDEXABLE=true`. Upload **only the contents of `out/`**, including `.htaccess` and `api/enquiry.php`, into the domain's document root. Do not upload source, `.env`, `.codex/`, `node_modules`, documentation or Git history.

Work on `development` and release through a pull request from `development` to `main`. After validation passes, GitHub Actions transfers the static build over a dedicated restricted SSH connection, verifies its checksum and staged files, and atomically replaces the live site. Public health checks automatically restore the old site on failure. The previous successful release stays outside the web folder for rollback. The private enquiry directory and separate tender subdomain are untouched.

Use the **Roll back Spaceship** GitHub workflow on `main` to restore the previous release. Full workflow, key maintenance and rollback instructions are in `docs/deployment.txt`. The project-scoped MCP connection remains available for hosting administration; automated releases do not use its expiring token.

`public/.htaccess` enforces the HTTPS apex hostname, disables directory listing, defines the custom 404 page and configures compression plus immutable caching for fingerprinted assets. Page metadata is centralised in `src/lib/metadata.ts`; the sitemap includes all public pages. Preview builds should use `SITE_INDEXABLE=false`.

## Project-only MCP

`.codex/config.toml` registers the Spaceship `meritx` server only for this trusted project. `.codex/mcp_headers.py` reads `MERITX_MCP_TOKEN` from this folder's private `.env`. No credential is imported by the frontend or stored in tracked configuration. If the project folder moves, update the helper's absolute command path.

Static export does not support request-time Next.js SSR, Server Actions or ISR. A future migration to a Node.js host requires removing `output: "export"` and adapting the PHP endpoint. `npm start` is reserved for that Node.js deployment; the current export uses `npm run preview`.
