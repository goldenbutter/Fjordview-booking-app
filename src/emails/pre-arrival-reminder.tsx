import { EmailLayout } from "./components/email-layout";
import type { EmailTemplateProps } from "./types";

export function PreArrivalReminderEmail(props: EmailTemplateProps) {
  return <EmailLayout props={props} type="reminder" action="booking" />;
}

export default PreArrivalReminderEmail;
