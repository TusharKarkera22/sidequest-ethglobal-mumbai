# Security and privacy

## Publication boundaries

This source is a clean export with a new initial Git history. It contains no historical wallet proof, transaction links, account-specific hosting identity, local environment values, recordings or runtime state. Test identities are generated synthetic fixtures.

Local secrets belong in ignored environment files or a deployment secret store. Never commit private keys, recovery phrases, wallet exports, database copies or access credentials. Do not attach unsanitized screenshots, videos or transaction evidence to public issues.

`npm run check:publication` scans all staged file contents for sensitive filenames, wallet/address/hash literals, common credential shapes, private hosting IDs and local user paths. The check is also run in CI; an opt-in pre-commit hook is included in `.githooks/`. It complements a dedicated secret scanner; it is not a guarantee against every possible disclosure.

The original demonstration dataset is not the default namespace in this public edition. This edition uses `sidequest.tasks.public.v1`; it starts without historical demonstration records.

## Runtime behavior

- Live wallet signatures happen in the browser. The server does not accept unsigned live writes or use a server signing key.
- The optional seed script reads a test-only private key from its environment and never prints it. It does print public transaction evidence when explicitly run; that output is not suitable for anonymous publication.
- `NEXT_PUBLIC_` environment values are public. Configure only browser-safe RPC keys there.
- Practice sessions use HttpOnly SameSite cookies, a hashed public identity and per-session database queries.
- Live posts and wallet addresses are public onchain. Do not publish personal information in task content.

## Reporting

Use GitHub's private vulnerability reporting when available. Do not post credentials or personal wallet evidence in a public issue.
