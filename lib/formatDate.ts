/** Fixed locale so server and client render identical date strings (avoids hydration errors). */
const DISPLAY_LOCALE = "en-US";

export function formatDateTimeMedium(
  input: Date | string | number
): string {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(input));
}
