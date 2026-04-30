export type ToastVariant = "error" | "info" | "success";

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: string;
  duration: number;
};

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  const snapshot = [...items];
  listeners.forEach((l) => l(snapshot));
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener([...items]);
  return () => listeners.delete(listener);
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const defaultDuration: Record<ToastVariant, number> = {
  error: 6500,
  info: 5000,
  success: 4500,
};

function push(
  variant: ToastVariant,
  message: string,
  duration?: number
): string {
  const id = genId();
  const d = duration ?? defaultDuration[variant];
  items = [...items, { id, variant, message, duration: d }];
  emit();
  if (typeof window !== "undefined" && d > 0) {
    window.setTimeout(() => dismiss(id), d);
  }
  return id;
}

export function dismiss(id: string) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  error: (message: string, duration?: number) =>
    push("error", message, duration),
  info: (message: string, duration?: number) =>
    push("info", message, duration),
  success: (message: string, duration?: number) =>
    push("success", message, duration),
};

/** Best-effort message from a failed API JSON body. */
export async function messageFromResponse(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string" &&
      (data as { error: string }).error.trim()
    ) {
      return (data as { error: string }).error.trim();
    }
  } catch {
    /* not JSON */
  }
  if (res.status === 404) return "Not found";
  if (res.status === 409) return "Conflict";
  return res.statusText?.trim() || "Something went wrong";
}

/** If `res.ok` is false, shows an error toast and returns `true`. */
export async function toastIfError(res: Response): Promise<boolean> {
  if (res.ok) return false;
  toast.error(await messageFromResponse(res));
  return true;
}
