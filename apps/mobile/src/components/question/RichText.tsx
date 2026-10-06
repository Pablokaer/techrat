import { ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { colors, radii, spacing } from "@techrat/theme";
import { splitBlocks, splitInlineCode } from "@/lib/rich-text";
import { monoFont, tints } from "@/components/ui";

/** Renders question/explanation text with code blocks and `inline code`. Never interprets HTML. */
export function RichText({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  return (
    <View style={styles.wrap}>
      {splitBlocks(text).map((b, i) =>
        b.code ? (
          <ScrollView key={i} horizontal style={styles.codeBox} contentContainerStyle={styles.codeContent}>
            <Text style={styles.code} selectable>{b.text}</Text>
          </ScrollView>
        ) : (
          <Text key={i} style={[styles.prose, style]}>
            {splitInlineCode(b.text).map((p, j) => (p.code ? <Text key={j} style={styles.inline}>{p.text}</Text> : p.text))}
          </Text>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  prose: { color: colors.text, fontSize: 15, lineHeight: 22 },
  inline: { fontFamily: monoFont, color: colors.primary, backgroundColor: tints.subtle },
  codeBox: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
  codeContent: { padding: spacing.md },
  code: { fontFamily: monoFont, fontSize: 13, lineHeight: 20, color: colors.primary },
});
