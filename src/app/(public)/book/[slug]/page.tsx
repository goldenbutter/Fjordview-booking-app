import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { demoProperty } from "@/lib/db/seed";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (slug !== demoProperty.slug) {
    notFound();
  }

  return <BookingFlow property={demoProperty} />;
}
