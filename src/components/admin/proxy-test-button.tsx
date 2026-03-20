"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ProxyTestButtonProps {
  host: string;
  port: string | number;
  username: string;
  password: string;
}

export function ProxyTestButton({ host, port, username, password }: ProxyTestButtonProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const runTest = async () => {
    if (!host || !port) {
      setResult({ success: false, message: "No proxy configured." });
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/proxy-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, username, password }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, message: "Test request failed." });
    } finally {
      setTesting(false);
    }
  };

  // Auto-test on mount when proxy details are present
  useEffect(() => {
    if (host && port) {
      runTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-3">
      {/* Status indicator */}
      {testing && (
        <span className="flex items-center gap-2 text-sm text-gray-500">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-400 animate-pulse" />
          Testing...
        </span>
      )}
      {!testing && result && (
        <span className={`flex items-center gap-2 text-sm font-medium ${result.success ? "text-green-700" : "text-red-700"}`}>
          <span className={`inline-block h-3 w-3 rounded-full ${result.success ? "bg-green-500" : "bg-red-500"}`} />
          {result.success ? "Proxy OK" : "Proxy Failed"}
        </span>
      )}
      {!testing && !result && host && port && (
        <span className="flex items-center gap-2 text-sm text-gray-400">
          <span className="inline-block h-3 w-3 rounded-full bg-gray-300" />
          Not tested
        </span>
      )}

      {/* Manual re-test button */}
      <Button type="button" variant="outline" size="sm" onClick={runTest} loading={testing}>
        {result ? "Re-test" : "Test Proxy"}
      </Button>
    </div>
  );
}
