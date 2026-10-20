/**
 * The login page forwards someone already signed in straight to ?redirect=.
 * If the server and the browser ever disagree about the session (a Supabase
 * hiccup on one side), that forward and the server's redirect to sign-in could
 * bounce forever. This allows one forward per destination every 30 seconds;
 * after that the sign-in form simply shows. Pure apart from the storage passed in.
 */
export const FORWARD_WINDOW_MS = 30_000;

type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

export function shouldForward(target: string, storage: KeyValueStore | null, now = Date.now()) {
  if (!storage) return true;
  const key = `sl_forward:${target}`;
  try {
    const last = Number(storage.getItem(key));
    if (Number.isFinite(last) && last > 0 && now - last < FORWARD_WINDOW_MS) return false;
    storage.setItem(key, String(now));
  } catch {
    // Storage blocked (private mode): forwarding once is still better than asking to sign in again.
  }
  return true;
}
