# Sidequest entity schema

Schema name: `sidequest.tasks.public.v1`, defined in `lib/arkiv-schema.ts`.

| Field | Type | Indexed | Meaning |
|---|---|---|---|
| kind | string | yes | `task` or `action` |
| ref | string | yes | Empty for tasks; referenced task entity key for actions |
| category | string | yes | Development, Design, Research, Community |
| payload | bytes | no | UTF-8 versioned JSON |

Task JSON: version, kind, validated NewTask fields, createdAt and expiresAt. The UI uses 1 hour to 7 days; validation permits 1–720 hours. Entity expiration is the chosen deadline. Display timestamps are verified against the duration, while Arkiv enforces block-based entity expiry.

Action JSON: version, kind (`claim` or `complete`), taskKey. Actor identity comes from `$creator`, not a user-controlled payload address. Action entities expire with the referenced task. Both task and action records are readonly. Records initially belong to their creator wallets. Sidequest authorization follows the original publisher/actor identity from `$creator`; external ownership transfer does not transfer the publisher role. Current entity owners retain Arkiv's ability to delete their own records.

The live board queries this schema with payload and chain provenance. Targeted mutation reads filter actions by indexed ref. Category is indexed for alternate clients; the current board filters category in the browser after the bounded read. Status is derived from action records, never trusted from a submitted payload.

No private profiles or contacts are required. Anything entered into live task details becomes public.
