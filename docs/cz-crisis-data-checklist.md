# CZ crisis-data verification checklist (per release)

Crisis content is **life-safety content**. The ČAPLD-derived list is a **seed,
not ground truth** — re-verify it against the source **before every release**. This
checklist is owned by Anna (clinical/product), per ADR `0001` §13 and
`crisis-line-recommender.md` §10.

## Provenance (record each refresh)

| Field | Value |
|---|---|
| `schema_version` | 1.0 |
| `source` | Česká asociace pracovišť linek důvěry, z.s. — *Linky důvěry v ČR* |
| `source.url` | (record the ČAPLD URL used) |
| `accessed_date` | 2026-06-13 (update on each refresh) |
| `count` | 31 (update on each refresh) |
| `verified_by` / `verified_date` | (sign-off per release) |

## The guaranteed safety net — verify these FIRST, every release

These are hardcoded + compiled in as the offline fallback; they must never depend
on the seed. Confirm each is still correct:

- [ ] **116 111** Linka bezpečí — free, **nonstop**, youth ≤ 26
- [ ] **116 123** Linka první psychické pomoci — free, **nonstop**, adults
- [ ] **116 006** Linka pomoci obětem — violence / domestic-violence victims
- [ ] **606 021 021** Rodičovská linka — **PO–ČT 09–21, PÁ 09–17**, standard tariff
      *(non-24/7 — the displayed hours must match)*
- [ ] **112** general emergency · **155** medical emergency
- [ ] Consider/keep **116 006** surfaced for the violence/DV chip path
- [ ] Re-check whether a Linka bezpečí **chat** option exists and its hours

## Per-line verification (all 31 seed items + any new ones)

For each line, confirm against ČAPLD:

- [ ] **Phone number(s)** correct and dialable; EU short codes (`116 xxx`) preserved verbatim
- [ ] **`phone_hours`** matches the source **verbatim** (raw string is what users see)
- [ ] **Chat URL** resolves and **chat hours** match
- [ ] **Cost** correct: *Volání bezplatné* (free) vs *Volání dle běžného tarifu* (standard)
- [ ] **Email channel** uses a **counseling** address (`email_counseling`), **never** an
      admin inbox (`contact_emails`) — a line with only admin emails has **no** email channel
- [ ] **Audience / scope** categories still accurate (note any new ČAPLD category →
      it maps to `Audience::Other(raw)` until the enum is extended)
- [ ] Line still **active** (not discontinued/merged)

## Parser / open-now sanity (no false "Closed")

- [ ] Any new `phone_hours`/chat-hours string that the parser cannot read
      **unambiguously** falls to `Unknown` (reachable), **not** a confident "Closed"
- [ ] Holiday-bordering dates degrade affected lines to `Unknown`
- [ ] The result is **never empty** and always offers **≥ 1 open-now** channel

## Sign-off

- [ ] All universal numbers re-verified
- [ ] All seed lines re-verified or flagged
- [ ] `accessed_date` / `count` / `verified_by` updated in the data file
- [ ] No confident "Closed" can be rendered for any line
- [ ] Anna's release sign-off recorded
