/** `2026-02-14` → `February 14, 2026`. Fixed to UTC so SSR and client agree. */
export const formatDate = (date: string | Date): string => {
  const value = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  if (Number.isNaN(value.getTime())) return "";

  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

/** `2026-02-14` → `Feb 2026`, for dense list metadata. */
export const formatDateShort = (date: string | Date): string => {
  const value = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  if (Number.isNaN(value.getTime())) return "";

  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};
