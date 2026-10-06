import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@techrat/api";
import { spacing } from "@techrat/theme";
import { changePasswordSchema, fieldErrors } from "@techrat/validation";
import { useAuth } from "@/lib/auth";
import { qk, usePasswordStatus } from "@/lib/queries";
import { AppText, Button, ErrorState, LoadingState, Screen, TextField } from "@/components/ui";

type Form = { current: string; password: string; confirm: string };
const EMPTY: Form = { current: "", password: "", confirm: "" };
const SERVER_FIELDS: Record<string, keyof Form> = { currentPassword: "current", newPassword: "password" };

/**
 * Change the password (or set one, for accounts created through an external provider). Same rules and API as the
 * web; the bearer session stores the new tokens, so this device stays signed in while the others are signed out.
 */
export function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const qc = useQueryClient();
  const status = usePasswordStatus();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form | "form", string>>>({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (status.isLoading) return <LoadingState label="Loading" />;
  if (!status.data) return <ErrorState error={status.error} retry={() => void status.refetch()} />;
  const hasPassword = status.data.hasPassword;
  const schema = changePasswordSchema(hasPassword);

  function validate(next: Form) {
    const parsed = schema.safeParse(next);
    setErrors(parsed.success ? {} : fieldErrors(parsed.error));
    return parsed.success;
  }

  function update(field: keyof Form, value: string) {
    const next = { ...form, [field]: value };
    setForm(next);
    setDone(false);
    if (submitted) validate(next);
  }

  async function submit() {
    setSubmitted(true);
    if (!validate(form)) return;
    setSaving(true);
    try {
      await changePassword(hasPassword ? form.current : null, form.password);
      setForm(EMPTY);
      setSubmitted(false);
      setDone(true);
      if (!hasPassword) void qc.invalidateQueries({ queryKey: qk.passwordStatus });
    } catch (err) {
      if (isApiError(err, 429)) setErrors({ form: "Too many attempts. Wait a minute and try again." });
      else if (isApiError(err) && err.errors)
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [SERVER_FIELDS[k] ?? k, v[0]])));
      else setErrors({ form: "Could not change the password. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.form}>
        {!hasPassword && (
          <AppText tone="secondary">Your account signs in through an external provider. Add a password to also sign in with your email.</AppText>
        )}
        {hasPassword && (
          <TextField label="Current password" revealable autoComplete="current-password" textContentType="password"
            value={form.current} onChangeText={(v) => update("current", v)} error={errors.current} />
        )}
        <TextField label="New password" revealable autoComplete="new-password" textContentType="newPassword"
          value={form.password} onChangeText={(v) => update("password", v)} error={errors.password} />
        {!errors.password && <AppText variant="caption" tone="muted">At least 8 characters, with upper and lower case letters and a number.</AppText>}
        <TextField label="Confirm new password" revealable autoComplete="new-password" textContentType="newPassword"
          value={form.confirm} onChangeText={(v) => update("confirm", v)} error={errors.confirm} />
        {!!errors.form && <AppText tone="error" accessibilityLiveRegion="polite">{errors.form}</AppText>}
        {done && <AppText tone="primary" accessibilityLiveRegion="polite">Password changed. Your other sessions were signed out.</AppText>}
        <Button label={hasPassword ? "Change password" : "Set password"} loading={saving} onPress={() => void submit()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
});
