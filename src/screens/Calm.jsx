/* Klid — dechový launcher, seznam aktivit, Večerka. */
import React from "react";
import { Badge, Card, ListItem } from "../ds/index.js";
import { LumiHeader } from "../components/Header.jsx";
import LumiBreath from "../components/Breath.jsx";

export default function CalmScreen() {
  const [breathing, setBreathing] = React.useState(false);
  return (
    <main className="app-scroll">
      <LumiHeader kicker="Klid" title="Na chvilku se zastav" />

      {/* dechový launcher */}
      <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px 22px" }}>
        <button
          type="button"
          className="lumi-breath-btn"
          aria-pressed={breathing}
          aria-label={breathing ? "Zastavit dýchání" : "Začít dýchat"}
          onClick={() => setBreathing((b) => !b)}
        >
          <LumiBreath size={150} active={breathing} hint={breathing ? "4 s nádech · 4 s výdech" : "Klepni a dýchej se mnou"} />
        </button>
      </Card>

      <Card style={{ padding: "8px 12px" }}>
        <ListItem icon="wind" title="Dech 4-7-8" subtitle="Při napětí a úzkosti" trailing={<Badge tone="accent">3 min</Badge>} onClick={() => {}} />
        <ListItem icon="audio-lines" title="Tichá louka" subtitle="Vedená meditace · čeština" trailing={<Badge tone="accent">10 min</Badge>} onClick={() => {}} />
        <ListItem
          icon="footprints"
          iconTint="var(--positive-soft)"
          iconColor="var(--sage-700)"
          title="Všímavá procházka"
          subtitle="Meditace v pohybu"
          trailing={<Badge tone="positive">venku</Badge>}
          onClick={() => {}}
        />
      </Card>

      {/* Večerka — lilac je v DS vyhrazený pro spánek/večer */}
      <section style={{ background: "var(--lilac-100)", borderRadius: "var(--radius-lg)", padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--lilac-700)" }}>Večerka</span>
          <Badge tone="lilac">od 21:00</Badge>
        </div>
        <p style={{ margin: 0, fontSize: 14.5, color: "var(--text-body)", lineHeight: 1.55 }}>
          Klidné usínání — zvuky deště, pomalé dýchání a audio na dobrou noc.
        </p>
      </section>
    </main>
  );
}
