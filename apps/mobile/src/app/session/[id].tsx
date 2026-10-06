import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSession } from "@/lib/queries";
import { useLaunchSession } from "@/lib/use-launch-session";
import { ErrorState, LoadingState, Screen } from "@/components/ui";
import { QuestionPlayer } from "@/components/question/QuestionPlayer";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session, isLoading, error, refetch } = useSession(id);
  const { launch, pending } = useLaunchSession();

  if (isLoading) return <LoadingState label="Loading session" />;
  if (error || !session) return <ErrorState error={error} retry={() => void refetch()} />;

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: session.isDailyChallenge ? "Daily Challenge" : session.topicName ?? "Practice" }} />
      <QuestionPlayer
        key={session.id}
        session={session}
        onExit={() => router.navigate("/")}
        restarting={pending}
        onPracticeAgain={
          session.mode === "DailyChallenge"
            ? undefined
            : () =>
                launch(
                  session.roadmapStepId
                    ? { mode: "Roadmap", roadmapStepId: session.roadmapStepId }
                    : { mode: session.mode, topicSlug: session.topicSlug, subtopicSlug: session.subtopicSlug, difficulty: session.difficulty, count: session.totalQuestions },
                  { replace: true },
                )
        }
      />
    </Screen>
  );
}
