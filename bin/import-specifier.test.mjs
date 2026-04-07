import assert from 'node:assert/strict'
import { join } from 'path'
import test from 'node:test'
import { pathToFileURL } from 'url'

import { getDistImportSpecifier } from './import-specifier.mjs'

test('builds a file URL import specifier for dist/cli.mjs', () => {
  const baseDir = process.platform === 'win32' ? 'C:\\repo\\bin' : '/repo/bin'
  const specifier = getDistImportSpecifier(baseDir)
  const expected = pathToFileURL(join(baseDir, '..', 'dist', 'cli.mjs')).href

  assert.equal(specifier, expected)
})
