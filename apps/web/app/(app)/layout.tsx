import type { Metadata } from "next";
import { AppShell } from "@/components/shell";

/** Everything here needs a signed-in learner: a crawler would only see an empty shell, so keep it out of the index. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
