import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { activeProcesses } from "@/app/api/admin/browser/launch/route";

const stopSchema = z.object({
  profileId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = stopSchema.parse(body);

    const child = activeProcesses.get(data.profileId);
    if (child) {
      await new Promise<void>((resolve) => {
        child.stdin?.write("stop\n");
        child.on("exit", () => resolve());
        setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 15000);
      });
      activeProcesses.delete(data.profileId);
    }

    return NextResponse.json({ message: "Browser closed and session saved", profileId: data.profileId });
  } catch (error) {
    console.error("Ambassador browser stop error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to close browser" },
      { status: 500 }
    );
  }
}
