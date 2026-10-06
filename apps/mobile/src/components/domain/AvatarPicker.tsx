import { useState } from "react";
import { Alert, Linking, Platform, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { spacing } from "@techrat/theme";
import type { UserSummary } from "@techrat/types";
import { useApi } from "@/lib/api-context";
import { AVATAR_TEXT, pickAvatar, removeAvatar, type AvatarSource } from "@/lib/avatar";
import { qk } from "@/lib/queries";
import { Button } from "@/components/ui";

/**
 * Profile photo actions: pick from the gallery or take a photo (then crop it on the next screen), or remove it.
 * Inline buttons instead of an alert menu, because Android alerts hold at most three buttons.
 */
export function AvatarPicker({ user }: { user: UserSummary }) {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function choose(source: AvatarSource) {
    const result = await pickAvatar(source);
    if (result.kind === "picked") {
      router.push({ pathname: "/avatar-crop", params: { uri: result.uri, width: String(result.width), height: String(result.height) } });
    } else if (result.kind === "denied") {
      Alert.alert(AVATAR_TEXT.deniedTitle[source], AVATAR_TEXT.deniedText[source], [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ]);
    } else if (result.kind === "invalid") {
      Alert.alert(AVATAR_TEXT.invalidTitle, AVATAR_TEXT[result.problem]);
    }
  }

  async function remove() {
    setRemoving(true);
    try {
      qc.setQueryData(qk.me, await removeAvatar(api));
      void qc.invalidateQueries({ queryKey: ["profile"] });
      void qc.invalidateQueries({ queryKey: ["leaderboard"] });
    } catch {
      Alert.alert(AVATAR_TEXT.uploadFailedTitle, AVATAR_TEXT.removeFailed);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <View style={styles.row}>
      <Button label="Gallery" icon="images-outline" variant="secondary" accessibilityLabel="Choose a photo from your gallery"
        onPress={() => void choose("library")} style={styles.button} />
      {Platform.OS !== "web" && (
        <Button label="Camera" icon="camera-outline" variant="secondary" accessibilityLabel="Take a photo"
          onPress={() => void choose("camera")} style={styles.button} />
      )}
      {!!user.avatarUrl && (
        <Button label="Remove" icon="trash-outline" variant="ghost" accessibilityLabel="Remove photo" loading={removing}
          onPress={() => void remove()} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  button: { flexGrow: 1 },
});
