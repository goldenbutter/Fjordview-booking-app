import { Resend } from "resend";
import { env } from "@/lib/env";
import type { Booking, Guest, Property, RoomType } from "@/types";

type EmailPayload = {
  property: Property;
  booking: Booking;
  guest: Guest;
  roomType: RoomType;
  selfServiceUrl: string;
  type: "confirmation" | "cancellation" | "reminder" | "thank_you" | "admin_notification" | "invoice";
};

export async function sendEmail(payload: EmailPayload) {
  const subject = `${payload.property.name} - ${payload.type.replace("_", " ")} - ${payload.booking.bookingRef}`;

  if (env.localDemoMode || !env.resendApiKey) {
    console.info("[local-email]", {
      to: payload.guest.email,
      subject,
      selfServiceUrl: payload.selfServiceUrl,
    });
    return { status: "logged", provider: "local-demo" };
  }

  const resend = new Resend(env.resendApiKey);
  const { data, error } = await resend.emails.send({
    from: `${payload.property.name} <${env.emailFrom}>`,
    to: payload.guest.email,
    subject,
    text: [
      `Booking ${payload.booking.bookingRef}`,
      `${payload.roomType.name[payload.booking.language]}: ${payload.booking.checkIn} - ${payload.booking.checkOut}`,
      payload.selfServiceUrl,
    ].join("\n"),
  });

  if (error) {
    return { status: "failed", provider: "resend", error };
  }

  return { status: "sent", provider: "resend", id: data?.id };
}
