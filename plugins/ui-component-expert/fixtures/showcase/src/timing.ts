/** Minimal promise-based delay shared by the demo's simulated services. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
