import type { Metadata } from "next";
import { TopicPage, topicPageMetadata } from "@/components/public-catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return topicPageMetadata("pt-BR", (await params).slug);
}

export default async function TopicRoute({ params }: Props) {
  return TopicPage({ locale: "pt-BR", slug: (await params).slug });
}
