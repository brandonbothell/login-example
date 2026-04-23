import { defineConfig, globalIgnores } from 'eslint/config'

import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
import nextPlugin from '@next/eslint-plugin-next'
import js from '@eslint/js'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['src/@prisma/**/*', '.yarn/**/*', '.next/**/*', '.pnp.*', 'next-env.d.ts']),

  js.configs.recommended, tseslint.configs.recommended, stylistic.configs.recommended, nextPlugin.configs.recommended,

  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: true,
      },
    },

    plugins: {
      '@stylistic': stylistic,
    },

    rules: {
      '@typescript-eslint/consistent-type-imports': ['warn', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],

      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
      }],

      'no-fallthrough': ['off'],
    },
  }])
