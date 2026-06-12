/* Dnes — domovská obrazovka. Stavy jsou datové: bez WHO-5 měření se místo
   procenta zobrazí výzva k prvnímu dotazníku (varianta „první den“),
   po dnešním zápisu se check-in karta změní na shrnutí. */
import { Badge, Button, Card, Icon, ListItem, ProgressRing } from "../ds/index.js";
import { LumiHeader, SectionLabel } from "../components/Header.jsx";
import MoodShape from "../components/MoodShape.jsx";
import { MOOD_BY_ID, czGreeting, czToday, latestWho5, who5HomeText } from "../model.js";

export default function HomeScreen({ name, todayEntry, who5, onStartCheckin, onOpenCalm, onOpenHelp, onOpenStats }) {
  const mood = todayEntry ? MOOD_BY_ID[todayEntry.mood] : null;
  const measurement = latestWho5(who5);
  return (
    <main className="app-scroll">
      <LumiHeader kicker={czToday()} title={czGreeting(name)} />

      {/* Check-in karta (dominantní) */}
      {todayEntry ? (
        <Card variant="sunken">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MoodShape mood={mood} size={22} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 15 }}>
                Dnes zapsáno: {mood.name}
                {todayEntry.words && todayEntry.words.length ? ` · ${todayEntry.words.join(", ")}` : ""}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-700)" }}>v {todayEntry.time} · záznam najdeš v Přehledech</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Button variant="ghost" size="sm" onClick={onStartCheckin}>Přidat další zápis</Button>
          </div>
        </Card>
      ) : (
        <Card variant="ink">
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 21, marginBottom: 4 }}>Jak se dnes cítíš?</div>
          <p style={{ margin: "0 0 16px", fontSize: 14.5, color: "rgba(255,248,236,0.82)", lineHeight: 1.5 }}>
            Krátký check-in pomáhá najít, co ti dělá dobře.
          </p>
          <Button variant="soft" onClick={onStartCheckin}>Začít check-in</Button>
        </Card>
      )}

      {/* Wellbeing index */}
      {measurement ? (
        <Card onClick={onOpenStats}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ProgressRing value={measurement.score / 100} size={78} label={`${measurement.score} %`} sublabel="wellbeing" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 15 }}>Wellbeing index</div>
              <div style={{ fontSize: 13.5, color: "var(--ink-700)", lineHeight: 1.45 }}>{who5HomeText(who5)}</div>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ProgressRing value={0} size={78} label="—" sublabel="wellbeing" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 15 }}>Wellbeing index</div>
              <div style={{ fontSize: 13.5, color: "var(--ink-700)", lineHeight: 1.45, margin: "2px 0 10px" }}>
                Krátký dotazník (5 otázek) ti nastaví výchozí bod. Bez známek, bez porovnávání.
              </div>
              <Button variant="secondary" size="sm" onClick={onOpenStats}>Vyplnit první dotazník</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Pro tebe */}
      <div>
        <SectionLabel>Pro tebe</SectionLabel>
        <Card style={{ padding: "8px 12px", marginTop: 6 }}>
          <ListItem
            icon="wind"
            title="Dechové cvičení 4-7-8"
            subtitle="Pomáhá při napětí"
            trailing={<Badge tone="accent">3 min</Badge>}
            onClick={onOpenCalm}
          />
          <ListItem
            icon="notebook-pen"
            iconTint="var(--positive-soft)"
            iconColor="var(--sage-700)"
            title="Večerní zápis do deníku"
            subtitle="Na co dnes nechceš zapomenout?"
            onClick={onStartCheckin}
          />
          <ListItem
            icon="moon"
            iconTint="var(--lilac-100)"
            iconColor="var(--lilac-700)"
            title="Klidné usínání"
            subtitle="Zvuky a audio na dobrou noc"
            trailing={<Badge tone="lilac">večer</Badge>}
            onClick={onOpenCalm}
          />
        </Card>
      </div>

      {/* Krizová karta — jemně odlišená, ne alarmující */}
      <section style={{ background: "var(--danger-soft)", borderRadius: "var(--radius-lg)", padding: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--clay-700)", marginBottom: 6 }}>
          <Icon name="heart-handshake" size={20} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17 }}>Není ti dobře?</span>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 15, color: "var(--text-body)", lineHeight: 1.55 }}>
          Pomoc je tu pořád — nemusíš na nic čekat.
        </p>
        <Button variant="crisis" onClick={onOpenHelp}>
          <Icon name="heart-handshake" size={18} /> Otevřít Pomoc
        </Button>
      </section>
    </main>
  );
}
