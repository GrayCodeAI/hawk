import { getGlobalConfig } from '../utils/config.js'
import {
  type Companion,
  type CompanionBones,
  EYES,
  HATS,
  RARITIES,
  RARITY_WEIGHTS,
  type Rarity,
  SPECIES,
  STAT_NAMES,
  type StatName,
} from './types.js'

// Mulberry32 — tiny seeded PRNG, good enough for picking ducks
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s: string): number {
  if (typeof Bun !== 'undefined') {
    return Number(BigInt(Bun.hash(s)) & 0xffffffffn)
  }
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!
}

function rollRarity(rng: () => number): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity]
    if (roll < 0) return rarity
  }
  return 'common'
}

const RARITY_FLOOR: Record<Rarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50,
}

// One peak stat, one dump stat, rest scattered. Rarity bumps the floor.
function rollStats(
  rng: () => number,
  rarity: Rarity,
): Record<StatName, number> {
  const floor = RARITY_FLOOR[rarity]
  const peak = pick(rng, STAT_NAMES)
  let dump = pick(rng, STAT_NAMES)
  while (dump === peak) dump = pick(rng, STAT_NAMES)

  const stats = {} as Record<StatName, number>
  for (const name of STAT_NAMES) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30))
    } else if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15))
    } else {
      stats[name] = floor + Math.floor(rng() * 40)
    }
  }
  return stats
}

const SALT = 'friend-2026-401'

export type Roll = {
  bones: CompanionBones
  inspirationSeed: number
}

function rollFrom(rng: () => number): Roll {
  const rarity = rollRarity(rng)
  const bones: CompanionBones = {
    rarity,
    species: pick(rng, SPECIES),
    eye: pick(rng, EYES),
    hat: rarity === 'common' ? 'none' : pick(rng, HATS),
    shiny: rng() < 0.01,
    stats: rollStats(rng, rarity),
  }
  return { bones, inspirationSeed: Math.floor(rng() * 1e9) }
}

// Called from three hot paths (500ms sprite tick, per-keystroke PromptInput,
// per-turn observer) with the same userId → cache the deterministic result.
let rollCache: { key: string; value: Roll } | undefined
export function roll(userId: string): Roll {
  const key = userId + SALT
  if (rollCache?.key === key) return rollCache.value
  const value = rollFrom(mulberry32(hashString(key)))
  rollCache = { key, value }
  return value
}

const COMPANION_NAMES = [
  'Pip', 'Ember', 'Widget', 'Biscuit', 'Cosmo', 'Tofu', 'Pixel', 'Dot',
  'Wisp', 'Bramble', 'Fizz', 'Mochi', 'Sprocket', 'Zinnia', 'Nugget',
  'Quill', 'Pebble', 'Juniper', 'Clover', 'Scout', 'Bean', 'Sprout',
  'Dottie', 'Jinx', 'Remy', 'Pippin', 'Tater', 'Ziggy', 'Ollie', 'Noodle',
  'Gizmo', 'Waffle', 'Taco', 'Miso', 'Onyx', 'Patches', 'Rusty', 'Lucky',
  'Sunny', 'Dash', 'Jumper', 'Twinkle', 'Bubbles', 'Socks', 'Mittens',
  'Shadow', 'Peanut', 'Marshmallow', 'Cinnamon', 'Honey', 'Maple', 'Ginger',
  'Willow', 'Fern', 'Ash', 'Oak', 'Sage', 'Roux', 'Banjo', 'Dex',
]

const COMPANION_PERSONALITIES = [
  'a relentlessly optimistic creature who finds wonder in every terminal command',
  'quietly observant, speaks in haiku-adjacent fragments when excited',
  'a chaos gremlin who celebrates stack traces like confetti',
  'deeply philosophical about semicolons and indentation',
  'a sleepy companion who occasionally mutters debugging advice in its sleep',
  'easily amused by simple variable names and well-formatted JSON',
  'a tiny perfectionist who gasps at inconsistent naming conventions',
  'cheerfully sarcastic, especially about magic numbers and TODO comments',
  'a gentle soul who collects interesting error messages like trading cards',
  'fervently believes that every bug is just a feature in disguise',
  'has strong opinions about tabs vs spaces but will never start a fight about it',
  'an incorrigible optimist who thinks every segfault is a learning opportunity',
  'whispers encouraging words to the compiler when things go wrong',
  'a tiny librarian who catalogs every function by how much it makes them sigh',
  'genuinely excited about edge cases and boundary conditions',
  'a zen master who finds peace in idempotent operations',
  'suspects the universe is simulated but is okay with it as long as the tests pass',
  'a cheerful nihilist who thinks nothing matters but the code should still work',
  'collects interesting variable names the way others collect stamps',
  'a romantic who believes every function deserves a clear return type',
  'treats every merge conflict like a diplomatic negotiation',
  'a tiny bard who sings the praises of well-written unit tests',
  'quietly judges code formatting but only in the friendliest way possible',
  'believes the best conversations start with "have you tried restarting it"',
  'a tiny engineer who speaks exclusively in design patterns',
]

export function hatchCompanion(): Roll['bones'] & { name: string; personality: string } | null {
  const stored = getGlobalConfig().companion
  if (stored) return null

  const rng = mulberry32(hashString(companionUserId() + SALT))
  const bones = rollFrom(rng).bones

  const name = COMPANION_NAMES[Math.floor(rng() * COMPANION_NAMES.length)]!
  const personality = COMPANION_PERSONALITIES[Math.floor(rng() * COMPANION_PERSONALITIES.length)]!

  saveGlobalConfig(cfg => ({
    ...cfg,
    companion: { name, personality, hatchedAt: Date.now() },
  }))

  return { ...bones, name, personality }
}

export function rollWithSeed(seed: string): Roll {
  return rollFrom(mulberry32(hashString(seed)))
}

export function companionUserId(): string {
  const config = getGlobalConfig()
  return config.oauthAccount?.accountUuid ?? config.userID ?? 'anon'
}

// Regenerate bones from userId, merge with stored soul. Bones never persist
// so species renames and SPECIES-array edits can't break stored companions,
// and editing config.companion can't fake a rarity.
export function getCompanion(): Companion | undefined {
  const stored = getGlobalConfig().companion
  if (!stored) return undefined
  const { bones } = roll(companionUserId())
  // bones last so stale bones fields in old-format configs get overridden
  return { ...stored, ...bones }
}
