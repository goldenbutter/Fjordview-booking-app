import { Hr, Link, Section, Text } from "@react-email/components";
import type { EmailCopy } from "../i18n";
import type { Property } from "@/types";

export function EmailFooter({ copy, property }: { copy: EmailCopy; property: Property }) {
  return (
    <Section style={{ padding: "8px 0 24px" }}>
      <Hr style={{ borderColor: "#e2e8f0", margin: "24px 0" }} />
      <Text style={{ color: "#475569", fontSize: "13px", lineHeight: "20px", margin: "0 0 8px" }}>
        {copy.footer}
      </Text>
      <Text style={{ color: "#475569", fontSize: "13px", lineHeight: "20px", margin: "0" }}>
        {copy.labels.contact}:{" "}
        <Link href={`mailto:${property.contactEmail}`} style={{ color: property.primaryColor || "#0D9488" }}>
          {property.contactEmail}
        </Link>
        {property.contactPhone ? ` | ${property.contactPhone}` : ""}
      </Text>
    </Section>
  );
}
