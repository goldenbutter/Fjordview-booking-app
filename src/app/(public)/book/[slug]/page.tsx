import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { getPropertyBySlug } from "@/lib/db/queries";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) {
    notFound();
  }
  return <BookingFlow property={property} />;
}
