/** Formats a cents value as a USD currency string, e.g. `150` -> `"$1.50"`. */
export function formatValue(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
