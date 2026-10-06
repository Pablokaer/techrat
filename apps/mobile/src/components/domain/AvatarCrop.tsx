import { useMemo, useRef, useState } from "react";
import { Alert, Image, PanResponder, StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@techrat/api";
import { colors, spacing } from "@techrat/theme";
import { clampCrop, cropRect, displayScale, zoomCrop, type CropState } from "@techrat/validation";
import { useApi } from "@/lib/api-context";
import { AVATAR_TEXT, exportAvatar, uploadAvatar } from "@/lib/avatar";
import { qk } from "@/lib/queries";
import { AppText, Button, Screen } from "@/components/ui";

const ZOOM_STEP = 0.25;
const PREVIEW = 64;

function distance(e: GestureResponderEvent) {
  const [a, b] = e.nativeEvent.touches;
  return a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 0;
}

/**
 * Circular crop for the profile photo: drag to reposition, pinch (or the ± buttons) to zoom, with a live preview.
 * Uses React Native's PanResponder, so it needs no gesture-handler root. Same geometry as the web (@techrat/validation).
 */
export function AvatarCropScreen() {
  const params = useLocalSearchParams<{ uri: string; width: string; height: string }>();
  const image = useMemo(() => ({ width: Number(params.width), height: Number(params.height) }), [params.width, params.height]);
  const router = useRouter();
  const api = useApi();
  const qc = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();
  const viewport = Math.min(300, screenWidth - spacing.lg * 2);
  const [crop, setCrop] = useState<CropState>({ zoom: 1, x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const last = useRef({ dx: 0, dy: 0, pinch: 0 });

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => { last.current = { dx: 0, dy: 0, pinch: distance(e) }; },
    onPanResponderMove: (e, g) => {
      const pinch = distance(e);
      if (pinch > 0) {
        const before = last.current.pinch;
        if (before > 0) setCrop((c) => zoomCrop(c, c.zoom * (pinch / before), image, viewport));
        last.current.pinch = pinch;
      } else {
        const { dx, dy } = last.current;
        setCrop((c) => clampCrop({ ...c, x: c.x + g.dx - dx, y: c.y + g.dy - dy }, image, viewport));
        last.current.pinch = 0;
      }
      last.current.dx = g.dx;
      last.current.dy = g.dy;
    },
  }), [image, viewport]);

  async function save() {
    setSaving(true);
    try {
      const file = await exportAvatar(params.uri, cropRect(crop, image, viewport));
      qc.setQueryData(qk.me, await uploadAvatar(api, file));
      for (const queryKey of [["profile"], ["leaderboard"], qk.dashboard]) void qc.invalidateQueries({ queryKey });
      router.back();
    } catch (err) {
      Alert.alert(AVATAR_TEXT.uploadFailedTitle, (isApiError(err) && err.field("file")) || AVATAR_TEXT.uploadFailed);
      setSaving(false);
    }
  }

  const scale = displayScale(crop.zoom, image, viewport);
  const placed = (ratio: number, size: number) => ({
    width: image.width * scale * ratio,
    height: image.height * scale * ratio,
    left: size / 2 - (image.width * scale * ratio) / 2 + crop.x * ratio,
    top: size / 2 - (image.height * scale * ratio) / 2 + crop.y * ratio,
  });

  return (
    <Screen>
      <AppText tone="secondary">Drag to reposition, pinch to zoom.</AppText>
      <View style={[styles.viewport, { width: viewport, height: viewport }]} {...responder.panHandlers}
        accessibilityLabel="Photo crop area" accessibilityHint="Drag to reposition, pinch to zoom">
        <Image source={{ uri: params.uri }} style={[styles.image, placed(1, viewport)]} />
        {/* A ring as thick as the viewport darkens everything outside the circle; the viewport clips it. */}
        <View pointerEvents="none" style={[styles.mask, {
          width: viewport * 3, height: viewport * 3, borderRadius: viewport * 1.5, borderWidth: viewport, left: -viewport, top: -viewport,
        }]} />
        <View pointerEvents="none" style={[styles.circle, { width: viewport, height: viewport, borderRadius: viewport / 2 }]} />
      </View>

      <View style={styles.row}>
        <View style={styles.preview} accessibilityLabel="Preview" accessible>
          <Image source={{ uri: params.uri }} style={[styles.image, placed(PREVIEW / viewport, PREVIEW)]} />
        </View>
        <Button label="−" variant="secondary" accessibilityLabel="Zoom out" onPress={() => setCrop((c) => zoomCrop(c, c.zoom - ZOOM_STEP, image, viewport))} />
        <AppText variant="mono" style={styles.zoom}>{Math.round(crop.zoom * 100)}%</AppText>
        <Button label="+" variant="secondary" accessibilityLabel="Zoom in" onPress={() => setCrop((c) => zoomCrop(c, c.zoom + ZOOM_STEP, image, viewport))} />
      </View>

      <View style={styles.row}>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} disabled={saving} style={styles.flex} />
        <Button label={saving ? "Uploading…" : "Save photo"} loading={saving} onPress={() => void save()} style={styles.flex} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  viewport: { alignSelf: "center", overflow: "hidden", backgroundColor: "#000", borderRadius: 16 },
  image: { position: "absolute" },
  mask: { position: "absolute", borderColor: "rgba(0,0,0,0.55)" },
  circle: { position: "absolute", left: 0, top: 0, borderWidth: 2, borderColor: "rgba(255,255,255,0.8)" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  preview: { width: PREVIEW, height: PREVIEW, borderRadius: PREVIEW / 2, overflow: "hidden", borderWidth: 1, borderColor: colors.primary, backgroundColor: "#000" },
  zoom: { minWidth: 48, textAlign: "center" },
  flex: { flex: 1 },
});
