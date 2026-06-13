//! Crisis-line data model. Mirrors the boundary-validator discipline of
//! `src/db/backup.ts`: unknown/invalid input degrades, never panics, never
//! silently drops a line. See `docs/crisis-line-recommender.md` §3.

use std::collections::BTreeSet;

pub type LineId = String;

/// Days of the week, Monday-first (matches the Czech source data).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Weekday {
    Mon,
    Tue,
    Wed,
    Thu,
    Fri,
    Sat,
    Sun,
}

impl Weekday {
    pub fn index(self) -> u8 {
        match self {
            Weekday::Mon => 0,
            Weekday::Tue => 1,
            Weekday::Wed => 2,
            Weekday::Thu => 3,
            Weekday::Fri => 4,
            Weekday::Sat => 5,
            Weekday::Sun => 6,
        }
    }

    pub fn from_index(i: u8) -> Weekday {
        match i % 7 {
            0 => Weekday::Mon,
            1 => Weekday::Tue,
            2 => Weekday::Wed,
            3 => Weekday::Thu,
            4 => Weekday::Fri,
            5 => Weekday::Sat,
            _ => Weekday::Sun,
        }
    }

    pub fn all() -> [Weekday; 7] {
        [
            Weekday::Mon,
            Weekday::Tue,
            Weekday::Wed,
            Weekday::Thu,
            Weekday::Fri,
            Weekday::Sat,
            Weekday::Sun,
        ]
    }
}

/// A single opening interval within the local week. Overnight ranges are split at
/// midnight into two intervals at ingestion time, so `start_min < end_min` always.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Interval {
    pub day: Weekday,
    pub start_min: u16, // minutes from 00:00, inclusive
    pub end_min: u16,   // minutes from 00:00, exclusive (<= 1440)
}

/// Machine-readable hours — populated ONLY when parsed unambiguously.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum OpeningHours {
    /// 24/7/365.
    Nonstop,
    /// A set of weekly intervals.
    Weekly(Vec<Interval>),
}

/// Hours store BOTH forms: `raw` is ALWAYS retained and ALWAYS displayed; `parsed`
/// is `Some` only when the parser was confident (otherwise the UI shows `raw` and
/// treats open-state as Unknown / reachable).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Hours {
    pub raw: String,
    pub parsed: Option<OpeningHours>,
}

/// Who a line is for. Mapped from `categories[]`; `Other` preserves unknown
/// categories so they are never dropped.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum Audience {
    GeneralPopulation,   // "Celá populace"
    Adults,              // "Dospělí"
    ChildrenYouth,       // "Děti a dospívající" (<= 25/26)
    Parents,             // "Rodiče a škola"
    Seniors,             // "Senioři"
    WomenGirls,          // "Ženy a dívky"
    ViolenceVictims,     // "Oběti trestných činů a domácího násilí"
    MentalIllness,       // "Lidé s duševním onemocněním"
    HealthcareWorkers,   // "Zdravotníci"
    PatientsFamilies,    // "Blízcí pacientů"
    SecurityForces,      // "Příslušníci bezpečnostních sborů"
    HealthDisadvantaged, // "Osoby zdravotně znevýhodněné"
    Prison,              // "Oblast vězeňství"
    Foreigners,          // "Cizinci"
    Other(String),       // FALLBACK — unknown category preserved verbatim
}

/// Geographic reach. `"Celorepublikové"` maps here (NOT to an audience).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Scope {
    National,
    Region(String), // Kraj
    City(String),
}

/// Call cost — decision-relevant for vulnerable callers, always shown.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Cost {
    Free,
    StandardTariff,
    Unknown,
}

/// A phone number. `tel` is dial-safe (digits / `+`, EU short codes preserved);
/// `display` is the original human form.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PhoneNumber {
    pub tel: String,
    pub display: String,
    pub label: Option<String>,
}

/// A way to reach a line. EACH channel carries its OWN hours.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Channel {
    Phone { numbers: Vec<PhoneNumber>, hours: Hours },
    Chat { url: String, hours: Hours },
    /// Addresses come ONLY from `email_counseling[]`, NEVER from `contact_emails[]`.
    Email { addresses: Vec<String> },
}

/// Where the data came from + whether it has been verified (see the release checklist).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Provenance {
    pub schema_version: String,
    pub source: String,
    pub accessed_date: String,
    pub verified: bool,
}

impl Provenance {
    pub fn unknown() -> Provenance {
        Provenance {
            schema_version: String::new(),
            source: String::new(),
            accessed_date: String::new(),
            verified: false,
        }
    }
}

/// One crisis line.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CrisisLine {
    pub id: LineId,
    pub name: String,
    pub operator: String,
    pub focus_text: String,
    pub audiences: BTreeSet<Audience>,
    pub scope: Scope,
    pub channels: Vec<Channel>,
    pub cost: Cost,
    pub notes: Option<String>,
    pub web: Option<String>,
    pub social: Vec<String>,
    pub provenance: Provenance,
}

impl CrisisLine {
    /// All dial-safe phone identifiers across this line's phone channels.
    pub fn tels(&self) -> Vec<String> {
        let mut out = Vec::new();
        for ch in &self.channels {
            if let Channel::Phone { numbers, .. } = ch {
                for n in numbers {
                    out.push(n.tel.clone());
                }
            }
        }
        out
    }

    pub fn has_tel(&self, tel: &str) -> bool {
        self.tels().iter().any(|t| t == tel)
    }

    pub fn has_channel_phone(&self) -> bool {
        self.channels
            .iter()
            .any(|c| matches!(c, Channel::Phone { .. }))
    }

    pub fn has_channel_chat(&self) -> bool {
        self.channels
            .iter()
            .any(|c| matches!(c, Channel::Chat { .. }))
    }

    pub fn has_channel_email(&self) -> bool {
        self.channels
            .iter()
            .any(|c| matches!(c, Channel::Email { .. }))
    }
}
