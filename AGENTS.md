<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Branch and deployment workflow

- Make and push ongoing changes on `development`. Keep production changes out of `main` until they are ready to ship.
- Release by opening a pull request from `development` to `main` and merging after the `validate` check passes.
- Every successful push to `main` automatically deploys the marketing site to Spaceship. `development` and pull requests only run checks.
- Production deployment credentials belong only in the GitHub `production` environment. Never commit private keys or hosting tokens.
- See `docs/deployment.txt` for rollback, release handling and deployment-key maintenance. Keep the separate tender prototype out of the marketing site's `out/` deployment.
