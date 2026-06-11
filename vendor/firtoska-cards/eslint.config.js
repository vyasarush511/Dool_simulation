import tseslint from 'typescript-eslint';

import eslint from '@eslint/js';

export default tseslint.config(
  {
    ignores: ['dist/', 'tmp/', 'node_modules/', '.yarn/', '.vscode/'],
  },
  {
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      tseslint: tseslint.plugin,
    },
    files: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
  }
);
