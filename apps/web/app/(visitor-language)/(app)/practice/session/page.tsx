"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useSession } from "@/lib/queries";
import { useT } from "@/i18n";
import { QuestionPlayer } from "@/components/question-player";
import { ErrorState, Skeleton } from "@/components/widgets";

function Session() {
  const t = useT();
  const id = useSearchParams().get("id") ?? "";
  const { data, isLoading, error } = useSession(id);
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10" /><Skeleton className="h-96" /></div>;
  if (error || !data) return <ErrorState error={error ?? new Error(t.practice.session.notFound)} />;
  return <QuestionPlayer key={data.id} session={data} />;
}

export default function SessionPage() {
  return <Suspense><Session /></Suspense>;
}
