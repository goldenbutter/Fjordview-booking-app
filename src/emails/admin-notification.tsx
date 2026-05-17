import { EmailLayout } from "./components/email-layout";
import type { EmailTemplateProps } from "./types";

export function AdminNotificationEmail(props: EmailTemplateProps) {
  return <EmailLayout props={props} type="admin_notification" action="booking" />;
}

export default AdminNotificationEmail;
