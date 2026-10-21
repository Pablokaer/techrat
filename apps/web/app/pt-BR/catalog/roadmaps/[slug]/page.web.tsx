import type { Metadata } from "next";
import { RoadmapPage, roadmapPageMetadata } from "@/components/public-catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return roadmapPageMetadata("pt-BR", (await params).slug);
}

export default async function RoadmapRoute({ params }: Props) {
  return RoadmapPage({ locale: "pt-BR", slug: (await params).slug });
}
