/* Custom tags (Settings): a list with a Delete button, the alternative without a gesture to the
   long press of a chip in the check-in (HIG Gestures: a button next to each gesture). A platform
   dialog confirms the deletion; the entries that use the tag stay unchanged. */
import React from "react";
import { View } from "react-native";
import { Button, Card, Text } from "../../ds";
import { SectionLabel } from "../../components/Header";
import { useDb, useDbVersion } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import { deleteCustomTag, listCustomTags, type Tag } from "../../db/repo";
import { useTranslation } from "../../i18n";
import { announce } from "../../lib/a11y";
import { confirmDelete } from "../../lib/dialogs";
import { createThemedStyles } from "../../theme";

export default function TagsSection() {
  const { t } = useTranslation(["settings", "common"]);
  const db = useDb();
  const write = useDbWriter();
  const { version } = useDbVersion();
  const styles = useStyles();
  const tags = React.useMemo(() => {
    void version; /* A write raises the version, which runs the query again. */
    return listCustomTags(db);
  }, [db, version]);

  const remove = (tag: Tag) => {
    confirmDelete({
      title: t("tags.delete.title", { label: tag.label }),
      message: t("tags.delete.message"),
    })
      .then((ok) => {
        if (ok) {
          write((d) => deleteCustomTag(d, tag.id));
          announce(t("tags.delete.announce", { label: tag.label }));
        }
      })
      .catch(() => {});
  };

  return (
    <View>
      <SectionLabel>{t("tags.title")}</SectionLabel>
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
                accessibilityLabel={t("tags.delete.a11yLabel", { label: tag.label })}
                onPress={() => remove(tag)}
              >
                {t("common:actions.delete")}
              </Button>
            </View>
          ))
        ) : (
          <Text variant="subheadline" color="textMuted">
            {t("tags.empty")}
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
