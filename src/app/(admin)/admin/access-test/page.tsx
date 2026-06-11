"use client";

import { useState } from "react";

export default function AccessTestPage() {
  const [profileId, setProfileId] = useState("689eefb399a57ac17a976c70");
  const [email, setEmail] = useState("milee+lvtest@linkedvelocity.com");
  const [busy, setBusy] = useState<"share" | "unshare" | null>(null);
  const [result, setResult] = useState<string>("");

  const run = async (action: "share" | "unshare") => {
    setBusy(action);
    setResult("");
    try {
      const res = await fetch("/api/admin/gologin-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profileId.trim(), email: email.trim(), action }),
      });
      const data = await res.json();
      setResult(
        res.ok
          ? `✅ ${action === "share" ? "Access granted" : "Access revoked"} — GoLogin responded:\n` +
              JSON.stringify(data.result, null, 2)
          : `❌ Error: ${data.error}`
      );
    } catch (e) {
      setResult("❌ " + (e instanceof Error ? e.message : "Request failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold text-gray-900">GoLogin access test</h2>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        Internal tool to verify adding/removing a renter&apos;s email on a GoLogin profile. Only touches the
        profile below — safe for testing.
      </p>

      <label className="block text-sm font-medium text-gray-700 mb-1">GoLogin profile ID</label>
      <input
        value={profileId}
        onChange={(e) => setProfileId(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4"
        placeholder="e.g. 689eefb399a57ac17a976c70"
      />

      <label className="block text-sm font-medium text-gray-700 mb-1">Renter email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-5"
        placeholder="renter@example.com"
      />

      <div className="flex gap-3">
        <button
          onClick={() => run("share")}
          disabled={busy !== null}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {busy === "share" ? "Granting…" : "Grant access (share)"}
        </button>
        <button
          onClick={() => run("unshare")}
          disabled={busy !== null}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy === "unshare" ? "Revoking…" : "Revoke access (unshare)"}
        </button>
      </div>

      {result && (
        <pre className="mt-5 whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-800">
          {result}
        </pre>
      )}
    </div>
  );
}
