import { EmailLayout } from "./components/email-layout";
import type { EmailTemplateProps } from "./types";

export function InvoiceEmail(props: EmailTemplateProps) {
  return <EmailLayout props={props} type="invoice" action="invoice" />;
}

export default InvoiceEmail;
