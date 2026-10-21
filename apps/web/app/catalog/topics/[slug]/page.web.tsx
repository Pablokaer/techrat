import type { Metadata } from "next";
import { TopicPage, topicPageMetadata } from "@/components/public-catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return topicPageMetadata("en", (await params).slug);
}

export default async function TopicRoute({ params }: Props) {
  return TopicPage({ locale: "en", slug: (await params).slug });
}
