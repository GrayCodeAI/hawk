/**
 * eyrie - Core LLM client library for hawk
 * 
 * This is the core library that handles:
 * - API provider configurations
 * - Model resolution
 * - API limits and constants
 * - Base types (messages, IDs, connectors)
 * - Error types
 * 
 * @module @hawk/eyrie
 */

// Phase 1: Constants
export {
  API_IMAGE_MAX_BASE64_SIZE,
  IMAGE_TARGET_RAW_SIZE,
  IMAGE_MAX_WIDTH,
  IMAGE_MAX_HEIGHT,
  PDF_TARGET_RAW_SIZE,
  API_PDF_MAX_PAGES,
  PDF_EXTRACT_SIZE_THRESHOLD,
  PDF_MAX_EXTRACT_SIZE,
  PDF_MAX_PAGES_PER_READ,
  PDF_AT_MENTION_INLINE_THRESHOLD,
  API_MAX_MEDIA_PER_REQUEST,
} from './constants/limits.js'

// Future phases will add more exports here
// Phase 2: Types
// Phase 3: Config
// Phase 4: Errors
// Phase 5: Clients

// Version
export const EYRIE_VERSION = '0.1.0'
