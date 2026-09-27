// Serializes writes while retaining the latest complete state. Intermediate clicks
// can be coalesced, but a slow earlier request can never overwrite a later one.
export function latestSaveQueue<T>(save: (value: T) => Promise<void>, status: (saving: boolean, error: string | null) => void) {
  let pending: { value: T } | null = null;
  let running = false;
  const drain = async () => {
    if (running) return;
    running = true; status(true, null);
    while (pending) {
      const current = pending; pending = null;
      try { await save(current.value); }
      catch { if (!pending) pending = current; running = false; status(false, "Could not save the checks. Your selections are kept—retry saving."); return; }
    }
    running = false; status(false, null);
  };
  return { push(value: T) { pending = { value }; void drain(); }, retry() { void drain(); }, isPending() { return running || !!pending; } };
}
