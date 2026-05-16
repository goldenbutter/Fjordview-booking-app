"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CancelBookingButton({ bookingRef, email }: { bookingRef: string; email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (!confirm(`Cancel booking ${bookingRef}?`)) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(bookingRef)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason: "Cancelled by admin" }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Could not cancel");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button type="button" variant="danger" onClick={cancel} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        {loading ? "Cancelling" : "Cancel booking"}
      </Button>
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </div>
  );
}
