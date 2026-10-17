/* Vlastní štítky (Nastavení): seznam s tlačítkem Smazat — negestová
   alternativa k dlouhému podržení chipu v check-inu (HIG Gestures: ke každému
   gestu tlačítko). Mazání potvrzuje platformní dialog; záznamy, kde je štítek
   použitý, zůstávají beze změny. */
import React from "react";
import { View } from "react-native";
import { Button, Card, Text } from "../../ds";
import { SectionLabel } from "../../components/Header";
import { useDb, useDbVersion } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import { deleteCustomTag, listCustomTags, type Tag } from "../../db/repo";
import { confirmDelete } from "../../lib/dialogs";
import { createThemedStyles } from "../../theme";

export default function TagsSection() {
  const db = useDb();
  const write = useDbWriter();
  const { version } = useDbVersion();
  const styles = useStyles();
  const tags = React.useMemo(() => {
    void version; // zápis zvyšuje verzi → vynucený re-query
    return listCustomTags(db);
  }, [db, version]);

  const remove = (tag: Tag) => {
    confirmDelete({
      title: `Smazat štítek „${tag.label}“?`,
      message: "Záznamy, kde už je použitý, zůstanou beze změny.",
    })
      .then((ok) => {
        if (ok) write((d) => deleteCustomTag(d, tag.id));
      })
      .catch(() => {});
  };

  return (
    <View>
      <SectionLabel>Vlastní štítky</SectionLabel>
      <Card style={styles.card}>
        {tags.length ? (
          tags.map((tag, i) => (
            <View key={tag.id} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text variant="body" color="textStrong" style={styles.label}>
                {tag.label}
              </Text>
              <Button
                variant="ghost"
                size="sm"
                accessibilityLabel={`Smazat štítek ${tag.label}`}
                onPress={() => remove(tag)}
              >
                Smazat
              </Button>
            </View>
          ))
        ) : (
          <Text variant="subheadline" color="textMuted">
            Vlastní štítky přidáš v check-inu u otázky „Co s tím souvisí?“.
          </Text>
        )}
      </Card>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  card: { marginTop: 6, paddingVertical: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: t.platform.listRowMinHeight,
    paddingVertical: 4,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: t.colors.borderSubtle },
  label: { flex: 1 },
}));
