# Architecture decision records

One file per decision that is hard to reverse: `NNNN-title.md` (0001, 0002…), with **Context**, **Decision**, **Consequences** and **Alternatives considered**. Written by the tech lead; listed in the [wiki](../wiki/README.md).

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](0001-local-first-contacts.md) | Contacts stay on the user's device (local-first) in Sprint 1 | Accepted | 2026-10-27 |
| [0002](0002-contacts-record-v2-per-source.md) | One stored list per contact source, merged on read (contacts record v2) | Accepted | 2026-11-07 |
| [0003](0003-beta-signups-upstash-redis.md) | Beta signups in Upstash Redis: one key per address, written with SET NX over REST | Proposed | 2026-11-15 |
