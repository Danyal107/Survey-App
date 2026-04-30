"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/lib/toast";

/**
 * Surfaces a server-rendered error string as a client toast once per mount.
 */
export function ServerMessageToast({
  message,
  variant = "error",
}: {
  message: string | null | undefined;
  variant?: "error" | "info";
}) {
  const shown = useRef(false);

  useEffect(() => {
    if (!message?.trim() || shown.current) return;
    shown.current = true;
    if (variant === "info") toast.info(message);
    else toast.error(message);
  }, [message, variant]);

  return null;
}
