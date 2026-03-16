"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { ProxyTestButton } from "@/components/admin/proxy-test-button";

type Step = "proxy" | "browser" | "details";

export default function NewAccountPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("proxy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");

  const [proxy, setProxy] = useState({
    proxyHost: "",
    proxyPort: "",
    proxyUsername: "",
    proxyPassword: "",
  });

  const [form, setForm] = useState({
    linkedinName: "",
    linkedinHeadline: "",
    linkedinUrl: "",
    connectionCount: 0,
    industry: "",
    location: "",
    profileScreenshotUrl: "",
    profilePhotoUrl: "",
    accountAgeMonths: 0,
    hasSalesNav: false,
    notes: "",
    status: "available" as "maintenance" | "available",
  });

  const updateProxy = (field: string, value: unknown) =>
    setProxy((prev) => ({ ...prev, [field]: value }));

  const updateForm = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Step 1: Launch browser with proxy
  const handleLaunchBrowser = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/browser/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: form.linkedinName || "New Account",
          proxyHost: proxy.proxyHost || undefined,
          proxyPort: proxy.proxyPort ? Number(proxy.proxyPort) : undefined,
          proxyUsername: proxy.proxyUsername || undefined,
          proxyPassword: proxy.proxyPassword || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to launch browser");
        return;
      }

      setSessionId(data.sessionId);
      setStep("browser");
    } catch {
      setError("Failed to launch browser");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Save account (stops browser, captures cookies, saves to DB)
  const handleSaveAccount = async () => {
    if (!form.linkedinName) {
      setError("LinkedIn name is required");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/browser/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          ...form,
          ...proxy,
          connectionCount: Number(form.connectionCount),
          proxyPort: proxy.proxyPort ? Number(proxy.proxyPort) : undefined,
          accountAgeMonths: form.accountAgeMonths
            ? Number(form.accountAgeMonths)
            : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save account");
        return;
      }

      router.push("/admin/accounts");
    } catch {
      setError("Failed to save account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Add LinkedIn Account</h2>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        <Badge variant={step === "proxy" ? "info" : "success"}>
          1. Proxy & Launch
        </Badge>
        <span className="text-gray-300">→</span>
        <Badge variant={step === "browser" ? "info" : step === "details" ? "success" : "default"}>
          2. Log into LinkedIn
        </Badge>
        <span className="text-gray-300">→</span>
        <Badge variant={step === "details" ? "info" : "default"}>
          3. Account Details
        </Badge>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Step 1: Proxy config + launch */}
      {step === "proxy" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Proxy Configuration</h3>
              <p className="text-sm text-gray-500">
                Optional. The browser will use this proxy when connecting to LinkedIn.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="proxyHost"
                  label="Proxy Host"
                  placeholder="e.g. us-proxy.example.com"
                  value={proxy.proxyHost}
                  onChange={(e) => updateProxy("proxyHost", e.target.value)}
                />
                <Input
                  id="proxyPort"
                  label="Proxy Port"
                  placeholder="e.g. 8080"
                  value={proxy.proxyPort || ""}
                  onChange={(e) => updateProxy("proxyPort", e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="proxyUsername"
                  label="Proxy Username"
                  value={proxy.proxyUsername}
                  onChange={(e) => updateProxy("proxyUsername", e.target.value)}
                />
                <Input
                  id="proxyPassword"
                  label="Proxy Password"
                  type="password"
                  value={proxy.proxyPassword}
                  onChange={(e) => updateProxy("proxyPassword", e.target.value)}
                />
              </div>
              <ProxyTestButton
                host={proxy.proxyHost}
                port={proxy.proxyPort}
                username={proxy.proxyUsername}
                password={proxy.proxyPassword}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Quick Name (optional)</h3>
              <p className="text-sm text-gray-500">
                Give this profile a name for GoLogin. You can update details after login.
              </p>
            </CardHeader>
            <CardContent>
              <Input
                id="accountName"
                label="Account Name"
                placeholder="e.g. Sarah Johnson"
                value={form.linkedinName}
                onChange={(e) => updateForm("linkedinName", e.target.value)}
              />
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button onClick={handleLaunchBrowser} loading={loading} size="lg">
              Launch Browser
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Browser is open, waiting for admin to log in */}
      {step === "browser" && (
        <div className="space-y-6">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Browser is open</h3>
                <p className="mt-2 text-gray-600 max-w-md mx-auto">
                  A browser window has opened with the LinkedIn login page.
                  Log into the LinkedIn account you want to add, then come back here and continue.
                </p>
                <div className="mt-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800 text-left">
                  <strong>Important:</strong> Don&apos;t close the browser window manually.
                  Click the button below when you&apos;re done — this will save the session cookies automatically.
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Button onClick={() => setStep("details")} size="lg">
              I&apos;ve Logged In — Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Fill in account details and save */}
      {step === "details" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Profile Details</h3>
              <p className="text-sm text-gray-500">
                Fill in the details from the LinkedIn profile you just logged into.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                id="linkedinName"
                label="LinkedIn Name *"
                value={form.linkedinName}
                onChange={(e) => updateForm("linkedinName", e.target.value)}
                required
              />
              <Input
                id="linkedinHeadline"
                label="Headline"
                placeholder="e.g. VP of Sales at TechCorp"
                value={form.linkedinHeadline}
                onChange={(e) => updateForm("linkedinHeadline", e.target.value)}
              />
              <Input
                id="linkedinUrl"
                label="LinkedIn Profile URL"
                placeholder="e.g. https://linkedin.com/in/sarahjohnson"
                value={form.linkedinUrl}
                onChange={(e) => updateForm("linkedinUrl", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="connectionCount"
                  label="Connection Count"
                  type="number"
                  value={form.connectionCount || ""}
                  onChange={(e) => updateForm("connectionCount", e.target.value)}
                />
                <Input
                  id="accountAgeMonths"
                  label="Account Age (months)"
                  type="number"
                  value={form.accountAgeMonths || ""}
                  onChange={(e) => updateForm("accountAgeMonths", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="industry"
                  label="Industry"
                  placeholder="e.g. Technology"
                  value={form.industry}
                  onChange={(e) => updateForm("industry", e.target.value)}
                />
                <Input
                  id="location"
                  label="Location"
                  placeholder="e.g. San Francisco, CA"
                  value={form.location}
                  onChange={(e) => updateForm("location", e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.hasSalesNav}
                  onChange={(e) => updateForm("hasSalesNav", e.target.checked)}
                  className="rounded border-gray-300"
                />
                Has Sales Navigator
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Images</h3>
              <p className="text-sm text-gray-500">
                Drag & drop, paste from clipboard, or click to upload
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUpload
                label="Profile Photo"
                value={form.profilePhotoUrl}
                onChange={(url) => updateForm("profilePhotoUrl", url)}
              />
              <ImageUpload
                label="Profile Screenshot"
                value={form.profileScreenshotUrl}
                onChange={(url) => updateForm("profileScreenshotUrl", url)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Status & Notes</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="maintenance">
                    Maintenance (not visible to customers)
                  </option>
                  <option value="available">
                    Available (visible to customers)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (admin only)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button onClick={handleSaveAccount} loading={loading} size="lg">
              Save Account & Close Browser
            </Button>
            <Button variant="outline" onClick={() => setStep("browser")}>
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
