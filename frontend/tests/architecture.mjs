#!/usr/bin/env node

/**
 * Structural test that enforces the frontend module dependency layering.
 *
 * Scans TypeScript imports and verifies that each module only imports from
 * modules at a lower layer number, per docs/architecture.md.
 *
 * Layer 0: types/
 * Layer 1: utils/
 * Layer 2: api/
 * Layer 3: hooks/
 * Layer 4: components/
 * Layer 5: pages/
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC_DIR = new URL('../src/', import.meta.url).pathname

/**
 * Explicit allowed imports per module, matching docs/architecture.md.
 *
 * Unlike the backend (where "any lower layer" is sufficient), the frontend
 * has additional constraints: components and pages must not import from api
 * directly — they go through hooks instead.
 */
const ALLOWED_IMPORTS = {
  types: [],
  utils: ['types'],
  api: ['types', 'utils'],
  hooks: ['types', 'utils', 'api'],
  components: ['types', 'utils', 'hooks'],
  pages: ['types', 'utils', 'hooks', 'components'],
}

const MODULES = Object.keys(ALLOWED_IMPORTS)

/** Recursively collect all .ts/.tsx files under a directory. */
function collectFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      results.push(...collectFiles(full))
    } else if (/\.(ts|tsx)$/.test(entry)) {
      results.push(full)
    }
  }
  return results
}

/** Extract internal module imports from a file's content. */
function extractInternalImports(content) {
  const importPattern = /(?:import|from)\s+['"](?:\.\.?\/)([^'"]+)['"]/g
  const imports = []
  let match
  while ((match = importPattern.exec(content)) !== null) {
    imports.push(match[1])
  }
  return imports
}

/** Determine which src/ module an import path resolves to. */
function resolveModule(importPath, fileModule) {
  // Relative imports starting with ../ go up to a sibling module
  if (importPath.startsWith('../')) {
    const parts = importPath.replace(/^\.\.\//, '').split('/')
    return parts[0]
  }
  // Relative imports starting with ./ stay in the same module
  if (importPath.startsWith('./') || !importPath.includes('/')) {
    return fileModule
  }
  return importPath.split('/')[0]
}

const violations = []

for (const module of MODULES) {
  const moduleDir = join(SRC_DIR, module)
  let files
  try {
    files = collectFiles(moduleDir)
  } catch {
    // Module directory doesn't exist yet, skip
    continue
  }

  const allowed = ALLOWED_IMPORTS[module]

  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    const imports = extractInternalImports(content)
    const relFile = relative(SRC_DIR, file)

    for (const imp of imports) {
      const target = resolveModule(imp, module)

      // Skip self-imports and non-layered modules
      if (target === module || !MODULES.includes(target)) continue

      if (!allowed.includes(target)) {
        violations.push(
          `${relFile}: imports from '${target}/' which is NOT allowed. ` +
            `'${module}/' may only import from: [${allowed.join(', ')}]`,
        )
      }
    }
  }
}

// Also check that only api/ uses fetch
for (const module of MODULES.filter((m) => m !== 'api')) {
  const moduleDir = join(SRC_DIR, module)
  let files
  try {
    files = collectFiles(moduleDir)
  } catch {
    continue
  }

  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    const relFile = relative(SRC_DIR, file)

    // Match fetch( calls but not type references or comments
    if (/\bfetch\s*\(/.test(content)) {
      // Exclude comments and type-only lines
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (/\bfetch\s*\(/.test(line) && !line.startsWith('//') && !line.startsWith('*')) {
          violations.push(
            `${relFile}:${i + 1}: calls fetch() directly. Only api/ may make HTTP calls.`,
          )
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Frontend dependency layering violations found:\n')
  for (const v of violations) {
    console.error(`  - ${v}`)
  }
  console.error(`\n${violations.length} violation(s) found.`)
  process.exit(1)
} else {
  console.log('Frontend dependency layering: OK')
  process.exit(0)
}
