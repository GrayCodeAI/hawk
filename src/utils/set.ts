/**
 * Returns elements present in set `a` but not in set `b` (set difference).
 * Note: this code is hot, so is optimized for speed.
 * 
 * @template A - The type of set elements
 * @param a - First set (minuend)
 * @param b - Second set (subtrahend)
 * @returns New set containing elements in `a` but not in `b`
 * 
 * @example
 * difference(new Set([1, 2, 3]), new Set([2, 3, 4]))
 * // Returns: Set(1) {1}
 */
export function difference<A>(a: Set<A>, b: Set<A>): Set<A> {
  const result = new Set<A>()
  for (const item of a) {
    if (!b.has(item)) {
      result.add(item)
    }
  }
  return result
}

/**
 * Checks if two sets have any elements in common (intersection non-empty).
 * Note: this code is hot, so is optimized for speed.
 * 
 * @template A - The type of set elements
 * @param a - First set
 * @param b - Second set
 * @returns `true` if there exists at least one element present in both sets
 * 
 * @example
 * intersects(new Set([1, 2]), new Set([2, 3]))
 * // Returns: true (both contain 2)
 */
export function intersects<A>(a: Set<A>, b: Set<A>): boolean {
  if (a.size === 0 || b.size === 0) {
    return false
  }
  for (const item of a) {
    if (b.has(item)) {
      return true
    }
  }
  return false
}

/**
 * Checks if all elements of set `a` are also in set `b` (subset relation).
 * Note: this code is hot, so is optimized for speed.
 * 
 * @template A - The type of set elements
 * @param a - Set to check (potential subset)
 * @param b - Reference set (potential superset)
 * @returns `true` if every element of `a` is in `b`
 * 
 * @example
 * every(new Set([1, 2]), new Set([1, 2, 3]))
 * // Returns: true ({1, 2} ⊆ {1, 2, 3})
 */
export function every<A>(a: ReadonlySet<A>, b: ReadonlySet<A>): boolean {
  for (const item of a) {
    if (!b.has(item)) {
      return false
    }
  }
  return true
}

/**
 * Returns the union of two sets (all elements from both sets).
 * Note: this code is hot, so is optimized for speed.
 * 
 * @template A - The type of set elements
 * @param a - First set
 * @param b - Second set
 * @returns New set containing all elements from `a` and `b`
 * 
 * @example
 * union(new Set([1, 2]), new Set([2, 3]))
 * // Returns: Set(3) {1, 2, 3}
 */
export function union<A>(a: Set<A>, b: Set<A>): Set<A> {
  const result = new Set<A>()
  for (const item of a) {
    result.add(item)
  }
  for (const item of b) {
    result.add(item)
  }
  return result
}
