/** Formats an ISO 8601 timestamp as `YYYY-MM-DD HH:MM UTC`, independent of the host timezone. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const datePart = date.toISOString().slice(0, 10)
  const timePart = date.toISOString().slice(11, 16)
  return `${datePart} ${timePart} UTC`
}
