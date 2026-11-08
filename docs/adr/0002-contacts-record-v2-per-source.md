# 0002. One stored list per contact source, merged on read (contacts record v2)

- **Status:** Proposed (accepted when the founder merges the #9 PR)
- **Date:** 2026-11-07
- **Deciders:** tech lead, founder
- **Stories:** #9
- **Amends:** ADR 0001 §2 ("one record, replace on import"). Everything else in ADR 0001 still holds.

## Context

ADR 0001 stores one IndexedDB record `{ schemaVersion: 1, isSample, importedAt, contacts }`, replaced on each import. #9 adds a second source (phone contacts, `.vcf`) that must be **merged** with LinkedIn: a person in both appears once, with the position and the number. Re-importing one source must not lose or duplicate the other. Users already have v1 records in their browsers since Sprint 1.

The record format lives in users' browsers, so we cannot change it without code that reads both formats.

## Decision

1. The record becomes **v2**: `{ schemaVersion: 2, isSample, importedAt, sources: { sample?, linkedin?, phone? } }`, each source `{ importedAt, contacts }`. The sample is exclusive; `linkedin` and `phone` can coexist. Same database, store and key; `DB_VERSION` stays 1.
2. Only the **per-source lists** are stored. The merged list is **computed on every load** by a pure function (`combineSources` in `lib/merge.js`). Importing a source replaces that source's list (`withImport`).
3. `loadContacts()` **migrates v1 → v2** (sample → `sources.sample`, otherwise → `sources.linkedin`) and writes the v2 record back. Unknown or malformed records are deleted, as before.
4. Minimum data from a vCard: name, one phone number (E.164), one email, company, position. Phone numbers are personal data of non-users and follow ADR 0001: on this device only, never logged, deleted by « Effacer mes données de cet appareil ».

## Consequences

**Good**
- Re-importing one source never corrupts the other, and changing the merge rule later needs no data migration (it runs on read).
- Existing users keep their LinkedIn import.
- The merge is a pure, tested function, reusable on a server later.

**Bad / accepted**
- **Rollback deletes v2 records.** A build from before this ADR treats a v2 record as unknown and deletes it. The user imports again. Nothing leaks.
- A person in both files is stored twice (once per source); about 300 bytes each, negligible.
- The merge runs on each load: target under 200 ms for 30,000 + 5,000 contacts.
- Every future source (Instagram, Excel) is a new key in `sources` and a change to `combineSources`; a new shape is v3 with its own migration.

## Alternatives considered

1. **Store only the merged list** (`combineImport(existing, incoming)`). Rejected: re-importing a source needs to "un-merge" contacts from it, which loses the phone side's own data and drifts over time.
2. **A second key (`phoneContacts`) next to the v1 record.** A rollback would keep LinkedIn data, but "contacts" would mean "LinkedIn only", the sample rules would be spread over two keys, and every reader needs both. Rejected for clarity.
3. **Drop v1 records instead of migrating.** Simpler, but every existing user would lose their import on deploy. Rejected.
4. **A new object store / `DB_VERSION` 2.** Not needed: one record per device stays small, and an `onupgradeneeded` migration adds blocked-upgrade cases across tabs.
