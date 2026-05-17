import { EmailLayout } from "./components/email-layout";
import type { EmailTemplateProps } from "./types";

export function PostStayThankyouEmail(props: EmailTemplateProps) {
  return <EmailLayout props={props} type="thank_you" action="booking" />;
}

export default PostStayThankyouEmail;
