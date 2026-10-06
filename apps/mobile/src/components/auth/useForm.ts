import { useState } from "react";
import type { z } from "zod";
import { isApiError } from "@techrat/api";
import { fieldErrors } from "@techrat/validation";
import { errorMessage } from "@/components/ui";

/**
 * Minimal form state for auth screens: client validation with the shared zod schema,
 * then server problem-details mapped onto fields (camelCase keys) or a form-level message.
 */
export function useForm<In extends Record<string, string | undefined>, Out>(schema: z.ZodType<Out, In>, initial: In) {
  const [values, setValues] = useState<In>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof In & string) => (text: string) => {
    setValues((v) => ({ ...v, [key]: text }));
    setErrors(({ [key]: _removed, ...rest }) => rest);
  };

  async function submit(action: (data: Out) => Promise<void>) {
    setFormError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setSubmitting(true);
    try {
      await action(parsed.data);
    } catch (e) {
      if (isApiError(e) && e.errors) {
        const mapped: Record<string, string> = {};
        for (const [k, msgs] of Object.entries(e.errors)) {
          const key = k.charAt(0).toLowerCase() + k.slice(1);
          if (msgs[0]) mapped[key in values ? key : "form"] = msgs[0];
        }
        setErrors(mapped);
        setFormError(mapped.form ?? (Object.keys(mapped).length ? null : errorMessage(e)));
      } else if (isApiError(e, 401)) {
        setFormError("Incorrect email or password.");
      } else {
        setFormError(errorMessage(e, "Could not reach the server. Please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return { values, errors, formError, submitting, set, submit };
}
