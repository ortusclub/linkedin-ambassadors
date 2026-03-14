"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function NewAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    linkedinName: "",
    linkedinHeadline: "",
    linkedinUrl: "",
    connectionCount: 0,
    industry: "",
    location: "",
    profileScreenshotUrl: "",
    profilePhotoUrl: "",
    proxyHost: "",
    proxyPort: 0,
    proxyUsername: "",
    proxyPassword: "",
    accountAgeMonths: 0,
    hasSalesNav: false,
    notes: "",
    createGologinProfile: false,
    status: "maintenance" as "maintenance" | "available",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          connectionCount: Number(form.connectionCount),
          proxyPort: form.proxyPort ? Number(form.proxyPort) : undefined,
          accountAgeMonths: form.accountAgeMonths ? Number(form.accountAgeMonths) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Failed to create account");
        return;
      }

      router.push("/admin/accounts");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Add LinkedIn Account</h2>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><h3 className="font-semibold text-gray-900">Profile Details</h3></CardHeader>
          <CardContent className="space-y-4">
            <Input id="linkedinName" label="LinkedIn Name *" value={form.linkedinName} onChange={(e) => update("linkedinName", e.target.value)} required />
            <Input id="linkedinHeadline" label="Headline" value={form.linkedinHeadline} onChange={(e) => update("linkedinHeadline", e.target.value)} />
            <Input id="linkedinUrl" label="LinkedIn URL" value={form.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input id="connectionCount" label="Connection Count" type="number" value={form.connectionCount} onChange={(e) => update("connectionCount", e.target.value)} />
              <Input id="accountAgeMonths" label="Account Age (months)" type="number" value={form.accountAgeMonths} onChange={(e) => update("accountAgeMonths", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input id="industry" label="Industry" value={form.industry} onChange={(e) => update("industry", e.target.value)} />
              <Input id="location" label="Location" value={form.location} onChange={(e) => update("location", e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.hasSalesNav} onChange={(e) => update("hasSalesNav", e.target.checked)} className="rounded border-gray-300" />
              Has Sales Navigator
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-gray-900">Images</h3></CardHeader>
          <CardContent className="space-y-4">
            <Input id="profilePhotoUrl" label="Profile Photo URL" value={form.profilePhotoUrl} onChange={(e) => update("profilePhotoUrl", e.target.value)} />
            <Input id="profileScreenshotUrl" label="Profile Screenshot URL" value={form.profileScreenshotUrl} onChange={(e) => update("profileScreenshotUrl", e.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-gray-900">Proxy Configuration</h3></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input id="proxyHost" label="Proxy Host" value={form.proxyHost} onChange={(e) => update("proxyHost", e.target.value)} />
              <Input id="proxyPort" label="Proxy Port" type="number" value={form.proxyPort} onChange={(e) => update("proxyPort", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input id="proxyUsername" label="Proxy Username" value={form.proxyUsername} onChange={(e) => update("proxyUsername", e.target.value)} />
              <Input id="proxyPassword" label="Proxy Password" type="password" value={form.proxyPassword} onChange={(e) => update("proxyPassword", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-gray-900">GoLogin & Status</h3></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.createGologinProfile} onChange={(e) => update("createGologinProfile", e.target.checked)} className="rounded border-gray-300" />
              Create GoLogin profile automatically
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="maintenance">Maintenance (not visible to customers)</option>
                <option value="available">Available (visible to customers)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (admin only)</label>
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" loading={loading}>Create Account</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
