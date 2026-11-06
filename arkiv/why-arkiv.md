# Why Arkiv

If the live records moved to our private Postgres database, users and agents would lose the ability to discover the same board directly through a shared public schema, verify the record creator from chain provenance and rely on database-native time-scoped storage. A second frontend can query our schema without receiving credentials from us.

Arkiv does not magically make coordination atomic. Sidequest derives the selected claimant from immutable records and deterministic ordering. It does not escrow funds, guarantee task quality, or prevent an entity owner from deleting their own record.

What stays off Arkiv: private practice sessions and sample tasks in D1, browser search/filter state and transient wallet UI state. These do not need public ownership or network fees. No private keys are stored in either application database.
