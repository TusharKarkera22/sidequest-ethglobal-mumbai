# Arkiv features that change the experience

- **Entities:** every live task is an entity. Read `GET /api/tasks?mode=live`, or run the SDK query in README, to inspect the same records the UI uses.
- **Ownership:** the publisher wallet owns its task. Another wallet owns its claim/completion record. Actors come from `$creator`; arbitrary JSON cannot impersonate another wallet.
- **Expiration:** the publisher chooses a useful lifetime. The SDK sets `ExpirationTime.atDate`, and actions end at the task's expiry block. Expired tasks disappear from discovery and cannot be acted on.
- **Queryable fields:** kind identifies task/action records; ref finds actions for one task. Category is indexed for third-party queries. The main UI renders records read from Arkiv, rather than treating Arkiv as a background log.
- **Readonly records:** payloads used for protocol reduction are immutable. Invalid payloads and unauthorized actions are ignored. Competing claims are resolved by creation block, then entity key.

Code: `lib/arkiv-wallet.ts` writes; `lib/arkiv.ts` reads; `lib/arkiv-records.ts` validates/reduces; `lib/task-domain.ts` enforces transitions. Tests include malformed payloads, race ordering and creator-based authorization.

This public edition uses a fresh namespace. Generate current live proof with your own test wallet; historical wallet-linked evidence is excluded.
