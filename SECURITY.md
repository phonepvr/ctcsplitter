# Security & confidentiality

This tool handles two sensitive things: **internal compensation policy** (the
per-level source tables) and **candidate personal data** (entered compensation).
This document records the threat model and the decisions taken.

## Threat model

- **Confidential:** the per-level source tables (reimbursement, insurance and
  related amounts by level).
- **Personal data:** the candidate's current compensation, entered by the user.
- **Adversary:** anyone who can reach the published site URL, read network
  traffic, or inspect the shipped JavaScript bundle.

## Key facts that shaped the design

1. **A static site on a non-Enterprise plan is publicly reachable.** The repo
   can be private, but the *published* URL — and therefore the JS bundle and
   anything embedded in it — is reachable by anyone with the link. Auth-gated
   ("private") hosting requires an Enterprise plan.
2. **A client-side access code is not security.** Any gate implemented in the
   browser can be bypassed by opening dev tools / reading the bundle.

## Chosen model — public UI, locally-loaded data

- The **calculator UI is deployed publicly**.
- The **confidential tables are NOT in the bundle.** In production the app boots
  with no data and the user loads a local `level-master.json`
  (`<input type="file">` + `FileReader`, entirely in-browser). The file is never
  uploaded.
- The sample tables live in `src/data/levelMaster.ts` (dev/tests only) and
  `sample-data/level-master.json`. Neither is reachable from the production
  entry path: the dev sample loads through an `import.meta.env.DEV`-guarded
  dynamic import, so it is **tree-shaken out** of the production build.
- **Automated guardrail:** `npm run check-leak` scans `dist/` after every build
  (and in CI) for values that exist only in the confidential tables and **fails
  the build** if any are present.

## Candidate data

Candidate compensation is **never stored or transmitted**. It lives only in
component state for the duration of the session and is gone on refresh. There is
no backend, no analytics, no logging.

## Other hardening

- **No third-party CDNs.** Fonts are self-hosted — no external font request, so
  no referrer leak.
- `<meta name="robots" content="noindex, nofollow">` and
  `<meta name="referrer" content="no-referrer">`.
- No runtime dependencies that phone home; minimal dependency tree.

## Handling the confidential JSON

- Distribute `level-master.json` through an internal channel. It may live in the
  **private** repo under `sample-data/`, but it is never published (only `dist/`
  is, and it contains no tables).
- Treat the JSON like any confidential document.

## Residual risk & stronger options

The public-URL exposure of the *UI* (not the data) remains. For defence in
depth, host behind authentication instead of a public static site:

- Enterprise auth-gated hosting, or
- An internal authenticated location, or run locally via `npm run preview`.

In any of those, the tables could optionally be bundled — but the current
"load a local JSON" model is the safest default and works on any plan.
