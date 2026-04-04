import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import checkFilePlugin from 'eslint-plugin-check-file';
import perfectionistPlugin from 'eslint-plugin-perfectionist';
import prettierPlugin from 'eslint-plugin-prettier';
import { readFileSync } from 'fs';
import globals from 'globals';
import { resolve } from 'path';
import tseslint from 'typescript-eslint';

const prettierOptions = JSON.parse(
  readFileSync(resolve('.prettierrc'), 'utf8'),
);

export default [
  js.configs.recommended,

  ...tseslint.configs.recommended,

  prettierConfig,

  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
      },
    },
    plugins: {
      perfectionist: perfectionistPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-unused-vars': 0,

      // Core ESLint rules
      'arrow-body-style': [2, 'as-needed'],
      'no-constant-binary-expression': 1,
      'no-shadow': 'off',
      'no-unused-vars': 0,
      'no-use-before-define': 0,
      'prefer-template': 2,

      // Newline before return
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', next: 'return', prev: '*' },
      ],

      // Perfectionist rules (import sorting)
      'perfectionist/sort-imports': [
        'error',
        {
          groups: [
            ['type-builtin', 'type-external'],
            ['builtin', 'external'],
            'type-internal',
            'internal',
            ['type-parent', 'type-sibling', 'type-index'],
            ['parent', 'sibling', 'index'],
            'unknown',
          ],
          newlinesBetween: 1,
          order: 'asc',
          type: 'alphabetical',
        },
      ],

      // Perfectionist rules (object sorting)
      'perfectionist/sort-objects': [
        'error',
        {
          order: 'asc',
          partitionByComment: true,
          type: 'alphabetical',
        },
      ],

      // Prettier rules
      'prettier/prettier': ['error', prettierOptions],
    },
  },

  // File and folder naming conventions
  {
    files: ['src/**/*.ts'],
    plugins: {
      'check-file': checkFilePlugin,
    },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          'src/**/*.ts': '+([a-z])*(-+([a-z0-9]))',
        },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': [
        'error',
        { 'src/**/': '+([a-z0-9])*(-+([a-z0-9]))' },
      ],
    },
  },

  // Ignore patterns
  {
    ignores: ['dist/**', 'node_modules/**', '.eslintcache'],
  },
];
