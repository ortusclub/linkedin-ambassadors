"use client";

import { useState } from "react";
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

  const handleTest = async () => {
    if (!host || !port) {
      setResult({ success: false, message: "Enter host and port first." });
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

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={handleTest} loading={testing}>
        Test Proxy
      </Button>
      {result && (
        <div
          className={`rounded-lg p-2 text-sm ${
            result.success
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
