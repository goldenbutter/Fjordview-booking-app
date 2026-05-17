import { EmailLayout } from "./components/email-layout";
import type { EmailTemplateProps } from "./types";

export function PaymentReceiptEmail(props: EmailTemplateProps) {
  return <EmailLayout props={props} type="receipt" action="booking" />;
}

export default PaymentReceiptEmail;
