# Publication audit

Checked 7 November 2026 before public release.

- Fresh Git history; no earlier private commits were copied.
- Historical wallet proof, transaction links, credentials, environment files, recordings, screenshots, local database state and private deployment identity excluded.
- New public Arkiv namespace; historical demonstration records are not queried by default.
- Known private values compared against staged source and generated build: no matches.
- Dedicated Gitleaks scan of the publication files and initial history: no findings.
- Staged-content publication guard: passed. Pre-commit hook and CI checks included.
- Independent privacy review: no blocking findings.
- Automated tests: 32 passed, zero failures.
- Typecheck, ESLint and production build: passed.
- npm dependency audit, including development dependencies: zero reported vulnerabilities.
- Local production smoke check: page assets, practice create/claim/complete, session isolation, invalid input handling and live read query passed.

Dependency audit and scanner results describe the checked release, not a guarantee about future vulnerabilities or changes. The public edition does not claim a new onchain write. Blockchain records created previously remain public independently of this repository.
