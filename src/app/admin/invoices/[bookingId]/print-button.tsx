"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  const params = useSearchParams();
  const autoPrint = params.get("print") === "1";

  useEffect(() => {
    if (autoPrint) {
      const timer = window.setTimeout(() => window.print(), 250);
      return () => window.clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <Button variant="secondary" type="button" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      Print
    </Button>
  );
}
