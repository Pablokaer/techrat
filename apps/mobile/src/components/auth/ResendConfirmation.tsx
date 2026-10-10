import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { spacing } from "@techrat/theme";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { AppText, Button } from "@/components/ui";

/**
 * "Resend the email" action shared by the register confirmation state and the login 403 notice. The API answers 202
 * whether or not the address has an account, so the "sent" text is deliberately conditional ("if the address...").
 */
export function ResendConfirmation({ email, label }: { email: string; label: string }) {
  const { resendConfirmation } = useAuth();
  const t = useT().emailConfirmation;
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function resend() {
    setState("sending");
    try {
      await resendConfirmation(email);
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  return (
    <View style={styles.box}>
      <Button label={label} variant="secondary" icon="mail-outline" loading={state === "sending"} onPress={() => void resend()} />
      {state === "sent" && <AppText tone="secondary" accessibilityRole="alert">{t.resendSent}</AppText>}
      {state === "failed" && <AppText tone="error" accessibilityRole="alert">{t.resendFailed}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({ box: { gap: spacing.md } });
