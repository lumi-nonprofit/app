//! Boundary-validating ingestion of the ČAPLD JSON into [`CrisisLine`]s.
//!
//! Mirrors `src/db/backup.ts` asEntry/asMeasurement: walk the untyped value by
//! hand, default missing fields, and **degrade rather than drop**. The only items
//! not kept are non-objects (which are not lines at all); those are counted in
//! `skipped` so nothing is silent. See spec §4.

use std::collections::BTreeSet;

use super::hours::parse_hours;
use super::json::{self, Json};
use super::model::{Audience, Channel, Cost, CrisisLine, Hours, PhoneNumber, Provenance, Scope};

pub struct Dataset {
    pub provenance: Provenance,
    pub lines: Vec<CrisisLine>,
    /// Non-object `items[]` entries that could not be a line (transparency, not silent).
    pub skipped: usize,
}

/// Known Kraj (region) names → [`Scope::Region`].
const KRAJS: &[&str] = &[
    "Středočeský kraj",
    "Jihočeský kraj",
    "Plzeňský kraj",
    "Karlovarský kraj",
    "Ústecký kraj",
    "Liberecký kraj",
    "Královéhradecký kraj",
    "Pardubický kraj",
    "Kraj Vysočina",
    "Jihomoravský kraj",
    "Olomoucký kraj",
    "Zlínský kraj",
    "Moravskoslezský kraj",
];

/// Known cities → [`Scope::City`] (extend via the release checklist as data grows).
const CITIES: &[&str] = &[
    "Praha",
    "Brno",
    "Ostrava",
    "Plzeň",
    "Liberec",
    "Olomouc",
    "Zlín",
    "Kladno",
    "Most",
    "Karlovy Vary",
    "Mladá Boleslav",
    "Blansko",
    "Trutnov",
    "Ústí nad Orlicí",
    "Ústí nad Labem",
    "České Budějovice",
    "Třebíč",
    "Kutná Hora",
];

/// Tags that describe channel/cost, not scope/audience — ignored by the audience demux.
const CHANNEL_COST_TAGS: &[&str] = &[
    "NONSTOP",
    "Telefonická krizová pomoc",
    "Chat",
    "E-mailové poradenství",
    "Volání dle běžného tarifu",
    "Volání bezplatné",
];

pub fn ingest(json: &str) -> Dataset {
    let root: Json = match json::parse(json) {
        Ok(v) => v,
        Err(_) => {
            return Dataset {
                provenance: Provenance::unknown(),
                lines: Vec::new(),
                skipped: 0,
            }
        }
    };

    let provenance = Provenance {
        schema_version: root
            .get("schema_version")
            .and_then(Json::as_str)
            .unwrap_or("")
            .to_string(),
        source: root
            .get("source")
            .and_then(|s| s.get("name"))
            .and_then(Json::as_str)
            .unwrap_or("")
            .to_string(),
        accessed_date: root
            .get("source")
            .and_then(|s| s.get("accessed_date"))
            .and_then(Json::as_str)
            .unwrap_or("")
            .to_string(),
        verified: false,
    };

    let empty = Vec::new();
    let items = root
        .get("items")
        .and_then(Json::as_array)
        .unwrap_or(&empty);

    let mut lines = Vec::new();
    let mut skipped = 0usize;
    for (i, item) in items.iter().enumerate() {
        match parse_item(item, i, &provenance) {
            Some(line) => lines.push(line),
            None => skipped += 1,
        }
    }

    Dataset {
        provenance,
        lines,
        skipped,
    }
}

fn parse_item(item: &Json, idx: usize, prov: &Provenance) -> Option<CrisisLine> {
    if !item.is_object() {
        return None; // not an object → not a line
    }

    let name = str_field(item.get("name"));
    let operator = str_field(item.get("operator"));
    let focus_text = str_field(item.get("focus"));

    let cats: Vec<String> = item
        .get("categories")
        .and_then(Json::as_array)
        .map(|a| {
            a.iter()
                .filter_map(|c| c.as_str().map(|s| s.trim().to_string()))
                .collect()
        })
        .unwrap_or_default();
    let (scope, audiences, cost) = demux_categories(&cats);

    let contacts = item.get("contacts");
    let channels = build_channels(contacts);
    let notes = item
        .get("notes")
        .and_then(Json::as_str)
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let web = contacts
        .and_then(|c| c.get("web"))
        .and_then(Json::as_str)
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty());
    let social = contacts
        .and_then(|c| c.get("social"))
        .and_then(Json::as_array)
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    Some(CrisisLine {
        id: format!("capld-{idx}"),
        name,
        operator,
        focus_text,
        audiences,
        scope,
        channels,
        cost,
        notes,
        web,
        social,
        provenance: prov.clone(),
    })
}

fn str_field(v: Option<&Json>) -> String {
    v.and_then(Json::as_str).unwrap_or("").trim().to_string()
}

fn demux_categories(cats: &[String]) -> (Scope, BTreeSet<Audience>, Cost) {
    let mut scope: Option<Scope> = None;
    let mut audiences: BTreeSet<Audience> = BTreeSet::new();
    let mut cost = Cost::Unknown;

    for c in cats {
        let cs = c.as_str();
        // --- cost ---
        if cs == "Volání bezplatné" {
            cost = Cost::Free;
            continue;
        }
        if cs == "Volání dle běžného tarifu" {
            if cost == Cost::Unknown {
                cost = Cost::StandardTariff;
            }
            continue;
        }
        // --- scope (National wins over Region wins over City) ---
        if cs == "Celorepublikové" {
            scope = Some(Scope::National);
            continue;
        }
        if KRAJS.contains(&cs) {
            if !matches!(scope, Some(Scope::National)) {
                scope = Some(Scope::Region(c.clone()));
            }
            continue;
        }
        if CITIES.contains(&cs) {
            if scope.is_none() {
                scope = Some(Scope::City(c.clone()));
            }
            continue;
        }
        // --- audience ---
        if let Some(a) = audience_from(cs) {
            audiences.insert(a);
            continue;
        }
        // --- channel/cost descriptors: ignore for the audience axis ---
        if CHANNEL_COST_TAGS.contains(&cs) {
            continue;
        }
        // --- truly unknown category: preserve, never drop ---
        audiences.insert(Audience::Other(c.clone()));
    }

    // Default scope, when no scope tag was present, is National: the safest choice
    // for "always reachable" — a region filter never excludes it.
    (scope.unwrap_or(Scope::National), audiences, cost)
}

fn audience_from(c: &str) -> Option<Audience> {
    Some(match c {
        "Celá populace" => Audience::GeneralPopulation,
        "Dospělí" => Audience::Adults,
        "Děti a dospívající" => Audience::ChildrenYouth,
        "Rodiče a škola" => Audience::Parents,
        "Senioři" => Audience::Seniors,
        "Ženy a dívky" => Audience::WomenGirls,
        "Oběti trestných činů a domácího násilí" => Audience::ViolenceVictims,
        "Lidé s duševním onemocněním" => Audience::MentalIllness,
        "Zdravotníci" => Audience::HealthcareWorkers,
        "Blízcí pacientů" => Audience::PatientsFamilies,
        "Příslušníci bezpečnostních sborů" => Audience::SecurityForces,
        "Osoby zdravotně znevýhodněné" => Audience::HealthDisadvantaged,
        "Oblast vězeňství" => Audience::Prison,
        "Cizinci" => Audience::Foreigners,
        _ => return None,
    })
}

fn build_channels(contacts: Option<&Json>) -> Vec<Channel> {
    let mut channels = Vec::new();
    let c = match contacts {
        Some(c) => c,
        None => return channels,
    };

    // Phone — a line MAY have zero phones (then no phone channel).
    let phones: Vec<PhoneNumber> = c
        .get("phones")
        .and_then(Json::as_array)
        .map(|a| a.iter().filter_map(parse_phone).collect())
        .unwrap_or_default();
    if !phones.is_empty() {
        let raw = str_field(c.get("phone_hours"));
        let parsed = parse_hours(&raw);
        channels.push(Channel::Phone {
            numbers: phones,
            hours: Hours { raw, parsed },
        });
    }

    // Chat.
    if let Some(chat) = c.get("chat") {
        if !chat.is_null() {
            if let Some(url) = chat.get("url").and_then(Json::as_str) {
                let raw = str_field(chat.get("hours"));
                let parsed = parse_hours(&raw);
                channels.push(Channel::Chat {
                    url: url.to_string(),
                    hours: Hours { raw, parsed },
                });
            }
        }
    }

    // Email — ONLY from email_counseling. NEVER from contact_emails (admin inboxes).
    let emails: Vec<String> = c
        .get("email_counseling")
        .and_then(Json::as_array)
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(|s| s.trim().to_string()))
                .filter(|s| !s.is_empty())
                .collect()
        })
        .unwrap_or_default();
    if !emails.is_empty() {
        channels.push(Channel::Email { addresses: emails });
    }

    channels
}

fn parse_phone(v: &Json) -> Option<PhoneNumber> {
    let num = v.get("number").and_then(Json::as_str)?.trim().to_string();
    if num.is_empty() {
        return None;
    }
    let label = v
        .get("label")
        .and_then(Json::as_str)
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let tel = tel_normalize(&num);
    Some(PhoneNumber {
        tel,
        display: num,
        label,
    })
}

/// Dial-safe form: keep digits and a leading `+`; drop spaces/separators. EU short
/// codes (`116 111`) become `116111`, still dialable, with `display` preserved.
fn tel_normalize(num: &str) -> String {
    num.chars()
        .filter(|c| c.is_ascii_digit() || *c == '+')
        .collect()
}
