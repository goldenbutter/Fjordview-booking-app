import { notFound } from "next/navigation";
import { BookingSelfService } from "@/components/booking/booking-self-service";
import { getPropertyBySlug } from "@/lib/db/queries";
import { env } from "@/lib/env";

export default async function BookingReferencePage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ email?: string; success?: string }>;
}) {
  const { ref } = await params;
  const query = await searchParams;
  const property = await getPropertyBySlug(env.defaultPropertySlug);
  if (!property) {
    notFound();
  }

  return (
    <BookingSelfService
      bookingRef={decodeURIComponent(ref)}
      property={property}
      initialEmail={query.email}
      success={query.success === "true"}
    />
  );
}
