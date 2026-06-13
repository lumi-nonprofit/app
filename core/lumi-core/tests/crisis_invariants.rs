//! Crisis-recommender safety invariants, asserted against the FROZEN real ČAPLD
//! seed (incl. its adversarial hours strings, the no-phone line, and the
//! contact_emails-only lines). See docs/crisis-line-recommender.md §7.

use std::collections::BTreeSet;

use lumi_core::crisis::*;

const FIXTURE: &str = include_str!("fixtures/capld_linky_duvery_cr.json");

fn dataset() -> Dataset {
    ingest(FIXTURE)
}

fn weekday_now(holiday: bool) -> PragueTime {
    // Wednesday 03:00 — a time when most non-NONSTOP lines are closed, to prove
    // the safety net still provides an open channel.
    PragueTime {
        weekday: Weekday::Wed,
        minute_of_day: 180,
        is_or_borders_holiday: holiday,
    }
}

fn tels_in(result: &MatchResult) -> BTreeSet<String> {
    let mut s = BTreeSet::new();
    for r in &result.lines {
        for t in r.line.tels() {
            s.insert(t);
        }
    }
    s
}

fn sample_queries() -> Vec<MatchQuery> {
    let mut all_chips = BTreeSet::new();
    for c in [
        Chip::Parent,
        Chip::ChildTeen,
        Chip::Senior,
        Chip::WomanGirl,
        Chip::Violence,
        Chip::MentalIllness,
        Chip::Bereavement,
        Chip::HealthCrisis,
        Chip::HealthcareWorker,
        Chip::FamilyOfPatient,
        Chip::ForeignerLanguage,
    ] {
        all_chips.insert(c);
    }
    vec![
        MatchQuery::bare(AgeBand::U26),
        MatchQuery::bare(AgeBand::Plus27),
        MatchQuery {
            free_only: true,
            ..MatchQuery::bare(AgeBand::Plus27)
        },
        MatchQuery {
            region: Some("Jihomoravský kraj".to_string()),
            ..MatchQuery::bare(AgeBand::U26)
        },
        MatchQuery {
            medium: Some(Medium::Chat),
            ..MatchQuery::bare(AgeBand::Plus27)
        },
        MatchQuery {
            chips: {
                let mut s = BTreeSet::new();
                s.insert(Chip::Violence);
                s
            },
            ..MatchQuery::bare(AgeBand::Plus27)
        },
        MatchQuery {
            chips: all_chips,
            medium: Some(Medium::Email),
            region: Some("Praha".to_string()),
            free_only: true,
            ..MatchQuery::bare(AgeBand::U26)
        },
    ]
}

// --- ingestion -------------------------------------------------------------

#[test]
fn ingest_keeps_all_31_lines_no_drops() {
    let d = dataset();
    assert_eq!(d.provenance.schema_version, "1.0");
    assert_eq!(d.lines.len(), 31, "all 31 seed lines must be kept");
    assert_eq!(d.skipped, 0, "no line silently dropped");
}

#[test]
fn email_channel_only_from_email_counseling() {
    let d = dataset();

    // Modrá linka: counseling help@, admin reditelka@. Only help@ may appear.
    let modra = d
        .lines
        .iter()
        .find(|l| l.name == "Modrá linka")
        .expect("Modrá linka present");
    let emails: Vec<&String> = modra
        .channels
        .iter()
        .filter_map(|c| match c {
            Channel::Email { addresses } => Some(addresses),
            _ => None,
        })
        .flatten()
        .collect();
    assert!(emails.iter().any(|e| e.as_str() == "help@modralinka.cz"));
    assert!(
        !emails.iter().any(|e| e.as_str() == "reditelka@modralinka.cz"),
        "admin contact_emails must never become an email channel"
    );

    // Exactly the 22 lines with email_counseling get an email channel; the 9
    // contact_emails-only lines get none.
    let with_email = d.lines.iter().filter(|l| l.has_channel_email()).count();
    assert_eq!(with_email, 22, "email channel count must match email_counseling");

    // No email address anywhere looks like a known admin inbox.
    for l in &d.lines {
        for c in &l.channels {
            if let Channel::Email { addresses } = c {
                assert!(
                    !addresses.iter().any(|a| a.starts_with("reditelka@")),
                    "{} leaked an admin email",
                    l.name
                );
            }
        }
    }
}

#[test]
fn zero_phone_line_is_kept() {
    let d = dataset();
    let np = d
        .lines
        .iter()
        .find(|l| l.name == "Nepanikař")
        .expect("Nepanikař present");
    assert!(!np.has_channel_phone(), "Nepanikař has no phone");
}

#[test]
fn short_codes_preserved_and_normalised() {
    let d = dataset();
    let lb = d
        .lines
        .iter()
        .find(|l| l.has_tel("116111"))
        .expect("116 111 present in seed");
    let has_display = lb.channels.iter().any(|c| match c {
        Channel::Phone { numbers, .. } => numbers.iter().any(|n| n.display == "116 111"),
        _ => false,
    });
    assert!(has_display, "display form preserved verbatim");
}

#[test]
fn verbatim_hours_retained_even_when_unparseable() {
    let d = dataset();
    let mut saw_unparseable = false;
    for l in &d.lines {
        for c in &l.channels {
            let h = match c {
                Channel::Phone { hours, .. } | Channel::Chat { hours, .. } => Some(hours),
                Channel::Email { .. } => None,
            };
            if let Some(h) = h {
                if !h.raw.is_empty() && h.parsed.is_none() {
                    saw_unparseable = true; // raw is still present — that's the point
                }
            }
        }
    }
    assert!(
        saw_unparseable,
        "fixture should contain at least one unparseable-but-retained hours string"
    );
}

// --- matcher safety invariants ---------------------------------------------

#[test]
fn invariant_1_safety_net_always_present_and_never_empty() {
    let d = dataset();
    let must_have = ["116111", "116123", "116006", "112", "155"];
    for q in sample_queries() {
        for &holiday in &[false, true] {
            let res = match_lines(&d.lines, &q, weekday_now(holiday));
            assert!(!res.lines.is_empty(), "result is never empty");
            let tels = tels_in(&res);
            for m in must_have {
                assert!(
                    tels.contains(m),
                    "universal/emergency line {m} missing for {q:?}"
                );
            }
        }
    }
}

#[test]
fn invariant_2_3_fail_open_and_always_one_open_now() {
    let d = dataset();
    for q in sample_queries() {
        // Even on a holiday at 03:00, a NONSTOP universal must be Open.
        let res = match_lines(&d.lines, &q, weekday_now(true));
        let open_count = res
            .lines
            .iter()
            .filter(|r| r.open == OpenState::Open)
            .count();
        assert!(open_count >= 1, "no dead ends: at least one open-now line");
        // Fail open: no line is ever rendered confidently Closed without surfacing;
        // unparseable hours yield Unknown (reachable), never LikelyClosed-with-no-data
        // that hides it. Here we assert unparseable lines are Unknown.
        for r in &res.lines {
            let any_unparseable_realtime = r.line.channels.iter().any(|c| match c {
                Channel::Phone { hours, .. } | Channel::Chat { hours, .. } => {
                    !hours.raw.is_empty() && hours.parsed.is_none()
                }
                _ => false,
            });
            let only_unparseable = any_unparseable_realtime
                && r.line.channels.iter().all(|c| match c {
                    Channel::Phone { hours, .. } | Channel::Chat { hours, .. } => {
                        hours.parsed.is_none()
                    }
                    Channel::Email { .. } => true,
                });
            if only_unparseable {
                assert_eq!(
                    r.open,
                    OpenState::Unknown,
                    "{} with only unparseable hours must be Unknown (reachable)",
                    r.line.name
                );
            }
        }
    }
}

#[test]
fn invariant_1_filters_change_order_not_membership() {
    let d = dataset();
    let ids = |q: &MatchQuery| -> BTreeSet<String> {
        match_lines(&d.lines, q, weekday_now(false))
            .lines
            .into_iter()
            .map(|r| r.line.id)
            .collect()
    };
    let base = ids(&MatchQuery::bare(AgeBand::U26));
    for q in sample_queries() {
        // Age can swap which verified line is which, but the full membership set is
        // identical: filters never remove a line.
        let other = ids(&q);
        assert_eq!(other, base, "membership must be filter-independent for {q:?}");
    }
}

#[test]
fn free_only_keeps_universals_and_demotes_paid() {
    let d = dataset();
    let q = MatchQuery {
        free_only: true,
        ..MatchQuery::bare(AgeBand::Plus27)
    };
    let res = match_lines(&d.lines, &q, weekday_now(false));
    // The standard-tariff Rodičovská linka is still present (demoted, not removed).
    assert!(
        res.lines.iter().any(|r| r.line.has_tel("606021021")),
        "paid verified line is demoted, not removed"
    );
    // A paid, non-universal line never outranks the age-appropriate universal one.
    let first = &res.lines[0];
    assert!(
        first.universal,
        "free_only must not push a universal line out of the top slot"
    );
}

#[test]
fn violence_chip_pins_dv_line_high() {
    let d = dataset();
    let mut chips = BTreeSet::new();
    chips.insert(Chip::Violence);
    let q = MatchQuery {
        chips,
        ..MatchQuery::bare(AgeBand::Plus27)
    };
    let res = match_lines(&d.lines, &q, weekday_now(false));
    // 116 006 must be at or near the very top (group 0 age line, then group 1 DV).
    let dv_pos = res
        .lines
        .iter()
        .position(|r| r.line.has_tel("116006"))
        .expect("DV line present");
    assert!(dv_pos <= 1, "DV line pinned high when violence indicated, got {dv_pos}");
}

#[test]
fn age_appropriate_universal_is_first() {
    let d = dataset();
    let u26 = match_lines(&d.lines, &MatchQuery::bare(AgeBand::U26), weekday_now(false));
    assert!(
        u26.lines[0].line.has_tel("116111"),
        "youth line first for U26"
    );
    let adult = match_lines(&d.lines, &MatchQuery::bare(AgeBand::Plus27), weekday_now(false));
    assert!(
        adult.lines[0].line.has_tel("116123"),
        "adult line first for Plus27"
    );
}

#[test]
fn verified_core_wins_over_seed_duplicates() {
    let d = dataset();
    let res = match_lines(&d.lines, &MatchQuery::bare(AgeBand::U26), weekday_now(false));
    // 116 111 appears once (verified net), not duplicated by the seed entry.
    let count = res.lines.iter().filter(|r| r.line.has_tel("116111")).count();
    assert_eq!(count, 1, "no duplicate of a safety-net number");
    assert!(res.lines.iter().any(|r| r.line.id == "net-116111"));
}

#[test]
fn invariant_5_reasons_listed_for_inputs() {
    let mut chips = BTreeSet::new();
    chips.insert(Chip::Violence);
    let q = MatchQuery {
        chips,
        free_only: true,
        ..MatchQuery::bare(AgeBand::Plus27)
    };
    let res = match_lines(&[], &q, weekday_now(false));
    assert!(res.reasons.iter().any(|r| r.contains("násilí")));
    assert!(res.reasons.iter().any(|r| r.contains("bezplatné")));
    // With zero inputs there is nothing to explain, but the net is still shown.
    let bare = match_lines(&[], &MatchQuery::bare(AgeBand::U26), weekday_now(false));
    assert!(bare.reasons.is_empty());
    assert!(!bare.lines.is_empty());
}

#[test]
fn invariant_7_deterministic() {
    let d = dataset();
    let q = MatchQuery::bare(AgeBand::U26);
    let a = match_lines(&d.lines, &q, weekday_now(false));
    let b = match_lines(&d.lines, &q, weekday_now(false));
    assert_eq!(a, b, "matching is deterministic");
}
