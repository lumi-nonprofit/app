//! Opening-hours parsing + open-now computation.
//!
//! **Best-effort, FAIL OPEN.** The parser is deliberately *conservative*: it only
//! returns `Some(..)` for strings it can read unambiguously (NONSTOP, or explicit
//! weekday + HH:MM ranges incl. overnight wrap). Anything with prose, seasonal or
//! holiday exceptions, or malformed times returns `None` → treated as Unknown →
//! reachable. We NEVER render a confident "Closed". See spec §5.

use super::model::{Interval, OpeningHours, Weekday};

/// An injected `Europe/Prague` wall-clock instant. The platform layer converts a
/// real timestamp into these local components; the core stays pure + testable and
/// needs no timezone database.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PragueTime {
    pub weekday: Weekday,
    pub minute_of_day: u16, // 0..=1439
    /// True if `now` is, or is adjacent to, a CZ public holiday. Holidays can't be
    /// resolved reliably offline, so affected weekly lines degrade to Unknown.
    pub is_or_borders_holiday: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NextOpen {
    pub day: Weekday,
    pub minute_of_day: u16,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum OpenState {
    Open,
    LikelyClosed { next_open: Option<NextOpen> },
    Unknown,
}

/// Best-effort open-now. `Unknown` is reachable; never a confident "Closed".
pub fn open_state(parsed: &Option<OpeningHours>, now: PragueTime) -> OpenState {
    let oh = match parsed {
        Some(o) => o,
        None => return OpenState::Unknown,
    };
    match oh {
        // 24/7/365 — open even on holidays.
        OpeningHours::Nonstop => OpenState::Open,
        OpeningHours::Weekly(intervals) => {
            // Can't assert open/closed around holidays without a holiday calendar.
            if now.is_or_borders_holiday {
                return OpenState::Unknown;
            }
            for iv in intervals {
                if iv.day == now.weekday
                    && now.minute_of_day >= iv.start_min
                    && now.minute_of_day < iv.end_min
                {
                    return OpenState::Open;
                }
            }
            OpenState::LikelyClosed {
                next_open: next_open(intervals, now),
            }
        }
    }
}

fn next_open(intervals: &[Interval], now: PragueTime) -> Option<NextOpen> {
    for off in 0..7u8 {
        let day = Weekday::from_index(now.weekday.index() + off);
        let mut best: Option<u16> = None;
        for iv in intervals {
            if iv.day == day {
                let after = off != 0 || iv.start_min > now.minute_of_day;
                if after {
                    best = Some(best.map_or(iv.start_min, |b| b.min(iv.start_min)));
                }
            }
        }
        if let Some(m) = best {
            return Some(NextOpen {
                day,
                minute_of_day: m,
            });
        }
    }
    None
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/// Parse an hours string. Returns `None` (→ Unknown) for anything not unambiguous.
pub fn parse_hours(raw: &str) -> Option<OpeningHours> {
    let s = raw.trim();
    if s.is_empty() {
        return None;
    }
    if s.eq_ignore_ascii_case("NONSTOP") {
        return Some(OpeningHours::Nonstop);
    }
    // Normalise en/em dashes to ASCII hyphen so range separators are uniform.
    let norm = s.replace('\u{2013}', "-").replace('\u{2014}', "-");

    let mut intervals: Vec<Interval> = Vec::new();
    let mut pending_days: Vec<Weekday> = Vec::new();

    for piece in norm.split(',') {
        let piece = piece.trim();
        if piece.is_empty() {
            continue;
        }
        match parse_piece(piece)? {
            PieceKind::DaysOnly(days) => pending_days.extend(days),
            PieceKind::Clause { days, start, end } => {
                let mut all_days = std::mem::take(&mut pending_days);
                all_days.extend(days);
                if all_days.is_empty() {
                    return None; // a time range with no days attached
                }
                for d in all_days {
                    push_interval(&mut intervals, d, start, end);
                }
            }
        }
    }

    if !pending_days.is_empty() {
        return None; // dangling day tokens (e.g. "… víkendy a svátky nepřetržitě")
    }
    if intervals.is_empty() {
        return None;
    }
    intervals.sort();
    intervals.dedup();
    Some(OpeningHours::Weekly(intervals))
}

enum PieceKind {
    DaysOnly(Vec<Weekday>),
    Clause {
        days: Vec<Weekday>,
        start: u16,
        end: u16,
    },
}

fn parse_piece(piece: &str) -> Option<PieceKind> {
    let mut day_toks: Vec<String> = Vec::new();
    let mut times: Vec<u16> = Vec::new();

    for tok in piece.split_whitespace() {
        if tok == "-" || tok.eq_ignore_ascii_case("až") {
            continue; // range separator
        }
        if let Some(min) = parse_time(tok) {
            if times.len() == 2 {
                return None; // a third time → ambiguous, reject
            }
            times.push(min);
            continue;
        }
        // A non-time, non-separator token after a time has started means trailing
        // prose or a second range ("… (mimo svátky)", "… a 15:00 - 19:00").
        if !times.is_empty() {
            return None;
        }
        let cleaned: String = tok
            .trim_matches(|c: char| !c.is_alphanumeric())
            .to_string();
        if cleaned.is_empty() {
            return None; // punctuation-only token, e.g. "(letní"
        }
        day_toks.push(cleaned);
    }

    if times.is_empty() {
        let days = parse_day_tokens(&day_toks)?;
        if days.is_empty() {
            return None;
        }
        return Some(PieceKind::DaysOnly(days));
    }
    if times.len() != 2 {
        return None; // a lone time without a range
    }
    let days = parse_day_tokens(&day_toks)?; // may be empty → rely on pending days
    Some(PieceKind::Clause {
        days,
        start: times[0],
        end: times[1],
    })
}

/// Parse "HH:MM" / "H:MM" with a mandatory colon. Rejects dotted ("20.00") and
/// bare-hour ("9") forms — both must degrade to Unknown.
fn parse_time(tok: &str) -> Option<u16> {
    let (h, m) = tok.split_once(':')?;
    if h.is_empty() || m.len() != 2 {
        return None;
    }
    let hh: u16 = h.parse().ok()?;
    let mm: u16 = m.parse().ok()?;
    if hh > 23 || mm > 59 {
        return None;
    }
    Some(hh * 60 + mm)
}

/// Interpret the day part of a piece. Within a single comma-piece the days are
/// either empty, a single day, an inclusive range (`D - D`), or "denně" (all 7).
/// Multi-day *lists* arrive as separate comma-pieces, so 3+ tokens here is invalid.
fn parse_day_tokens(toks: &[String]) -> Option<Vec<Weekday>> {
    if toks.is_empty() {
        return Some(vec![]);
    }
    if toks.len() == 1 {
        if toks[0].to_lowercase() == "denně" || toks[0].eq_ignore_ascii_case("denne") {
            return Some(Weekday::all().to_vec());
        }
        return Some(vec![day_from(&toks[0])?]);
    }
    if toks.len() == 2 {
        let a = day_from(&toks[0])?;
        let b = day_from(&toks[1])?;
        return day_range(a, b);
    }
    None
}

fn day_from(tok: &str) -> Option<Weekday> {
    match tok.to_uppercase().as_str() {
        "PO" => Some(Weekday::Mon),
        "ÚT" | "UT" => Some(Weekday::Tue),
        "ST" => Some(Weekday::Wed),
        "ČT" | "CT" => Some(Weekday::Thu),
        "PÁ" | "PA" => Some(Weekday::Fri),
        "SO" => Some(Weekday::Sat),
        "NE" => Some(Weekday::Sun),
        _ => None,
    }
}

fn day_range(a: Weekday, b: Weekday) -> Option<Vec<Weekday>> {
    let (ai, bi) = (a.index(), b.index());
    if ai > bi {
        return None; // no wrap-around day ranges in the source data
    }
    Some((ai..=bi).map(Weekday::from_index).collect())
}

/// Push an interval, splitting overnight ranges (start >= end) at midnight.
fn push_interval(out: &mut Vec<Interval>, day: Weekday, start: u16, end: u16) {
    if start == end {
        return; // zero-length / ambiguous — ignore
    }
    if start < end {
        out.push(Interval {
            day,
            start_min: start,
            end_min: end,
        });
    } else {
        out.push(Interval {
            day,
            start_min: start,
            end_min: 1440,
        });
        out.push(Interval {
            day: Weekday::from_index(day.index() + 1),
            start_min: 0,
            end_min: end,
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn weekly(p: &str) -> Vec<Interval> {
        match parse_hours(p) {
            Some(OpeningHours::Weekly(v)) => v,
            other => panic!("expected Weekly for {p:?}, got {other:?}"),
        }
    }

    fn iv(day: Weekday, s: u16, e: u16) -> Interval {
        Interval {
            day,
            start_min: s,
            end_min: e,
        }
    }

    #[test]
    fn nonstop() {
        assert_eq!(parse_hours("NONSTOP"), Some(OpeningHours::Nonstop));
        assert_eq!(parse_hours("nonstop"), Some(OpeningHours::Nonstop));
    }

    #[test]
    fn daily_ranges() {
        let all = Weekday::all();
        for p in ["Denně 08:00 - 20:00", "Denně 08:00 až 20:00"] {
            let got = weekly(p);
            assert_eq!(got.len(), 7, "{p}");
            for d in all {
                assert!(got.contains(&iv(d, 480, 1200)), "{p} missing {d:?}");
            }
        }
        assert!(weekly("Denně 09:00 - 21:00").contains(&iv(Weekday::Sun, 540, 1260)));
    }

    #[test]
    fn weekday_range_and_colon() {
        let got = weekly("PO - PÁ - 09:00 - 21:00");
        assert_eq!(got.len(), 5);
        assert!(got.contains(&iv(Weekday::Mon, 540, 1260)));
        assert!(got.contains(&iv(Weekday::Fri, 540, 1260)));
        assert!(!got.iter().any(|i| i.day == Weekday::Sat));

        let colon = weekly("PO - PÁ: 08:00 - 22:00");
        assert!(colon.contains(&iv(Weekday::Wed, 480, 1320)));
    }

    #[test]
    fn two_clauses_and_day_list() {
        // weekday range + weekend list, second clause assembled from pending days
        let got = weekly("PO - PÁ: 08:00 - 18:00, SO, NE - 08:00 - 16:00");
        assert!(got.contains(&iv(Weekday::Mon, 480, 1080)));
        assert!(got.contains(&iv(Weekday::Sat, 480, 960)));
        assert!(got.contains(&iv(Weekday::Sun, 480, 960)));

        // single-digit hour + per-day ranges
        let g2 = weekly("PO - ČT - 09:00 - 21:00, PÁ - 9:00 - 17:00");
        assert!(g2.contains(&iv(Weekday::Thu, 540, 1260)));
        assert!(g2.contains(&iv(Weekday::Fri, 540, 1020)));

        // explicit weekday list in a single clause
        let g3 = weekly("PO, ST, PÁ - 08:00 - 20:00");
        assert_eq!(g3.len(), 3);
        assert!(g3.contains(&iv(Weekday::Wed, 480, 1200)));
    }

    #[test]
    fn overnight_wrap_splits_at_midnight() {
        let got = weekly("PO - PÁ 19:00 - 07:00");
        // Mon evening + Tue early morning both present
        assert!(got.contains(&iv(Weekday::Mon, 1140, 1440)));
        assert!(got.contains(&iv(Weekday::Tue, 0, 420)));
        // Fri evening wraps into Sat morning
        assert!(got.contains(&iv(Weekday::Sat, 0, 420)));
    }

    #[test]
    fn en_dash_single_day() {
        let got = weekly("NE: 17:00 – 21:00");
        assert_eq!(got, vec![iv(Weekday::Sun, 1020, 1260)]);
    }

    #[test]
    fn unparseable_strings_degrade_to_none() {
        // The full adversarial corpus from the real ČAPLD seed.
        let unknowns = [
            "",
            "denně 08:00 - 20.00",                                         // malformed dot
            "PO, ČT, SO: 17:00 - 20.00",                                   // malformed dot
            "PO, ÚT, ST, ČT, PÁ - 18:00 - 6:00, víkendy a svátky nepřetržitě", // holiday prose
            "PO - PÁ 16:00 - 22:00, (letní režim 16:00 - 20:00)",          // seasonal
            "PO 13:00 - 16:00, ÚT 16:00 - 19:00, ČT 13:00 - 16:00 (mimo svátky)", // holiday exc.
            "PO, ST, NE: 18:30 - 21:30, aktuální provozní doba chatu je upřesněna na webových stránkách organizace", // prose tail
            "denně 09:00 – 13.00 a 15:00 – 19:00",                         // malformed + split
            "Denně: 10:00 - 12:00 a 17:00 - 19:00",                        // split ranges
            "PO - ČT 9 - 21, PÁ 9 - 15, SO 14 - 20",                       // bare hours
            "PO: 8:00 – 13:00, ÚT, ST, ČT: 13:00 – 18:00, PÁ SO, NE a svátky: 08:00 – 13:00",
        ];
        for u in unknowns {
            assert_eq!(parse_hours(u), None, "expected None for {u:?}");
        }
    }

    #[test]
    fn open_state_basic() {
        let nonstop = Some(OpeningHours::Nonstop);
        let holiday = PragueTime {
            weekday: Weekday::Wed,
            minute_of_day: 600,
            is_or_borders_holiday: true,
        };
        // Nonstop is open even on holidays.
        assert_eq!(open_state(&nonstop, holiday), OpenState::Open);
        // None → Unknown.
        assert_eq!(open_state(&None, holiday), OpenState::Unknown);

        let weekly = parse_hours("PO - PÁ - 09:00 - 21:00");
        let mon_noon = PragueTime {
            weekday: Weekday::Mon,
            minute_of_day: 720,
            is_or_borders_holiday: false,
        };
        assert_eq!(open_state(&weekly, mon_noon), OpenState::Open);

        let mon_early = PragueTime {
            weekday: Weekday::Mon,
            minute_of_day: 480,
            is_or_borders_holiday: false,
        };
        match open_state(&weekly, mon_early) {
            OpenState::LikelyClosed { next_open: Some(n) } => {
                assert_eq!(n.day, Weekday::Mon);
                assert_eq!(n.minute_of_day, 540);
            }
            other => panic!("expected LikelyClosed, got {other:?}"),
        }

        // Holiday degrades a weekly line to Unknown — never a confident Closed.
        let weekly_holiday = PragueTime {
            weekday: Weekday::Mon,
            minute_of_day: 480,
            is_or_borders_holiday: true,
        };
        assert_eq!(open_state(&weekly, weekly_holiday), OpenState::Unknown);
    }

    #[test]
    fn open_state_overnight() {
        let oh = parse_hours("PO - PÁ 19:00 - 07:00");
        // Tuesday 06:00 should be open (Monday night wrap).
        let tue_early = PragueTime {
            weekday: Weekday::Tue,
            minute_of_day: 360,
            is_or_borders_holiday: false,
        };
        assert_eq!(open_state(&oh, tue_early), OpenState::Open);
        // Tuesday noon should be closed.
        let tue_noon = PragueTime {
            weekday: Weekday::Tue,
            minute_of_day: 720,
            is_or_borders_holiday: false,
        };
        assert!(matches!(
            open_state(&oh, tue_noon),
            OpenState::LikelyClosed { .. }
        ));
    }
}
