import { StyleSheet, View } from "react-native";
import { spacing } from "@techrat/theme";
import { registerSchema } from "@techrat/validation";
import { useAuth } from "@/lib/auth";
import { PRIVACY_URL, TERMS_URL } from "@/lib/config";
import { useT } from "@/lib/i18n";
import { openReference } from "@/lib/links";
import { AppText, Button, Screen, TextField } from "@/components/ui";
import { useForm } from "@/components/auth/useForm";

export default function RegisterScreen() {
  const { register } = useAuth();
  const legal = useT().legal;
  const form = useForm(registerSchema, { email: "", username: "", displayName: "", password: "" });
  const submit = () => void form.submit((d) => register(d));

  return (
    <Screen edges={[]}>
      <AppText tone="secondary">Join TechRat and start earning XP for everything you learn.</AppText>
      <View style={styles.form}>
        <TextField label="Email" value={form.values.email} onChangeText={form.set("email")} error={form.errors.email}
          autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <TextField label="Username" value={form.values.username} onChangeText={form.set("username")} error={form.errors.username}
          autoCapitalize="none" autoComplete="username" textContentType="username" />
        <TextField label="Display name (optional)" value={form.values.displayName ?? ""} onChangeText={form.set("displayName")} error={form.errors.displayName}
          autoComplete="name" textContentType="name" />
        <TextField label="Password" value={form.values.password} onChangeText={form.set("password")} error={form.errors.password}
          secureTextEntry autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
        <AppText variant="caption" tone="muted">At least 8 characters with an uppercase letter, a lowercase letter and a number.</AppText>
        {form.formError && <AppText tone="error" accessibilityRole="alert">{form.formError}</AppText>}
        <AppText variant="caption" tone="muted">
          {legal.consent.before}
          <AppText variant="caption" tone="primary" accessibilityRole="link" accessibilityHint={legal.openHint} onPress={() => void openReference(TERMS_URL)}>{legal.consent.terms}</AppText>
          {legal.consent.between}
          <AppText variant="caption" tone="primary" accessibilityRole="link" accessibilityHint={legal.openHint} onPress={() => void openReference(PRIVACY_URL)}>{legal.consent.privacy}</AppText>
          {legal.consent.after}
        </AppText>
        <Button label="Create account" icon="person-add-outline" loading={form.submitting} onPress={submit} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
