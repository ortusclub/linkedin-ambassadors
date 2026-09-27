import type { ChildProcess } from "node:child_process";

// Shared process registry belongs outside route handlers.
export const activeProcesses = new Map<string, ChildProcess>();
