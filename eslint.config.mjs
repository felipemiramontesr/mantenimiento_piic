// FC083 F3 — Flat config (ESLint 9, Camino A/Híbrido).
// Diseño: protocols/analysis/088_evidence/f1/diseno_flat_config.md
// Un solo config raíz con bloques `files` por workspace (apps/api, apps/web),
// reemplazando los 3 `.eslintrc.json` legacy (root/api/web). `airbnb-base`
// sigue vía FlatCompat (confirmado funcional en el spike F0); la capa TS
// específica de Airbnb (`eslint-config-airbnb-typescript`, nunca usada en
// este repo) queda reemplazada por `@typescript-eslint` recommended nativo.
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import securityPlugin from 'eslint-plugin-security';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import unicornPlugin from 'eslint-plugin-unicorn';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  {
    ignores: [
      'packages/database/scripts/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/scratch/**',
    ],
  },
  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  ...compat.extends('airbnb-base'),
  eslintConfigPrettier,
  {
    // Settings globales (legacy .eslintrc.json los aplicaba sin scope de `files`).
    settings: {
      react: { version: 'detect' },
      'import/resolver': { node: true },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      import: importPlugin,
      sonarjs: sonarjsPlugin,
      security: securityPlugin,
      unicorn: unicornPlugin,
    },
    rules: {
      'import/extensions': 'off',
      'import/no-unresolved': 'off',
      'no-console': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-param-reassign': [
        'error',
        { props: true, ignorePropertyModificationsFor: ['config', 'state'] },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      'import/no-extraneous-dependencies': 'off',
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: true,
            pascalCase: true,
          },
          // unicorn@65 agregó chequeo de nombres de directorio (checkDirectories,
          // default true) -- v51 (legacy) solo revisaba archivos. __tests__/__mocks__
          // son convención del ecosistema, no algo a renombrar. Restaura el alcance
          // original (solo archivos).
          checkDirectories: false,
        },
      ],
      'unicorn/prevent-abbreviations': 'off',
      'sonarjs/cognitive-complexity': ['error', 20],
      'security/detect-object-injection': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // La regla base no entiende posiciones solo-de-tipo (.d.ts, firmas de
      // interfaz) y duplica el reporte de @typescript-eslint/no-unused-vars —
      // recomendación oficial de typescript-eslint: desactivarla en archivos TS.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      'import/no-extraneous-dependencies': 'off',
    },
  },
  {
    files: ['apps/api/src/scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['apps/web/**/*.ts', 'apps/web/**/*.tsx'],
    rules: {
      'import/no-extraneous-dependencies': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'all', argsIgnorePattern: '^_|^newDate$', varsIgnorePattern: '^_' },
      ],
    },
  },
];
