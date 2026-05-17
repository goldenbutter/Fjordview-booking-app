import { EmailLayout } from "./components/email-layout";
import type { EmailTemplateProps } from "./types";

export function CancellationConfirmationEmail(props: EmailTemplateProps) {
  return <EmailLayout props={props} type="cancellation" action="booking" />;
}

export default CancellationConfirmationEmail;
