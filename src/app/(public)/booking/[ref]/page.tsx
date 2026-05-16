import { BookingSelfService } from "@/components/booking/booking-self-service";
import { demoProperty } from "@/lib/db/seed";

export default async function BookingReferencePage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ email?: string; success?: string }>;
}) {
  const { ref } = await params;
  const query = await searchParams;

  return (
    <BookingSelfService
      bookingRef={decodeURIComponent(ref)}
      property={demoProperty}
      initialEmail={query.email}
      success={query.success === "true"}
    />
  );
}
