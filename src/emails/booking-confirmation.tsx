import { EmailLayout } from "./components/email-layout";
import type { EmailTemplateProps } from "./types";

export function BookingConfirmationEmail(props: EmailTemplateProps) {
  return <EmailLayout props={props} type="confirmation" action="booking" />;
}

export default BookingConfirmationEmail;
