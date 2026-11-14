# MeritX

Local Next.js App Router project for MeritX's tender support, solutions and consultancy website at https://meritxsc.com.

## Run locally

Requires Node.js 22 or newer. Install with `npm ci`, then run `npm run dev` and open http://localhost:3000.

## Validate and build

```sh
npm run check
npm run build
npm run preview
```

`npm run build` generates a static website in `out/`. `npm run preview` serves that output locally. `npm start` is reserved for a future Node.js deployment after removing `output: "export"`; it does not serve the current static export.

## Structure

- `src/app/`: routes, layout, styles and metadata routes.
- `src/lib/site.ts`: shared public site identity and indexing configuration. Server-only; never imports private MCP credentials.
- `.codex/`: project-only MCP configuration and an authentication header helper.
- `.env`: local configuration and private credentials, excluded from Git.

## SEO and launch

The site includes pre-rendered HTML, semantic headings, canonical metadata, Open Graph/Twitter metadata, a branded PNG social preview, Organization structured data, robots.txt and sitemap.xml. Fonts are bundled locally, with no Google Fonts request during builds or page visits.

The lint toolchain pins ESLint 9 for compatibility with Next.js's React/accessibility plugins. A targeted minimatch override uses the patched 11.x release in the TypeScript parser; `npm audit` reports no known vulnerabilities.

`NEXT_PUBLIC_SITE_URL=https://meritxsc.com` is the canonical origin. `SITE_INDEXABLE=false` keeps this draft out of search results. Before launch, review service descriptions, add approved contact details and any required business/legal pages, then set `SITE_INDEXABLE=true` and rebuild. This enables indexing and adds the homepage to the sitemap. Preview and draft deployments should keep it false. Rebuild after changing either variable.

For Spaceship/cPanel hosting, upload **only the contents of `out/`** into the domain's document root. Do not upload `.env`, `.codex/`, source files or `node_modules`. Configure HTTPS and a single canonical hostname at the hosting level. With trailing slashes enabled, future routes export as directory `index.html` files. Configure the host's custom 404 page to `/404.html`; add compression and long-lived caching for fingerprinted `/_next/static/` assets at the hosting/CDN layer.

Static export is fast and compatible with ordinary shared hosting. It does not support request-time server rendering, Server Actions, API routes that require a server, ISR, or the default runtime image optimizer. For those features, remove `output: "export"`, configure a Node.js-capable host, and use `npm run build && npm start`. Use pre-sized/optimized images in the static build.

SEO foundations cannot guarantee search rankings. Useful service content, crawlability, real business information, mobile performance and domain authority still matter. Submit the production sitemap to search engines after launch.

## Project-only MCP

`.codex/config.toml` registers the `meritx` server only inside this trusted project. `.codex/mcp_headers.py` reads `MERITX_MCP_TOKEN` from this folder's `.env` and supplies an Authorization header. No token is stored in the Codex config or frontend code. Restart the MCP connection after changing credentials. No global MCP entry is required.

Keep `.env` private. `.env.example` contains names and public defaults only. When setting up another checkout, copy it to `.env` and supply the token privately. The helper command in `.codex/config.toml` currently uses this machine's absolute project path; update it if the folder moves.
