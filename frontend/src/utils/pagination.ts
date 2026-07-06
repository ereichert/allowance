/// Pure helpers for parsing pagination state out of the URL.

/** Parses a `page` search param into a valid positive page number, defaulting to 1. */
export function parsePageParam(raw: string | null): number {
  if (raw === null) return 1
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : 1
}
