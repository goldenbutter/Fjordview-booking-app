import { Body, Button, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { getEmailCopy } from "../i18n";
import type { EmailTemplateProps, EmailType } from "../types";
import { templateLanguage } from "../types";
import { BookingDetailBlock } from "./booking-detail-block";
import { EmailFooter } from "./email-footer";
import { EmailHeader } from "./email-header";

export function EmailLayout({
  props,
  type,
  action,
  children,
}: {
  props: EmailTemplateProps;
  type: EmailType;
  action?: "booking" | "invoice";
  children?: ReactNode;
}) {
  const language = templateLanguage(props);
  const copy = getEmailCopy(language);
  const buttonLabel = action === "invoice" ? copy.actions.viewInvoice : copy.actions.viewBooking;
  const color = props.property.primaryColor || "#0D9488";

  return (
    <Html>
      <Head />
      <Preview>{copy.preview[type]}</Preview>
      <Body style={{ backgroundColor: "#f1f5f9", fontFamily: "Arial, sans-serif", margin: "0", padding: "0" }}>
        <Container style={{ backgroundColor: "#ffffff", margin: "0 auto", maxWidth: "620px", padding: "0 28px" }}>
          <EmailHeader property={props.property} />
          <Section style={{ padding: "4px 0 18px" }}>
            <Text style={{ color: "#0f172a", fontSize: "16px", lineHeight: "26px", margin: "0 0 18px" }}>
              {copy.intro[type]}
            </Text>
            <BookingDetailBlock copy={copy} language={language} props={props} />
            {children}
            <Button
              href={props.selfServiceUrl}
              style={{
                backgroundColor: color,
                borderRadius: "6px",
                color: "#ffffff",
                display: "inline-block",
                fontSize: "14px",
                fontWeight: 700,
                marginTop: "22px",
                padding: "12px 18px",
                textDecoration: "none",
              }}
            >
              {buttonLabel}
            </Button>
          </Section>
          <EmailFooter copy={copy} property={props.property} />
        </Container>
      </Body>
    </Html>
  );
}
