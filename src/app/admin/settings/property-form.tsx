"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
import type { Property } from "@/types";

export function PropertyForm({ property }: { property: Property }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: property.name,
    address: property.address,
    city: property.city,
    postalCode: property.postalCode,
    contactEmail: property.contactEmail,
    contactPhone: property.contactPhone,
    checkInTime: property.checkInTime.slice(0, 5),
    checkOutTime: property.checkOutTime.slice(0, 5),
    primaryColor: property.primaryColor,
    accentColor: property.accentColor,
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setStatus("idle");
    setError("");
    try {
      const response = await fetch("/api/admin/property", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus("error");
        setError(typeof payload.error === "string" ? payload.error : "Could not save");
        return;
      }
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel>Property name</FieldLabel>
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Address</FieldLabel>
          <TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <FieldLabel>City</FieldLabel>
          <TextInput value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Postal code</FieldLabel>
          <TextInput value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Contact email</FieldLabel>
          <TextInput type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Contact phone</FieldLabel>
          <TextInput value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Check-in time</FieldLabel>
          <TextInput type="time" value={form.checkInTime} onChange={(e) => setForm({ ...form, checkInTime: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Check-out time</FieldLabel>
          <TextInput type="time" value={form.checkOutTime} onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Primary color</FieldLabel>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Primary color"
              value={form.primaryColor}
              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              className="h-11 w-12 cursor-pointer rounded-md border border-slate-200"
            />
            <TextInput value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="flex-1" />
          </div>
        </div>
        <div>
          <FieldLabel>Accent color</FieldLabel>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Accent color"
              value={form.accentColor}
              onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
              className="h-11 w-12 cursor-pointer rounded-md border border-slate-200"
            />
            <TextInput value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="flex-1" />
          </div>
        </div>
      </div>

      {status === "saved" ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Saved.</div>
      ) : null}
      {status === "error" ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {loading ? "Saving" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
