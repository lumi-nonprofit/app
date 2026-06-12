/* Pomoc — krizová intervence. Primární linka podle věku z onboardingu,
   druhá vždy viditelná hned pod ní; tlačítka volají přes tel: odkazy.
   Krizový register: konkrétně, čísla a akce napřed, žádný alarm. */
import { Badge, Button, Card, Icon, ListItem } from "../ds/index.js";
import { LumiHeader, SectionLabel } from "../components/Header.jsx";
import { HELP_LINES } from "../model.js";

const telHref = (phone) => `tel:${phone.replace(/\s/g, "")}`;

function LineRow({ line, primary }) {
  return (
    <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-md)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: primary ? 18 : 15.5, color: "var(--text-strong)" }}>
            {line.name}
          </span>
          {primary ? <Badge tone="danger">tvoje linka</Badge> : null}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-700)", marginTop: 2 }}>{line.meta}</div>
      </div>
      <Button variant={primary ? "crisis" : "secondary"} size={primary ? "md" : "sm"} href={telHref(line.phone)}>
        <Icon name="phone" size={17} /> Zavolat {line.phone}
      </Button>
    </div>
  );
}

export default function HelpScreen({ age, onOpenCalm }) {
  const primary = age === "plus27" ? HELP_LINES.plus27 : HELP_LINES.u26;
  const secondary = age === "plus27" ? HELP_LINES.u26 : HELP_LINES.plus27;
  return (
    <main className="app-scroll">
      <LumiHeader kicker="Pomoc" title="Jsme tu s tebou" />

      {/* krizová karta — primární linka podle věku z onboardingu */}
      <section style={{ background: "var(--danger-soft)", borderRadius: "var(--radius-lg)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--clay-700)", padding: "2px 4px 0" }}>
          <Icon name="heart-handshake" size={20} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17 }}>Potřebuješ si promluvit hned?</span>
        </div>
        <LineRow line={primary} primary />
        <LineRow line={secondary} />
        <p style={{ margin: 0, padding: "2px 4px 4px", fontSize: 13.5, fontWeight: 600, color: "var(--clay-700)", lineHeight: 1.5 }}>
          Při bezprostředním ohrožení života volej 155 nebo 112.
        </p>
      </section>

      {/* krizový plán — rozcestník, detailní obrazovky budou doplněny */}
      <Card style={{ padding: "16px 12px 8px" }}>
        <div style={{ padding: "0 8px 6px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--text-strong)" }}>Můj krizový plán</div>
          <div style={{ fontSize: 13.5, color: "var(--ink-700)", marginTop: 2 }}>Připrav si kroky, dokud je klid.</div>
        </div>
        <ListItem icon="eye" title="Moje varovné signály" subtitle="Podle čeho poznám, že se to horší" onClick={() => {}} />
        <ListItem
          icon="heart"
          iconTint="var(--positive-soft)"
          iconColor="var(--sage-700)"
          title="Co mi pomáhá"
          subtitle="Ověřené kroky a činnosti"
          onClick={() => {}}
        />
        <ListItem
          icon="users"
          iconTint="var(--info-soft)"
          iconColor="var(--lake-700)"
          title="Na koho se obrátím"
          subtitle="Blízcí lidé a kontakty"
          onClick={() => {}}
        />
      </Card>

      {/* rychlé zklidnění */}
      <Card style={{ padding: "8px 12px" }}>
        <ListItem icon="wind" title="Rychlé zklidnění" subtitle="Dech a uzemnění na 2 minuty" trailing={<Badge tone="accent">2 min</Badge>} onClick={onOpenCalm} />
      </Card>

      {/* rozcestník */}
      <div>
        <SectionLabel>Co dělat, když…</SectionLabel>
        <Card style={{ padding: "8px 12px", marginTop: 6 }}>
          <ListItem icon="cloud" iconTint="var(--info-soft)" iconColor="var(--lake-700)" title="…přijde úzkost" subtitle="Krátké kroky pro tady a teď" onClick={() => {}} />
          <ListItem icon="waves" iconTint="var(--info-soft)" iconColor="var(--lake-700)" title="…přijde panika" subtitle="Co dělat během vlny" onClick={() => {}} />
          <ListItem icon="cloud-rain" iconTint="var(--info-soft)" iconColor="var(--lake-700)" title="…jsou myšlenky těžké" subtitle="Nejsi v tom — kde hledat oporu" onClick={() => {}} />
        </Card>
      </div>

      {/* kontakty */}
      <div>
        <SectionLabel>Kontakty</SectionLabel>
        <Card style={{ padding: "8px 12px", marginTop: 6 }}>
          <ListItem
            icon="phone"
            iconTint="var(--danger-soft)"
            iconColor="var(--clay-700)"
            title="Linka bezpečí · 116 111"
            subtitle="nonstop, zdarma · děti a studenti do 26 let"
            href={telHref("116 111")}
          />
          <ListItem
            icon="phone"
            iconTint="var(--danger-soft)"
            iconColor="var(--clay-700)"
            title="Linka první psychické pomoci · 116 123"
            subtitle="nonstop, zdarma · dospělí"
            href={telHref("116 123")}
          />
          <ListItem
            icon="phone"
            iconTint="var(--danger-soft)"
            iconColor="var(--clay-700)"
            title="Rodičovská linka · 606 021 021"
            subtitle="Po–Pá 9–21 · rodiče a blízcí dětí"
            href={telHref("606 021 021")}
          />
          <ListItem
            icon="message-circle"
            iconTint="var(--positive-soft)"
            iconColor="var(--sage-700)"
            title="Chat Linky bezpečí"
            subtitle="denně 9–13 a 15–19 · když se nechce mluvit"
            onClick={() => {}}
          />
        </Card>
      </div>
    </main>
  );
}
