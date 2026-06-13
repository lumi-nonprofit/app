//! Deterministic, on-device crisis-line recommender.
//!
//! Enforces the seven safety invariants in `docs/crisis-line-recommender.md` §7.
//! The guaranteed safety net is hardcoded + compiled in (the offline fallback);
//! the ČAPLD dataset only ever *enriches* it. Filters change ORDER and DEMOTE;
//! they never remove a line and never empty the result.

use std::collections::BTreeSet;

use super::hours::{open_state, OpenState, PragueTime};
use super::model::{
    Audience, Channel, Cost, CrisisLine, Hours, OpeningHours, PhoneNumber, Provenance, Scope,
    Weekday,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AgeBand {
    U26,
    Plus27,
}

/// Optional, ephemeral situational hints ("Co se právě děje?"). NEVER persisted.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Chip {
    Parent,
    ChildTeen,
    Senior,
    WomanGirl,
    Violence,
    MentalIllness,
    Bereavement,
    HealthCrisis,
    HealthcareWorker,
    FamilyOfPatient,
    ForeignerLanguage,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Medium {
    Phone,
    Chat,
    Email,
}

#[derive(Debug, Clone)]
pub struct MatchQuery {
    pub age: AgeBand,
    pub chips: BTreeSet<Chip>,
    pub medium: Option<Medium>,
    pub region: Option<String>,
    pub free_only: bool,
}

impl MatchQuery {
    /// A query with no optional refinements — the "Zobrazit všechny linky" baseline.
    pub fn bare(age: AgeBand) -> MatchQuery {
        MatchQuery {
            age,
            chips: BTreeSet::new(),
            medium: None,
            region: None,
            free_only: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RankedLine {
    pub line: CrisisLine,
    /// One of the always-on universal lines (116 111 / 116 123 / 116 006).
    pub universal: bool,
    /// Emergency service (112 / 155) — always present.
    pub emergency: bool,
    pub score: i32,
    pub open: OpenState,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MatchResult {
    pub lines: Vec<RankedLine>,
    pub reasons: Vec<String>,
}

/// Recommend lines. `now` is the injected Prague time used for open-now signals.
pub fn match_lines(dataset: &[CrisisLine], q: &MatchQuery, now: PragueTime) -> MatchResult {
    let net = safety_net();

    // The verified core wins for the safety-net numbers: drop any dataset line that
    // re-states one of them, so guaranteed numbers are never doubled or overridden.
    let mut net_tels: BTreeSet<String> = BTreeSet::new();
    for (l, _) in &net {
        for t in l.tels() {
            net_tels.insert(t);
        }
    }

    let mut merged: Vec<(CrisisLine, bool)> = net;
    for l in dataset {
        if l.tels().iter().any(|t| net_tels.contains(t)) {
            continue;
        }
        merged.push((l.clone(), false));
    }

    let mut ranked: Vec<RankedLine> = merged
        .into_iter()
        .map(|(line, emergency)| {
            let universal = is_universal(&line);
            let score = score_line(&line, q, universal);
            let open = best_open(&line, now);
            RankedLine {
                line,
                universal,
                emergency,
                score,
                open,
            }
        })
        .collect();

    ranked.sort_by(|a, b| sort_key(a, q).cmp(&sort_key(b, q)));

    MatchResult {
        lines: ranked,
        reasons: build_reasons(q),
    }
}

fn is_universal(l: &CrisisLine) -> bool {
    l.has_tel("116111") || l.has_tel("116123") || l.has_tel("116006")
}

fn score_line(l: &CrisisLine, q: &MatchQuery, universal: bool) -> i32 {
    let mut s = 0i32;

    let age_aud = match q.age {
        AgeBand::U26 => Audience::ChildrenYouth,
        AgeBand::Plus27 => Audience::Adults,
    };
    if l.audiences.contains(&age_aud) {
        s += 2;
    }

    for chip in &q.chips {
        if let Some(a) = chip_audience(*chip) {
            if l.audiences.contains(&a) {
                s += 10;
            }
        }
    }

    if let Some(region) = &q.region {
        match &l.scope {
            Scope::Region(r) if r == region => s += 6,
            Scope::National => s += 1, // national lines are always somewhat relevant
            _ => {}
        }
    }

    if let Some(m) = q.medium {
        let has = match m {
            Medium::Phone => l.has_channel_phone(),
            Medium::Chat => l.has_channel_chat(),
            Medium::Email => l.has_channel_email(),
        };
        if has {
            s += 4;
        }
    }

    // "Free calls only" DEMOTES paid, non-universal lines — it never removes them
    // (cost stays visible; the universal free lines are unaffected).
    if q.free_only && l.cost != Cost::Free && !universal {
        s -= 1000;
    }

    s
}

fn chip_audience(chip: Chip) -> Option<Audience> {
    Some(match chip {
        Chip::Parent => Audience::Parents,
        Chip::ChildTeen => Audience::ChildrenYouth,
        Chip::Senior => Audience::Seniors,
        Chip::WomanGirl => Audience::WomenGirls,
        Chip::Violence => Audience::ViolenceVictims,
        Chip::MentalIllness => Audience::MentalIllness,
        Chip::HealthcareWorker => Audience::HealthcareWorkers,
        Chip::FamilyOfPatient => Audience::PatientsFamilies,
        Chip::ForeignerLanguage => Audience::Foreigners,
        // No specialised audience — handled by the always-present general lines.
        Chip::Bereavement | Chip::HealthCrisis => return None,
    })
}

fn open_rank(o: &OpenState) -> u8 {
    match o {
        OpenState::Open => 0,
        OpenState::Unknown => 1,
        OpenState::LikelyClosed { .. } => 2,
    }
}

/// Sort group: lower sorts earlier.
fn group(r: &RankedLine, q: &MatchQuery) -> u8 {
    if r.emergency {
        return 3; // always present; UI pins the emergency block separately
    }
    if r.universal {
        let age_ok = match q.age {
            AgeBand::U26 => r.line.audiences.contains(&Audience::ChildrenYouth),
            AgeBand::Plus27 => r.line.audiences.contains(&Audience::Adults),
        };
        if age_ok {
            return 0; // the age-appropriate universal line, pinned first
        }
        if q.chips.contains(&Chip::Violence) && r.line.has_tel("116006") {
            return 1; // DV line pinned high when violence is indicated
        }
        return 2;
    }
    2
}

fn sort_key(r: &RankedLine, q: &MatchQuery) -> (u8, i32, u8, String) {
    (
        group(r, q),
        -r.score, // higher score first
        open_rank(&r.open),
        r.line.id.clone(),
    )
}

/// Best open-state across a line's real-time channels (phone/chat). Email is async
/// (no hours) → does not gate open-now. A line with no real-time channel is Unknown
/// (reachable), never Closed.
fn best_open(l: &CrisisLine, now: PragueTime) -> OpenState {
    let mut any_unknown = false;
    let mut nexts: Vec<Option<super::hours::NextOpen>> = Vec::new();
    let mut found_realtime = false;

    for ch in &l.channels {
        let hours: Option<&Hours> = match ch {
            Channel::Phone { hours, .. } => Some(hours),
            Channel::Chat { hours, .. } => Some(hours),
            Channel::Email { .. } => None,
        };
        if let Some(h) = hours {
            found_realtime = true;
            match open_state(&h.parsed, now) {
                OpenState::Open => return OpenState::Open,
                OpenState::Unknown => any_unknown = true,
                OpenState::LikelyClosed { next_open } => nexts.push(next_open),
            }
        }
    }

    if any_unknown || !found_realtime {
        return OpenState::Unknown;
    }
    let next = nexts
        .into_iter()
        .flatten()
        .min_by_key(|n| (n.day.index(), n.minute_of_day));
    OpenState::LikelyClosed { next_open: next }
}

fn build_reasons(q: &MatchQuery) -> Vec<String> {
    let mut labels: Vec<String> = Vec::new();
    for chip in &q.chips {
        labels.push(chip_label(*chip).to_string());
    }
    if let Some(region) = &q.region {
        labels.push(format!("kraj {region}"));
    }
    if let Some(m) = q.medium {
        labels.push(
            match m {
                Medium::Phone => "telefon",
                Medium::Chat => "chat",
                Medium::Email => "e-mail",
            }
            .to_string(),
        );
    }
    if q.free_only {
        labels.push("jen bezplatné hovory".to_string());
    }
    labels
        .into_iter()
        .map(|x| format!("Zobrazuji nejdřív, protože jste uvedl/a: {x}."))
        .collect()
}

fn chip_label(chip: Chip) -> &'static str {
    match chip {
        Chip::Parent => "rodič",
        Chip::ChildTeen => "dítě nebo dospívající",
        Chip::Senior => "senior/ka",
        Chip::WomanGirl => "žena nebo dívka",
        Chip::Violence => "násilí nebo domácí násilí",
        Chip::MentalIllness => "duševní onemocnění",
        Chip::Bereavement => "ztráta blízkého",
        Chip::HealthCrisis => "zdravotní krize",
        Chip::HealthcareWorker => "zdravotník/ce",
        Chip::FamilyOfPatient => "blízký/á pacienta",
        Chip::ForeignerLanguage => "podpora v cizím jazyce",
    }
}

// ---------------------------------------------------------------------------
// Hardcoded verified safety net (offline fallback). Returns (line, is_emergency).
// ---------------------------------------------------------------------------

fn safety_net() -> Vec<(CrisisLine, bool)> {
    let nonstop = || Hours {
        raw: "NONSTOP".to_string(),
        parsed: Some(OpeningHours::Nonstop),
    };

    // Rodičovská linka — PO–ČT 09:00–21:00, PÁ 09:00–17:00 (built directly so the
    // verified core never depends on the parser).
    let rodicovska_hours = Hours {
        raw: "PO–ČT 09:00–21:00, PÁ 09:00–17:00".to_string(),
        parsed: Some(OpeningHours::Weekly(vec![
            iv(Weekday::Mon, 540, 1260),
            iv(Weekday::Tue, 540, 1260),
            iv(Weekday::Wed, 540, 1260),
            iv(Weekday::Thu, 540, 1260),
            iv(Weekday::Fri, 540, 1020),
        ])),
    };

    vec![
        (
            phone_line(
                "net-116111",
                "Linka bezpečí",
                "Linka bezpečí, z.ú.",
                "116 111",
                &[Audience::ChildrenYouth, Audience::GeneralPopulation],
                Cost::Free,
                nonstop(),
            ),
            false,
        ),
        (
            phone_line(
                "net-116123",
                "Linka první psychické pomoci",
                "Národní ústav duševního zdraví",
                "116 123",
                &[Audience::Adults, Audience::GeneralPopulation],
                Cost::Free,
                nonstop(),
            ),
            false,
        ),
        (
            phone_line(
                "net-116006",
                "Linka pomoci obětem",
                "Bílý kruh bezpečí",
                "116 006",
                &[Audience::ViolenceVictims],
                Cost::Free,
                nonstop(),
            ),
            false,
        ),
        (
            phone_line(
                "net-rodicovska",
                "Rodičovská linka",
                "Linka bezpečí, z.ú.",
                "606 021 021",
                &[Audience::Parents],
                Cost::StandardTariff,
                rodicovska_hours,
            ),
            false,
        ),
        (
            phone_line(
                "net-112",
                "Tísňové volání",
                "Integrovaný záchranný systém",
                "112",
                &[Audience::GeneralPopulation],
                Cost::Free,
                nonstop(),
            ),
            true,
        ),
        (
            phone_line(
                "net-155",
                "Zdravotnická záchranná služba",
                "Zdravotnická záchranná služba",
                "155",
                &[Audience::GeneralPopulation],
                Cost::Free,
                nonstop(),
            ),
            true,
        ),
    ]
}

fn iv(day: Weekday, start_min: u16, end_min: u16) -> super::model::Interval {
    super::model::Interval {
        day,
        start_min,
        end_min,
    }
}

fn phone_line(
    id: &str,
    name: &str,
    operator: &str,
    display: &str,
    audiences: &[Audience],
    cost: Cost,
    hours: Hours,
) -> CrisisLine {
    let tel: String = display
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '+')
        .collect();
    CrisisLine {
        id: id.to_string(),
        name: name.to_string(),
        operator: operator.to_string(),
        focus_text: String::new(),
        audiences: audiences.iter().cloned().collect(),
        scope: Scope::National,
        channels: vec![Channel::Phone {
            numbers: vec![PhoneNumber {
                tel,
                display: display.to_string(),
                label: None,
            }],
            hours,
        }],
        cost,
        notes: None,
        web: None,
        social: Vec::new(),
        provenance: Provenance {
            schema_version: "verified-core".to_string(),
            source: "Lumi hardcoded safety net".to_string(),
            accessed_date: "2026-06-13".to_string(),
            verified: true,
        },
    }
}
