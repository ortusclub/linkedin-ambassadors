"use client";

import { useState } from "react";

export default function AccessTestPage() {
  const [profileId, setProfileId] = useState("689eefb399a57ac17a976c70");
  const [email, setEmail] = useState("ardianacomia@gmail.com");
  const [token, setToken] = useState("");
  const [shareId, setShareId] = useState("");
  const [busy, setBusy] = useState<"share" | "unshare" | null>(null);
  const [result, setResult] = useState<string>("");

  const run = async (action: "share" | "unshare") => {
    setBusy(action);
    setResult("");
    try {
      const res = await fetch("/api/admin/gologin-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profileId.trim(),
          email: email.trim(),
          action,
          token: token.trim(),
          shareId: shareId.trim(),
        }),
      });
      const text = await res.text();
      let data: { ok?: boolean; error?: string; shareId?: string; result?: unknown } = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON response */ }
      if (!res.ok || data.ok === false) {
        setResult(`❌ Error ${res.status}: ${data.error || text || "(empty response from server)"}`);
        return;
      }
      // Auto-fill the Share ID after a successful grant so revoke is one click.
      if (action === "share" && data.shareId) setShareId(data.shareId);
      setResult(
        `✅ ${action === "share" ? "Access granted" : "Access revoked"} — GoLogin responded:\n` +
          (action === "share" && data.shareId
            ? `Share ID: ${data.shareId}  ← auto-filled below; click Revoke to remove it\n\n`
            : "") +
          JSON.stringify(data.result, null, 2)
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
        Internal tool to verify adding/removing a renter&apos;s access on a GoLogin profile. Grant returns a
        Share ID; Revoke deletes that Share ID. Safe — only touches the profile/share below.
      </p>

      <label className="block text-sm font-medium text-gray-700 mb-1">GoLogin profile ID</label>
      <input
        value={profileId}
        onChange={(e) => setProfileId(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4"
        placeholder="e.g. 689eefb399a57ac17a976c70"
      />

      <label className="block text-sm font-medium text-gray-700 mb-1">Renter email <span className="font-normal text-gray-400">(used by Grant)</span></label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4"
        placeholder="renter@example.com"
      />

      <label className="block text-sm font-medium text-gray-700 mb-1">
        Share ID <span className="font-normal text-gray-400">(used by Revoke — auto-fills after a Grant)</span>
      </label>
      <input
        value={shareId}
        onChange={(e) => setShareId(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4 font-mono"
        placeholder="e.g. 6a2a8de6ad53c433b34e6024"
      />

      <label className="block text-sm font-medium text-gray-700 mb-1">
        GoLogin API token <span className="font-normal text-gray-400">(testing only — same account that owns the profile; blank = site token)</span>
      </label>
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-5 font-mono"
        placeholder="paste the GoLogin account's API token"
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
