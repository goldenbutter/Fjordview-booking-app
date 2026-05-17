import { Heading, Img, Section, Text } from "@react-email/components";
import type { Property } from "@/types";

const fallbackColor = "#0D9488";

export function EmailHeader({ property }: { property: Property }) {
  const color = property.primaryColor || fallbackColor;

  return (
    <Section style={{ borderTop: `6px solid ${color}`, padding: "24px 0 18px" }}>
      {property.logoUrl ? (
        <Img
          src={property.logoUrl}
          alt={property.name}
          width="96"
          style={{ display: "block", marginBottom: "16px", maxHeight: "56px", objectFit: "contain" }}
        />
      ) : null}
      <Heading style={{ color: "#0f172a", fontSize: "24px", lineHeight: "32px", margin: "0" }}>
        {property.name}
      </Heading>
      <Text style={{ color: "#64748b", fontSize: "14px", lineHeight: "22px", margin: "6px 0 0" }}>
        {[property.address, property.postalCode, property.city].filter(Boolean).join(", ")}
      </Text>
    </Section>
  );
}
