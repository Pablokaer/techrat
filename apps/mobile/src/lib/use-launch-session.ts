import { useRouter } from "expo-router";
import type { StartPracticeRequest } from "@techrat/types";
import { errorMessage } from "@/components/ui";
import { useStartSession } from "./queries";

/** Starts a session (practice body or "daily") and opens the question screen. */
export function useLaunchSession() {
  const router = useRouter();
  const mutation = useStartSession();
  return {
    launch: (body: StartPracticeRequest | "daily", opts?: { replace?: boolean }) =>
      mutation.mutate(body, {
        onSuccess: (s) => (opts?.replace ? router.replace(`/session/${s.id}`) : router.push(`/session/${s.id}`)),
      }),
    pending: mutation.isPending,
    /** The body of the in-flight request (to show a spinner on the right button). */
    pendingBody: mutation.isPending ? mutation.variables : undefined,
    error: mutation.error ? errorMessage(mutation.error, "Could not start the session") : null,
  };
}
