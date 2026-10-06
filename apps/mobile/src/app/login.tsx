import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { spacing } from "@techrat/theme";
import { loginSchema } from "@techrat/validation";
import { useAuth } from "@/lib/auth";
import { AppText, Button, Screen, TextField } from "@/components/ui";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { useForm } from "@/components/auth/useForm";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const form = useForm(loginSchema, { email: "", password: "" });

  return (
    <Screen>
      <AuthHeader subtitle="Sign in to keep your streak alive." />
      <View style={styles.form}>
        <TextField label="Email" value={form.values.email} onChangeText={form.set("email")} error={form.errors.email}
          autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <TextField label="Password" value={form.values.password} onChangeText={form.set("password")} error={form.errors.password}
          secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={() => void form.submit((d) => signIn(d.email, d.password))} />
        {form.formError && <AppText tone="error" accessibilityRole="alert">{form.formError}</AppText>}
        <Button label="Sign in" icon="log-in-outline" loading={form.submitting} onPress={() => void form.submit((d) => signIn(d.email, d.password))} />
        <Button label="Create an account" variant="ghost" onPress={() => router.push("/register")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
