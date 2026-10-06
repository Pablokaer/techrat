import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { colors } from "@techrat/theme";

/** Opens documentation in an in-app browser, falling back to the system browser. */
export async function openReference(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, { toolbarColor: colors.background, controlsColor: colors.primary });
  } catch {
    await Linking.openURL(url);
  }
}
