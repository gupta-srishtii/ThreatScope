import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.playwright/**',
      'playwright-report/**',
      '.npm-cache/**',
      '.python/**',
      '.uv-cache/**',
      '.venv/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      'frontend/**/*.{ts,tsx}',
      'frontend/vite.config.ts',
      'frontend/playwright.config.ts',
      'frontend/tests/**/*.ts',
    ],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.vitest } },
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error' },
  },
  { files: ['*.js', 'scripts/**/*.mjs'], languageOptions: { globals: globals.node } },
)
