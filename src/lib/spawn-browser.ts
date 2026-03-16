// Browser spawn wrapper — only functional locally, no-ops on Vercel
// Uses dynamic Function constructor to completely hide require from bundler

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getChildProcess(): any {
  // This prevents ANY bundler from seeing the require call
  return new Function('return require("child_process")')();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function spawnBrowser(data: Record<string, unknown>): Promise<{ child: any; result: { status: string; profileId?: string; error?: string } }> {
  if (process.env.VERCEL) {
    return { child: null, result: { status: "error", error: "Browser launch is only available on the local admin server" } };
  }

  try {
    const cp = getChildProcess();
    const scriptPath = process.cwd() + "/src/lib/browser-launcher.mjs";

    return new Promise((resolve, reject) => {
      const child = cp.spawn("node", [scriptPath, "launch", JSON.stringify(data)], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let resolved = false;

      child.stdout.on("data", (chunk: Buffer) => {
        if (!resolved) {
          try {
            const msg = JSON.parse(chunk.toString().trim());
            resolved = true;
            resolve({ child, result: msg });
          } catch { /* not JSON yet */ }
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        console.error("Browser stderr:", chunk.toString());
      });

      child.on("error", (err: Error) => {
        if (!resolved) { resolved = true; reject(err); }
      });

      child.on("exit", (code: number | null) => {
        if (!resolved) { resolved = true; reject(new Error(`Exited with code ${code}`)); }
      });

      setTimeout(() => {
        if (!resolved) { resolved = true; child.kill(); reject(new Error("Timed out")); }
      }, 60000);
    });
  } catch (e) {
    return { child: null, result: { status: "error", error: `Spawn failed: ${e instanceof Error ? e.message : "unknown"}` } };
  }
}

export function execCommand(cmd: string): string {
  if (process.env.VERCEL) return "";
  try {
    const cp = getChildProcess();
    return cp.execSync(cmd, { encoding: "utf-8", timeout: 15000 });
  } catch {
    return "";
  }
}
