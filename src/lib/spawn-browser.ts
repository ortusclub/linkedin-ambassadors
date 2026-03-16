// Wrapper to spawn browser-launcher as a child process
// Uses eval to prevent Turbopack from tracing the file path

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function spawnBrowser(data: Record<string, unknown>): Promise<{ child: any; result: { status: string; profileId?: string; error?: string } }> {
  // Dynamic require to hide from bundler
  // eslint-disable-next-line no-eval
  const cp = eval('require("child_process")');
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
        } catch {
          // not JSON yet
        }
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
  // eslint-disable-next-line no-eval
  const cp = eval('require("child_process")');
  return cp.execSync(cmd, { encoding: "utf-8", timeout: 15000 });
}
