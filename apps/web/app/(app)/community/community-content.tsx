"use client";

import Link from "next/link";
import { Swords, Users, UsersRound } from "lucide-react";
import { Card } from "@techrat/ui";
import { PageHeader } from "@/components/widgets";
import { useT } from "@/i18n";

const SOON = [
  { key: "duels", icon: Swords },
  { key: "friends", icon: UsersRound },
  { key: "discussions", icon: Users },
] as const;

export function CommunityContent() {
  const t = useT();
  return (
    <>
      <PageHeader eyebrow={t.community.eyebrow} title={t.community.title} subtitle={t.community.subtitle} />
      <div className="grid gap-4 md:grid-cols-3">
        {SOON.map(({ key, icon: Icon }) => (
          <Card key={key} className="p-6">
            <Icon className="h-8 w-8 text-primary" aria-hidden />
            <h2 className="mt-4 font-semibold">{t.community.soon[key].title}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t.community.soon[key].text}</p>
          </Card>
        ))}
      </div>
      <Link href="/leaderboard" className="btn-primary mt-6">{t.community.openLeaderboard}</Link>
    </>
  );
}
