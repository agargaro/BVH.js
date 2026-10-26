import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

const formatting = stylistic.configs.customize({
  jsx: false,
  semi: true,
  commaDangle: 'never',
  arrowParens: true,
  braceStyle: '1tbs',
  blockSpacing: true,
  indent: 2,
  quoteProps: 'as-needed',
  quotes: 'single'
});

const runtimeSyntax = [
  { selector: 'ForOfStatement', message: 'Use an indexed for loop with a precomputed length.' },
  { selector: 'ForInStatement', message: 'Use an indexed for loop with a precomputed length.' },
  { selector: 'ForStatement > BinaryExpression.test > MemberExpression.right[property.name="length"]', message: 'Precompute the length: for (let i = 0, l = array.length; i < l; i++).' },
  { selector: 'CallExpression[callee.property.name=/^(forEach|map|filter|reduce|reduceRight|some|every|find|findIndex|findLast|findLastIndex|flatMap)$/]', message: 'Use an indexed for loop instead of a callback array method.' },
  { selector: 'UnaryExpression[operator="delete"]', message: 'delete changes the object shape; assign null instead.' }
];

export default defineConfig([
  { ignores: ['build/**', 'coverage/**', 'benchmarks/results/**', '.cache/**'] },
  { files: ['**/*.js'], extends: [js.configs.recommended, formatting] },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked, formatting],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true
      }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-unnecessary-condition': ['error', { allowConstantLoopConditions: true }],
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'explicit' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-use-before-define': ['error', { functions: false, classes: true, variables: true, typedefs: true }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error'
    }
  },
  {
    files: ['tests/**/*.ts', 'benchmarks/**/*.ts', '*.config.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/unbound-method': 'off'
    }
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...runtimeSyntax],
      'prefer-rest-params': 'error'
    }
  }
]);
