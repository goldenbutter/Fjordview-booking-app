import { createElement, type ReactElement } from "react";
import { Resend } from "resend";
import { AdminNotificationEmail } from "@/emails/admin-notification";
import { BookingConfirmationEmail } from "@/emails/booking-confirmation";
import { CancellationConfirmationEmail } from "@/emails/cancellation-confirmation";
import { getEmailCopy } from "@/emails/i18n";
import { InvoiceEmail } from "@/emails/invoice-email";
import { PaymentReceiptEmail } from "@/emails/payment-receipt";
import { PostStayThankyouEmail } from "@/emails/post-stay-thankyou";
import { PreArrivalReminderEmail } from "@/emails/pre-arrival-reminder";
import type { EmailTemplateProps, EmailType } from "@/emails/types";
import { env } from "@/lib/env";
import { logEmail as writeEmailLog, type LogEmailInput } from "@/lib/db/queries";
import type { Locale } from "@/types";

type EmailTypeAlias =
  | EmailType
  | "payment_receipt"
  | "pre_arrival_reminder"
  | "post_stay_thankyou"
  | "cancellation_confirmation"
  | "invoice_email";

export type EmailPayload = EmailTemplateProps & {
  type: EmailTypeAlias;
};

type BuildEmailInput = EmailPayload & {
  emailFrom?: string;
};

type ResendSendInput = {
  from: string;
  to: string;
  subject: string;
  text: string;
  react: ReactElement;
};

type ResendLike = {
  emails: {
    send: (
      input: ResendSendInput,
      options?: { headers?: Record<string, string> },
    ) => Promise<{ data?: { id?: string } | null; error?: unknown }>;
  };
};

type EmailSendDeps = {
  resendApiKey?: string;
  emailFrom?: string;
  resend?: ResendLike;
  logEmail?: (input: LogEmailInput) => Promise<unknown>;
  logger?: Pick<typeof console, "info" | "error">;
};

const templateByType: Record<EmailType, (props: EmailTemplateProps) => ReactElement> = {
  confirmation: BookingConfirmationEmail,
  receipt: PaymentReceiptEmail,
  reminder: PreArrivalReminderEmail,
  thank_you: PostStayThankyouEmail,
  cancellation: CancellationConfirmationEmail,
  invoice: InvoiceEmail,
  admin_notification: AdminNotificationEmail,
};

export function buildEmailSendInput(input: BuildEmailInput) {
  const type = normalizeEmailType(input.type);
  const language = input.booking.language;
  const copy = getEmailCopy(language);
  const recipient = type === "admin_notification" ? input.property.contactEmail : input.guest.email;
  const subject = copy.subjects[type](input.booking.bookingRef);
  const templateProps: EmailTemplateProps = { ...input, language };

  return {
    send: {
      from: `${input.property.name} <${input.emailFrom ?? env.emailFrom}>`,
      to: recipient,
      subject,
      text: buildPlainText(input, type, language),
      react: createElement(templateByType[type], templateProps),
    },
    log: {
      propertyId: input.property.id,
      bookingId: input.booking.id,
      guestId: input.guest.id,
      emailType: type,
      toEmail: recipient,
      subject,
      language,
    },
    idempotencyKey: `email-${type}-${input.booking.id}`,
  };
}

export async function sendEmail(payload: EmailPayload, deps: EmailSendDeps = {}) {
  const apiKey = deps.resendApiKey ?? env.resendApiKey;
  const logger = deps.logger ?? console;
  const logEmail = deps.logEmail ?? writeEmailLog;
  const message = buildEmailSendInput({ ...payload, emailFrom: deps.emailFrom ?? env.emailFrom });

  if (!apiKey) {
    logger.info("[local-email]", {
      to: message.send.to,
      subject: message.send.subject,
      selfServiceUrl: payload.selfServiceUrl,
    });
    await recordEmail(logEmail, {
      ...message.log,
      status: "sent",
      resendMessageId: undefined,
    });
    return { status: "logged", provider: "local-demo" };
  }

  const resend = deps.resend ?? (new Resend(apiKey) as unknown as ResendLike);
  try {
    const { data, error } = await resend.emails.send(message.send, {
      headers: { "Idempotency-Key": message.idempotencyKey },
    });

    if (error) {
      await recordEmail(logEmail, {
        ...message.log,
        status: "failed",
        resendMessageId: undefined,
      });
      return { status: "failed", provider: "resend", error };
    }

    await recordEmail(logEmail, {
      ...message.log,
      status: "sent",
      resendMessageId: data?.id,
    });
    return { status: "sent", provider: "resend", id: data?.id };
  } catch (error) {
    await recordEmail(logEmail, {
      ...message.log,
      status: "failed",
      resendMessageId: undefined,
    });
    return { status: "failed", provider: "resend", error };
  }
}

function normalizeEmailType(type: EmailTypeAlias): EmailType {
  switch (type) {
    case "payment_receipt":
      return "receipt";
    case "pre_arrival_reminder":
      return "reminder";
    case "post_stay_thankyou":
      return "thank_you";
    case "cancellation_confirmation":
      return "cancellation";
    case "invoice_email":
      return "invoice";
    default:
      return type;
  }
}

function buildPlainText(input: EmailTemplateProps, type: EmailType, language: Locale) {
  const copy = getEmailCopy(language);
  const roomName = input.roomType.name[language] ?? input.roomType.name.en;
  return [
    copy.preview[type],
    `${copy.labels.bookingRef}: ${input.booking.bookingRef}`,
    `${copy.labels.guest}: ${input.guest.firstName} ${input.guest.lastName}`,
    `${copy.labels.room}: ${roomName}`,
    `${copy.labels.checkIn}: ${input.booking.checkIn}`,
    `${copy.labels.checkOut}: ${input.booking.checkOut}`,
    `${copy.labels.total}: ${formatMoney(input.booking.totalPrice, input.booking.currency, language)}`,
    `${copy.labels.paid}: ${formatMoney(input.booking.paidAmount, input.booking.currency, language)}`,
    `${copy.labels.selfService}: ${input.selfServiceUrl}`,
  ].join("\n");
}

function formatMoney(amount: number, currency: string, language: Locale) {
  return new Intl.NumberFormat(language === "no" ? "nb-NO" : "en-US", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

async function recordEmail(
  logEmail: (input: LogEmailInput) => Promise<unknown>,
  input: LogEmailInput,
) {
  try {
    await logEmail(input);
  } catch (error) {
    console.error("[email.log]", error);
  }
}
