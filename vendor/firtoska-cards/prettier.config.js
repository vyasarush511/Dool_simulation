const config = {
  tabWidth: 2,
  useTabs: false,
  singleQuote: true,
  semi: true,
  bracketSpacing: true,
  arrowParens: 'avoid',
  trailingComma: 'es5',
  bracketSameLine: true,
  printWidth: 100,
  endOfLine: 'lf',
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  importOrder: ['^@scope/', '<THIRD_PARTY_MODULES>', '^@?[a-zA-Z0-9]+[/\\\\]', '^src/', '^[./]'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};

export default config;
