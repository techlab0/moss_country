# Dependency migration notes

The October 2026 dependency refresh moves the app to Next.js 16.4.2, React 19.3.1, Sanity 6.20.0 with `next-sanity` 13.3.4, Nodemailer 10.2.0, and Tailwind CSS 4.3.3. The runtime requirement is Node.js 22.12 or newer. Tailwind 4 requires modern browsers (Chrome 111+, Safari 16.4+, Firefox 128+).

Tailwind configuration now lives in `src/app/globals.css` via `@theme`; PostCSS uses `@tailwindcss/postcss`. Utility names whose defaults changed in v4 were updated across source files to retain prior sizing, opacity, and ring behavior. Generic image, form, and focus defaults use the base layer so they do not override component utilities. Next dev/build explicitly select Webpack to preserve the existing custom webpack fallbacks. Image qualities 75, 80, 82, and 85 are allowlisted.

Blog post metadata is generated through the async route `generateMetadata`; it retains title, description, canonical, Open Graph, and Twitter metadata formerly split with the route head module. Mailer recipient strings are capped at 320 characters and arrays at 50 entries before transport creation. Nodemailer's per-message `maxRecipients: 50` also limits the combined parsed to/bcc recipients, including comma-separated strings. Regression tests use JSON transport and never send SMTP mail.

Primary migration references: [Next.js 16 upgrade](https://nextjs.org/docs/app/guides/upgrading/version-16), [Sanity v5 to v6](https://www.sanity.io/docs/help/v5-to-v6), [Sanity React 19](https://www.sanity.io/docs/help/react-19), and [Tailwind CSS upgrade guide](https://tailwindcss.com/docs/upgrade-guide).

## Remaining upstream advisories (2026-10-22)

The public npm audit falls from 33 aggregate entries (2 critical, 23 high, 8 moderate) to 18 (0 critical, 14 high, 4 moderate). The remaining entries derive from two source advisories, without a published patched release:

The repository owner's GitHub API returned all 60 currently open Dependabot alerts. Comparing each advisory's vulnerable range against every installed version in the final lockfile shows 58 no longer affected (removed packages count as removed exposure). Only alerts [#48](https://github.com/techlab0/moss_country/security/dependabot/48) and [#52](https://github.com/techlab0/moss_country/security/dependabot/52) still match. This is a lockfile comparison, not a claim that GitHub has closed the alerts: main still requires merging and rescanning.

| Package | Advisory | Dependency paths and limits |
| --- | --- | --- |
| `braces@3.0.3` | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | ESLint globbing and Sanity CLI/codegen; no application request path accepts glob patterns. |
| `sprintf-js@1.0.3` | [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) | Sanity CLI/framework detection, through js-yaml/argparse; CLI formatting strings are fixed. |

These are unresolved upstream risks, not dismissed alerts. Avoid processing untrusted CLI patterns/configuration; monitor upstream fixes. Do not use `npm audit fix --force`: its proposed Sanity/ESLint downgrades break the supported dependency combination. `decompress` is absent, and Nodemailer 10.2.0 is audit-clean. Scoped `smol-toml@1.9.1` and `js-yaml@3.15.2` overrides remove the other affected framework-detection versions.

## Validation and release boundaries

- A clean install and a full installed-package-versus-lockfile scan passed with zero version mismatches.
- TypeScript passed; all 243 local tests passed, including real Nodemailer JSON-transport recipient-limit tests.
- The build retains the lint error gate. Lint has zero errors and 66 warnings: 57 are React Compiler diagnostics newly enabled by Next 16, reported as warnings while React Compiler remains disabled; the other warnings are existing dependency-array diagnostics.
- The production build was verified with process-local synthetic Supabase settings (`127.0.0.1:9` and fake keys). Without them this checkout lacks the Supabase settings required by the existing module initializer. No environment file or production setting was changed.
- Chromium exercised home/shop/workshop at 1440px and 390px, with HTTP 200, no uncaught page errors or horizontal overflow. The unauthenticated admin products API returned 401. Screenshot comparison detected and corrected the Tailwind layer/image-height regression.
- Authenticated CMS, real Supabase, live SMTP, payments, and deployed production behavior have not been tested. Before merging/deploying, verify actual Node/Supabase environment settings and the required authenticated service integrations in an authorized preview.

Existing PR #58's undici updates (6.29.1 / 7.30.1) were included by the dependency refresh. PR #1's Next 15.3.8 security update is superseded. Neither existing PR was merged or closed.
