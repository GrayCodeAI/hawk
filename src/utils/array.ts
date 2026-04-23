/**
 * Inserts a separator element between each element of an array.
 * 
 * @template A - The type of array elements
 * @param as - The source array to intersperse
 * @param separator - Function that generates separator elements, receives the current index
 * @returns New array with separators interspersed between elements
 * 
 * @example
 * intersperse(['a', 'b', 'c'], () => '-')
 * // Returns: ['a', '-', 'b', '-', 'c']
 */
export function intersperse<A>(as: A[], separator: (index: number) => A): A[] {
  return as.flatMap((a, i) => (i ? [separator(i), a] : [a]))
}

/**
 * Counts elements in an array that satisfy a predicate.
 * 
 * @template T - The type of array elements
 * @param arr - The array to count elements from
 * @param pred - Predicate function that returns truthy for elements to count
 * @returns The number of elements where pred(element) is truthy
 * 
 * @example
 * count([1, 2, 3, 4], x => x % 2 === 0)
 * // Returns: 2 (2 and 4 are even)
 */
export function count<T>(arr: readonly T[], pred: (x: T) => unknown): number {
  let n = 0
  for (const x of arr) n += +!!pred(x)
  return n
}

/**
 * Returns unique elements from an iterable, preserving first occurrence order.
 * 
 * @template T - The type of iterable elements
 * @param xs - The iterable to deduplicate
 * @returns Array containing only unique elements in order of first appearance
 * 
 * @example
 * uniq([1, 2, 2, 3, 1])
 * // Returns: [1, 2, 3]
 */
export function uniq<T>(xs: Iterable<T>): T[] {
  return [...new Set(xs)]
}
