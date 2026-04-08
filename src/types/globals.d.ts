/**
 * Global type declarations for Hawk
 *
 * - MACRO.*  : build-time constants inlined by Bun bundler (scripts/build.ts)
 * - Third-party modules without published @types declarations
 */

// ============================================================================
// Build-time constants (replaced by Bun bundler at build time)
// ============================================================================

declare const MACRO: {
  VERSION: string
  DISPLAY_VERSION: string
  BUILD_TIME: string
  ISSUES_EXPLAINER: string
}

// ============================================================================
// Lodash-ES module declarations
// (lodash-es ships CJS types; these declarations enable ESM subpath imports)
// ============================================================================

declare module 'lodash-es/capitalize.js' {
  const capitalize: (str?: string) => string
  export default capitalize
}

declare module 'lodash-es/cloneDeep.js' {
  const cloneDeep: <T>(value: T) => T
  export default cloneDeep
}

declare module 'lodash-es/isEqual.js' {
  const isEqual: (value: unknown, other: unknown) => boolean
  export default isEqual
}

declare module 'lodash-es/isObject.js' {
  const isObject: (value: unknown) => value is object
  export default isObject
}

declare module 'lodash-es/isPlainObject.js' {
  const isPlainObject: (value: unknown) => boolean
  export default isPlainObject
}

declare module 'lodash-es/last.js' {
  const last: <T>(array: T[] | null | undefined) => T | undefined
  export default last
}

declare module 'lodash-es/mapValues.js' {
  const mapValues: <T extends object, TResult>(
    object: T | null | undefined,
    iteratee: (value: T[keyof T], key: string) => TResult
  ) => Record<string, TResult>
  export default mapValues
}

declare module 'lodash-es/memoize.js' {
  interface MemoizedFunction {
    cache: {
      has(key: unknown): boolean
      get(key: unknown): unknown
      set(key: unknown, value: unknown): void
      delete(key: unknown): boolean
      clear(): void
    }
  }
  const memoize: {
    <T extends (...args: unknown[]) => unknown>(
      func: T,
      resolver?: (...args: Parameters<T>) => unknown
    ): T & MemoizedFunction
  }
  export default memoize
}

declare module 'lodash-es/mergeWith.js' {
  const mergeWith: <TObject, TSource>(
    object: TObject,
    source: TSource,
    customizer: (objValue: unknown, srcValue: unknown, key: string) => unknown
  ) => TObject & TSource
  export default mergeWith
}

declare module 'lodash-es/noop.js' {
  const noop: (...args: unknown[]) => void
  export default noop
}

declare module 'lodash-es/omit.js' {
  const omit: <T extends object, K extends keyof T>(object: T, ...paths: K[]) => Omit<T, K>
  export default omit
}

declare module 'lodash-es/partition.js' {
  const partition: <T>(
    collection: T[] | null | undefined,
    predicate: (value: T) => boolean
  ) => [T[], T[]]
  export default partition
}

declare module 'lodash-es/pickBy.js' {
  const pickBy: <T extends object>(
    object: T | null | undefined,
    predicate?: (value: T[keyof T], key: string) => boolean
  ) => Partial<T>
  export default pickBy
}

declare module 'lodash-es/reject.js' {
  const reject: <T>(
    collection: T[] | null | undefined,
    predicate: (value: T) => boolean
  ) => T[]
  export default reject
}

declare module 'lodash-es/sample.js' {
  const sample: <T>(collection: T[] | null | undefined) => T | undefined
  export default sample
}

declare module 'lodash-es/setWith.js' {
  const setWith: <T extends object>(
    object: T,
    path: string | string[],
    value: unknown,
    customizer?: (nsValue: unknown, key: string, nsObject: T) => unknown
  ) => T
  export default setWith
}

declare module 'lodash-es/sumBy.js' {
  const sumBy: <T>(
    collection: T[] | null | undefined,
    iteratee: ((value: T) => number) | string
  ) => number
  export default sumBy
}

declare module 'lodash-es/throttle.js' {
  interface ThrottledFunction<T extends (...args: unknown[]) => unknown> {
    (...args: Parameters<T>): ReturnType<T>
    cancel(): void
    flush(): ReturnType<T>
  }
  const throttle: <T extends (...args: unknown[]) => unknown>(
    func: T,
    wait?: number,
    options?: { leading?: boolean; trailing?: boolean }
  ) => ThrottledFunction<T>
  export default throttle
}

declare module 'lodash-es/uniqBy.js' {
  const uniqBy: <T>(
    array: T[] | null | undefined,
    iteratee: ((value: T) => unknown) | string
  ) => T[]
  export default uniqBy
}

declare module 'lodash-es/zipObject.js' {
  const zipObject: <K extends string, V>(
    props: K[],
    values: V[]
  ) => Record<K, V>
  export default zipObject
}

// ============================================================================
// Third-party modules without @types packages
// ============================================================================

declare module 'lodash-es' {
  export { default as capitalize } from 'lodash-es/capitalize.js'
  export { default as cloneDeep } from 'lodash-es/cloneDeep.js'
  export { default as isEqual } from 'lodash-es/isEqual.js'
  export { default as isObject } from 'lodash-es/isObject.js'
  export { default as isPlainObject } from 'lodash-es/isPlainObject.js'
  export { default as last } from 'lodash-es/last.js'
  export { default as mapValues } from 'lodash-es/mapValues.js'
  export { default as memoize } from 'lodash-es/memoize.js'
  export { default as mergeWith } from 'lodash-es/mergeWith.js'
  export { default as noop } from 'lodash-es/noop.js'
  export { default as omit } from 'lodash-es/omit.js'
  export { default as partition } from 'lodash-es/partition.js'
  export { default as pickBy } from 'lodash-es/pickBy.js'
  export { default as reject } from 'lodash-es/reject.js'
  export { default as sample } from 'lodash-es/sample.js'
  export { default as setWith } from 'lodash-es/setWith.js'
  export { default as sumBy } from 'lodash-es/sumBy.js'
  export { default as throttle } from 'lodash-es/throttle.js'
  export { default as uniqBy } from 'lodash-es/uniqBy.js'
  export { default as zipObject } from 'lodash-es/zipObject.js'
}

declare module 'bidi-js' {
  export function getEmbeddingLevels(text: string, defaultDirection?: 'ltr' | 'rtl'): {
    levels: Uint8Array
    paragraphs: Array<{ start: number; end: number; level: number }>
  }
  export function getReorderSegments(text: string, embeddingLevels: ReturnType<typeof getEmbeddingLevels>['levels'], start?: number, end?: number): Array<[number, number]>
  export function getVisualOrder(reorderSegments: Array<[number, number]>): number[]
  export function getVisualIndex(logicalIndex: number, visualOrder: number[]): number
}

declare module 'picomatch' {
  function picomatch(glob: string | string[], options?: picomatch.PicomatchOptions): (str: string) => boolean
  namespace picomatch {
    interface PicomatchOptions {
      dot?: boolean
      nocase?: boolean
      ignore?: string | string[]
    }
    function isMatch(str: string | string[], glob: string | string[], options?: PicomatchOptions): boolean
    function makeRe(glob: string, options?: PicomatchOptions): RegExp
  }
  export = picomatch
}

declare module 'proper-lockfile' {
  interface LockOptions {
    stale?: number
    retries?: number | { retries?: number; factor?: number; minTimeout?: number; maxTimeout?: number }
    realpath?: boolean
    lockfilePath?: string
    onCompromised?: (err: Error) => void
  }
  export function lock(path: string, options?: LockOptions): Promise<() => Promise<void>>
  export function unlock(path: string, options?: Pick<LockOptions, 'realpath' | 'lockfilePath'>): Promise<void>
  export function check(path: string, options?: Pick<LockOptions, 'stale' | 'realpath' | 'lockfilePath'>): Promise<boolean>
}

declare module 'react-reconciler' {
  const Reconciler: (...args: unknown[]) => unknown
  export default Reconciler
}

declare module 'react-reconciler/constants.js' {
  export const ConcurrentRoot: number
  export const LegacyRoot: number
  export const NoMode: number
  export const ConcurrentMode: number
}

declare module 'semver' {
  export function valid(version: string | null): string | null
  export function clean(version: string | null): string | null
  export function satisfies(version: string, range: string): boolean
  export function gt(v1: string, v2: string): boolean
  export function gte(v1: string, v2: string): boolean
  export function lt(v1: string, v2: string): boolean
  export function lte(v1: string, v2: string): boolean
  export function eq(v1: string, v2: string): boolean
  export function neq(v1: string, v2: string): boolean
  export function coerce(version: string | null): { version: string } | null
  export function parse(version: string | null): { major: number; minor: number; patch: number; version: string } | null
  export function major(version: string): number
  export function minor(version: string): number
  export function patch(version: string): number
  export function inc(version: string, release: 'major' | 'minor' | 'patch' | 'premajor' | 'preminor' | 'prepatch' | 'prerelease'): string | null
  export function diff(v1: string, v2: string): string | null
  export function Range(range: string): { test(version: string): boolean }
}

declare module 'shell-quote' {
  export function parse(cmd: string, env?: Record<string, string>): Array<string | { op: string }>
  export function quote(words: string[]): string
}

declare module 'turndown' {
  interface TurndownOptions {
    headingStyle?: 'setext' | 'atx'
    hr?: string
    bulletListMarker?: '-' | '+' | '*'
    codeBlockStyle?: 'indented' | 'fenced'
    fence?: '```' | '~~~'
    emDelimiter?: '_' | '*'
    strongDelimiter?: '__' | '**'
    linkStyle?: 'inlined' | 'referenced'
    linkReferenceStyle?: 'full' | 'collapsed' | 'shortcut'
  }
  class TurndownService {
    constructor(options?: TurndownOptions)
    turndown(html: string): string
    use(plugin: (service: TurndownService) => void): this
    addRule(key: string, rule: { filter: string | string[] | ((node: unknown) => boolean); replacement: (content: string, node: unknown) => string }): this
  }
  export default TurndownService
}

declare module 'ws' {
  class WebSocket {
    static readonly CONNECTING: 0
    static readonly OPEN: 1
    static readonly CLOSING: 2
    static readonly CLOSED: 3
    readonly readyState: 0 | 1 | 2 | 3
    readonly url: string
    constructor(url: string, protocols?: string | string[], options?: unknown)
    send(data: string | Buffer | ArrayBuffer): void
    close(code?: number, reason?: string): void
    on(event: 'message', listener: (data: Buffer, isBinary: boolean) => void): this
    on(event: 'open' | 'close', listener: () => void): this
    on(event: 'error', listener: (err: Error) => void): this
    on(event: string, listener: (...args: unknown[]) => void): this
    once(event: string, listener: (...args: unknown[]) => void): this
    off(event: string, listener: (...args: unknown[]) => void): this
  }
  class WebSocketServer {
    constructor(options: { port?: number; server?: unknown; path?: string })
    on(event: 'connection', listener: (socket: WebSocket, request: unknown) => void): this
    on(event: string, listener: (...args: unknown[]) => void): this
    close(callback?: () => void): void
  }
  export { WebSocket, WebSocketServer }
  export default WebSocket
}

declare module 'qrcode' {
  interface QRCodeToStringOptions {
    type?: 'svg' | 'terminal' | 'utf8'
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    margin?: number
    width?: number
    color?: { dark?: string; light?: string }
  }
  interface QRCodeToDataURLOptions extends QRCodeToStringOptions {
    type?: 'image/png' | 'image/jpeg' | 'image/webp'
  }
  export function toString(text: string, options?: QRCodeToStringOptions): Promise<string>
  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>
  export function toCanvas(canvas: unknown, text: string, options?: QRCodeToStringOptions): Promise<void>
}
