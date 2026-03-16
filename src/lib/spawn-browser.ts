// Wrapper to spawn browser-launcher as a child process
// Only works locally — returns error on serverless (Vercel)

const isServerless = !!process.env.VERCEL;

// Hide require from Turbopack bundler
const _require = typeof globalThis.require === "function"
  ? globalThis.require
  : (id: string) => { throw new Error(`Cannot require ${id} in this environment`); };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function spawnBrowser(data: Record<string, unknown>): Promise<{ child: any; result: { status: string; profileId?: string; error?: string } }> {
  if (isServerless) {
    return { child: null, result: { status: "error", error: "Browser launch only works on local server" } };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cp: any = _require("child_process");
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
      if (!resolved) { resolved = true; child.kill(); reject(new Error("Browser launch timed out")); }
    }, 60000);
  });
}

export function execCommand(cmd: string): string {
  if (isServerless) return "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cp: any = _require("child_process");
  return cp.execSync(cmd, { encoding: "utf-8", timeout: 15000 });
}
