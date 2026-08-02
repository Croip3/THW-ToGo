/** Fisher-Yates shuffle. Returns a new array; never mutates or clones the items themselves. */
export function shuffleCopy<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = copy[i] as T
    copy[i] = copy[j] as T
    copy[j] = temp
  }
  return copy
}
