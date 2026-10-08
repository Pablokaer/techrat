import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { isApiError } from "@techrat/api";
import { colors, radii, spacing } from "@techrat/theme";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { usePasswordStatus } from "@/lib/queries";
import { AppText, Button, ErrorState, LoadingState, Screen, TextField } from "@/components/ui";

/**
 * Permanent account deletion (required by Google Play). Accounts with a password prove it with the password, the
 * ones created through an external provider type their own username. Nothing is sent before a second, explicit
 * confirmation: an inline step (not a system Alert) so it is accessible, themed and testable.
 *
 * There is no navigation on success: the session drops the stored tokens, `AuthProvider` sees the sign-out and the
 * route guard in `_layout.tsx` sends the app back to the login screen. The form is cleared first so no credential
 * is left in memory or on screen.
 */
export function DeleteAccountScreen() {
  const t = useT().deleteAccount;
  const { deleteAccount } = useAuth();
  const status = usePasswordStatus();
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (status.isLoading) return <LoadingState label={t.loading} />;
  if (!status.data) return <ErrorState error={status.error} retry={() => void status.refetch()} />;
  const hasPassword = status.data.hasPassword;

  function change(text: string) {
    setValue(text);
    setFieldError(undefined);
    setFormError(undefined);
  }

  function ask() {
    setFormError(undefined);
    if (!value.trim()) {
      setFieldError(hasPassword ? t.passwordRequired : t.usernameRequired);
      return;
    }
    setFieldError(undefined);
    setConfirming(true);
  }

  async function confirm() {
    setDeleting(true);
    try {
      await deleteAccount(hasPassword ? value : null, hasPassword ? null : value.trim());
      setValue("");
    } catch (err) {
      setConfirming(false);
      if (isApiError(err, 409)) setFormError(t.lastAdmin);
      else if (isApiError(err, 429)) setFormError(t.tooManyAttempts);
      else if (isApiError(err) && err.errors) {
        const message = (hasPassword ? err.errors.password : err.errors.confirmation)?.[0] ?? Object.values(err.errors)[0]?.[0];
        if (message) setFieldError(message);
        else setFormError(t.failed);
      } else setFormError(t.failed);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.form}>
        <AppText variant="subheading" tone="error" accessibilityRole="header">{t.intro}</AppText>
        <View style={styles.list} accessible={false}>
          <AppText variant="subheading">{t.deletedHeading}</AppText>
          {t.deletedItems.map((item) => <AppText key={item} tone="secondary">{`• ${item}`}</AppText>)}
        </View>
        <AppText tone="secondary">{t.noRecovery}</AppText>

        <TextField
          label={hasPassword ? t.passwordLabel : t.usernameLabel}
          value={value}
          onChangeText={change}
          error={fieldError}
          editable={!deleting}
          {...(hasPassword
            ? { revealable: true, autoComplete: "current-password" as const, textContentType: "password" as const }
            : { autoCapitalize: "none" as const, autoCorrect: false, autoComplete: "username" as const, textContentType: "username" as const })}
        />
        {!fieldError && <AppText variant="caption" tone="muted">{hasPassword ? t.passwordHint : t.usernameHintGeneric}</AppText>}
        {!!formError && <AppText tone="error" accessibilityLiveRegion="polite" accessibilityRole="alert">{formError}</AppText>}

        {confirming ? (
          <View style={styles.confirm} accessibilityLiveRegion="polite">
            <AppText variant="heading" tone="error" accessibilityRole="header">{t.confirmTitle}</AppText>
            <AppText>{t.confirmBody}</AppText>
            <Button label={t.confirmButton} variant="danger" icon="trash-outline" loading={deleting} onPress={() => void confirm()} />
            <Button label={t.cancelButton} variant="secondary" disabled={deleting} onPress={() => setConfirming(false)} />
          </View>
        ) : (
          <Button label={t.deleteButton} variant="danger" icon="trash-outline" accessibilityHint={t.deleteButtonHint} onPress={ask} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  list: { gap: spacing.xs },
  confirm: { gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.error, backgroundColor: colors.card },
});
