# CZ crisis-data verification checklist (per release)

Crisis content is **life-safety content**. The list derived from ČAPLD is a **seed, not ground
truth**. Verify it again against the source **before every release**. Anna (clinical/product) owns
this checklist, per ADR `0001` §13 and `crisis-line-recommender.md` §10.

## Provenance (record each refresh)

| Field                           | Value                                                             |
| ------------------------------- | ----------------------------------------------------------------- |
| `schema_version`                | 1.0                                                               |
| `source`                        | Česká asociace pracovišť linek důvěry, z.s. — _Linky důvěry v ČR_ |
| `source.url`                    | (record the ČAPLD URL that you used)                              |
| `accessed_date`                 | 2026-06-13 (update on each refresh)                               |
| `count`                         | 31 (update on each refresh)                                       |
| `verified_by` / `verified_date` | (sign-off per release)                                            |

## The guaranteed safety net — verify these FIRST, every release

The app carries these lines in its code, compiled in as the offline fallback. They must never
depend on the seed. Confirm that each line is still correct:

- [ ] **116 111** Linka bezpečí — free, **nonstop**, youth ≤ 26
- [ ] **116 123** Linka první psychické pomoci — free, **nonstop**, adults
- [ ] **116 006** Linka pomoci obětem — victims of violence and domestic violence
- [ ] **606 021 021** Rodičovská linka — **`PO–ČT 09–21, PÁ 09–17`**, standard tariff
      _(not 24/7 — the displayed hours must match)_
- [ ] **112** general emergency · **155** medical emergency
- [ ] Keep **116 006** visible for the violence/DV chip path
- [ ] Check again whether a **chat** option of Linka bezpečí exists, and its hours

## Per-line verification (all 31 seed items + any new ones)

For each line, confirm against ČAPLD:

- [ ] **Phone number(s)** correct; the phone can dial them; EU short codes (`116 xxx`) kept
      verbatim
- [ ] **`phone_hours`** matches the source **verbatim** (users see the raw string)
- [ ] **Chat URL** resolves and the **chat hours** match
- [ ] **Cost** correct: `Volání bezplatné` (free) or `Volání dle běžného tarifu` (standard tariff)
- [ ] **Email channel** uses an address from **`email_counseling`**, **never** an admin inbox
      (`contact_emails`). A line with only admin emails has **no** email channel.
- [ ] **Audience / scope** categories still accurate. Note any new ČAPLD category: it maps to
      `Audience::Other(raw)` until someone extends the enum.
- [ ] Line still **active** (not discontinued or merged)

## Parser / open-now checks (no false "Closed")

- [ ] Any new `phone_hours` or chat-hours string that the parser cannot read **unambiguously**
      falls to `Unknown` (reachable), **not** to a confident "Closed"
- [ ] Dates that border a holiday degrade the affected lines to `Unknown`
- [ ] The result is **never empty** and always offers **≥ 1 open-now** channel

## Sign-off

- [ ] All universal numbers verified again
- [ ] All seed lines verified again or flagged
- [ ] `accessed_date` / `count` / `verified_by` updated in the data file
- [ ] The app can never render a confident "Closed" for any line
- [ ] Anna's release sign-off recorded
